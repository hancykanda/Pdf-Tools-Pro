"use client";

import { useState, DragEvent } from "react";
import { FileText, Upload, GripVertical, Plus, Trash2, Download, CheckCircle2, AlertCircle } from "lucide-react";
import {
  ToolPageShell,
  ToolCard,
  ToolUploadZone,
  ToolPrimaryButton,
  ToolAlert,
} from "@/components/layout/ToolPageShell";

export default function OrganizePDFPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pages, setPages] = useState<number[]>([]);
  const [isCounting, setIsCounting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFile = async (selected: FileList | null) => {
    const picked = selected?.[0] || null;
    if (!picked || picked.type !== "application/pdf") {
      setError(picked ? "Please upload a valid PDF file" : "Please upload a file");
      return;
    }

    setFile(picked);
    setError(null);
    setSuccess(false);
    setPages([]);
    setPageCount(null);
    setIsCounting(true);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const arrayBuffer = await picked.arrayBuffer();
      const pdfDoc = await PDFDocument.load(new Uint8Array(arrayBuffer));
      const count = pdfDoc.getPageCount();

      setPageCount(count);
      setPages(Array.from({ length: count }, (_, i) => i + 1));
    } catch {
      setError("Could not read the PDF. It may be corrupted.");
      setPageCount(0);
      setPages([]);
    } finally {
      setIsCounting(false);
    }
  };

  const movePage = (from: number, to: number) => {
    if (from === to) return;
    setPages((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(from, 1);
      updated.splice(to, 0, removed);
      return updated;
    });
  };

  const duplicatePage = (index: number) => {
    setPages((prev) => [...prev, prev[index]]);
  };

  const removePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.setData("text/page-index", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/page-index"));
    if (!Number.isNaN(from)) {
      movePage(from, dropIndex);
    }
  };

  const handleProcess = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const res = await fetch("/api/tools/organize-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, pageOrder: pages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Organize failed");

      const link = document.createElement("a");
      link.href = data.dataUrl;
      link.download = "organized.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to organize PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ToolPageShell title="Organize PDF" description="Reorder, add, or delete pages in PDFs." icon={FileText}>
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {!file ? (
            <ToolUploadZone
              icon={Upload}
              title="Click to upload or drag and drop a PDF file"
              subtitle="Upload your PDF to reorder its pages"
              accept="application/pdf"
              onFiles={handleFile}
            />
          ) : isCounting ? (
            <ToolCard>
              <div className="flex items-center gap-4 py-8 justify-center">
                <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">Reading {file.name}…</span>
              </div>
            </ToolCard>
          ) : (
            <ToolCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-lg text-brand-dark">
                  Pages ({pages.length}/{pageCount})
                </h3>
                <button
                  onClick={() => setPages(Array.from({ length: pageCount || 0 }, (_, i) => i + 1))}
                  className="text-xs font-medium text-brand-red hover:underline"
                >
                  Reset order
                </button>
              </div>

              <p className="text-xs text-gray-500 mb-4 font-sans">
                Drag the handle to reorder. Use + to duplicate a page and ✕ to remove it. The pages
                will be merged in their current order.
              </p>

              <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                {pages.map((pageNumber, index) => (
                  <div
                    key={`${pageNumber}-${index}`}
                    data-page-index={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100/60 transition-colors"
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab shrink-0" />

                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-red/10 text-brand-red font-bold text-sm">
                      {pageNumber}
                    </div>

                    <span className="text-sm font-medium text-gray-700 truncate">
                      Page {pageNumber}
                      <span className="ml-1 text-gray-400">• position {index + 1}</span>
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => duplicatePage(index)}
                        className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-white rounded-lg border border-transparent cursor-pointer"
                        title="Duplicate page"
                        type="button"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removePage(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg border border-transparent cursor-pointer"
                        title="Remove page"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pageCount !== null && pages.length === 0 && (
                <p className="text-xs text-gray-500 mt-4">All pages removed. Upload again to start over.</p>
              )}
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
              PDF organized successfully! Your download should begin automatically.
            </ToolAlert>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-fit">
          <div>
            <h3 className="font-display font-semibold text-lg text-brand-dark mb-4">Options</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-6 font-sans">
              Reorder pages by dragging the grip handle, duplicate a page with +, or remove it with
              the ✕ button. When you are happy with the order, click below to merge the pages into
              a single PDF.
            </p>

            <div className="space-y-3 bg-gray-50 p-4 rounded-2xl mb-6">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Pages to Merge:</span>
                <span className="text-brand-dark">{pages.length}</span>
              </div>
              {pageCount !== null && (
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Total Pages:</span>
                  <span className="text-brand-dark">{pageCount}</span>
                </div>
              )}
            </div>
          </div>

          <ToolPrimaryButton
            onClick={handleProcess}
            disabled={pages.length === 0 || isProcessing}
            loading={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Merge Pages</span>
                <Download className="w-5 h-5 shrink-0" />
              </>
            )}
          </ToolPrimaryButton>
        </div>
      </div>
    </ToolPageShell>
  );
}
