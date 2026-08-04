'use client';

import { useState, useRef, useEffect } from 'react';
import { FileImage, Upload, Download, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageContainer, Section, PageHeader, UploadZone, ActionButton, Alert, Card } from '@/components/layout/PageShell';

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = (window as any).pdfjsLib;
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  const handleFile = (selected: File | null) => {
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setImages([]);
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

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) throw new Error('PDF.js is not loaded yet. Please wait a moment and try again.');

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const cleanBase64 = base64.split(',')[1] || base64;
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      const renderedImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        renderedImages.push(canvas.toDataURL('image/jpeg', 0.92));
      }

      setImages(renderedImages);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to convert PDF to images');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="PDF to JPG" description="Convert PDF pages to JPG images." icon={FileImage} />

        <UploadZone
          icon={Upload}
          title="Click to upload or drag and drop a PDF file"
          subtitle="Each page will be converted to a JPG image"
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

            <ActionButton onClick={handleConvert} loading={isProcessing}>
              <Download className="w-5 h-5" />
              Convert to Images
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
            Converted {images.length} page(s) to images.
          </Alert>
        )}

        {images.length > 0 && (
          <Card>
            <h3 className="font-display font-semibold text-brand-dark mb-4">Converted Images</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((src, index) => (
                <div key={index} className="relative">
                  <img
                    src={src}
                    alt={`Page ${index + 1}`}
                    className="w-full h-40 object-cover rounded-xl border border-gray-100"
                  />
                  <a
                    href={src}
                    download={`page-${index + 1}.jpg`}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-medium opacity-0 hover:opacity-100 transition-opacity rounded-xl"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Section>
    </PageContainer>
  );
}