import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * Sign out. Clerk owns the session, so "logout" == revoking the active Clerk
 * session server-side (client components can also use `<SignOutButton />` /
 * `useClerk().signOut()`).
 */
export async function POST() {
  try {
    const { sessionId } = await auth();

    if (sessionId) {
      const client = await clerkClient();
      await client.sessions.revokeSession(sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
