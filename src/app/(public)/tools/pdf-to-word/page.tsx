'use client';

import { useState } from 'react';
import { FileEdit, Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolSecondaryButton,
  ToolAlert,
} from '@/components/layout/ToolPageShell';

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setText('');
      setError(null);
      setSuccess(false);
      setCountdown(0);
    } else {
      setError('Please upload a valid PDF file');
    }
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
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownloadWord = () => {
    if (!text || countdown > 0) return;

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

  return (
    <ToolPageShell title="PDF to Word" description="Extract text from PDF and download as Word document." icon={FileEdit} popular>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop a PDF file"
              subtitle="Text will be extracted and formatted for Word"
              accept="application/pdf"
              onFiles={(files) => handleFile(files?.[0] || null)}
            />
          ) : (
            <ToolCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg text-brand-dark">Selected File</h3>
                <ToolPrimaryButton onClick={handleExtract} loading={isExtracting} className="!w-auto">
                  {isExtracting ? 'Extracting...' : 'Extract Text'}
                </ToolPrimaryButton>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="text-sm font-medium text-gray-700">{file.name}</span>
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
              Text extracted successfully!
            </ToolAlert>
          )}


          {text && (
            <ToolCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg text-brand-dark">Extracted Text</h3>
                <ToolSecondaryButton onClick={handleDownloadWord} className="!w-auto" disabled={countdown > 0}>
                  <Download className="w-4 h-4" />
                  {countdown > 0 ? `Wait ${countdown}s` : 'Download Word'}
                </ToolSecondaryButton>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{text}</pre>
              </div>
            </ToolCard>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Extraction Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Extract text content from your PDF and download it as a Word document.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
