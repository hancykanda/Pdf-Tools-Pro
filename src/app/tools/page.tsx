import Link from 'next/link';
import { Zap } from 'lucide-react';
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
  { name: 'Merge PDF', href: '/tools/merge', description: 'Combine multiple PDFs into one', icon: MergePdfIcon },
  { name: 'Split PDF', href: '/tools/split', description: 'Extract pages from PDFs', icon: SplitPdfIcon },
  { name: 'Compress PDF', href: '/tools/compress', description: 'Reduce PDF file size', icon: CompressPdfIcon },
  { name: 'Word to PDF', href: '/tools/word-to-pdf', description: 'Convert Word documents to PDF', icon: WordToPdfIcon },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', description: 'Convert PDF to editable Word', icon: PdfToWordIcon },
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', description: 'Convert images to PDF', icon: JpgToPdfIcon },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', description: 'Extract images from PDFs', icon: PdfToJpgIcon },
  { name: 'PowerPoint to PDF', href: '/tools/powerpoint-to-pdf', description: 'Convert PPT/PPTX to PDF', icon: PowerPointToPdfIcon },
  { name: 'Excel to PDF', href: '/tools/excel-to-pdf', description: 'Convert XLS/XLSX to PDF', icon: ExcelToPdfIcon },
  { name: 'HTML to PDF', href: '/tools/html-to-pdf', description: 'Convert webpages to PDF', icon: HtmlToPdfIcon },
  { name: 'PDF to PowerPoint', href: '/tools/pdf-to-powerpoint', description: 'Convert PDF to PPT/PPTX', icon: PdfToPowerPointIcon },
  { name: 'PDF to Excel', href: '/tools/pdf-to-excel', description: 'Extract PDF data to Excel', icon: PdfToExcelIcon },
  { name: 'Rotate PDF', href: '/tools/rotate-pdf', description: 'Rotate PDF pages', icon: RotatePdfIcon },
  { name: 'Add Page Numbers', href: '/tools/page-numbers', description: 'Insert page numbers into PDFs', icon: PageNumbersIcon },
  { name: 'Watermark', href: '/tools/watermark', description: 'Add text or image watermark', icon: WatermarkIcon },
  { name: 'Crop PDF', href: '/tools/crop-pdf', description: 'Crop PDF margins', icon: CropPdfIcon },
  { name: 'Edit PDF', href: '/tools/edit-pdf', description: 'Add text, images, and shapes', icon: EditPdfIcon },
  { name: 'Unlock PDF', href: '/tools/unlock-pdf', description: 'Remove PDF password protection', icon: UnlockPdfIcon },
  { name: 'Protect PDF', href: '/tools/protect-pdf', description: 'Encrypt PDF with password', icon: ProtectPdfIcon },
  { name: 'Sign PDF', href: '/tools/sign-pdf', description: 'Add digital signatures', icon: SignPdfIcon },
  { name: 'Redact PDF', href: '/tools/redact-pdf', description: 'Permanently remove sensitive text', icon: RedactPdfIcon },
  { name: 'Compare PDF', href: '/tools/compare-pdf', description: 'Compare two PDF files', icon: ComparePdfIcon },
  { name: 'Organize PDF', href: '/tools/organize-pdf', description: 'Reorder, add, or delete pages', icon: OrganizePdfIcon },
  { name: 'Repair PDF', href: '/tools/repair-pdf', description: 'Fix corrupted PDF files', icon: RepairPdfIcon },
  { name: 'OCR PDF', href: '/tools/ocr-pdf', description: 'Make scanned PDFs searchable', icon: OcrPdfIcon },
  { name: 'PDF to PDF/A', href: '/tools/pdf-to-pdfa', description: 'Convert to archival PDF format', icon: PdfToPdfaIcon },
  { name: 'Scan to PDF', href: '/tools/scan-pdf', description: 'Scan documents to PDF', icon: ScanToPdfIcon },
  { name: 'AI Summarizer', href: '/tools/summarize-pdf', description: 'Summarize PDF content with AI', icon: SummarizePdfIcon },
  { name: 'Translate PDF', href: '/tools/translate-pdf', description: 'Translate PDF with AI', icon: TranslatePdfIcon },
  { name: 'PDF to Markdown', href: '/tools/pdf-to-markdown', description: 'Convert PDF to Markdown', icon: PdfToMarkdownIcon },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
            Free PDF Tools
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            All tools run locally in your browser. Your files never leave your device.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className="group relative flex flex-col bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-brand-red/30 transition-all cursor-pointer overflow-hidden transform hover:-translate-y-1.5"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-red-50 transition-colors">
                  <tool.icon className="w-6 h-6 text-brand-red" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-brand-dark group-hover:text-brand-red transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm">{tool.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 text-xs font-bold text-gray-400 group-hover:text-brand-red transition-all">
                <span>Open Tool</span>
                <Zap className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}