/**
 * Premium job dispatch + status with a serverless-safe fallback.
 *
 * By default (`PREMIUM_INLINE_PROCESSING` unset/false) jobs are enqueued to
 * BullMQ and processed by the in-process worker registered in
 * `@/lib/premiumWorker` — this is the right model for a long-running server or
 * container, where the worker keeps running.
 *
 * When `PREMIUM_INLINE_PROCESSING=true` (e.g. Vercel / edge / any environment
 * where a persistent worker does NOT run), jobs are processed **inline** within
 * the request and the result is cached in Redis. This keeps the existing
 * poll-based UI working everywhere without requiring a separate worker process.
 *
 * Trade-off: inline processing blocks the request until the job (AI/OCR) is
 * done, so on serverless it must stay under the platform's function timeout.
 */
import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { enqueuePremiumJob, getJobStatus as bullmqGetJobStatus, type PremiumJobData, type PremiumJobResult } from './queue';
import { handleJob } from './premiumWorker';

export type { PremiumJobData, PremiumJobResult } from './queue';

const INLINE = process.env.PREMIUM_INLINE_PROCESSING === 'true';
const RESULT_TTL = 3600;

const resultClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

async function storeInlineResult(id: string, result: PremiumJobResult | { error: string }) {
  try {
    await resultClient.set(`premium-job-result:${id}`, JSON.stringify(result), 'EX', RESULT_TTL);
  } catch (error) {
    console.error('[premiumDispatch] storeInlineResult failed:', error);
  }
}

/** Enqueue (worker mode) or process inline (serverless mode). Returns a job id. */
export async function dispatchPremiumJob(name: string, data: PremiumJobData): Promise<string> {
  if (INLINE) {
    const id = `inline_${randomUUID()}`;
    try {
      const result = await handleJob({ data } as Parameters<typeof handleJob>[0]);
      await storeInlineResult(id, result);
    } catch (err) {
      await storeInlineResult(id, {
        error: err instanceof Error ? err.message : 'Processing failed',
      });
    }
    return id;
  }
  return enqueuePremiumJob(name, data);
}

/** Status lookup that also resolves inline (serverless) results from Redis. */
export async function getPremiumJobStatus(id: string) {
  const fromQueue = await bullmqGetJobStatus(id);
  if (fromQueue) return fromQueue;

  try {
    const raw = await resultClient.get(`premium-job-result:${id}`);
    if (raw) {
      const result = JSON.parse(raw) as PremiumJobResult & { error?: string };
      const failed = 'error' in result;
      return {
        id,
        name: 'inline',
        data: {},
        state: failed ? 'failed' : 'completed',
        progress: failed ? 0 : 100,
        result,
        failedReason: failed ? (result as { error: string }).error : null,
        timestamp: undefined,
        processedOn: undefined,
        finishedOn: undefined,
      };
    }
  } catch (error) {
    console.error('[premiumDispatch] inline status lookup failed:', error);
  }
  return null;
}
