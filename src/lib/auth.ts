import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'change-me-in-production');
const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  sub: string;
  email: string;
  name?: string;
  role: 'USER' | 'PREMIUM' | 'ADMIN';
  isPremium: boolean;
  exp: number;
};

export async function createSession(user: { id: string; email: string; name?: string | null; role: 'USER' | 'PREMIUM' | 'ADMIN'; isPremium: boolean }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role,
    isPremium: user.isPremium,
    exp,
  };

  const token = await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ['HS256'] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, isPremium: true, premiumUntil: true },
  });

  return user;
}

export async function hashPassword(password: string) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}