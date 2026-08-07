'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Scan,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Camera,
  ArrowRight,
  ArrowLeft,
  GripVertical,
  Sparkles,
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
import { downloadDataUrl, formatSize, moveItem, useCountdownDownload } from '@/components/tools/PdfThumbnailGrid';

export default function ScanToPdfPage() {
  return (
    <ErrorBoundary>
      <ScanToPdfContent />
    </ErrorBoundary>
  );
}

function ScanToPdfContent() {
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState('none');
  const [pageSize, setPageSize] = useState('letter');
  const [orientation, setOrientation] = useState('portrait');
  const [ocr, setOcr] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ dataUrl: string; filename: string; pageCount: number; ocr: boolean } | null>(
    null
  );

  const { step, setStep, isProcessing, setIsProcessing, error, setError, goToOptions, goToDownload, resetAll } =
    useToolState();
  const { countdown, start: startCountdown } = useCountdownDownload();

  // Object URLs for previews, revoked when the list changes.
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const imageFiles = Array.from(selected).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please choose image files (JPG or PNG scans/photos)');
      return;
    }
    setFiles((prev) => [...prev, ...imageFiles]);
    setError(null);
  };

  const handleRemove = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const move = (from: number, to: number) => setFiles((prev) => moveItem(prev, from, to));

  const handleContinueToOptions = () => {
    if (files.length === 0) {
      setError('Please select at least one image to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      // Order of the appended entries is the page order in the PDF.
      files.forEach((file) => formData.append('files', file));
      formData.append('margin', margin);
      formData.append('pageSize', pageSize);
      formData.append('orientation', orientation);
      formData.append('ocr', ocr ? 'true' : 'false');

      const res = await fetch('/api/tools/scan-to-pdf', { method: 'POST', body: formData });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Conversion failed');
      if (!data.dataUrl) throw new Error('The server did not return a file');

      setResult({
        dataUrl: data.dataUrl,
        filename: data.filename || 'scanned.pdf',
        pageCount: data.pageCount ?? files.length,
        ocr: Boolean(data.ocr),
      });
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert scan to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    downloadDataUrl(result.dataUrl, result.filename);
  };

  return (
    <ToolPageShell title="Scan to PDF" description="Turn photos and scans into a clean PDF document." icon={Scan}>
      <div className="max-w-4xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Capture', options: 'Arrange', download: 'Download' }} />
        <ProcessingModal
          open={isProcessing}
          message={ocr ? 'Creating a searchable PDF...' : 'Creating your PDF...'}
        />

        <div key={step} className="animate-slide-up">
          {/* Step 1 — Capture / upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Add Your Scans</h2>
                  <p className="text-sm text-gray-500">Take photos with your camera or upload existing images</p>
                </div>

                <div className="space-y-4">
                  {files.length === 0 ? (
                    <ToolUploadZone
                      icon={Upload}
                      title="Drop scanned images here"
                      subtitle="or click to browse from your computer"
                      accept="image/*"
                      multiple
                      onFiles={handleFiles}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50 p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-semibold text-green-700">
                            {files.length} image{files.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                        <button
                          onClick={() => setFiles([])}
                          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition-all hover:bg-red-50 hover:text-red-700"
                        >
                          Clear All
                        </button>
                      </div>

                      <ScanThumbGrid
                        files={files}
                        previews={previews}
                        dragIndex={dragIndex}
                        setDragIndex={setDragIndex}
                        onMove={move}
                        onRemove={handleRemove}
                      />

                      <ToolUploadZone
                        icon={Upload}
                        title="Add more images"
                        subtitle="Drag and drop or click to browse"
                        accept="image/*"
                        multiple
                        onFiles={handleFiles}
                      />
                    </>
                  )}

                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50">
                    <Camera className="w-4 h-4" />
                    Take a photo with your camera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </label>
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
                <ToolPrimaryButton onClick={handleContinueToOptions} disabled={files.length === 0} className="min-w-[200px]">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {/* Step 2 — Arrange & options */}
          {step === 'options' && (
            <div className="space-y-6">
              <ToolCard>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Arrange & Convert</h2>
                    <p className="text-sm text-gray-500">Drag the thumbnails to set the page order</p>
                  </div>
                  <button
                    onClick={() => setStep('upload')}
                    disabled={isProcessing}
                    className="cursor-pointer text-xs font-semibold text-gray-500 transition-colors hover:text-brand-red disabled:opacity-40"
                  >
                    ← Back to Upload
                  </button>
                </div>

                <ScanThumbGrid
                  files={files}
                  previews={previews}
                  dragIndex={dragIndex}
                  setDragIndex={setDragIndex}
                  onMove={move}
                  onRemove={handleRemove}
                />

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">Page size</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    >
                      <option value="letter">US Letter</option>
                      <option value="a4">A4</option>
                      <option value="auto">Fit to image</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">Orientation</span>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      disabled={pageSize === 'auto'}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 disabled:opacity-50"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">Page margin</span>
                    <select
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20"
                    >
                      <option value="none">None</option>
                      <option value="small">Small</option>
                      <option value="large">Large</option>
                    </select>
                  </label>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-gray-50 p-4">
                  <input
                    type="checkbox"
                    checked={ocr}
                    onChange={(e) => setOcr(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-2 text-sm text-gray-700">
                    <Sparkles className="w-4 h-4 text-brand-red" />
                    Make the PDF searchable (OCR)
                    <span className="text-gray-400">— slower, adds a hidden text layer</span>
                  </span>
                </label>

                <div className="mt-6 space-y-3 rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Images</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{files.length}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Size</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {formatSize(files.reduce((sum, f) => sum + f.size, 0))}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                  <p className="text-xs leading-relaxed text-blue-700">
                    Each image becomes one page, in the order shown above. JPG and PNG scans are supported.
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
                <ToolPrimaryButton onClick={handleConvert} loading={isProcessing} className="max-w-xs">
                  {isProcessing ? (
                    <>
                      <Spinner size={24} color="#ffffff" className="shrink-0" />
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-5 h-5 shrink-0" />
                      <span>Create PDF</span>
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
                <h2 className="font-display mb-3 text-2xl font-bold text-brand-dark sm:text-3xl">Your PDF Is Ready!</h2>
                <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                  {result.pageCount} page{result.pageCount === 1 ? '' : 's'} created
                  {result.ocr ? ' with a searchable text layer.' : '.'}
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
                    <Upload className="w-5 h-5 shrink-0" />
                    <span>Scan More Pages</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>

              <RelatedTools currentTool="scan-to-pdf" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}

/** Reorderable grid of scanned image thumbnails. */
function ScanThumbGrid({
  files,
  previews,
  dragIndex,
  setDragIndex,
  onMove,
  onRemove,
}: {
  files: File[];
  previews: string[];
  dragIndex: number | null;
  setDragIndex: (index: number | null) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          draggable
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
            if (Number.isInteger(from)) onMove(from, index);
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          className={`group relative cursor-grab rounded-2xl border-2 border-gray-200 bg-white p-2 transition-all hover:border-gray-300 active:cursor-grabbing ${
            dragIndex === index ? 'opacity-40' : ''
          }`}
        >
          <div className="relative overflow-hidden rounded-xl bg-gray-50" style={{ aspectRatio: '3 / 4' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img
              src={previews[index]}
              alt={`Scan ${index + 1}`}
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
            />
            <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-white/90 text-gray-500 shadow-sm ring-1 ring-gray-200">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-red px-1.5 text-[11px] font-bold text-white shadow">
              {index + 1}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1 px-1">
            <span className="truncate text-xs font-semibold text-gray-600">{file.name}</span>
            <span className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                title="Move left"
                aria-label={`Move ${file.name} earlier`}
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-dark disabled:opacity-30"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Move right"
                aria-label={`Move ${file.name} later`}
                onClick={() => onMove(index, index + 1)}
                disabled={index === files.length - 1}
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-brand-dark disabled:opacity-30"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => onRemove(index)}
                className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
