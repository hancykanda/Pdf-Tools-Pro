'use client';

import Link from 'next/link';
import {
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
import SiteHeader from '@/components/layout/SiteHeader';

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
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-brand-dark">
      <SiteHeader />

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
