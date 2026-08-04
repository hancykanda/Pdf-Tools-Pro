'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Download, RefreshCw, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = (selected: File | null) => {
    if (selected && (selected.name.endsWith('.docx') || selected.name.endsWith('.doc'))) {
      setFile(selected);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please upload a valid Word document (.docx or .doc)');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files[0] || null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsConverting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/tools/word-to-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'converted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to convert Word to PDF');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Word to PDF" description="Convert Microsoft Word documents to PDF." icon={FileText} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop a Word document"
          subtitle="Supports .docx and .doc files"
          accept=".docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onFiles={(files) => handleFile(files?.[0] || null)}
        />

        {file && (
          <Card className="mb-6">
            <h3 className="font-display font-semibold text-brand-dark mb-4">Selected File</h3>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
              <span className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
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
            Word document converted to PDF successfully!
          </Alert>
        )}

        <ActionButton onClick={handleConvert} disabled={!file} loading={isConverting}>
          <Download className="w-5 h-5" />
          Convert to PDF
        </ActionButton>
      </Section>
    </PageContainer>
  );
}