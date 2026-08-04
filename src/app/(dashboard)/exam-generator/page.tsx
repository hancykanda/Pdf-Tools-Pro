'use client';

import { useState } from 'react';
import { ClipboardList, Sparkles, Download, Loader2 } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

export default function ExamGeneratorPage() {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [questionCount, setQuestionCount] = useState('10');
  const [result, setResult] = useState<{ url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!className.trim() || !subject.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/premium/exam-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          className,
          subject,
          topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
          questionCount: Number(questionCount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      setJobId(data.jobId);
      setStatus('queued');
      pollJob(data.jobId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate exam');
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
        <PageHeader title="Exam Generator" description="Generate exams from your question bank." icon={ClipboardList} />

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-brand-dark">How it works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Select Class & Subject</h4>
              <p className="text-sm text-gray-600">Choose grade level and subject for the exam.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Pick Topics</h4>
              <p className="text-sm text-gray-600">Select specific topics or generate from all topics.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-display font-semibold text-brand-dark mb-1">Generate PDF</h4>
              <p className="text-sm text-gray-600">Create a formatted downloadable exam paper.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g., Grade 10"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Topics (comma separated)</label>
              <input
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="e.g., Algebra, Geometry, Trigonometry"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                min="1"
                max="50"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
              />
            </div>
          </div>

          <ActionButton
            onClick={handleGenerate}
            disabled={!className.trim() || !subject.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Exam
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
              download="exam.pdf"
              className="mt-4 flex items-center justify-center gap-2 text-brand-red hover:text-red-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download Exam PDF
            </a>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
