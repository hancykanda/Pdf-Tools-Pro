import Link from 'next/link';
import { ReactNode } from 'react';
import { ShieldCheck, Sparkles, Lock } from 'lucide-react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="flex items-center justify-center w-7 h-7 bg-brand-red text-white rounded-lg shadow-xs group-hover:bg-red-700 transition-colors">
              <span className="font-quintessential font-bold text-[11px] tracking-tight">PDF</span>
            </div>
            <span className="font-bree text-base tracking-tight text-gray-900 group-hover:text-brand-red transition-colors flex items-center">
              <span>PDF</span>
              <span className="font-quintessential font-bold text-brand-red ml-1">Master</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-500">
            <Link href="/tools" className="hover:text-brand-red transition-colors">Tools</Link>
            <Link href="/pricing" className="hover:text-brand-red transition-colors">Pricing</Link>
            <Link href="/about" className="hover:text-brand-red transition-colors">About</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-200/50">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Premium</span>
            </Link>
            <Link href="/auth/signin" className="px-4 py-2 text-gray-700 hover:text-brand-red font-medium transition-colors">
              Sign In
            </Link>
            <Link href="/auth/register" className="px-4 py-2 bg-brand-red text-white hover:bg-red-700 font-semibold rounded-xl transition-colors shadow-lg shadow-red-500/10">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>

      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
        <div className="h-1 w-full bg-gradient-to-r from-brand-red via-amber-500 to-indigo-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
            <div className="space-y-5">
              <Link href="/" className="flex items-center gap-2.5 cursor-pointer group text-left">
                <div className="flex items-center justify-center w-8 h-8 bg-brand-red text-white rounded-xl shadow-md group-hover:bg-red-600 group-hover:scale-105 transition-all">
                  <span className="font-quintessential font-extrabold text-xs tracking-tight">PDF</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bree text-lg tracking-tight text-white group-hover:text-red-400 transition-colors flex items-center leading-none">
                    <span>PDF</span>
                    <span className="font-quintessential font-bold text-brand-red ml-1">Master</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans tracking-wide uppercase font-semibold mt-0.5">
                    Pro Document Platform
                  </span>
                </div>
              </Link>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-sans">
                Professional PDF tools for everyone. Free tools for daily use, premium AI-powered workspace for educators.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                <span>Free Tools</span>
              </h4>
              <ul className="space-y-2 text-xs font-sans">
                <li><Link href="/tools/merge" className="hover:text-green-400 text-slate-400 transition-colors">Merge PDF</Link></li>
                <li><Link href="/tools/split" className="hover:text-green-400 text-slate-400 transition-colors">Split PDF</Link></li>
                <li><Link href="/tools/compress" className="hover:text-green-400 text-slate-400 transition-colors">Compress PDF</Link></li>
                <li><Link href="/tools/word-to-pdf" className="hover:text-green-400 text-slate-400 transition-colors">Word to PDF</Link></li>
                <li><Link href="/tools/pdf-to-word" className="hover:text-green-400 text-slate-400 transition-colors">PDF to Word</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Premium</span>
              </h4>
              <ul className="space-y-2 text-xs font-sans">
                <li><Link href="/pricing" className="hover:text-amber-400 text-slate-400 transition-colors">AI PDF Editor</Link></li>
                <li><Link href="/pricing" className="hover:text-amber-400 text-slate-400 transition-colors">Exam Header Customizer</Link></li>
                <li><Link href="/pricing" className="hover:text-amber-400 text-slate-400 transition-colors">Question Bank</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-display flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Legal</span>
              </h4>
              <ul className="space-y-2 text-xs font-sans">
                <li><Link href="/privacy" className="hover:text-indigo-400 text-slate-400 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-indigo-400 text-slate-400 transition-colors">Terms of Service</Link></li>
                <li><Link href="/contact" className="hover:text-indigo-400 text-slate-400 transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-sans">
            <span>© {new Date().getFullYear()} PDF Master. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}