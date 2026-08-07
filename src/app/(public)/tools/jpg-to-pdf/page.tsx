'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  GripVertical,
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

/** pdf-lib can only embed JPEG and PNG data. */
const ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_ATTR = '.jpg,.jpeg,.png,image/jpeg,image/png';

const PAGE_SIZE_OPTIONS = [
  { value: 'a4', label: 'A4 (210 × 297 mm)' },
  { value: 'letter', label: 'US Letter (8.5 × 11 in)' },
  { value: 'legal', label: 'US Legal (8.5 × 14 in)' },
  { value: 'a3', label: 'A3 (297 × 420 mm)' },
  { value: 'a5', label: 'A5 (148 × 210 mm)' },
  { value: 'fit', label: 'Fit to image (no fixed size)' },
];

const ORIENTATION_OPTIONS = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
  { value: 'auto', label: 'Auto (match each image)' },
];

interface ImageItem {
  id: string;
  file: File;
  url: string;
}

let idCounter = 0;
const nextId = () => `img-${Date.now()}-${idCounter++}`;

export default function JpgToPdfPage() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState('none');
  const dragIndex = useRef<number | null>(null);

  const {
    step,
    setStep,
    result,
    setResult,
    countdown,
    setCountdown,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    setSuccess,
    goToOptions,
    goToDownload,
    resetAll,
  } = useToolState<Record<string, unknown>>();

  // Object URLs power the thumbnails; revoke them when the page unmounts so we
  // do not leak blobs for large batches.
  const itemsRef = useRef<ImageItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const handleFiles = useCallback(
    (selected: FileList | null) => {
      if (!selected) return;
      const picked = Array.from(selected);
      const accepted = picked.filter(
        (f) =>
          ACCEPTED_MIME.includes(f.type.toLowerCase()) ||
          /\.(jpe?g|png)$/i.test(f.name),
      );
      const rejected = picked.length - accepted.length;

      if (accepted.length > 0) {
        setItems((prev) => [
          ...prev,
          ...accepted.map((file) => ({ id: nextId(), file, url: URL.createObjectURL(file) })),
        ]);
        setSuccess(false);
      }

      setError(
        rejected > 0
          ? `${rejected} file${rejected !== 1 ? 's were' : ' was'} skipped — only JPG and PNG images can be converted.`
          : null,
      );
    },
    [setError, setSuccess],
  );

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAll = () => {
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setError(null);
  };

  /** Move the image at `from` to position `to`, keeping every other order. */
  const moveItem = (from: number, to: number) => {
    setItems((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleContinueToOptions = () => {
    if (items.length === 0) {
      setError('Please select at least one image to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const handleConvert = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      // Appended in grid order — the API keeps that order page by page.
      items.forEach((item) => formData.append('files', item.file));
      formData.append('pageSize', pageSize);
      formData.append('orientation', orientation);
      formData.append('margin', margin);

      const res = await fetch('/api/tools/jpg-to-pdf', { method: 'POST', body: formData });

      // The API streams back a binary PDF; only error payloads are JSON.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed');
      }

      const blob = await res.blob();
      setResult(URL.createObjectURL(blob));
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert images to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCountdown = () => {
    let remaining = 10;
    setCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);
    return timer;
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'converted.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    clearAll();
    setPageSize('a4');
    setOrientation('portrait');
    setMargin('none');
    resetAll();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes: string[] = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderThumbnail = (item: ImageItem, index: number) => (
    <div
      key={item.id}
      draggable
      onDragStart={() => {
        dragIndex.current = index;
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (dragIndex.current !== null) moveItem(dragIndex.current, index);
        dragIndex.current = null;
      }}
      onDragEnd={() => {
        dragIndex.current = null;
      }}
      className="relative group bg-white border border-gray-100 rounded-xl p-2 cursor-grab active:cursor-grabbing"
    >
      <span className="absolute top-3 left-3 z-10 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-semibold tabular-nums">
        {index + 1}
      </span>
      <GripVertical className="absolute top-3 right-3 z-10 w-4 h-4 text-white/70 drop-shadow opacity-0 group-hover:opacity-100 transition-opacity" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.file.name}
        className="w-full h-28 object-cover rounded-lg bg-gray-50 pointer-events-none"
      />
      <p className="text-[11px] text-gray-500 mt-1.5 truncate" title={item.file.name}>
        {item.file.name}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveItem(index, index - 1)}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-brand-dark hover:bg-gray-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Move earlier"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => moveItem(index, index + 1)}
            disabled={index === items.length - 1}
            className="p-1 text-gray-400 hover:text-brand-dark hover:bg-gray-100 rounded-md disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Move later"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => handleRemove(item.id)}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <ToolPageShell
      title="JPG to PDF"
      description="Combine JPG and PNG images into a single PDF."
      icon={ImageIcon}
    >
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={step} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">

        {step === 'upload' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="text-center mb-6">
                <h2 className="font-display font-bold text-xl text-brand-dark mb-2">
                  Upload Your Images
                </h2>
                <p className="text-sm text-gray-500">
                  Select JPG or PNG images, then drag the thumbnails to set the page order
                </p>
              </div>

              {items.length === 0 ? (
                <ToolUploadZone
                  icon={Upload}
                  title="Drop images here"
                  subtitle="or click to browse (.jpg, .jpeg, .png)"
                  accept={ACCEPTED_ATTR}
                  multiple
                  onFiles={handleFiles}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        {items.length} image{items.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <button
                      onClick={clearAll}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <p className="text-xs text-gray-500">
                    Drag a thumbnail onto another to reorder, or use the arrows. Page order follows the
                    numbers below.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map(renderThumbnail)}
                  </div>

                  <ToolUploadZone
                    icon={Upload}
                    title="Add more images"
                    subtitle="Drag and drop or click to browse"
                    accept={ACCEPTED_ATTR}
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
              <ToolPrimaryButton
                onClick={handleContinueToOptions}
                disabled={items.length === 0}
                className="min-w-[160px]"
              >
                Continue to Options
                <Download className="w-4 h-4" />
              </ToolPrimaryButton>
            </div>
          </div>
        )}

        {step === 'options' && (
          <div className="space-y-6">
            <ToolCard>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-1">
                    Conversion Settings
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose the page size and orientation for your PDF
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                >
                  ← Back to Upload
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Page Order ({items.length} page{items.length !== 1 ? 's' : ''})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {items.map(renderThumbnail)}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="page-size"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Page Size
                    </label>
                    <select
                      id="page-size"
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="orientation"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Orientation
                    </label>
                    <select
                      id="orientation"
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      disabled={pageSize === 'fit'}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      {ORIENTATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {pageSize === 'fit' && (
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Each page matches its image, so orientation does not apply.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="margin" className="block text-sm font-semibold text-gray-700 mb-2">
                    Margin
                  </label>
                  <select
                    id="margin"
                    value={margin}
                    onChange={(e) => setMargin(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
                  >
                    <option value="none">None</option>
                    <option value="small">Small</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Images</span>
                    <span className="font-semibold text-brand-dark tabular-nums">{items.length}</span>
                  </div>
                  <div className="h-px bg-gray-200/60" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Size</span>
                    <span className="font-semibold text-brand-dark tabular-nums">
                      {formatSize(items.reduce((sum, item) => sum + item.file.size, 0))}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Each image becomes one page, scaled to fit while keeping its aspect ratio.
                  </p>
                </div>
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
              <ToolPrimaryButton onClick={handleConvert} loading={isProcessing}>
                {isProcessing ? (
                  <>
                    <Spinner size={24} color="#ffffff" className="shrink-0" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 shrink-0" />
                    <span>Convert to PDF</span>
                  </>
                )}
              </ToolPrimaryButton>
            </div>
          </div>
        )}

        {step === 'download' && (
          <div className="space-y-6">
            <ToolCard className="text-center py-12 sm:py-16">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                Images Converted Successfully!
              </h2>
              <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Your images have been combined into a single PDF document. Download your file below.
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
                <ToolSecondaryButton onClick={handleReset} className="flex-1">
                  <Upload className="w-5 h-5 shrink-0" />
                  <span>Convert More Images</span>
                </ToolSecondaryButton>
              </div>
            </ToolCard>

            <RelatedTools currentTool="jpg-to-pdf" />
          </div>
        )}
      </div>
        </div>
    </ToolPageShell>
  );
}
