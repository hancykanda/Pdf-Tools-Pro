import React from 'react';

const icon = (file: string, alt: string): React.FC<{ className?: string }> =>
  function ToolIcon({ className }) {
    // eslint-disable-next-line @next/next/no-img-element -- static brand SVGs served from /public
    return <img src={`/ilovepdf-icons/${file}.svg`} alt={alt} className={className} />;
  };

export const MergePdfIcon = icon('merge-pdf', 'Merge PDF');
export const SplitPdfIcon = icon('split-pdf', 'Split PDF');
export const CompressPdfIcon = icon('compress-pdf', 'Compress PDF');
export const WordToPdfIcon = icon('word-to-pdf', 'Word to PDF');
export const PdfToWordIcon = icon('pdf-to-word', 'PDF to Word');
export const JpgToPdfIcon = icon('jpg-to-pdf', 'JPG to PDF');
export const PdfToJpgIcon = icon('pdf-to-jpg', 'PDF to JPG');
export const PowerPointToPdfIcon = icon('powerpoint-to-pdf', 'PowerPoint to PDF');
export const ExcelToPdfIcon = icon('excel-to-pdf', 'Excel to PDF');
export const HtmlToPdfIcon = icon('html-to-pdf', 'HTML to PDF');
export const PdfToPowerPointIcon = icon('pdf-to-powerpoint', 'PDF to PowerPoint');
export const PdfToExcelIcon = icon('pdf-to-excel', 'PDF to Excel');
export const RotatePdfIcon = icon('rotate-pdf', 'Rotate PDF');
export const PageNumbersIcon = icon('page-numbers', 'Page numbers');
export const WatermarkIcon = icon('watermark', 'Watermark');
export const CropPdfIcon = icon('crop-pdf', 'Crop PDF');
export const EditPdfIcon = icon('edit-pdf', 'Edit PDF');
export const UnlockPdfIcon = icon('unlock-pdf', 'Unlock PDF');
export const ProtectPdfIcon = icon('protect-pdf', 'Protect PDF');
export const SignPdfIcon = icon('sign-pdf', 'Sign PDF');
export const RedactPdfIcon = icon('redact-pdf', 'Redact PDF');
export const ComparePdfIcon = icon('compare-pdf', 'Compare PDF');
export const OrganizePdfIcon = icon('organize-pdf', 'Organize PDF');
export const RepairPdfIcon = icon('repair-pdf', 'Repair PDF');
export const OcrPdfIcon = icon('ocr-pdf', 'OCR PDF');
export const PdfToPdfaIcon = icon('pdf-to-pdf-a', 'PDF to PDF/A');
export const ScanToPdfIcon = icon('scan-to-pdf', 'Scan to PDF');
export const SummarizePdfIcon = icon('ai-summarizer', 'AI Summarizer');
export const TranslatePdfIcon = icon('translate-pdf', 'Translate PDF');
export const PdfToMarkdownIcon = icon('pdf-to-markdown', 'PDF to Markdown');
