'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton, Alert } from '@/components/layout/PageShell';

type Paper = {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  year?: number | null;
  term?: string | null;
  fileName: string;
  fileSize: number;
  downloadCount: number;
  downloadUrl?: string;
};

const emptyMeta = {
  title: '',
  subject: '',
  classLevel: '',
  year: '',
  term: '',
  description: '',
};

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState(emptyMeta);

  const loadPapers = useCallback(async () => {
    try {
      const res = await fetch('/api/premium/papers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load papers');
      setPapers(Array.isArray(data.items) ? data.items : []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadPapers();
    };
    run();
  }, [loadPapers]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError('Please choose a PDF file to upload.');
      return;
    }

    const title = meta.title.trim() || file.name.replace(/\.[^/.]+$/, '');
    if (!meta.subject.trim() || !meta.classLevel.trim()) {
      setError('Subject and class level are required.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('subject', meta.subject.trim());
      formData.append('classLevel', meta.classLevel.trim());
      if (meta.year.trim()) formData.append('year', meta.year.trim());
      if (meta.term.trim()) formData.append('term', meta.term.trim());
      if (meta.description.trim()) formData.append('description', meta.description.trim());

      const res = await fetch('/api/premium/papers', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setPapers((prev) => [data.paper as Paper, ...prev]);
      setMeta(emptyMeta);
      form.reset();
      setShowUpload(false);
      // refresh silently so the new paper gets its presigned downloadUrl
      loadPapers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      const res = await fetch(`/api/premium/papers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete paper');
      setPapers((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete paper');
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <PageContainer>
      <Section>
        <PageHeader title="Papers Bank" description="Search and download past exam papers." icon={BookOpen} />

        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-brand-dark">Papers ({papers.length})</h3>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Paper
            </button>
          </div>

          {error && (
            <div className="mb-4">
              <Alert>{error}</Alert>
            </div>
          )}

          {showUpload && (
            <form onSubmit={handleUpload} className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF Paper</label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={meta.title}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={meta.subject}
                    onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Level</label>
                  <input
                    type="text"
                    value={meta.classLevel}
                    onChange={(e) => setMeta({ ...meta, classLevel: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={meta.year}
                    onChange={(e) => setMeta({ ...meta, year: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <input
                    type="text"
                    value={meta.term}
                    onChange={(e) => setMeta({ ...meta, term: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={meta.description}
                    onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <ActionButton type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload'}
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-6 py-3 bg-white text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading papers...
              </div>
            ) : papers.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No papers yet. Upload your first paper.</p>
            ) : (
              papers.map((paper) => (
                <div key={paper.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-brand-red rounded-xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{paper.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                        <span>{paper.subject}</span>
                        <span>•</span>
                        <span>{paper.classLevel}</span>
                        {paper.year && (
                          <>
                            <span>•</span>
                            <span>{paper.year}</span>
                          </>
                        )}
                        {paper.term && (
                          <>
                            <span>•</span>
                            <span>{paper.term}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatSize(paper.fileSize)}</span>
                        <span>•</span>
                        <span>{paper.downloadCount} downloads</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {paper.downloadUrl && (
                      <a
                        href={paper.downloadUrl}
                        download={paper.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-brand-red hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(paper.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
