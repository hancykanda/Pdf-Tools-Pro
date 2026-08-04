'use client';

import { useState, useRef } from 'react';
import { Scissors, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0] || null);
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
    } catch (err: any) {
      setError(err.message || 'Failed to split PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Split PDF" description="Extract specific pages or page ranges from your PDF." icon={Scissors} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop a PDF file"
          subtitle="Select the PDF you want to split"
          accept="application/pdf"
          onFiles={(files) => handleFile(files?.[0] || null)}
        />

        {file && (
          <Card className="mb-6">
            <h3 className="font-display font-semibold text-brand-dark mb-4">Selected File</h3>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-4">
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
          </Card>
        )}

        {error && (
          <Alert type="error">
            <AlertCircle className="w-4 h-4" />
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success">
            <CheckCircle2 className="w-4 h-4" />
            PDF split successfully! Your download should begin automatically.
          </Alert>
        )}

        <ActionButton onClick={handleSplit} disabled={!file} loading={isProcessing}>
          <Download className="w-5 h-5" />
          Split PDF
        </ActionButton>
      </Section>
    </PageContainer>
  );
}