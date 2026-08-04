'use client';

import { useState, useRef } from 'react';
import { ImageIcon, Upload, Download, RefreshCw, CheckCircle2, AlertCircle, FileImage } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

export default function JpgToPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState<'none' | 'small' | 'large'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const imageFiles = Array.from(selected).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
    setError(null);
    setSuccess(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const readFiles = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
          });
        })
      );

      const res = await fetch('/api/tools/jpg-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: readFiles, margin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Conversion failed');

      const link = document.createElement('a');
      link.href = data.dataUrl;
      link.download = 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to convert images to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="JPG to PDF" description="Convert JPG, PNG, and WebP images to PDF." icon={ImageIcon} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop images"
          subtitle="Supports JPG, PNG, WebP"
          accept="image/*"
          multiple
          onFiles={handleFiles}
        />

        {files.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-brand-dark">Selected Images ({files.length})</h3>
              <button onClick={() => setFiles([])} className="text-xs font-bold text-red-500 hover:text-red-700">
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {files.map((file, index) => (
                <div key={index} className="relative group">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-32 object-cover rounded-xl" />
                  <button
                    onClick={() => handleRemove(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Margin</label>
              <select
                value={margin}
                onChange={(e) => setMargin(e.target.value as 'none' | 'small' | 'large')}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              >
                <option value="none">No Margin</option>
                <option value="small">Small Margin</option>
                <option value="large">Large Margin</option>
              </select>
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
            Images converted to PDF successfully!
          </Alert>
        )}

        <ActionButton onClick={handleConvert} disabled={files.length === 0} loading={isProcessing}>
          <FileImage className="w-5 h-5" />
          Convert to PDF
        </ActionButton>
      </Section>
    </PageContainer>
  );
}