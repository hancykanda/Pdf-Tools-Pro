'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, Sparkles, Download, Loader2, GripVertical } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

export default function OcrOrganizePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ url?: string; text?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (selected: FileList | null) => {
    if (!selected?.[0]) return;
    const f = selected[0];
    setFile(f);
    setError(null);
    setResult(null);
    setJobId(null);
    setStatus(null);

    if (f.type === 'application/pdf') {
      const arrayBuffer = await f.arrayBuffer();
      const { PDFDocument } = await import('pdf-lib');
      const pdf = await PDFDocument.load(Buffer.from(arrayBuffer));
      const count = pdf.getPages().length;
      setPages(Array.from({ length: count }, (_, i) => i + 1));
    } else {
      setPages([1]);
    }
  };

  const movePage = (index: number, direction: -1 | 1) => {
    setPages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tool', 'ocr');
      formData.append('pageOrder', JSON.stringify(pages));

      const res = await fetch('/api/premium/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setJobId(data.jobId);
      setStatus('queued');
      pollJob(data.jobId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start OCR');
      setLoading(false);
    }
  };

  const pollJob = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/premium/jobs/${id}/status`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Job status failed');

        setStatus(data.state);
        if (data.state === 'completed') {
          clearInterval(interval);
          setResult({
            url: `/api/premium/files/${data.result?.objectName || ''}`,
            text: data.result?.text || '',
          });
          setLoading(false);
        } else if (data.state === 'failed') {
          clearInterval(interval);
          setError(data.failedReason || 'Job failed');
          setLoading(false);
        }
      } catch (err: unknown) {
        clearInterval(interval);
        setError(err instanceof Error ? err.message : 'Job polling failed');
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="OCR + Organize PDF" description="Scan, recognize, and reorganize documents." icon={FileText} />

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-brand-dark">How it works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Upload</h4>
              <p className="text-sm text-gray-600">Upload a scanned PDF or image.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">OCR</h4>
              <p className="text-sm text-gray-600">Gemini Vision extracts text and structure.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Organize</h4>
              <p className="text-sm text-gray-600">Reorder pages and export a clean PDF.</p>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-4"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/*"
              className="absolute w-px h-px overflow-hidden opacity-0"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Upload className="w-10 h-10 text-brand-red mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">
              {file ? file.name : 'Click to upload or drag and drop a file'}
            </p>
            <p className="text-gray-400 text-sm">Supports PDF, JPG, PNG</p>
          </div>

          {pages.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Page Order</h4>
              <div className="flex flex-wrap gap-2">
                {pages.map((page, index) => (
                  <div
                    key={page}
                    className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => movePage(index, -1)}
                      disabled={index === 0}
                      className="text-gray-500 hover:text-brand-red disabled:opacity-30"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-700">{page}</span>
                    <button
                      type="button"
                      onClick={() => movePage(index, 1)}
                      disabled={index === pages.length - 1}
                      className="text-gray-500 hover:text-brand-red disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ActionButton
            onClick={handleProcess}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Run OCR + Organize
              </>
            )}
          </ActionButton>

          {status && (
            <p className="text-xs text-gray-500 mt-2 text-center">Status: {status}</p>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
          )}

          {result?.url && (
            <a
              href={result.url}
              download="ocr-organized.pdf"
              className="mt-4 flex items-center justify-center gap-2 text-brand-red hover:text-red-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download Result
            </a>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
