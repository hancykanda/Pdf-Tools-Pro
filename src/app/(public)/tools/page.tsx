import Link from 'next/link';
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

const categories = [
  {
    id: 'organize',
    name: 'Organize',
    tools: [
      { name: 'Merge PDF', href: '/tools/merge', description: 'Combine multiple PDFs into one', icon: MergePdfIcon },
      { name: 'Split PDF', href: '/tools/split', description: 'Extract pages from PDFs', icon: SplitPdfIcon },
      { name: 'Organize PDF', href: '/tools/organize-pdf', description: 'Reorder, rotate, or delete pages', icon: OrganizePdfIcon },
      { name: 'Remove Pages', href: '/tools/remove-pages', description: 'Delete unwanted pages from a PDF', icon: OrganizePdfIcon },
      { name: 'Extract Pages', href: '/tools/extract-pages', description: 'Save selected pages as a new PDF', icon: SplitPdfIcon },
      { name: 'Compare PDF', href: '/tools/compare-pdf', description: 'Compare two PDF files', icon: ComparePdfIcon },
    ],
  },
  {
    id: 'optimize',
    name: 'Optimize',
    tools: [
      { name: 'Compress PDF', href: '/tools/compress', description: 'Reduce PDF file size', icon: CompressPdfIcon },
      { name: 'Repair PDF', href: '/tools/repair-pdf', description: 'Fix corrupted PDF files', icon: RepairPdfIcon },
      { name: 'PDF to PDF/A', href: '/tools/pdf-to-pdfa', description: 'Convert to archival PDF format', icon: PdfToPdfaIcon },
    ],
  },
  {
    id: 'convert',
    name: 'Convert',
    tools: [
      { name: 'Word to PDF', href: '/tools/word-to-pdf', description: 'Convert Word documents to PDF', icon: WordToPdfIcon },
      { name: 'PDF to Word', href: '/tools/pdf-to-word', description: 'Convert PDF to editable Word', icon: PdfToWordIcon },
      { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', description: 'Convert images to PDF', icon: JpgToPdfIcon },
      { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', description: 'Extract images from PDFs', icon: PdfToJpgIcon },
      { name: 'PowerPoint to PDF', href: '/tools/powerpoint-to-pdf', description: 'Convert PPT/PPTX to PDF', icon: PowerPointToPdfIcon },
      { name: 'PDF to PowerPoint', href: '/tools/pdf-to-powerpoint', description: 'Convert PDF to PPT/PPTX', icon: PdfToPowerPointIcon },
      { name: 'Excel to PDF', href: '/tools/excel-to-pdf', description: 'Convert XLS/XLSX to PDF', icon: ExcelToPdfIcon },
      { name: 'PDF to Excel', href: '/tools/pdf-to-excel', description: 'Extract PDF data to Excel', icon: PdfToExcelIcon },
      { name: 'HTML to PDF', href: '/tools/html-to-pdf', description: 'Convert webpages to PDF', icon: HtmlToPdfIcon },
      { name: 'Scan to PDF', href: '/tools/scan-to-pdf', description: 'Scan documents to PDF', icon: ScanToPdfIcon },
      { name: 'PDF to Markdown', href: '/tools/pdf-to-markdown', description: 'Convert PDF to Markdown', icon: PdfToMarkdownIcon },
      { name: 'OCR PDF', href: '/tools/ocr-pdf', description: 'Make scanned PDFs searchable', icon: OcrPdfIcon },
    ],
  },
  {
    id: 'edit',
    name: 'Edit',
    tools: [
      { name: 'Rotate PDF', href: '/tools/rotate-pdf', description: 'Rotate PDF pages', icon: RotatePdfIcon },
      { name: 'Add Page Numbers', href: '/tools/page-numbers', description: 'Insert page numbers into PDFs', icon: PageNumbersIcon },
      { name: 'Watermark', href: '/tools/watermark', description: 'Add text or image watermark', icon: WatermarkIcon },
      { name: 'Crop PDF', href: '/tools/crop-pdf', description: 'Crop PDF margins', icon: CropPdfIcon },
      { name: 'Edit PDF', href: '/tools/edit-pdf', description: 'Add text, images, and shapes', icon: EditPdfIcon },
      { name: 'Remove Watermark', href: '/tools/remove-watermark', description: 'Strip logos and watermarks from files', icon: RemoveWatermarkIcon },
      { name: 'Redact PDF', href: '/tools/redact-pdf', description: 'Permanently remove sensitive text', icon: RedactPdfIcon },
      { name: 'Sign PDF', href: '/tools/sign-pdf', description: 'Add digital signatures', icon: SignPdfIcon },
    ],
  },
  {
    id: 'security',
    name: 'Security',
    tools: [
      { name: 'Unlock PDF', href: '/tools/unlock-pdf', description: 'Remove PDF password protection', icon: UnlockPdfIcon },
      { name: 'Protect PDF', href: '/tools/protect-pdf', description: 'Encrypt PDF with password', icon: ProtectPdfIcon },
      { name: 'AI Summarizer', href: '/tools/summarize-pdf', description: 'Summarize PDF content with AI', icon: SummarizePdfIcon },
      { name: 'Translate PDF', href: '/tools/translate-pdf', description: 'Translate PDF with AI', icon: TranslatePdfIcon },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
            Free PDF Tools
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            All tools run locally in your browser. Your files never leave your device.
          </p>
        </div>

        <div className="space-y-16">
          {categories.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-24">
              <div className="mb-6">
                <h2 className="font-display font-bold text-2xl text-brand-dark mb-2">
                  {category.name}
                </h2>
                <p className="text-gray-500 text-sm">
                  {category.id === 'organize' && 'Merge, split, and organize your PDF files'}
                  {category.id === 'optimize' && 'Compress, repair, and optimize your PDFs'}
                  {category.id === 'convert' && 'Convert PDFs to and from popular formats'}
                  {category.id === 'edit' && 'Edit, annotate, and enhance your PDFs'}
                  {category.id === 'security' && 'Protect, unlock, and analyze your PDFs'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.tools.map((tool) => (
                  <Link
                    key={tool.name}
                    href={tool.href}
                    className="block bg-white rounded-2xl border border-gray-200 p-5 transition-all duration-200 hover:border-gray-400 hover:shadow-sm"
                  >
                    <div className="mb-3">
                      <tool.icon />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {tool.name}
                    </h3>
                    <p className="text-sm text-gray-500 leading-snug line-clamp-2">
                      {tool.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
