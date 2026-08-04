'use client';

import { useState, useRef } from 'react';
import { Scissors, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState('1-1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
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
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Get page count
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <Scissors className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">Split PDF</h1>
          <p className="text-gray-500 text-sm">Extract specific pages or page ranges from your PDF.</p>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-6"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-1">Click to upload or drag and drop a PDF file</p>
        <p className="text-gray-400 text-sm">Select the PDF you want to split</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>

      {file && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-display font-semibold text-brand-dark mb-4">Selected File</h3>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">{file.name}</span>
            <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>

          <div className="mt-4">
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
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm mb-6">
          <CheckCircle2 className="w-4 h-4" />
          PDF split successfully! Your download should begin automatically.
        </div>
      )}

      <button
        onClick={handleSplit}
        disabled={!file || isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Splitting...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Split PDF
          </>
        )}
      </button>
    </div>
  );
}