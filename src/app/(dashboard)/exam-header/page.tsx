'use client';

import { useState, useRef } from 'react';
import { Award, Upload, Sparkles, Download, Loader2 } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

export default function ExamHeaderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headerText, setHeaderText] = useState('');
  const [logoPosition, setLogoPosition] = useState('top-left');
  const [result, setResult] = useState<{ url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (selected: FileList | null) => {
    if (!selected?.[0]) return;
    setFile(selected[0]);
    setError(null);
    setResult(null);
    setJobId(null);
    setStatus(null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tool', 'exam-header');
      formData.append('headerText', headerText);
      formData.append('logoPosition', logoPosition);

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
      setError(err instanceof Error ? err.message : 'Failed to customize header');
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
          setResult({ url: `/api/premium/files/${data.result?.objectName || ''}` });
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
        <PageHeader title="Exam Header Customizer" description="Customize branded exam headers." icon={Award} />

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-brand-dark">How it works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Upload Exam</h4>
              <p className="text-sm text-gray-600">Upload an existing exam PDF.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Customize</h4>
              <p className="text-sm text-gray-600">Add school name, logo, and header text.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Export</h4>
              <p className="text-sm text-gray-600">Download the branded exam PDF.</p>
            </div>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-red transition-colors cursor-pointer mb-4"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="absolute w-px h-px overflow-hidden opacity-0"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Upload className="w-10 h-10 text-brand-red mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-1">
              {file ? file.name : 'Click to upload or drag and drop an exam PDF'}
            </p>
            <p className="text-gray-400 text-sm">Supports PDF files</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Header Text</label>
            <input
              type="text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="e.g., Springfield High School - Final Exam"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Position</label>
            <select
              value={logoPosition}
              onChange={(e) => setLogoPosition(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
            >
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="center">Center</option>
            </select>
          </div>

          <ActionButton
            onClick={handleProcess}
            disabled={!file || !headerText.trim() || loading}
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
                Customize Header
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
              download="customized-exam.pdf"
              className="mt-4 flex items-center justify-center gap-2 text-brand-red hover:text-red-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download Customized Exam
            </a>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
