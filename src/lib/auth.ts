/**
 * Auth layer — Clerk (auth + roles ONLY).
 *
 * Clerk owns identity/sessions/roles. Subscriptions are owned by our own DB
 * (see `@/lib/subscription`) — there is NO Clerk Billing / Stripe here.
 *
 * The Prisma `User` row is the canonical application user; it is linked to the
 * Clerk user via `User.clerkId` and created lazily on first authenticated hit.
 */
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSubscriptionStatus } from '@/lib/subscription';
import type { User, UserRole } from '@prisma/client';

export type AppUser = User & { subscriptionActive: boolean };

const USER_ROLES: readonly UserRole[] = ['ADMIN', 'TEACHER', 'STUDENT'] as const;

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/**
 * Resolve the role for a brand new user:
 * Clerk `publicMetadata.role` (trusted, server-set) ->
 * `unsafeMetadata.role` (user-supplied at sign-up; clamped to non-admin) ->
 * `DEFAULT_ROLE` env -> `TEACHER`.
 *
 * `unsafeMetadata` is client-writable, so it is only trusted for TEACHER/STUDENT
 * — a user can never self-assign the ADMIN role through it.
 */
function resolveRole(publicMetaRole: unknown, unsafeMetaRole?: unknown): UserRole {
  if (isUserRole(publicMetaRole)) return publicMetaRole;

  if (isUserRole(unsafeMetaRole) && unsafeMetaRole !== 'ADMIN') return unsafeMetaRole;

  const fromEnv = process.env.DEFAULT_ROLE;
  if (isUserRole(fromEnv)) return fromEnv;

  return 'TEACHER';
}

/**
 * Returns the current application user (Prisma row + resolved subscription
 * flag) or `null` when the request is not authenticated.
 *
 * Lazily provisions the Prisma row the first time a Clerk user shows up.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const cu = await currentUser();
  if (!cu) return null;

  const clerkId = cu.id;

  let user = await prisma.user.findUnique({ where: { clerkId } });

  if (!user) {
    const email = cu.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@clerk.local`;
    const role = resolveRole(cu.publicMetadata?.role, cu.unsafeMetadata?.role);

    try {
      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name: cu.firstName ?? null,
          image: cu.imageUrl ?? null,
          role,
        },
      });
    } catch {
      // Race (concurrent first request) or a pre-existing row with the same
      // email — reconcile instead of failing the request.
      user =
        (await prisma.user.findUnique({ where: { clerkId } })) ??
        (await prisma.user.update({ where: { email }, data: { clerkId } }));
    }
  }

  const subscriptionActive =
    user.role === 'ADMIN' ? true : (await getSubscriptionStatus(user.id)).active;

  return { ...user, subscriptionActive };
}

/**
 * Legacy shim — the custom JWT session is gone, Clerk owns sessions now.
 * Kept so old call sites keep type-checking; always `null`.
 */
export async function getSession(): Promise<null> {
  return null;
}

/**
 * Legacy shim — sessions are created by Clerk. No-op returning an empty token.
 */
export async function createSession(_user: unknown): Promise<string> {
  void _user;
  return '';
}

/**
 * Legacy shim — sign-out is handled by Clerk (`<SignOutButton />` on the
 * client, session revocation in `/api/auth/logout` on the server).
 */
export async function clearSession(): Promise<void> {}

/**
 * Premium access rule (single source of truth for the app):
 * - ADMIN   -> always
 * - TEACHER -> only with an active subscription (our DB, not Clerk Billing)
 * - anyone else (STUDENT / anonymous) -> never
 */
export function hasPremiumAccess(user: AppUser | null): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'TEACHER') return user.subscriptionActive;
  return false;
}

/** Throws when unauthenticated. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

/** Throws when unauthenticated or the role is not in `roles`. */
export async function requireRole(roles: UserRole[]): Promise<AppUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new Error('Not authorized');
  return user;
}
