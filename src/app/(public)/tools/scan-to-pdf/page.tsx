"use client";

import { useState } from "react";
import { FileImage, Upload, Trash2, Download, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolAlert,
} from "@/components/layout/ToolPageShell";

export default function ScantoPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [margin, setMargin] = useState<"none" | "small" | "large">("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resultData, setResultData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const imageFiles = Array.from(selected).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imageFiles]);
    setError(null);
    setSuccess(false);
    setResultData(null);
    setCountdown(0);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const readFiles = await Promise.all(
        files.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
            })
        )
      );

      const res = await fetch("/api/tools/scan-to-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: readFiles, margin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");

      const link = document.createElement("a");
      link.href = data.dataUrl;
      link.download = "scanned.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to convert images to PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    if (!resultData || countdown > 0) return;
    const link = document.createElement('a');
    link.href = resultData;
    link.download = 'result.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ToolPageShell title="Scan to PDF" description="Scan documents directly to PDF format." icon={FileImage}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {files.length === 0 ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop images"
              subtitle="Supports JPG, PNG, WebP"
              accept="image/*"
              multiple
              onFiles={handleFiles}
            />
          ) : (
            <ToolCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg text-brand-dark">
                  Selected Images ({files.length})
                </h3>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs font-bold text-red-500 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-2xl border border-gray-100"
                    />
                    <button
                      onClick={() => handleRemove(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-2 left-2 bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Page Margin</label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(e.target.value as "none" | "small" | "large")}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent"
                >
                  <option value="none">No Margin</option>
                  <option value="small">Small Margin</option>
                  <option value="large">Large Margin</option>
                </select>
              </div>

              <div className="mt-6 border-t border-gray-50 pt-6">
                <ToolUploadZone
                  icon={Upload}
                  title="Add more images"
                  subtitle="Drag and drop or click to browse"
                  accept="image/*"
                  multiple
                  onFiles={handleFiles}
                />
              </div>
            </ToolCard>
          )}

          {error && (
            <ToolAlert type="error">
              <AlertCircle className="w-4 h-4" />
              {error}
            </ToolAlert>
          )}

          {success && (
            <ToolAlert type="success">
              <CheckCircle2 className="w-4 h-4" />
              Images converted to PDF successfully! Your download should begin automatically.
            </ToolAlert>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Conversion Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Convert your scanned images into a single PDF document. Adjust the page margin to
              control how each image fits on its page.
            </p>

            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl mb-6">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Images:</span>
                <span className="text-brand-dark">{files.length}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Combined Size:</span>
                <span className="text-brand-dark">{formatSize(files.reduce((sum, f) => sum + f.size, 0))}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <ToolPrimaryButton onClick={handleConvert} disabled={files.length === 0} loading={isProcessing}>
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <span>Create PDF</span>
                  <Download className="w-5 h-5 shrink-0" />
                </>
              )}
            </ToolPrimaryButton>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
