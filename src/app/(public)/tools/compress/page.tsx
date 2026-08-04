'use client';

import { useState, useRef } from 'react';
import { ShieldCheck, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = (selected: FileList | null) => {
    const file = selected?.[0] || null;
    if (file && file.type === 'application/pdf') {
      setFile(file);
      setOriginalSize(file.size);
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
    handleFile(e.dataTransfer.files);
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

  const savings = originalSize > 0 && compressedSize > 0 ? ((1 - compressedSize / originalSize) * 100).toFixed(1) : '0.0';

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Compress PDF" description="Reduce PDF file size while preserving quality." icon={ShieldCheck} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop a PDF file"
          subtitle="We'll compress it while preserving quality"
          accept="application/pdf"
          onFiles={handleFile}
        />

        {file && (
          <Card className="mb-6">
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

            <ActionButton onClick={handleCompress} loading={isProcessing} className="mt-4">
              <ShieldCheck className="w-5 h-5" />
              Compress PDF
            </ActionButton>
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
            PDF compressed successfully! Your download should begin automatically.
          </Alert>
        )}
      </Section>
    </PageContainer>
  );
}