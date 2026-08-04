'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { AuthLayout, Alert, ActionButton } from '@/components/layout/PageShell';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <Alert type="error">
          <AlertCircle className="w-4 h-4" />
          {error}
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="pl-10 w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              placeholder="you@school.edu"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="pl-10 w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <ActionButton type="submit" loading={loading}>
        Sign in
      </ActionButton>

      <div className="text-center text-sm text-gray-500">
        <Link href="/" className="hover:text-brand-red">
          ← Back to PDF Master
        </Link>
      </div>
    </form>
  );
}

export default function SignInPage() {
  return (
    <AuthLayout title="Sign in to your account" subtitle="Or" href="/auth/register" linkText="create a free account">
      <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}