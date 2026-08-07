'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Sparkles,
  Zap,
  LockKeyhole,
  BrainCircuit,
  School,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
  X,
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
  RemoveWatermarkIcon,
} from '@/components/ui/ToolCardIcons';

const tools = [
  { name: 'Merge PDF', href: '/tools/merge', description: 'Combine multiple PDFs into one', icon: MergePdfIcon, category: 'organize' },
  { name: 'Split PDF', href: '/tools/split', description: 'Extract pages from PDFs', icon: SplitPdfIcon, category: 'organize' },
  { name: 'Organize PDF', href: '/tools/organize-pdf', description: 'Reorder, rotate, or delete pages', icon: OrganizePdfIcon, category: 'organize' },
  { name: 'Remove Pages', href: '/tools/remove-pages', description: 'Delete unwanted pages from a PDF', icon: OrganizePdfIcon, category: 'organize' },
  { name: 'Extract Pages', href: '/tools/extract-pages', description: 'Save selected pages as a new PDF', icon: SplitPdfIcon, category: 'organize' },
  { name: 'Compare PDF', href: '/tools/compare-pdf', description: 'Compare two PDF files', icon: ComparePdfIcon, category: 'organize' },

  { name: 'Compress PDF', href: '/tools/compress', description: 'Reduce PDF file size', icon: CompressPdfIcon, category: 'optimize' },
  { name: 'Repair PDF', href: '/tools/repair-pdf', description: 'Fix corrupted PDF files', icon: RepairPdfIcon, category: 'optimize' },
  { name: 'PDF to PDF/A', href: '/tools/pdf-to-pdfa', description: 'Convert to archival PDF format', icon: PdfToPdfaIcon, category: 'optimize' },

  { name: 'Word to PDF', href: '/tools/word-to-pdf', description: 'Convert Word documents to PDF', icon: WordToPdfIcon, category: 'convert' },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', description: 'Convert PDF to editable Word', icon: PdfToWordIcon, category: 'convert' },
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', description: 'Convert images to PDF', icon: JpgToPdfIcon, category: 'convert' },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', description: 'Extract images from PDFs', icon: PdfToJpgIcon, category: 'convert' },
  { name: 'PowerPoint to PDF', href: '/tools/powerpoint-to-pdf', description: 'Convert PPT/PPTX to PDF', icon: PowerPointToPdfIcon, category: 'convert' },
  { name: 'PDF to PowerPoint', href: '/tools/pdf-to-powerpoint', description: 'Convert PDF to PPT/PPTX', icon: PdfToPowerPointIcon, category: 'convert' },
  { name: 'Excel to PDF', href: '/tools/excel-to-pdf', description: 'Convert XLS/XLSX to PDF', icon: ExcelToPdfIcon, category: 'convert' },
  { name: 'PDF to Excel', href: '/tools/pdf-to-excel', description: 'Extract PDF data to Excel', icon: PdfToExcelIcon, category: 'convert' },
  { name: 'HTML to PDF', href: '/tools/html-to-pdf', description: 'Convert webpages to PDF', icon: HtmlToPdfIcon, category: 'convert' },
  { name: 'Scan to PDF', href: '/tools/scan-to-pdf', description: 'Scan documents to PDF', icon: ScanToPdfIcon, category: 'convert' },

  { name: 'Rotate PDF', href: '/tools/rotate-pdf', description: 'Rotate PDF pages', icon: RotatePdfIcon, category: 'edit' },
  { name: 'Add Page Numbers', href: '/tools/page-numbers', description: 'Insert page numbers into PDFs', icon: PageNumbersIcon, category: 'edit' },
  { name: 'Watermark', href: '/tools/watermark', description: 'Add text or image watermark', icon: WatermarkIcon, category: 'edit' },
  { name: 'Crop PDF', href: '/tools/crop-pdf', description: 'Crop PDF margins', icon: CropPdfIcon, category: 'edit' },
  { name: 'Edit PDF', href: '/tools/edit-pdf', description: 'Add text, images, and shapes', icon: EditPdfIcon, category: 'edit' },
  { name: 'Remove Watermark', href: '/tools/remove-watermark', description: 'Strip logos and watermarks from files', icon: RemoveWatermarkIcon, category: 'edit' },
  { name: 'Redact PDF', href: '/tools/redact-pdf', description: 'Permanently remove sensitive text', icon: RedactPdfIcon, category: 'edit' },
  { name: 'Sign PDF', href: '/tools/sign-pdf', description: 'Add digital signatures', icon: SignPdfIcon, category: 'edit' },

  { name: 'Unlock PDF', href: '/tools/unlock-pdf', description: 'Remove PDF password protection', icon: UnlockPdfIcon, category: 'security' },
  { name: 'Protect PDF', href: '/tools/protect-pdf', description: 'Encrypt PDF with password', icon: ProtectPdfIcon, category: 'security' },

  { name: 'AI Summarizer', href: '/tools/summarize-pdf', description: 'Summarize PDF content with AI', icon: SummarizePdfIcon, category: 'ai' },
  { name: 'Translate PDF', href: '/tools/translate-pdf', description: 'Translate PDF with AI', icon: TranslatePdfIcon, category: 'ai' },
  { name: 'OCR PDF', href: '/tools/ocr-pdf', description: 'Make scanned PDFs searchable', icon: OcrPdfIcon, category: 'ai' },
  { name: 'PDF to Markdown', href: '/tools/pdf-to-markdown', description: 'Convert PDF to Markdown', icon: PdfToMarkdownIcon, category: 'convert' },
];

const featureStats = [
  { id: 'tools', title: '30+ Free Tools', subtitle: 'Complete utility suite', icon: Sliders, bg: 'bg-red-50 text-brand-red', iconBg: 'bg-red-500/10' },
  { id: 'privacy', title: '100% Private', subtitle: 'Files never leave device', icon: ShieldCheck, bg: 'bg-emerald-50 text-emerald-600', iconBg: 'bg-emerald-500/10' },
  { id: 'uploads', title: 'No Uploads', subtitle: 'Browser-based processing', icon: LockKeyhole, bg: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-500/10' },
  { id: 'cost', title: 'No Limits', subtitle: 'Use tools as much as you want', icon: Sparkles, bg: 'bg-purple-50 text-purple-600', iconBg: 'bg-purple-500/10' },
];

const whyFeatures = [
  { id: 'private', title: '100% Private', desc: 'Files are processed locally on your device. Nothing is uploaded to any server.', icon: LockKeyhole, iconBg: 'bg-green-50 text-green-600' },
  { id: 'ai', title: 'AI-Powered', desc: 'Smart document parsing, AI editing, OCR, and automated exam generation for educators.', icon: BrainCircuit, iconBg: 'bg-purple-50 text-purple-600' },
  { id: 'edu', title: 'Educator Focused', desc: 'Purpose-built tools for teachers: question banks, exam headers, lesson plans, and paper management.', icon: School, iconBg: 'bg-blue-50 text-blue-600' },
  { id: 'fast', title: 'Lightning Fast', desc: 'Browser-native processing means no waiting for uploads or downloads. Instant results.', icon: Zap, iconBg: 'bg-amber-50 text-amber-600' },
];

const homeFaqs = [
  {
    q: 'Are my files safe and kept local without uploading?',
    a: 'Yes, 100%. PDF Tools Pro runs natively inside your web browser. Files are processed locally on your device without ever being uploaded to remote servers.',
  },
  {
    q: 'How does this compare to iLovePDF or Smallpdf?',
    a: 'Unlike traditional online converters that limit daily tasks or enforce cloud uploads, PDF Tools Pro offers unlimited local processing with no paywalls or limits.',
  },
  {
    q: 'Do I need to sign up to use free tools?',
    a: 'No. All free tools work instantly without registration. Sign up only if you want access to premium AI-powered teacher tools.',
  },
  {
    q: 'What premium tools are available?',
    a: 'Premium tools include AI PDF Editor, Exam Header Customizer, OCR + Organize PDF, Question Bank, Papers Bank, Exam Generator, and Lesson Plans Master.',
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 text-center">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-brand-dark tracking-tight leading-[1.1] mb-5">
            The complete PDF toolkit
            <br />
            <span className="text-brand-red">for everyone</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Merge, split, compress, convert, and edit PDFs with our free online tools.
            Your files are processed locally in your browser and never leave your device.
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 30+ PDF tools..."
              className="w-full pl-12 pr-11 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm shadow-sm focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-red-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 text-gray-400 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="pt-8 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-50 text-brand-red rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-lg text-brand-dark mb-1">No tools found</h3>
              <p className="text-gray-400 text-sm max-w-sm mb-6">
                We couldn&apos;t find any PDF utilities matching &quot;{searchQuery}&quot;.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-brand-red text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/10"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTools.map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group flex flex-col items-start bg-white rounded-2xl border border-gray-200 p-5 transition-all duration-200 hover:border-brand-red/40 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gray transition-colors group-hover:bg-red-50">
                    <tool.icon className="w-10 h-10" />
                  </div>
                  <h3 className="text-base font-bold text-brand-dark transition-colors group-hover:text-brand-red">
                    {tool.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 leading-snug line-clamp-2">
                    {tool.description}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featureStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.id} className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${stat.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-brand-dark leading-tight">
                      {stat.title}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium leading-tight">
                      {stat.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why section */}
      <section className="bg-white border-t border-b border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-brand-red rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Next-Gen Technology
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mt-4">
              Why PDF Tools Pro?
            </h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Unlike traditional online converters that limit daily tasks or enforce cloud uploads, PDF Tools Pro offers unlimited local processing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {whyFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.id} className="bg-brand-gray/60 p-6 rounded-2xl border border-gray-100/80 space-y-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display font-bold text-base text-brand-dark">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Everything you need to know about processing PDFs with PDF Tools Pro:
            </p>
          </div>

          <div className="space-y-3">
            {homeFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-display font-bold text-sm text-brand-dark flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-red flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="bg-white border-t border-gray-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-full text-xs font-bold tracking-wide mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Premium Teacher Workspace</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
            AI-Powered Tools for Educators
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-8">
            Unlock AI PDF editing, exam header customization, OCR, question banks, exam generation, and lesson plans.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10"
          >
            <Sparkles className="w-5 h-5" />
            Upgrade to Premium
          </Link>
        </div>
      </section>
    </>
  );
}
