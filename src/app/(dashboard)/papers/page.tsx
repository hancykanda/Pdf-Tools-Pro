'use client';

import { useState } from 'react';
import { BookOpen, Upload, Download, Trash2 } from 'lucide-react';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

type Paper = {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  year?: number;
  term?: string;
  fileName: string;
  fileSize: number;
  downloadCount: number;
};

const samplePapers: Paper[] = [
  {
    id: '1',
    title: 'Final Exam 2024',
    subject: 'Mathematics',
    classLevel: 'Grade 10',
    year: 2024,
    term: 'Final',
    fileName: 'math-final-2024.pdf',
    fileSize: 1024000,
    downloadCount: 12,
  },
];

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>(samplePapers);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tool', 'papers');

      const res = await fetch('/api/premium/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const newPaper: Paper = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        subject: 'General',
        classLevel: 'General',
        fileName: file.name,
        fileSize: file.size,
        downloadCount: 0,
      };
      setPapers([newPaper, ...papers]);
      setShowUpload(false);
    } catch (err: unknown) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setPapers(papers.filter((p) => p.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
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
            {papers.map((paper) => (
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
                  <a
                    href={`/api/premium/files/${paper.id}`}
                    download={paper.fileName}
                    className="p-2 text-brand-red hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(paper.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </PageContainer>
  );
}
