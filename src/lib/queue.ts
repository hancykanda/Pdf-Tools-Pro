import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl);

export const premiumQueue = new Queue('premium-jobs', { connection });

export type PremiumJobData = Record<string, unknown>;
export type PremiumJobResult = Record<string, unknown>;

export async function enqueuePremiumJob(
  name: string,
  data: PremiumJobData
): Promise<string> {
  const job = await premiumQueue.add(name, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
  return job.id as string;
}

export async function getJobStatus(jobId: string) {
  const job = await premiumQueue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  const progress = await job.progress;
  const result = (job.returnvalue ?? null) as PremiumJobResult | null;
  const failedReason = (job.failedReason ?? null) as string | null;
  return {
    id: job.id as string,
    name: job.name,
    data: job.data,
    state,
    progress,
    result,
    failedReason,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

let workerInstance: Worker<PremiumJobData, PremiumJobResult, string> | null = null;

export function registerPremiumWorker(
  handler: (job: Job<PremiumJobData, PremiumJobResult, string>) => Promise<PremiumJobResult>
) {
  if (workerInstance) return workerInstance;
  workerInstance = new Worker('premium-jobs', handler, { connection });
  return workerInstance;
}

export { connection };
