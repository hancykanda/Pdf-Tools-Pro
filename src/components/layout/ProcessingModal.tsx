'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export function ProcessingModal({
  open,
  message = 'Please wait...',
  submessage = "We're processing your document. Keep this tab open.",
}: {
  open: boolean;
  message?: string;
  submessage?: string;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <ProcessingModalContent message={message} submessage={submessage} />,
    document.body
  );
}

function ProcessingModalContent({
  message,
  submessage,
}: {
  message: string;
  submessage: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => setTimedOut(true), 30000);
    return () => {
      document.body.style.overflow = original;
      clearTimeout(t);
    };
  }, []);

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm px-4">
      <div className="relative w-[min(90vw,360px)] bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-9 h-9 bg-orange-500 text-white rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-gray-900">PDF Master</span>
        </div>

        {/* Big red spinner */}
        <Spinner size={56} color="#e11d48" className="mb-5" />

        <p className="font-display font-bold text-lg text-brand-dark">{message}</p>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          {timedOut
            ? 'This is taking longer than expected. You can close this and try again.'
            : submessage}
        </p>
      </div>
    </div>
  );
}
