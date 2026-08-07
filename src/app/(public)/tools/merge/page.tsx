'use client';

import { useState } from 'react';
import {
  FileStack,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  ArrowRight,
  GripVertical,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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
  ProcessingModal,
} from '@/components/layout';
import { Spinner } from '@/components/ui/Spinner';
import {
  downloadDataUrl,
  formatSize,
  moveItem,
  readFileAsDataUrl,
  useCountdownDownload,
} from '@/components/tools/PdfThumbnailGrid';

export default function MergePage() {
  return (
    <ErrorBoundary>
      <MergePageContent />
    </ErrorBoundary>
  );
}

function MergePageContent() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ dataUrl: string; filename: string } | null>(null);

  const { step, setStep, isProcessing, setIsProcessing, error, setError, goToOptions, goToDownload, resetAll } =
    useToolState();
  const { countdown, start: startCountdown } = useCountdownDownload();

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const pdfFiles = Array.from(selected).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfFiles.length === 0) {
      setError('Only PDF files can be merged');
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...pdfFiles]);
  };

  const handleRemove = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const handleMoveUp = (index: number) => setFiles((prev) => moveItem(prev, index, index - 1));
  const handleMoveDown = (index: number) => setFiles((prev) => moveItem(prev, index, index + 1));

  const handleContinueToOptions = () => {
    if (files.length < 2) {
      setError('Please select at least 2 PDF files to merge');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setError(null);

    try {
      const readFiles = await Promise.all(files.map((file) => readFileAsDataUrl(file)));

      const res = await fetch('/api/tools/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: readFiles }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Merge failed');
      if (!data.dataUrl) throw new Error('The server did not return a file');

      setResult({ dataUrl: data.dataUrl, filename: data.filename || 'merged.pdf' });
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    downloadDataUrl(result.dataUrl, result.filename);
  };

  return (
    <ToolPageShell
      title="Merge PDF"
      description="Combine multiple PDF documents into a single file."
      icon={FileStack}
      popular
    >
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal open={isProcessing} message="Merging your PDFs..." />

        <div key={step} className="animate-slide-up">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF Files</h2>
                  <p className="text-sm text-gray-500">
                    Select 2 or more PDF files, then drag them into the order you want
                  </p>
                </div>

                {files.length === 0 ? (
                  <ToolUploadZone
                    icon={Upload}
                    title="Drop PDF files here"
                    subtitle="or click to browse from your computer"
                    accept="application/pdf"
                    multiple
                    onFiles={handleFiles}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50 p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          {files.length} file{files.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <button
                        onClick={() => setFiles([])}
                        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:bg-red-50 hover:text-red-700"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                      {files.map((file, index) => (
                        <MergeFileRow
                          key={`${file.name}-${index}`}
                          file={file}
                          index={index}
                          total={files.length}
                          dragging={dragIndex === index}
                          onDragStartRow={setDragIndex}
                          onDropRow={(from, to) => {
                            setFiles((prev) => moveItem(prev, from, to));
                            setDragIndex(null);
                          }}
                          onDragEndRow={() => setDragIndex(null)}
                          onMoveUp={() => handleMoveUp(index)}
                          onMoveDown={() => handleMoveDown(index)}
                          onRemove={() => handleRemove(index)}
                        />
                      ))}
                    </div>

                    <ToolUploadZone
                      icon={Plus}
                      title="Add more PDF files"
                      subtitle="Drag and drop or click to browse"
                      accept="application/pdf"
                      multiple
                      onFiles={handleFiles}
                    />
                  </div>
                )}

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
                <ToolPrimaryButton onClick={handleContinueToOptions} disabled={files.length < 2} className="min-w-[200px]">
                  Continue to Options
                  <ArrowRight className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 2 — Options */}
          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Merge Settings</h2>
                    <p className="text-sm text-gray-500">Drag to fine-tune the order — pages are combined top to bottom</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    disabled={isProcessing}
                    className="cursor-pointer text-xs font-semibold text-gray-500 transition-colors hover:text-brand-red disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">Files to Merge</h3>
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                      {files.map((file, index) => (
                        <MergeFileRow
                          key={`${file.name}-${index}`}
                          file={file}
                          index={index}
                          total={files.length}
                          compact
                          dragging={dragIndex === index}
                          onDragStartRow={setDragIndex}
                          onDropRow={(from, to) => {
                            setFiles((prev) => moveItem(prev, from, to));
                            setDragIndex(null);
                          }}
                          onDragEndRow={() => setDragIndex(null)}
                          onMoveUp={() => handleMoveUp(index)}
                          onMoveDown={() => handleMoveDown(index)}
                          onRemove={() => handleRemove(index)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total Documents</span>
                      <span className="font-semibold text-brand-dark tabular-nums">{files.length}</span>
                    </div>
                    <div className="h-px bg-gray-200/60" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Combined Size</span>
                      <span className="font-semibold text-brand-dark tabular-nums">
                        {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </ToolCard>

              {error && (
                <ToolAlert type="error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </ToolAlert>
              )}

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')} disabled={isProcessing}>
                  Back
                </ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleMerge} loading={isProcessing} className="max-w-xs">
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FileStack className="w-5 h-5 shrink-0" />
                      <span>Merge PDF</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 3 — Download */}
          {step === 'download' && result && (
            <div className="space-y-6">
              <ToolCard className="py-12 text-center sm:py-16">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl">
                  PDFs Merged Successfully!
                </h2>
                <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                  Your files have been combined into a single PDF document. Download your merged file below.
                </p>

                <div className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row">
                  <ToolPrimaryButton onClick={handleDownload} disabled={countdown > 0} className="flex-1">
                    {countdown > 0 ? (
                      <>
                        <Spinner size={24} color="#ffffff" className="shrink-0" />
                        <span>Please wait {countdown}s...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 shrink-0" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </ToolPrimaryButton>
                  <ToolSecondaryButton
                    onClick={() => {
                      setFiles([]);
                      setResult(null);
                      resetAll();
                    }}
                    className="flex-1"
                  >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span>Merge More Files</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="merge" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

/** Draggable file row shared by the upload and options steps. */
function MergeFileRow({
  file,
  index,
  total,
  compact,
  dragging,
  onDragStartRow,
  onDropRow,
  onDragEndRow,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  file: File;
  index: number;
  total: number;
  compact?: boolean;
  dragging?: boolean;
  onDragStartRow: (index: number) => void;
  onDropRow: (from: number, to: number) => void;
  onDragEndRow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        onDragStartRow(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData('text/plain'));
        if (Number.isInteger(from)) onDropRow(from, index);
      }}
      onDragEnd={onDragEndRow}
      className={`group flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/80 transition-all hover:border-gray-200 hover:bg-gray-50 cursor-grab active:cursor-grabbing ${
        compact ? 'p-3' : 'p-4'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />

      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-500">
        {index + 1}
      </div>

      <div className="shrink-0 rounded-xl border border-gray-100 bg-white p-2 text-brand-red">
        <FileText className="w-4 h-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-brand-dark">{file.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">{formatSize(file.size)}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          title="Move up"
          aria-label={`Move ${file.name} up`}
          className="cursor-pointer rounded-lg border border-transparent p-2 text-gray-400 transition-all hover:border-gray-200 hover:bg-white hover:text-brand-dark disabled:opacity-30"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          title="Move down"
          aria-label={`Move ${file.name} down`}
          className="cursor-pointer rounded-lg border border-transparent p-2 text-gray-400 transition-all hover:border-gray-200 hover:bg-white hover:text-brand-dark disabled:opacity-30"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          title="Remove"
          aria-label={`Remove ${file.name}`}
          className="cursor-pointer rounded-lg border border-transparent p-2 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
