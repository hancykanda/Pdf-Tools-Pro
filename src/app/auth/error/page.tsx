import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

type SearchParams = { callbackUrl?: string };

export default function AuthErrorPage({ searchParams }: { searchParams?: SearchParams }) {
  const callbackUrl = searchParams?.callbackUrl || '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 text-red-600 rounded-2xl mx-auto mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-3xl text-gray-900">Authentication error</h2>
        <p className="text-sm text-gray-600">
          Something went wrong during sign in. Please try again or contact support if the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="px-6 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Try again
          </Link>
          <Link
            href={callbackUrl}
            className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Continue to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}