'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Menu,
  Sparkles,
  Lock,
  Mail,
  ShieldAlert,
  ScrollText,
  Cookie,
  HelpCircle,
  Info,
  FileStack,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import {
  MergePdfIcon,
  SplitPdfIcon,
  CompressPdfIcon,
  WordToPdfIcon,
  PdfToWordIcon,
  JpgToPdfIcon,
  PdfToJpgIcon,
  PowerPointToPdfIcon,
  ExcelToPdfIcon,
  HtmlToPdfIcon,
  PdfToPowerPointIcon,
  PdfToExcelIcon,
  RotatePdfIcon,
  PageNumbersIcon,
  WatermarkIcon,
  CropPdfIcon,
  EditPdfIcon,
  UnlockPdfIcon,
  ProtectPdfIcon,
  SignPdfIcon,
  RedactPdfIcon,
  ComparePdfIcon,
  OrganizePdfIcon,
  RepairPdfIcon,
  OcrPdfIcon,
  PdfToPdfaIcon,
  ScanToPdfIcon,
  SummarizePdfIcon,
  TranslatePdfIcon,
  PdfToMarkdownIcon,
} from '@/components/ui/ToolIcons';

const tools = [
  { name: 'Merge PDF', href: '/tools/merge', icon: MergePdfIcon },
  { name: 'Split PDF', href: '/tools/split', icon: SplitPdfIcon },
  { name: 'Compress PDF', href: '/tools/compress', icon: CompressPdfIcon },
  { name: 'Word to PDF', href: '/tools/word-to-pdf', icon: WordToPdfIcon },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', icon: PdfToWordIcon },
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', icon: JpgToPdfIcon },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', icon: PdfToJpgIcon },
  { name: 'PowerPoint to PDF', href: '/tools/powerpoint-to-pdf', icon: PowerPointToPdfIcon },
  { name: 'Excel to PDF', href: '/tools/excel-to-pdf', icon: ExcelToPdfIcon },
  { name: 'HTML to PDF', href: '/tools/html-to-pdf', icon: HtmlToPdfIcon },
  { name: 'PDF to PowerPoint', href: '/tools/pdf-to-powerpoint', icon: PdfToPowerPointIcon },
  { name: 'PDF to Excel', href: '/tools/pdf-to-excel', icon: PdfToExcelIcon },
  { name: 'Rotate PDF', href: '/tools/rotate-pdf', icon: RotatePdfIcon },
  { name: 'Add Page Numbers', href: '/tools/page-numbers', icon: PageNumbersIcon },
  { name: 'Watermark', href: '/tools/watermark', icon: WatermarkIcon },
  { name: 'Crop PDF', href: '/tools/crop-pdf', icon: CropPdfIcon },
  { name: 'Edit PDF', href: '/tools/edit-pdf', icon: EditPdfIcon },
  { name: 'Unlock PDF', href: '/tools/unlock-pdf', icon: UnlockPdfIcon },
  { name: 'Protect PDF', href: '/tools/protect-pdf', icon: ProtectPdfIcon },
  { name: 'Sign PDF', href: '/tools/sign-pdf', icon: SignPdfIcon },
  { name: 'Redact PDF', href: '/tools/redact-pdf', icon: RedactPdfIcon },
  { name: 'Compare PDF', href: '/tools/compare-pdf', icon: ComparePdfIcon },
  { name: 'Organize PDF', href: '/tools/organize-pdf', icon: OrganizePdfIcon },
  { name: 'Repair PDF', href: '/tools/repair-pdf', icon: RepairPdfIcon },
  { name: 'OCR PDF', href: '/tools/ocr-pdf', icon: OcrPdfIcon },
  { name: 'PDF to PDF/A', href: '/tools/pdf-to-pdfa', icon: PdfToPdfaIcon },
  { name: 'Scan to PDF', href: '/tools/scan-pdf', icon: ScanToPdfIcon },
  { name: 'AI Summarizer', href: '/tools/summarize-pdf', icon: SummarizePdfIcon },
  { name: 'Translate PDF', href: '/tools/translate-pdf', icon: TranslatePdfIcon },
  { name: 'PDF to Markdown', href: '/tools/pdf-to-markdown', icon: PdfToMarkdownIcon },
];

const otherLinks = [
  { name: 'About Us', href: '/about', icon: Info },
  { name: 'Privacy Policy', href: '/privacy', icon: ShieldAlert },
  { name: 'Terms of Service', href: '/terms', icon: ScrollText },
  { name: 'Contact Us', href: '/contact', icon: Mail },
  { name: 'Cookie Policy', href: '/cookies', icon: Cookie },
  { name: 'FAQ & Help', href: '/faq', icon: HelpCircle },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-brand-dark">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 bg-brand-red text-white rounded-lg shadow-sm group-hover:bg-red-700 group-hover:scale-105 transition-all">
              <span className="font-quintessential font-bold text-xs tracking-tight">PDF</span>
            </div>
            <span className="font-bree text-base tracking-tight text-gray-900 group-hover:text-brand-red transition-colors flex items-center">
              <span>PDF</span>
              <span className="font-quintessential font-bold text-brand-red ml-1">Master</span>
            </span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search */}
            {searchOpen ? (
              <div className="relative flex items-center bg-gray-100/90 hover:bg-gray-100 border border-gray-200/80 focus-within:border-brand-red focus-within:ring-2 focus-within:ring-red-500/20 rounded-full transition-all w-48 sm:w-64 px-3 py-1.5 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 hover:bg-gray-200 text-gray-400 rounded-full transition-colors ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="p-0.5 hover:bg-gray-200 text-gray-400 rounded-full transition-colors ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-600 hover:text-brand-red bg-gray-50 hover:bg-gray-100 border border-gray-200/60 rounded-full transition-all flex items-center gap-1.5 text-xs font-semibold pointer-events-auto"
                title="Search PDF tools"
              >
                <Search className="w-4 h-4 text-gray-600" />
                <span className="hidden sm:inline text-gray-500 text-xs font-medium">Search</span>
              </button>
            )}

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-500 hover:text-brand-red bg-gray-50 hover:bg-gray-100 border border-gray-200/50 rounded-xl transition-all pointer-events-auto"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 px-6 py-6 space-y-4 max-h-[85vh] overflow-y-auto z-50">
              <div className="flex flex-col space-y-2">
                <Link
                  href="/tools"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FileStack className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-brand-red transition-colors">Tools</span>
                </Link>
                <Link
                  href="/pricing"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-brand-red transition-colors">Pricing</span>
                </Link>
                <Link
                  href="/about"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Info className="w-4 h-4 text-gray-400 group-hover:text-brand-red transition-colors" />
                  <span className="text-xs font-bold text-gray-700 group-hover:text-brand-red transition-colors">About</span>
                </Link>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-2">
                <Link
                  href="/auth/signin"
                  className="block w-full text-center px-4 py-2.5 text-gray-700 font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="block w-full text-center px-4 py-2.5 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Header spacer for fixed header */}
      <div className="h-16" />

      {/* Main Content */}
      <main className="flex-grow">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 relative overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-brand-red via-amber-500 to-indigo-500" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-5">
              <Link href="/" className="flex items-center gap-2.5 group text-left">
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

              {/* Platform Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 text-[11px] font-medium text-amber-400">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Document Engine</span>
                </div>
              </div>
            </div>

            {/* Popular Tools */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <FileStack className="w-3.5 h-3.5 text-brand-red" />
                <span>Popular Tools</span>
              </h4>
              <ul className="space-y-2 text-xs font-sans">
                {tools.slice(0, 5).map((tool) => (
                  <li key={tool.name}>
                    <Link href={tool.href} className="hover:text-brand-red text-slate-400 transition-colors">
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Converters & Security */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Converters & Security</span>
              </h4>
              <ul className="space-y-2 text-xs font-sans">
                <li><Link href="/tools/word-to-pdf" className="hover:text-emerald-400 text-slate-400 transition-colors">Word to PDF</Link></li>
                <li><Link href="/tools/pdf-to-word" className="hover:text-emerald-400 text-slate-400 transition-colors">PDF to Word</Link></li>
                <li><Link href="/tools/jpg-to-pdf" className="hover:text-emerald-400 text-slate-400 transition-colors">JPG to PDF</Link></li>
                <li><Link href="/tools/pdf-to-jpg" className="hover:text-emerald-400 text-slate-400 transition-colors">PDF to JPG</Link></li>
                <li><Link href="/tools/compress" className="hover:text-emerald-400 text-slate-400 transition-colors">Compress PDF</Link></li>
              </ul>
            </div>

            {/* Other Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Other Links</span>
              </h4>
              <ul className="space-y-2 text-xs font-sans">
                {otherLinks.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="hover:text-indigo-400 text-slate-400 transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-sans">
            <div className="flex items-center gap-3">
              <span>© {new Date().getFullYear()} PDF Master. All rights reserved.</span>
              <span className="hidden sm:inline text-slate-700">•</span>
              <span className="hidden sm:inline text-slate-400">Crafted for Educators & Professionals</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Browser Offline Compatible</span>
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-800 shadow-sm flex items-center gap-1 text-[11px]"
                title="Scroll back to top"
              >
                <span>Top</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
