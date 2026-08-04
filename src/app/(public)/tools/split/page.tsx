'use client';

import { useState } from 'react';
import { Scissors, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolAlert,
} from '@/components/layout/ToolPageShell';

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState('1-1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const parsePageRange = (range: string, maxPages: number): number[] => {
    const indices: number[] = [];
    const parts = range.split(',').map((p) => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        for (let i = start; i <= end && i <= maxPages; i++) {
          if (i >= 1) indices.push(i - 1);
        }
      } else {
        const num = Number(part);
        if (num >= 1 && num <= maxPages) indices.push(num - 1);
      }
    }

    return [...new Set(indices)].sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const cleanBase64 = base64.split(',')[1] || base64;

      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: Buffer.from(cleanBase64, 'base64') });
      const data = await parser.getText();
      const maxPages = data.pages?.length || 1;

      const pageIndices = parsePageRange(pageRange, maxPages);
      if (pageIndices.length === 0) {
        throw new Error('Invalid page range. Please check the format.');
      }

      const res = await fetch('/api/tools/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, pageIndices }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Split failed');

      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = 'split.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell title="Split PDF" description="Extract specific pages or page ranges from your PDF." icon={Scissors}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop a PDF file"
              subtitle="Select the PDF you want to split"
              accept="application/pdf"
              onFiles={(files) => handleFile(files?.[0] || null)}
            />
          ) : (
            <ToolCard>
              <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Selected File</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-6">
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Range</label>
                <input
                  type="text"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder="e.g., 1-3, 5, 7-9"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Enter page numbers or ranges (e.g., 1-3, 5, 7-9)</p>
              </div>
            </ToolCard>
          )}

          {error && (
            <ToolAlert type="error">
              <AlertCircle className="w-4 h-4" />
              {error}
            </ToolAlert>
          )}

          {success && (
            <ToolAlert type="success">
              <CheckCircle2 className="w-4 h-4" />
              PDF split successfully! Your download should begin automatically.
            </ToolAlert>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Split Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Extract specific pages from your PDF. Use the page range input to select which pages to extract.
            </p>
          </div>

          <ToolPrimaryButton onClick={handleSplit} disabled={!file} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Split PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
