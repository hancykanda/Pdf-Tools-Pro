'use client';

import { useState, useRef } from 'react';
import { ShieldCheck, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setOriginalSize(selected.size);
      setCompressedSize(0);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleCompress = async () => {
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

      const res = await fetch('/api/tools/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Compression failed');

      // Estimate compressed size from base64 length
      const estimatedSize = Math.floor((data.dataUrl.length - `data:application/pdf;base64,`.length) * 0.75);
      setCompressedSize(estimatedSize);

      const link = document.createElement('a');
      link.href = data.dataUrl;
      link.download = 'compressed.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to compress PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const savings = originalSize > 0 && compressedSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-red text-white flex items-center justify-center rounded-xl shadow-lg shadow-red-500/10">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-dark">Compress PDF</h1>
          <p className="text-gray-500 text-sm">Reduce PDF file size while preserving quality.</p>
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
        <p className="text-gray-400 text-sm">We'll compress it while preserving quality</p>
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
          <h3 className="font-display font-semibold text-brand-dark mb-4">File Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Original Size</p>
              <p className="text-lg font-bold text-gray-900">{formatSize(originalSize)}</p>
            </div>
            {compressedSize > 0 && (
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Compressed Size</p>
                <p className="text-lg font-bold text-green-700">{formatSize(compressedSize)}</p>
                <p className="text-xs text-green-600 mt-1">Saved {savings}%</p>
              </div>
            )}
          </div>

          <button
            onClick={handleCompress}
            disabled={isProcessing}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Compressing...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Compress PDF
              </>
            )}
          </button>
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
          PDF compressed successfully! Your download should begin automatically.
        </div>
      )}
    </div>
  );
}