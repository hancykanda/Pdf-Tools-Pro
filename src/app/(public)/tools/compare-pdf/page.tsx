'use client';

import { useMemo, useState } from 'react';
import {
  GitCompare,
  Upload,
  CheckCircle2,
  AlertCircle,
  Info,
  Plus,
  Minus,
  Pencil,
  Equal,
} from 'lucide-react';
import { useToolState } from '@/hooks/useToolState';
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolSecondaryButton,
  ToolAlert,
  StepIndicator,
  RelatedTools,
} from '@/components/layout';
import { Spinner } from '@/components/ui/Spinner';
import { ProcessingModal } from '@/components/layout';

interface DiffSegment {
  text: string;
  changed: boolean;
}

interface DiffRow {
  type: 'unchanged' | 'added' | 'removed' | 'changed';
  leftNumber: number | null;
  rightNumber: number | null;
  left: string | null;
  right: string | null;
  leftSegments?: DiffSegment[];
  rightSegments?: DiffSegment[];
}

interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  similarity: number;
}

interface CompareResponse {
  rows: DiffRow[];
  summary: DiffSummary;
  identical: boolean;
  pageCount1: number;
  pageCount2: number;
  warning?: string;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

function Segments({ segments, text, tone }: { segments?: DiffSegment[]; text: string | null; tone: 'left' | 'right' }) {
  if (!segments || segments.length === 0) return <>{text}</>;
  return (
    <>
      {segments.map((segment, index) =>
        segment.changed ? (
          <mark
            key={index}
            className={`rounded px-0.5 ${
              tone === 'left' ? 'bg-red-200/80 text-red-900' : 'bg-green-200/80 text-green-900'
            }`}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

export default function ComparePdfPage() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [diff, setDiff] = useState<CompareResponse | null>(null);
  const [onlyDifferences, setOnlyDifferences] = useState(true);

  const {
    step,
    setStep,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    setSuccess,
    goToOptions,
    goToDownload,
    resetAll,
  } = useToolState<Record<string, unknown>>();

  const pick = (setter: (file: File | null) => void, label: string) => (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked || picked.type !== 'application/pdf') {
      setError(`Please upload a valid PDF file for the ${label} document`);
      return;
    }
    setter(picked);
    setError(null);
    setSuccess(false);
    setDiff(null);
  };

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file1', file1);
      form.append('file2', file2);

      const res = await fetch('/api/tools/compare-pdf', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Compare failed');

      setDiff(data as CompareResponse);
      setSuccess(true);
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compare PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  const visibleRows = useMemo(() => {
    if (!diff) return [];
    return onlyDifferences ? diff.rows.filter((row) => row.type !== 'unchanged') : diff.rows;
  }, [diff, onlyDifferences]);

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setDiff(null);
    resetAll();
  };

  const rowTone = (type: DiffRow['type'], side: 'left' | 'right') => {
    if (type === 'unchanged') return 'bg-white';
    if (type === 'changed') return side === 'left' ? 'bg-red-50/70' : 'bg-green-50/70';
    if (type === 'removed') return side === 'left' ? 'bg-red-50' : 'bg-gray-50/60';
    return side === 'right' ? 'bg-green-50' : 'bg-gray-50/60';
  };

  return (
    <ToolPageShell
      title="Compare PDF"
      description="See exactly what changed between two PDFs, side by side."
      icon={GitCompare}
    >
      <div className={step === 'download' ? 'max-w-7xl mx-auto' : 'max-w-3xl mx-auto'}>
        <StepIndicator
          currentStep={step}
          labels={{ upload: 'Upload', options: 'Compare', download: 'Differences' }}
        />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Two PDFs</h2>
                  <p className="text-sm text-gray-500">The original and the version you want to check</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      { file: file1, setter: setFile1, label: 'Original', tone: 'red' },
                      { file: file2, setter: setFile2, label: 'Modified', tone: 'green' },
                    ] as const
                  ).map((slot) => (
                    <div key={slot.label}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">{slot.label} PDF</h3>
                      {!slot.file ? (
                        <ToolUploadZone
                          icon={Upload}
                          title={`Drop ${slot.label.toLowerCase()} PDF`}
                          subtitle="or click to browse"
                          accept="application/pdf"
                          onFiles={pick(slot.setter, slot.label.toLowerCase())}
                        />
                      ) : (
                        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-green-700 truncate">{slot.file.name}</p>
                              <p className="text-xs text-gray-500">{formatSize(slot.file.size)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => slot.setter(null)}
                            className="mt-3 text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <div className="flex justify-end">
                <ToolPrimaryButton
                  onClick={() => {
                    if (!file1 || !file2) {
                      setError('Please upload both PDF files to compare');
                      return;
                    }
                    setError(null);
                    goToOptions();
                  }}
                  disabled={!file1 || !file2}
                  className="min-w-[160px]"
                >
                  Continue
                  <GitCompare className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Ready to Compare</h2>
                    <p className="text-sm text-gray-500">Text is extracted with pdf.js and diffed line by line</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      { file: file1, label: 'Original' },
                      { file: file2, label: 'Modified' },
                    ] as const
                  ).map((slot) => (
                    <div key={slot.label} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                      <div className="p-3 bg-white border border-gray-100 rounded-xl text-brand-red">
                        <GitCompare className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">{slot.label}</p>
                        <p className="text-sm font-semibold text-brand-dark truncate">{slot.file?.name}</p>
                        <p className="text-xs text-gray-500">{formatSize(slot.file?.size || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl mt-6">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Added, removed and changed lines are highlighted side by side. Nothing is uploaded to a third
                    party and no output file is produced — this is a read-only comparison.
                  </p>
                </div>

                {error && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleCompare} loading={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Comparing...</span>
                    </>
                  ) : (
                    <>
                      <GitCompare className="w-5 h-5 shrink-0" />
                      <span>Compare PDFs</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'download' && diff && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">
                      {diff.identical ? 'The documents match' : 'Differences found'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {diff.pageCount1} vs {diff.pageCount2} pages ·{' '}
                      {Math.round(diff.summary.similarity * 100)}% of lines identical
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700">
                      <Plus className="w-3.5 h-3.5" /> {diff.summary.added} added
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700">
                      <Minus className="w-3.5 h-3.5" /> {diff.summary.removed} removed
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700">
                      <Pencil className="w-3.5 h-3.5" /> {diff.summary.changed} changed
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                      <Equal className="w-3.5 h-3.5" /> {diff.summary.unchanged} unchanged
                    </span>
                  </div>
                </div>

                {diff.warning && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{diff.warning}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <ToolCard className="p-0 sm:p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="grid grid-cols-2 gap-4 flex-1 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 truncate">
                      {file1?.name || 'Original'}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 truncate">
                      {file2?.name || 'Modified'}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer shrink-0 ml-4">
                    <input
                      type="checkbox"
                      checked={onlyDifferences}
                      onChange={(e) => setOnlyDifferences(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[var(--brand-red,#e5322d)] cursor-pointer"
                    />
                    Only differences
                  </label>
                </div>

                <div className="max-h-[65vh] overflow-auto">
                  {visibleRows.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-16">
                      No differences to show.
                    </p>
                  ) : (
                    <div className="min-w-[640px]">
                      {visibleRows.map((row, index) => (
                        <div key={index} className="grid grid-cols-2 border-b border-gray-50 last:border-0">
                          <div className={`flex gap-3 px-4 py-1.5 border-r border-gray-100 ${rowTone(row.type, 'left')}`}>
                            <span className="w-9 shrink-0 text-right text-[11px] leading-5 text-gray-300 tabular-nums select-none">
                              {row.leftNumber ?? ''}
                            </span>
                            <span className="text-[13px] leading-5 text-gray-700 font-mono whitespace-pre-wrap break-words">
                              <Segments segments={row.leftSegments} text={row.left} tone="left" />
                            </span>
                          </div>
                          <div className={`flex gap-3 px-4 py-1.5 ${rowTone(row.type, 'right')}`}>
                            <span className="w-9 shrink-0 text-right text-[11px] leading-5 text-gray-300 tabular-nums select-none">
                              {row.rightNumber ?? ''}
                            </span>
                            <span className="text-[13px] leading-5 text-gray-700 font-mono whitespace-pre-wrap break-words">
                              <Segments segments={row.rightSegments} text={row.right} tone="right" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ToolCard>

              <div className="flex justify-center">
                <ToolSecondaryButton onClick={handleReset} className="min-w-[220px]">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Compare Another Pair</span>
                </ToolSecondaryButton>
              </div>

              <RelatedTools currentTool="compare-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
