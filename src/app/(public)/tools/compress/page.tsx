'use client';

import { useState } from 'react';
import { ShieldCheck, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
    ToolSecondaryButton,
  ToolAlert,
} from '@/components/layout/ToolPageShell';

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleFile = (selected: FileList | null) => {
    const file = selected?.[0] || null;
    if (file && file.type === 'application/pdf') {
      setFile(file);
      setOriginalSize(file.size);
      setCompressedSize(0);
      setError(null);
      setSuccess(false);
    setResultData(null);
    setCountdown(0);
    } else {
      setError('Please upload a valid PDF file');
    }
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

      const estimatedSize = Math.floor((data.dataUrl.length - `data:application/pdf;base64,`.length) * 0.75);
      setCompressedSize(estimatedSize);

      setResultData(data.dataUrl);
      setSuccess(true);
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF');
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

  const savings = originalSize > 0 && compressedSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : '0.0';


  const startCountdown = () => {
    let remaining = 10;
    setCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    return timer;
  };

  const handleDownload = () => {
    if (!resultData || countdown > 0) return;
    const link = document.createElement('a');
    link.href = resultData;
    link.download = 'compressed.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ToolPageShell title="Compress PDF" description="Reduce PDF file size while preserving quality." icon={ShieldCheck}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop a PDF file"
              subtitle="We'll compress it while preserving quality"
              accept="application/pdf"
              onFiles={handleFile}
            />
          ) : (
            <ToolCard>
              <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">File Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-gray-500 mb-1">Original Size</p>
                  <p className="text-lg font-bold text-gray-900">{formatSize(originalSize)}</p>
                </div>
                {compressedSize > 0 && (
                  <div className="p-4 bg-green-50 rounded-2xl">
                    <p className="text-xs text-gray-500 mb-1">Compressed Size</p>
                    <p className="text-lg font-bold text-green-700">{formatSize(compressedSize)}</p>
                    <p className="text-xs text-green-600 mt-1">Saved {savings}%</p>
                  </div>
                )}
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
              PDF compressed successfully!
            </ToolAlert>
          )}
          {success && resultData && (
            <ToolCard>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-lg text-brand-dark">Result</h3>
                <ToolSecondaryButton onClick={handleDownload} className="!w-auto" disabled={countdown > 0}>
                  <Download className="w-4 h-4" />
                  {countdown > 0 ? `Wait ${countdown}s` : 'Download'}
                </ToolSecondaryButton>
              </div>
            </ToolCard>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Compression Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Reduce PDF file size while preserving quality. Upload your PDF and we&apos;ll compress it for you.
            </p>
          </div>

          <ToolPrimaryButton onClick={handleCompress} disabled={!file} loading={isProcessing}>
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Compress PDF</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
