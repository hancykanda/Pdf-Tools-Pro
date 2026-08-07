'use client';

import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { getRelatedTools } from '@/lib/toolCategories';

interface RelatedToolsProps {
  currentTool: string;
  title?: string;
}

const toolDisplayNames: Record<string, string> = {
  'word-to-pdf': 'Word to PDF',
  'excel-to-pdf': 'Excel to PDF',
  'powerpoint-to-pdf': 'PowerPoint to PDF',
  'html-to-pdf': 'HTML to PDF',
  'jpg-to-pdf': 'JPG to PDF',
  'scan-to-pdf': 'Scan to PDF',
  'pdf-to-word': 'PDF to Word',
  'pdf-to-excel': 'PDF to Excel',
  'pdf-to-powerpoint': 'PDF to PowerPoint',
  'pdf-to-jpg': 'PDF to JPG',
  'pdf-to-markdown': 'PDF to Markdown',
  'pdf-to-pdfa': 'PDF to PDF/A',
  'edit-pdf': 'Edit PDF',
  'watermark': 'Watermark',
  'page-numbers': 'Add Page Numbers',
  'crop-pdf': 'Crop PDF',
  'rotate-pdf': 'Rotate PDF',
  'redact-pdf': 'Redact PDF',
  'sign-pdf': 'Sign PDF',
  'protect-pdf': 'Protect PDF',
  'unlock-pdf': 'Unlock PDF',
  'repair-pdf': 'Repair PDF',
  'compress-pdf': 'Compress PDF',
  'merge': 'Merge PDF',
  'split': 'Split PDF',
  'organize-pdf': 'Organize PDF',
  'remove-pages': 'Remove Pages',
  'extract-pages': 'Extract Pages',
  'compare-pdf': 'Compare PDF',
  'summarize-pdf': 'AI Summarizer',
  'translate-pdf': 'Translate PDF',
  'ocr-pdf': 'OCR PDF',
};

const toolDescriptions: Record<string, string> = {
  'word-to-pdf': 'Convert Word documents to PDF format',
  'excel-to-pdf': 'Convert Excel spreadsheets to PDF',
  'powerpoint-to-pdf': 'Convert presentations to PDF',
  'html-to-pdf': 'Convert HTML pages to PDF documents',
  'jpg-to-pdf': 'Convert images to PDF documents',
  'scan-to-pdf': 'Convert scanned images to searchable PDF',
  'pdf-to-word': 'Extract text from PDF to Word format',
  'pdf-to-excel': 'Extract tables from PDF to Excel',
  'pdf-to-powerpoint': 'Convert PDF to PowerPoint presentations',
  'pdf-to-jpg': 'Convert PDF pages to JPG images',
  'pdf-to-markdown': 'Convert PDF to Markdown format',
  'pdf-to-pdfa': 'Convert PDF to PDF/A for archiving',
  'edit-pdf': 'Add text and shapes to PDF documents',
  'watermark': 'Add watermarks to your PDF files',
  'page-numbers': 'Add page numbers to your PDF',
  'crop-pdf': 'Crop margins and adjust boundaries',
  'rotate-pdf': 'Rotate PDF pages to any angle',
  'redact-pdf': 'Permanently remove sensitive text',
  'sign-pdf': 'Add digital signatures to PDFs',
  'protect-pdf': 'Encrypt PDFs with password protection',
  'unlock-pdf': 'Remove password protection from PDFs',
  'repair-pdf': 'Fix corrupted PDF files',
  'compress-pdf': 'Reduce PDF file size',
  'merge': 'Combine multiple PDFs into one',
  'split': 'Extract pages from PDF files',
  'organize-pdf': 'Reorder and manage PDF pages',
  'remove-pages': 'Delete unwanted pages from a PDF',
  'extract-pages': 'Save selected pages as a new PDF',
  'compare-pdf': 'Find differences between two PDFs',
  'summarize-pdf': 'Generate AI-powered summaries',
  'translate-pdf': 'Translate PDF content to other languages',
  'ocr-pdf': 'Make scanned PDFs searchable',
};

export function RelatedTools({ currentTool, title = 'Recommended Tools' }: RelatedToolsProps) {
  const relatedSlugs = getRelatedTools(currentTool, 4);

  if (relatedSlugs.length === 0) return null;

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-50 text-brand-red rounded-xl">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="font-display font-bold text-xl text-brand-dark">{title}</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {relatedSlugs.map((slug) => (
          <Link
            key={slug}
            href={`/tools/${slug}`}
            className="group block p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <h4 className="font-semibold text-brand-dark group-hover:text-brand-red transition-colors">
                {toolDisplayNames[slug] || slug}
              </h4>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-red group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {toolDescriptions[slug] || ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
