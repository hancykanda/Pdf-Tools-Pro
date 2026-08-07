'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Droplets, Upload, Download, CheckCircle2, AlertCircle, Type, Image as ImageIcon, X } from 'lucide-react';
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
import { renderPdfPages, type RenderedPage } from '@/lib/pdfPreview';

const POSITIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'middle-left', label: 'Middle left' },
  { value: 'middle-right', label: 'Middle right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' },
];

const FONTS = [
  { value: 'Helvetica', label: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
  { value: 'TimesRoman', label: 'Times Roman', css: '"Times New Roman", Times, serif' },
  { value: 'Courier', label: 'Courier', css: '"Courier New", Courier, monospace' },
];

const PAGE_SCOPES = [
  { value: 'all', label: 'All pages' },
  { value: 'odd', label: 'Odd pages' },
  { value: 'even', label: 'Even pages' },
  { value: 'custom', label: 'Custom range' },
];

function alignmentFor(position: string) {
  const [vertical, horizontal] = position.split('-');
  const justifyContent =
    horizontal === 'left' ? 'flex-start' : horizontal === 'right' ? 'flex-end' : 'center';
  const alignItems = vertical === 'top' ? 'flex-start' : vertical === 'bottom' ? 'flex-end' : 'center';
  return { justifyContent, alignItems };
}

/** Mirrors the tiling grid used by the API so the preview matches the output. */
function tileCenters(viewWidth: number, viewHeight: number, blockWidth: number, blockHeight: number) {
  const stepX = Math.max(blockWidth + Math.max(40, blockWidth * 0.35), 40);
  const stepY = Math.max(blockHeight + Math.max(60, blockHeight * 1.4), 40);
  const cols = Math.min(20, Math.ceil(viewWidth / stepX) + 1);
  const rows = Math.min(20, Math.ceil(viewHeight / stepY) + 1);
  const centers: Array<{ x: number; y: number }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      centers.push({ x: (col + 0.5) * stepX, y: (row + 0.5) * stepY });
    }
  }
  return centers;
}

export default function WatermarkPage() {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [color, setColor] = useState('#808080');
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState('center');
  const [margin, setMargin] = useState(24);
  const [tile, setTile] = useState(false);
  const [scope, setScope] = useState('all');
  const [customPages, setCustomPages] = useState('');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState(1);
  const [imageScale, setImageScale] = useState(0.4);

  const [previewPage, setPreviewPage] = useState<RenderedPage | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const resultUrlRef = useRef<string | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const {
    step,
    setStep,
    file,
    setFile,
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

  const releaseResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  const releaseImage = useCallback(() => {
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      releaseResult();
      releaseImage();
    },
    [releaseResult, releaseImage]
  );

  const loadPreview = useCallback(async (selected: File) => {
    setLoadingPreview(true);
    setPreviewPage(null);
    try {
      const buffer = await selected.arrayBuffer();
      const { getPdfInfo } = await import('@/lib/pdfPreview');
      const info = await getPdfInfo(buffer);
      setPageCount(info.numPages);
      const [page] = await renderPdfPages(buffer, { pages: [1], targetWidth: 500 });
      setPreviewPage(page ?? null);
    } catch {
      setError('Could not render a preview for this PDF. The watermark can still be applied.');
    } finally {
      setLoadingPreview(false);
    }
  }, [setError]);

  const handleFile = (selected: FileList | null) => {
    const selectedFile = selected?.[0] || null;
    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      setError('Please upload a valid PDF file');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setSuccess(false);
    releaseResult();
    setResult(null);
    void loadPreview(selectedFile);
  };

  const handleImage = (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(selected.type)) {
      setError('The watermark image must be a PNG or JPG file');
      return;
    }
    releaseImage();
    const url = URL.createObjectURL(selected);
    imageUrlRef.current = url;
    setImageFile(selected);
    setImageUrl(url);
    setError(null);

    const probe = new Image();
    probe.onload = () => setImageAspect(probe.naturalHeight / probe.naturalWidth || 1);
    probe.src = url;
  };

  const handleContinueToOptions = () => {
    if (!file) {
      setError('Please select a PDF file to continue');
      return;
    }
    setError(null);
    goToOptions();
  };

  const fontCss = useMemo(
    () => FONTS.find((f) => f.value === fontFamily)?.css || 'Helvetica, Arial, sans-serif',
    [fontFamily]
  );

  /** Approximate text width in points, used only to lay out the tiled preview. */
  const measureText = useCallback(
    (value: string, size: number) => {
      if (typeof document === 'undefined') return value.length * size * 0.5;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return value.length * size * 0.5;
      context.font = `${size}px ${fontCss}`;
      return context.measureText(value).width;
    },
    [fontCss]
  );

  const handleProcess = async () => {
    if (!file) return;
    if (mode === 'text' && !text.trim()) {
      setError('Enter the watermark text');
      return;
    }
    if (mode === 'image' && !imageFile) {
      setError('Choose a watermark image');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'options',
        JSON.stringify({
          mode,
          text,
          fontSize,
          fontFamily,
          color,
          opacity,
          rotation,
          position,
          margin,
          tile,
          scale: imageScale,
          pages: scope === 'custom' ? customPages || 'all' : scope,
        })
      );
      if (mode === 'image' && imageFile) form.append('image', imageFile);

      const res = await fetch('/api/tools/watermark', { method: 'POST', body: form });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Watermarking failed');
      }

      const blob = await res.blob();
      releaseResult();
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult(url);
      setSuccess(true);
      startCountdown();
      goToDownload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add watermark');
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
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return timer;
  };

  const handleDownload = () => {
    if (!result || countdown > 0) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-watermarked.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    releaseResult();
    releaseImage();
    setPreviewPage(null);
    setImageFile(null);
    setImageUrl(null);
    setPageCount(0);
    resetAll();
  };

  const renderWatermarkElement = (scale: number, key: string) => {
    if (mode === 'text') {
      return (
        <span
          key={key}
          style={{
            fontSize: fontSize * scale,
            lineHeight: 1,
            color,
            opacity,
            fontFamily: fontCss,
            whiteSpace: 'nowrap',
            transform: `rotate(${-rotation}deg)`,
            display: 'inline-block',
          }}
        >
          {text}
        </span>
      );
    }
    if (!imageUrl || !previewPage) return null;
    const width = previewPage.width * imageScale * scale;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={key}
        src={imageUrl}
        alt="Watermark"
        style={{
          width,
          height: width * imageAspect,
          opacity,
          transform: `rotate(${-rotation}deg)`,
          maxWidth: 'none',
        }}
      />
    );
  };

  const renderPreview = () => {
    if (!previewPage) return null;
    const displayWidth = 460;
    const scale = displayWidth / previewPage.width;
    const { justifyContent, alignItems } = alignmentFor(position);

    const blockWidth =
      mode === 'text' ? measureText(text || ' ', fontSize) : previewPage.width * imageScale;
    const blockHeight = mode === 'text' ? fontSize * 0.7 : previewPage.width * imageScale * imageAspect;

    return (
      <div
        className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white mx-auto"
        style={{ width: displayWidth, height: previewPage.height * scale }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewPage.dataUrl} alt="Page 1" className="absolute inset-0 w-full h-full" />

        {tile ? (
          <div className="absolute inset-0 overflow-hidden">
            {tileCenters(previewPage.width, previewPage.height, blockWidth, blockHeight).map((center, index) => (
              <div
                key={index}
                className="absolute"
                style={{
                  left: center.x * scale,
                  top: center.y * scale,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {renderWatermarkElement(scale, `tile-${index}`)}
              </div>
            ))}
          </div>
        ) : (
          <div
            className="absolute flex overflow-hidden"
            style={{ inset: margin * scale, justifyContent, alignItems }}
          >
            {renderWatermarkElement(scale, 'single')}
          </div>
        )}
      </div>
    );
  };

  return (
    <ToolPageShell title="Watermark" description="Add text or image watermarks to PDFs." icon={Droplets}>
      <div className="max-w-6xl mx-auto">
        <StepIndicator currentStep={step} labels={{ upload: 'Upload', options: 'Watermark', download: 'Download' }} />
        <ProcessingModal open={isProcessing} />
        <div key={step} className="animate-slide-up">
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard>
                <div className="text-center mb-6">
                  <h2 className="font-display font-bold text-xl text-brand-dark mb-2">Upload Your PDF</h2>
                  <p className="text-sm text-gray-500">Preview the watermark on the real page before applying</p>
                </div>
                {!file ? (
                  <ToolUploadZone
                    icon={Upload}
                    title="Drop a PDF file here"
                    subtitle="or click to browse from your computer"
                    accept="application/pdf"
                    onFiles={handleFile}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">{file.name}</span>
                      </div>
                      {pageCount > 0 && <span className="text-xs text-gray-500">{pageCount} pages</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setFile(null);
                          setPreviewPage(null);
                          setPageCount(0);
                          setError(null);
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                      {loadingPreview && (
                        <span className="flex items-center gap-2 text-xs text-gray-500">
                          <Spinner size={14} /> Preparing preview…
                        </span>
                      )}
                    </div>
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
                <ToolPrimaryButton onClick={handleContinueToOptions} disabled={!file} className="min-w-[160px]">
                  Continue
                  <Droplets className="w-4 h-4" />
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <ToolCard className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-display font-bold text-xl text-brand-dark mb-1">Watermark</h2>
                      <p className="text-sm text-gray-500">Text or image, positioned exactly</p>
                    </div>
                    <button
                      onClick={() => setStep('upload')}
                      className="text-xs font-semibold text-gray-500 hover:text-brand-red transition-colors cursor-pointer"
                    >
                      ← Back
                    </button>
                  </div>

                  <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-5">
                    <button
                      onClick={() => setMode('text')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        mode === 'text' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      <Type className="w-4 h-4" /> Text
                    </button>
                    <button
                      onClick={() => setMode('image')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        mode === 'image' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" /> Image
                    </button>
                  </div>

                  <div className="space-y-4">
                    {mode === 'text' ? (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Watermark text</label>
                          <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="CONFIDENTIAL"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">Size: {fontSize}pt</label>
                            <input
                              type="range"
                              min={8}
                              max={160}
                              value={fontSize}
                              onChange={(e) => setFontSize(Number(e.target.value))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-2">Color</label>
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => setColor(e.target.value)}
                              className="w-full h-[42px] px-2 py-1 rounded-xl border border-gray-200 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Font</label>
                          <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                          >
                            {FONTS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Watermark image</label>
                          {!imageUrl ? (
                            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl p-6 cursor-pointer hover:border-brand-red transition-colors">
                              <ImageIcon className="w-8 h-8 text-brand-red" />
                              <span className="text-sm font-semibold text-gray-600">Choose a PNG or JPG</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg"
                                className="hidden"
                                onChange={(e) => handleImage(e.target.files)}
                              />
                            </label>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imageUrl} alt="Watermark" className="w-12 h-12 object-contain" />
                              <span className="flex-1 text-sm font-semibold text-brand-dark truncate">
                                {imageFile?.name}
                              </span>
                              <button
                                onClick={() => {
                                  releaseImage();
                                  setImageFile(null);
                                  setImageUrl(null);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg cursor-pointer"
                                title="Remove image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Width: {Math.round(imageScale * 100)}% of the page
                          </label>
                          <input
                            type="range"
                            min={5}
                            max={100}
                            value={Math.round(imageScale * 100)}
                            onChange={(e) => setImageScale(Number(e.target.value) / 100)}
                            className="w-full"
                          />
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Opacity: {Math.round(opacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          value={Math.round(opacity * 100)}
                          onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Rotation: {rotation}°</label>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={5}
                          value={rotation}
                          onChange={(e) => setRotation(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Position</label>
                        <select
                          value={position}
                          disabled={tile}
                          onChange={(e) => setPosition(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent disabled:opacity-50"
                        >
                          {POSITIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Margin: {margin}pt</label>
                        <input
                          type="range"
                          min={0}
                          max={120}
                          step={2}
                          value={margin}
                          disabled={tile}
                          onChange={(e) => setMargin(Number(e.target.value))}
                          className="w-full disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tile}
                        onChange={(e) => setTile(e.target.checked)}
                        className="w-4 h-4 accent-red-600 cursor-pointer"
                      />
                      <span className="text-sm font-semibold text-gray-700">Tile across the whole page</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">Apply to</label>
                        <select
                          value={scope}
                          onChange={(e) => setScope(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                        >
                          {PAGE_SCOPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {scope === 'custom' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">Pages</label>
                          <input
                            type="text"
                            value={customPages}
                            onChange={(e) => setCustomPages(e.target.value)}
                            placeholder="1-3, 7"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                          />
                        </div>
                      )}
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

                <ToolCard className="lg:col-span-3">
                  <h3 className="font-display font-bold text-lg text-brand-dark mb-1">Live preview</h3>
                  <p className="text-sm text-gray-500 mb-6">Page 1 with the watermark exactly where it will land.</p>

                  {loadingPreview && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Spinner size={36} />
                      <p className="text-sm text-gray-500">Rendering preview…</p>
                    </div>
                  )}

                  {!loadingPreview && previewPage && renderPreview()}

                  {!loadingPreview && !previewPage && (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-500">Preview unavailable — the watermark will still be applied.</p>
                    </div>
                  )}
                </ToolCard>
              </div>

              <div className="flex justify-end gap-3">
                <ToolSecondaryButton onClick={() => setStep('upload')}>Back</ToolSecondaryButton>
                <ToolPrimaryButton onClick={handleProcess} loading={isProcessing} className="!w-auto">
                  {isProcessing ? (
                    <>
                      <Spinner size={20} color="#ffffff" className="shrink-0" />
                      <span>Applying…</span>
                    </>
                  ) : (
                    <>
                      <Droplets className="w-5 h-5 shrink-0" />
                      <span>Apply watermark</span>
                    </>
                  )}
                </ToolPrimaryButton>
              </div>
            </div>
          )}

          {step === 'download' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <ToolCard className="text-center py-12 sm:py-16">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark mb-3">
                  Watermark Added Successfully!
                </h2>
                <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                  Your watermarked PDF is ready for download.
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
                    <span>Watermark Another</span>
                  </ToolSecondaryButton>
                </div>
              </ToolCard>
              <RelatedTools currentTool="watermark" />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
