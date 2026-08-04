'use client';

import { useRef } from 'react';
import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

export function ToolPageShell({
  title,
  description,
  icon: Icon,
  popular,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  popular?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Tool Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-red transition-all group"
            >
              <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>All Tools</span>
            </Link>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="p-3 bg-red-50 text-brand-red rounded-2xl">
                {Icon && <Icon className="w-8 h-8" />}
              </div>
              {popular && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500 rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-brand-dark">{title}</h1>
                {popular && (
                  <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
                    <TrendingUp className="w-3 h-3" />
                    Popular
                  </span>
                )}
              </div>
              {description && <p className="text-gray-500 text-sm max-w-2xl">{description}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tool Content */}
      <main className="flex-grow py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function ToolCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
}

export function ToolUploadZone({
  icon: Icon,
  title,
  subtitle,
  accept,
  multiple,
  onFiles,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-200 rounded-3xl p-8 sm:p-12 text-center hover:border-brand-red transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="p-4 bg-red-50 text-brand-red rounded-2xl w-fit mx-auto mb-4">
        <Icon className="w-10 h-10" />
      </div>
      <p className="text-gray-700 font-semibold mb-1">{title}</p>
      <p className="text-gray-400 text-sm">{subtitle}</p>
    </div>
  );
}

export function ToolPrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-red text-white disabled:opacity-40 disabled:hover:bg-brand-red hover:bg-red-700 font-semibold rounded-2xl cursor-pointer transition-all shadow-lg shadow-red-500/10 text-xs uppercase tracking-wider ${className}`}
    >
      {loading && (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}

export function ToolSecondaryButton({
  children,
  onClick,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 hover:bg-gray-50 font-semibold rounded-2xl border border-gray-200 cursor-pointer transition-all ${className}`}
    >
      {children}
    </button>
  );
}

export function ToolAlert({ type = 'error', children }: { type?: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
        type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
      }`}
    >
      {children}
    </div>
  );
}

export function FileItem({
  name,
  size,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  name: string;
  size: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/50 transition-all">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2 bg-red-100/50 text-brand-red rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-brand-dark truncate">{name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{size}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onMoveUp && (
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Move Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        {onMoveDown && (
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Move Down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent cursor-pointer"
          title="Remove"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
