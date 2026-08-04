'use client';

import { useState, useRef } from 'react';
import { FileStack, Upload, Trash2, ArrowUp, ArrowDown, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

export default function MergePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const pdfFiles = Array.from(selected).filter((f) => f.type === 'application/pdf');
    setFiles((prev) => [...prev, ...pdfFiles]);
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
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

      const res = await fetch('/api/tools/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: readFiles }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Merge failed');

      const link = document.createElement('a');
      link.href = data.dataUrl;
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Merge PDF" description="Combine multiple PDF documents into a single file." icon={FileStack} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop PDF files"
          subtitle="Select 2 or more PDF files to merge"
          accept="application/pdf"
          multiple
          onFiles={handleFiles}
        />

        {files.length > 0 && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-brand-dark">Selected Files ({files.length})</h3>
              <button onClick={() => setFiles([])} className="text-xs font-bold text-red-500 hover:text-red-700">
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-gray-500 w-6 text-center">{index + 1}</span>
                    <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-40">
                      <ArrowUp className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => handleMoveDown(index)} disabled={index === files.length - 1} className="p-1.5 hover:bg-gray-200 rounded-lg disabled:opacity-40">
                      <ArrowDown className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => handleRemove(index)} className="p-1.5 hover:bg-red-100 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
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
            PDFs merged successfully! Your download should begin automatically.
          </Alert>
        )}

        <ActionButton onClick={handleMerge} disabled={files.length < 2} loading={isProcessing}>
          <Download className="w-5 h-5" />
          Merge PDFs
        </ActionButton>
      </Section>
    </PageContainer>
  );
}