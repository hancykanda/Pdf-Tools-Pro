import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl mb-6">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-3xl text-gray-900 mb-4">Premium Required</h2>
        <p className="text-gray-500 mb-8">
          This feature is only available to premium users. Upgrade your account to unlock AI-powered teacher tools.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/pricing" className="px-6 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
            View Pricing
          </Link>
          <Link href="/dashboard" className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}