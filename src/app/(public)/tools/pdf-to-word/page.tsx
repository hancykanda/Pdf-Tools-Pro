'use client';

import { useState, useRef } from 'react';
import { FileEdit, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setText('');
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

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const cleanBase64 = base64.split(',')[1] || base64;
      const res = await fetch('/api/tools/pdf-to-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: cleanBase64 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setText(data.text || '');
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadWord = () => {
    if (!text) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${file?.name?.replace(/\.[^/.]+$/, '') || 'document'}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333333; margin: 1in; }
          h1 { color: #1E3A8A; font-family: 'Georgia', serif; font-size: 18pt; margin-bottom: 12pt; }
          p { margin-bottom: 10pt; }
        </style>
      </head>
      <body>
        ${text.split('\n').filter((p) => p.trim() !== '').map((p) => `<p>${p}</p>`).join('\n')}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file?.name?.replace(/\.[^/.]+$/, '') || 'document'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="PDF to Word" description="Extract text from PDF and download as Word document." icon={FileEdit} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop a PDF file"
          subtitle="Text will be extracted and formatted for Word"
          accept="application/pdf"
          onFiles={(files) => handleFile(files?.[0] || null)}
        />

        {file && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-brand-dark">Selected File</h3>
              <ActionButton onClick={handleExtract} loading={isExtracting} className="!w-auto">
                {isExtracting ? 'Extracting...' : 'Extract Text'}
              </ActionButton>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-medium text-gray-700">{file.name}</span>
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
            Text extracted successfully!
          </Alert>
        )}

        {text && (
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-brand-dark">Extracted Text</h3>
              <ActionButton onClick={handleDownloadWord} variant="secondary" className="!w-auto">
                <Download className="w-4 h-4" />
                Download Word
              </ActionButton>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{text}</pre>
            </div>
          </Card>
        )}
      </Section>
    </PageContainer>
  );
}