'use client';

import Link from 'next/link';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function DashboardErrorBoundary({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl w-fit mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-brand-dark mb-3">Something went wrong</h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            An unexpected error occurred in the dashboard. Please try again or go back to the home page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}