'use client';

import { useCallback, useState } from 'react';
import {
  LayoutGrid,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  RotateCw,
  RotateCcw,
  Copy,
  Trash2,
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
  PageThumbnail,
  ThumbnailAction,
  ThumbnailGrid,
  usePdfThumbnails,
  readFileAsDataUrl,
  downloadDataUrl,
  formatSize,
  moveItem,
  useCountdownDownload,
  type PdfThumbnail,
} from '@/components/tools/PdfThumbnailGrid';

interface PageEntry {
  /** Stable key so duplicated pages can be dragged independently. */
  id: string;
  /** 1-based source page number. */
  page: number;
  /** Extra rotation applied on save. */
  rotation: number;
}

export default function OrganizePdfPage() {
  return (
    <ErrorBoundary>
      <OrganizePdfContent />
    </ErrorBoundary>
  );
}

/** Default working list: every source page once, unrotated. */
function defaultEntries(pageCount: number): PageEntry[] {
  return Array.from({ length: pageCount }, (_, i) => ({ id: `p${i + 1}`, page: i + 1, rotation: 0 }));
}

function OrganizePdfContent() {
  const [edits, setEdits] = useState<{ key: string; entries: PageEntry[] }>({ key: '', entries: [] });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ dataUrl: string; filename: string; pageCount: number } | null>(null);

  const { step, setStep, file, setFile, isProcessing, setIsProcessing, error, setError, goToOptions, goToDownload, resetAll } =
    useToolState();

  const { thumbnails, pageCount, loading: thumbsLoading, error: thumbsError } = usePdfThumbnails(file);
  const { countdown, start: startCountdown } = useCountdownDownload();

  // The working list is derived from the loaded document; edits are stored
  // against that document's key so a new upload starts from a clean slate
  // without needing a state-resetting effect.
  const docKey = file ? `${file.name}:${file.size}:${file.lastModified}:${pageCount}` : '';
  const entries = edits.key === docKey ? edits.entries : defaultEntries(pageCount);

  const setEntries = useCallback(
    (updater: PageEntry[] | ((prev: PageEntry[]) => PageEntry[])) => {
      setEdits((prev) => {
        const base = prev.key === docKey ? prev.entries : defaultEntries(pageCount);
        return { key: docKey, entries: typeof updater === 'function' ? updater(base) : updater };
      });
    },
    [docKey, pageCount]
  );

  const handleFiles = (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked) return;
    if (picked.type !== 'application/pdf' && !picked.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file');
      return;
    }
    setError(null);
    setResult(null);
    setFile(picked);
  };

  const thumbFor = (page: number): PdfThumbnail =>
    thumbnails[page - 1] ?? { pageNumber: page, dataUrl: null, width: 190, height: 269 };

  const rotate = (index: number, delta: number) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, rotation: (entry.rotation + delta + 360) % 360 } : entry))
    );
  };

  const rotateAll = (delta: number) => {
    setEntries((prev) => prev.map((entry) => ({ ...entry, rotation: (entry.rotation + delta + 360) % 360 })));
  };

  const duplicate = (index: number) => {
    setEntries((prev) => {
      const next = [...prev];
      const source = next[index];
      next.splice(index + 1, 0, { ...source, id: `${source.id}-copy-${Date.now()}` });
      return next;
    });
  };

  const remove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const resetOrder = () => setEntries(defaultEntries(pageCount));

  const handleContinue = () => {
    if (!file) {
      setError('Please upload a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleSave = async () => {
    if (!file) return;
    if (entries.length === 0) {
      setError('Keep at least one page in the document');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);

      const res = await fetch('/api/tools/organize-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: dataUrl,
          filename: file.name,
          pages: entries.map((entry) => ({ page: entry.page, rotation: entry.rotation })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Organization failed');
      if (!data.dataUrl) throw new Error('The server did not return a file');

      setResult({
        dataUrl: data.dataUrl,
        filename: data.filename || 'organized.pdf',
        pageCount: data.pageCount ?? entries.length,
      });
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to organize PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    downloadDataUrl(result.dataUrl, result.filename);
  };

  const rotatedCount = entries.filter((entry) => entry.rotation !== 0).length;

  return (
    <ToolPageShell
      title="Organize PDF"
      description="Drag pages into a new order, rotate, duplicate or delete them."
      icon={LayoutGrid}
    >
      <div className="max-w-5xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Organize', download: 'Download' }} />
        <ProcessingModal open={isProcessing} message="Rebuilding your PDF..." />

        <div key={step} className="animate-slide-up">
          {/* Step 1 — Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Then drag the page thumbnails into the order you want</p>
                </div>

                {!file ? (
                  <ToolUploadZone
                    icon={Upload}
                    title="Drop a PDF file here"
                    subtitle="or click to browse from your computer"
                    accept="application/pdf"
                    onFiles={handleFiles}
                  />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-green-700 truncate">{file.name}</p>
                      <p className="text-xs text-green-600/80 mt-0.5">
                        {formatSize(file.size)}
                        {pageCount > 0 && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setResult(null);
                      }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {(error || thumbsError) && (
                  <div className="mt-4">
                    <ToolAlert type="error">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error || thumbsError}</span>
                    </ToolAlert>
                  </div>
                )}
              </ToolCard>

              <div className="flex justify-end">
                <ToolPrimaryButton onClick={handleContinue} disabled={!file} className="min-w-[200px]">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 2 — Organize */}
          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Arrange Pages</h2>
                    <p className="text-sm text-gray-500">
                      Drag a thumbnail onto another to move it. Use the buttons to rotate, duplicate or delete.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    disabled={isProcessing}
                    className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer disabled:opacity-40"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  <ToolSecondaryButton onClick={() => rotateAll(-90)} disabled={entries.length === 0}>
                    <RotateCcw className="w-4 h-4" />
                    Rotate all left
                  </ToolSecondaryButton>
                  <ToolSecondaryButton onClick={() => rotateAll(90)} disabled={entries.length === 0}>
                    <RotateCw className="w-4 h-4" />
                    Rotate all right
                  </ToolSecondaryButton>
                  <ToolSecondaryButton onClick={resetOrder} disabled={pageCount === 0}>
                    Reset
                  </ToolSecondaryButton>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages in output</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{entries.length}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Rotated pages</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{rotatedCount}</span>
                  </div>
                </div>

                {thumbsLoading && thumbnails.length === 0 ? (
                  <div className="flex items-center justify-center gap-3 py-10 text-sm text-gray-500">
                    <Spinner size={22} />
                    Rendering page previews…
                  </div>
                ) : (
                  <ThumbnailGrid>
                    {entries.map((entry, index) => (
                      <PageThumbnail
                        key={entry.id}
                        thumbnail={thumbFor(entry.page)}
                        rotation={entry.rotation}
                        label={`${index + 1} · page ${entry.page}`}
                        draggable
                        dragging={dragIndex === index}
                        onDragStart={(e) => {
                          setDragIndex(index);
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
                          if (Number.isInteger(from)) setEntries((prev) => moveItem(prev, from, index));
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        actions={
                          <>
                            <ThumbnailAction title="Rotate left" onClick={() => rotate(index, -90)}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </ThumbnailAction>
                            <ThumbnailAction title="Rotate right" onClick={() => rotate(index, 90)}>
                              <RotateCw className="w-3.5 h-3.5" />
                            </ThumbnailAction>
                            <ThumbnailAction title="Duplicate page" onClick={() => duplicate(index)}>
                              <Copy className="w-3.5 h-3.5" />
                            </ThumbnailAction>
                            <ThumbnailAction title="Delete page" danger onClick={() => remove(index)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </ThumbnailAction>
                          </>
                        }
                      />
                    ))}
                  </ThumbnailGrid>
                )}

                <div className="mt-6 flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <GripVertical className="inline w-3.5 h-3.5 -mt-0.5" /> Thumbnails are draggable — drop one on top of
                    another to place it there. Rotation is applied to the saved PDF.
                  </p>
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
                <ToolPrimaryButton
                  onClick={handleSave}
                  loading={isProcessing}
                  disabled={entries.length === 0}
                  className="max-w-xs"
                >
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="w-5 h-5 shrink-0" />
                      <span>Save PDF</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 3 — Download */}
          {step === 'download' && result && (
            <div className="space-y-6">
              <ToolCard className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                  PDF Organized Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your new document has {result.pageCount} page{result.pageCount === 1 ? '' : 's'} in the order you set.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
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
                      setResult(null);
                      resetAll();
                    }}
                    className="flex-1"
                  >
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Organize Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="organize-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
