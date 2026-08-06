/**
 * Subscription / billing service.
 *
 * Design rules (do not change without updating `@/lib/auth` + `src/proxy.ts`):
 * - Clerk is used for AUTH ONLY. There is NO Clerk Billing and NO Stripe.
 * - The subscription state lives entirely in OUR database (Prisma / MySQL).
 * - Payment happens OUTSIDE the app, on a local gateway (Snippe.me,
 *   Flutterwave, or a MANUAL bank transfer recorded by an admin). The UI only
 *   creates a `PENDING` subscription and shows the user a payment reference
 *   (`gatewayRef`). The gateway then calls `POST /api/webhooks/payment`, which
 *   funnels into `applyWebhook()` below and flips the row to `ACTIVE`.
 * - Therefore there is no client-side payment SDK anywhere in this codebase.
 *
 * Env vars used here:
 * - `SNIPPE_WEBHOOK_SECRET`      shared secret for Snippe.me webhook signatures
 * - `FLUTTERWAVE_WEBHOOK_SECRET` shared secret ("secret hash") for Flutterwave
 * - `MANUAL_WEBHOOK_SECRET`      shared secret for the MANUAL/admin gateway
 * - `PAYMENT_GATEWAY`            default gateway used by the API routes
 * - `PREMIUM_PLAN_ID`            id of the teacher monthly plan; when set,
 *                                `ensureDefaultPlan()` upserts THAT id so all
 *                                environments share one stable plan id and the
 *                                UI can link straight to it. When unset the
 *                                plan is matched by name ("Teacher Premium").
 * - `PREMIUM_PLAN_PRICE`         optional price override (default 9.99)
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import type { Gateway, Plan, Subscription, SubscriptionStatus } from '@prisma/client';

/* -------------------------------------------------------------------------- */
/* Types & constants                                                          */
/* -------------------------------------------------------------------------- */

export type SubscriptionView = {
  active: boolean;
  status: SubscriptionStatus | null;
  planId: string | null;
  currentPeriodEnd: Date | null;
  gateway: string | null;
};

const INACTIVE: SubscriptionView = {
  active: false,
  status: null,
  planId: null,
  currentPeriodEnd: null,
  gateway: null,
};

/** Length of one billing period granted by a successful payment. */
export const BILLING_PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Name used to find/upsert the single built-in teacher plan. */
export const DEFAULT_PLAN_NAME = 'Teacher Premium';

/** All gateways we accept (mirrors the Prisma `Gateway` enum). */
export const GATEWAYS = ['SNIPPE', 'FLUTTERWAVE', 'MANUAL'] as const;
export type GatewayName = (typeof GATEWAYS)[number];

/** Normalizes free-form input ("snippe", "Flutterwave") to the Prisma enum. */
export function normalizeGateway(value: string | null | undefined): Gateway | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return (GATEWAYS as readonly string[]).includes(upper) ? (upper as Gateway) : null;
}

/** `sub_<24 hex>` — the reference the user quotes when paying on the gateway. */
export function createGatewayRef(): string {
  return `sub_${randomBytes(12).toString('hex')}`;
}

/** `Plan.features` is a JSON string column; this parses it defensively. */
export function parsePlanFeatures(plan: Pick<Plan, 'features'>): string[] {
  try {
    const parsed: unknown = JSON.parse(plan.features || '[]');
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Webhook signature verification (pluggable per gateway)                     */
/* -------------------------------------------------------------------------- */

/** Normalized view of a gateway webhook, produced by each adapter's `parse`. */
export type WebhookEvent = {
  /** Our `gatewayRef` (payment reference) as echoed back by the gateway. */
  ref: string | null;
  /** Optional user identifier (our `User.id` or Clerk id) sent in metadata. */
  userId: string | null;
  /** Normalized payment outcome. */
  outcome: 'success' | 'failed' | 'pending';
};

type GatewayAdapter = {
  /** Env var holding the shared secret for this gateway. */
  secretEnv: string;
  /** Verifies the signature header against the RAW request body. */
  verify: (rawBody: string, signature: string, secret: string) => boolean;
  /** Maps a gateway-specific payload onto our normalized `WebhookEvent`. */
  parse: (payload: Record<string, unknown>) => WebhookEvent;
};

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** HMAC-SHA256(rawBody, secret) compared in hex (also accepts base64/`sha256=`). */
function hmacSha256Verify(rawBody: string, signature: string, secret: string): boolean {
  const provided = signature.trim().replace(/^sha256=/i, '');
  const mac = createHmac('sha256', secret).update(rawBody, 'utf8');
  const digest = mac.digest();
  return (
    constantTimeEqual(provided.toLowerCase(), digest.toString('hex')) ||
    constantTimeEqual(provided, digest.toString('base64'))
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

/** Words that mean "money received" across the gateways we support. */
const SUCCESS_WORDS = ['success', 'successful', 'completed', 'complete', 'paid', 'approved'];
const FAILURE_WORDS = ['failed', 'failure', 'cancelled', 'canceled', 'refunded', 'reversed', 'declined', 'voided', 'chargeback'];

function classify(status: string | null): WebhookEvent['outcome'] {
  const value = (status ?? '').toLowerCase();
  if (!value) return 'pending';
  if (SUCCESS_WORDS.some((w) => value.includes(w))) return 'success';
  if (FAILURE_WORDS.some((w) => value.includes(w))) return 'failed';
  return 'pending';
}

/**
 * ADDING A NEW GATEWAY = ADDING ONE ENTRY HERE.
 *
 * 1. Add the value to the Prisma `Gateway` enum (supervisor owns the schema).
 * 2. Add `<NAME>: { secretEnv, verify, parse }` below.
 * 3. Put the shared secret in the env var named by `secretEnv`.
 * Nothing else in the app needs to change — the route, the DB writes and the
 * status logic are gateway-agnostic.
 */
export const GATEWAY_VERIFIERS: Record<GatewayName, GatewayAdapter> = {
  /**
   * Snippe.me — configure the webhook URL as
   *   https://<host>/api/webhooks/payment?gateway=snippe
   * and the shared secret as `SNIPPE_WEBHOOK_SECRET`. Snippe signs the raw
   * body with HMAC-SHA256 and sends it in `x-snippe-signature`.
   * Expected payload (map field names here if Snippe renames them):
   *   { event: 'payment.success', status: 'success',
   *     reference: 'sub_ab12…', metadata: { userId } }
   */
  SNIPPE: {
    secretEnv: 'SNIPPE_WEBHOOK_SECRET',
    verify: hmacSha256Verify,
    parse: (payload) => {
      const data = asRecord(payload.data ?? payload);
      const meta = { ...asRecord(payload.metadata), ...asRecord(data.metadata), ...asRecord(data.meta) };
      const ref = pickString(data, ['reference', 'transaction_ref', 'tx_ref', 'txRef', 'gatewayRef', 'merchant_reference']) ??
        pickString(meta, ['reference', 'gatewayRef']);
      const status =
        pickString(data, ['status', 'payment_status']) ?? pickString(payload, ['event', 'status', 'type']);
      return {
        ref,
        userId: pickString(meta, ['userId', 'user_id', 'clerkId']),
        outcome: classify(status),
      };
    },
  },

  /**
   * Flutterwave — dashboard > Settings > Webhooks. Set the "Secret hash" to
   * `FLUTTERWAVE_WEBHOOK_SECRET`; Flutterwave sends it verbatim in the
   * `verif-hash` header (it does NOT HMAC the body), so we accept either the
   * plain secret OR a real HMAC-SHA256 signature (used by their newer setups
   * and by our own tests).
   * Payload: { event: 'charge.completed',
   *            data: { status: 'successful', tx_ref: 'sub_ab12…',
   *                    meta: { userId } } }
   */
  FLUTTERWAVE: {
    secretEnv: 'FLUTTERWAVE_WEBHOOK_SECRET',
    verify: (rawBody, signature, secret) =>
      constantTimeEqual(signature.trim(), secret) || hmacSha256Verify(rawBody, signature, secret),
    parse: (payload) => {
      const data = asRecord(payload.data ?? payload);
      const meta = { ...asRecord(data.meta), ...asRecord(data.metadata), ...asRecord(payload.meta) };
      const ref = pickString(data, ['tx_ref', 'txRef', 'reference', 'transaction_ref']) ??
        pickString(meta, ['tx_ref', 'gatewayRef', 'reference']);
      const status = pickString(data, ['status']) ?? pickString(payload, ['event', 'status']);
      return {
        ref,
        userId: pickString(meta, ['userId', 'user_id', 'clerkId']),
        outcome: classify(status),
      };
    },
  },

  /**
   * MANUAL — bank transfer / cash confirmed by an admin (or an internal
   * script). Same HMAC contract, secret in `MANUAL_WEBHOOK_SECRET`.
   * Payload: { gatewayRef: 'sub_ab12…', status: 'success', userId? }
   */
  MANUAL: {
    secretEnv: 'MANUAL_WEBHOOK_SECRET',
    verify: hmacSha256Verify,
    parse: (payload) => {
      const data = asRecord(payload.data ?? payload);
      return {
        ref: pickString(data, ['gatewayRef', 'reference', 'ref', 'tx_ref']),
        userId: pickString(data, ['userId', 'user_id', 'clerkId']),
        outcome: classify(pickString(data, ['status', 'event'])),
      };
    },
  },
};

/**
 * Verifies a webhook signature for `gateway`.
 *
 * `payload` may be the RAW body string (preferred — signatures are computed
 * over raw bytes) or an already-parsed object, in which case it is
 * re-serialized with `JSON.stringify`.
 *
 * Fails CLOSED in production when the secret is missing; outside production a
 * missing secret only logs a warning so local/dev gateways can be simulated.
 */
export function verifySignature(
  gateway: string,
  payload: unknown,
  signature?: string,
): boolean {
  const name = normalizeGateway(gateway);
  if (!name) return false;

  const adapter = GATEWAY_VERIFIERS[name as GatewayName];
  const secret = (process.env[adapter.secretEnv] ?? '').trim();

  if (!secret || secret === 'change-me') {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[subscription] ${adapter.secretEnv} is not set — rejecting ${name} webhook`);
      return false;
    }
    console.warn(`[subscription] ${adapter.secretEnv} is not set — skipping ${name} signature check (non-production)`);
    return true;
  }

  if (!signature || !signature.trim()) return false;

  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});

  try {
    return adapter.verify(rawBody, signature, secret);
  } catch (error) {
    console.error('[subscription] signature verification error:', error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

/** Active plans, cheapest first. */
export async function listPlans(): Promise<Plan[]> {
  try {
    return await prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }],
    });
  } catch (error) {
    console.error('[subscription] listPlans failed:', error);
    return [];
  }
}

/**
 * Upserts the single built-in teacher plan and returns its id.
 *
 * Matching strategy: `PREMIUM_PLAN_ID` when set (so the id is stable across
 * environments), otherwise the plan named `Teacher Premium`.
 * Called by `prisma/seed.ts` and lazily by `createSubscription()` when the DB
 * has no plans yet.
 */
export async function ensureDefaultPlan(): Promise<string> {
  const envId = (process.env.PREMIUM_PLAN_ID ?? '').trim();
  const price = Number.parseFloat(process.env.PREMIUM_PLAN_PRICE ?? '') || 9.99;

  const data = {
    name: DEFAULT_PLAN_NAME,
    description: 'Full AI-powered teacher workspace: AI PDF editor, OCR, question & papers bank, exam generator and lesson plans.',
    priceMonthly: price,
    currency: 'USD',
    features: JSON.stringify([
      'AI PDF Editor',
      'Exam Header Customizer',
      'OCR + Organize PDF',
      'Question Bank',
      'Papers Bank',
      'Exam Generator',
      'Lesson Plans AI',
      'Priority support',
    ]),
    active: true,
  };

  const existing = envId
    ? await prisma.plan.findUnique({ where: { id: envId } })
    : await prisma.plan.findFirst({ where: { name: DEFAULT_PLAN_NAME } });

  if (existing) {
    const updated = await prisma.plan.update({ where: { id: existing.id }, data });
    return updated.id;
  }

  const created = await prisma.plan.create({ data: envId ? { id: envId, ...data } : data });
  return created.id;
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

/** `where` matching an ACTIVE subscription whose period has not elapsed. */
function activeWhere(userId: string) {
  const now = new Date();
  return {
    userId,
    status: 'ACTIVE' as const,
    OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
  };
}

const ACTIVE_ORDER = [{ currentPeriodEnd: 'desc' as const }, { createdAt: 'desc' as const }];

/** The newest still-valid ACTIVE subscription of a user, or `null`. */
async function findActiveSubscription(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({ where: activeWhere(userId), orderBy: ACTIVE_ORDER });
}

/** Same, with the related `Plan` eagerly loaded. */
async function findActiveSubscriptionWithPlan(
  userId: string,
): Promise<(Subscription & { plan: Plan }) | null> {
  return prisma.subscription.findFirst({
    where: activeWhere(userId),
    orderBy: ACTIVE_ORDER,
    include: { plan: true },
  });
}

/**
 * Flips ACTIVE subscriptions whose period already ended to EXPIRED.
 * Scoped to one user when `userId` is given (the hot path), global otherwise
 * (useful from a cron/worker).
 */
export async function expireStaleSubscriptions(userId?: string): Promise<number> {
  try {
    const { count } = await prisma.subscription.updateMany({
      where: {
        ...(userId ? { userId } : {}),
        status: 'ACTIVE',
        currentPeriodEnd: { not: null, lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return count;
  } catch (error) {
    console.error('[subscription] expireStaleSubscriptions failed:', error);
    return 0;
  }
}

/**
 * Premium gate used by `getCurrentUser()` and the proxy.
 *
 * Fails CLOSED (returns inactive) on any DB error so an outage degrades to
 * "no premium" instead of a 500 on every request.
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionView> {
  if (!userId) return INACTIVE;

  try {
    const active = await findActiveSubscription(userId);

    if (active) {
      return {
        active: true,
        status: active.status,
        planId: active.planId,
        currentPeriodEnd: active.currentPeriodEnd,
        gateway: active.gateway,
      };
    }

    // No valid subscription: lazily reap rows still marked ACTIVE whose period
    // has elapsed (cheap no-op when there is nothing to expire).
    await expireStaleSubscriptions(userId);

    return INACTIVE;
  } catch (error) {
    console.error('[subscription] getSubscriptionStatus failed:', error);
    return INACTIVE;
  }
}

/** The Plan behind the user's active subscription, or `null`. */
export async function getActivePlan(userId: string): Promise<Plan | null> {
  if (!userId) return null;
  try {
    const active = await findActiveSubscriptionWithPlan(userId);
    return active?.plan ?? null;
  } catch (error) {
    console.error('[subscription] getActivePlan failed:', error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export type CreateSubscriptionInput = {
  userId: string;
  planId: string;
  gateway: string;
  gatewayRef?: string;
};

/**
 * Creates a PENDING subscription — the "intent to pay".
 *
 * The user then pays on the gateway quoting `gatewayRef`; the gateway webhook
 * (`applyWebhook`) is what turns this row into ACTIVE. Nothing here talks to a
 * payment provider.
 */
export async function createSubscription(input: CreateSubscriptionInput): Promise<{ id: string }> {
  const { userId } = input;
  if (!userId) throw new Error('userId is required');

  const gateway = normalizeGateway(input.gateway);
  if (!gateway) throw new Error(`Unknown payment gateway: ${input.gateway}`);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new Error('User not found');

  // Resolve + validate the plan (falls back to the built-in plan when the DB
  // has not been seeded yet, so the upgrade flow never dead-ends).
  let planId = (input.planId ?? '').trim();
  if (!planId) planId = (process.env.PREMIUM_PLAN_ID ?? '').trim();

  let plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;
  if (!plan) {
    const anyPlan = await prisma.plan.count();
    if (planId && anyPlan > 0) throw new Error('Plan not found');
    plan = await prisma.plan.findUnique({ where: { id: await ensureDefaultPlan() } });
  }
  if (!plan) throw new Error('Plan not found');
  if (!plan.active) throw new Error('Plan is not active');

  const created = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: 'PENDING',
      gateway,
      gatewayRef: input.gatewayRef?.trim() || createGatewayRef(),
    },
    select: { id: true },
  });

  return { id: created.id };
}

/**
 * Cancels the user's subscription.
 * - `atPeriodEnd` (default): keeps access until `currentPeriodEnd`.
 * - otherwise: flips to CANCELLED immediately (also used when the sub has no
 *   period end yet).
 */
export async function cancelSubscription(
  userId: string,
  atPeriodEnd = true,
): Promise<{ ok: boolean; status: SubscriptionStatus | null; cancelAtPeriodEnd: boolean }> {
  const active = await findActiveSubscription(userId);
  if (!active) return { ok: false, status: null, cancelAtPeriodEnd: false };

  const immediate = !atPeriodEnd || !active.currentPeriodEnd;

  const updated = await prisma.subscription.update({
    where: { id: active.id },
    data: immediate
      ? { status: 'CANCELLED', cancelAtPeriodEnd: true }
      : { cancelAtPeriodEnd: true },
    select: { status: true, cancelAtPeriodEnd: true },
  });

  return { ok: true, status: updated.status, cancelAtPeriodEnd: updated.cancelAtPeriodEnd };
}

/** Undoes a "cancel at period end" while the subscription is still ACTIVE. */
export async function resumeSubscription(
  userId: string,
): Promise<{ ok: boolean; status: SubscriptionStatus | null; cancelAtPeriodEnd: boolean }> {
  const active = await findActiveSubscription(userId);
  if (!active) return { ok: false, status: null, cancelAtPeriodEnd: false };

  const updated = await prisma.subscription.update({
    where: { id: active.id },
    data: { cancelAtPeriodEnd: false },
    select: { status: true, cancelAtPeriodEnd: true },
  });

  return { ok: true, status: updated.status, cancelAtPeriodEnd: updated.cancelAtPeriodEnd };
}

/* -------------------------------------------------------------------------- */
/* Webhook                                                                    */
/* -------------------------------------------------------------------------- */

/** Resolves `userId` from metadata: our `User.id` first, then the Clerk id. */
async function resolveUserId(candidate: string | null): Promise<string | null> {
  if (!candidate) return null;
  const byId = await prisma.user.findUnique({ where: { id: candidate }, select: { id: true } });
  if (byId) return byId.id;
  const byClerk = await prisma.user.findUnique({ where: { clerkId: candidate }, select: { id: true } });
  return byClerk?.id ?? null;
}

/**
 * Applies a gateway webhook to our subscription state.
 *
 * Flow: verify signature -> parse payload (per-gateway adapter) -> locate the
 * subscription by `gatewayRef` (or the newest PENDING one of the identified
 * user) -> ACTIVE (+30 days) on success, CANCELLED on failure/refund.
 *
 * Returns `{ ok: false }` for: unknown gateway, bad signature, unparsable
 * payload, or a reference we do not know.
 */
export async function applyWebhook(opts: {
  gateway: string;
  payload: unknown;
  signature?: string;
}): Promise<{ ok: boolean; status?: string }> {
  const gateway = normalizeGateway(opts.gateway);
  if (!gateway) {
    console.warn('[subscription] webhook for unknown gateway:', opts.gateway);
    return { ok: false };
  }

  if (!verifySignature(gateway, opts.payload, opts.signature)) {
    console.warn(`[subscription] invalid ${gateway} webhook signature`);
    return { ok: false };
  }

  // Accept a raw body string or an already-parsed object.
  let parsed: Record<string, unknown>;
  if (typeof opts.payload === 'string') {
    try {
      parsed = asRecord(JSON.parse(opts.payload));
    } catch {
      console.warn('[subscription] webhook body is not valid JSON');
      return { ok: false };
    }
  } else {
    parsed = asRecord(opts.payload);
  }

  const event = GATEWAY_VERIFIERS[gateway as GatewayName].parse(parsed);

  try {
    // 1. Locate the subscription: by our reference first, then by user.
    let subscription: Subscription | null = event.ref
      ? await prisma.subscription.findFirst({
          where: { gatewayRef: event.ref },
          orderBy: [{ createdAt: 'desc' }],
        })
      : null;

    if (!subscription) {
      const userId = await resolveUserId(event.userId);
      if (userId) {
        subscription = await prisma.subscription.findFirst({
          where: { userId, status: 'PENDING' },
          orderBy: [{ createdAt: 'desc' }],
        });
      }
    }

    if (!subscription) {
      console.warn('[subscription] webhook reference not found:', event.ref ?? event.userId);
      return { ok: false };
    }

    // 2. Apply the outcome.
    if (event.outcome === 'success') {
      // Renewals extend from the current period end when it is still ahead.
      const now = Date.now();
      const base =
        subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now
          ? subscription.currentPeriodEnd.getTime()
          : now;

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(base + BILLING_PERIOD_DAYS * DAY_MS),
          cancelAtPeriodEnd: false,
          gateway,
          gatewayRef: event.ref ?? subscription.gatewayRef,
        },
      });

      return { ok: true, status: 'ACTIVE' };
    }

    if (event.outcome === 'failed') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED', cancelAtPeriodEnd: true },
      });
      return { ok: true, status: 'CANCELLED' };
    }

    // Informational event (e.g. "payment pending") — acknowledged, no change.
    return { ok: true, status: subscription.status };
  } catch (error) {
    console.error('[subscription] applyWebhook failed:', error);
    return { ok: false };
  }
}
