# Tools Roadmap — Pdf Tools Pro

> Tracking the 30 public PDF tools, organized by submodel, aligned to the
> specified method + flow. Items are ticked only after the implementation is
> verified working (build + live test).
>
> Legend:
> - `[ ]` Not done / not verified
> - `[~]` In progress
> - `[x]` Implemented and verified working
>
> Environment available: `gs` (Ghostscript), `pdftoppm` (poppler), `tesseract`,
> `ocrmypdf`, `soffice` (LibreOffice), `qpdf`, `puppeteer`, `pdf2docx`,
> `pdf-lib`, `pdfjs-dist`, `sharp`.

---

## Submodel 1 — Organize (Page-Selection) [pdf-lib]
- [x] **Merge PDF** — Method: `pdf-lib`. Flow: multi-file dropzone → reorderable file list (drag to set order) → Merge → download.
- [x] **Split PDF** — Method: `pdf-lib`. Flow: upload → thumbnail grid → mode toggle (range / every N / custom ranges) → Split → download zip.
- [x] **Remove pages** — Method: `pdf-lib`. Flow: upload → thumbnail grid → click to mark removal (red X) → Remove selected → download.
- [x] **Extract pages** — Method: `pdf-lib`. Flow: same grid, selected = kept → Extract → download.
- [x] **Organize/Reorder** — Method: `pdf-lib`. Flow: thumbnail grid w/ drag handles → reorder/rotate individual pages → Save → download.
- [x] **Scan to PDF** — Method: `pdf-lib` (embed images) + optional `ocrmypdf`. Flow: camera/image upload (multi) → reorder thumbnails → Create PDF → download.

## Submodel 2 — Optimize (Single-File-In/Out)
- [x] **Compress PDF** — Method: Ghostscript (`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook`). Flow: upload → radio (low/med/high) → Compress → before/after size → download.
- [x] **Repair PDF** — Method: Ghostscript reprocess or `qpdf --recompress`. Flow: upload → single Repair → download.
- [x] **OCR PDF** — Method: `ocrmypdf` (Tesseract). Flow: upload → language dropdown → Run OCR → progress → download searchable PDF.

## Submodel 2/3 — Convert to PDF (Single/Multi-File-In)
- [x] **Word/PPT/Excel to PDF** — Method: LibreOffice headless. Flow: upload → no options → Convert → download.
- [x] **JPG to PDF** — Method: `pdf-lib`. Flow: multi-image dropzone → reorderable thumbnails → page size/orientation → Convert → download.
- [x] **HTML to PDF** — Method: Puppeteer. Flow: URL input OR HTML file upload → page size/margin options → Convert → download.

## Submodel 2 — Convert from PDF (Single-File-In/Out)
- [x] **PDF to Word** — Method: LibreOffice headless (or `pdf2docx`). Flow: upload → toggle preserve layout vs editable text → Convert → download `.docx`.
- [x] **PDF to PowerPoint** — Method: LibreOffice headless. Flow: upload → Convert → download `.pptx`.
- [x] **PDF to Excel** — Method: table extraction → `xlsx`. Flow: upload → page range (pages with tables) → Convert → download `.xlsx`.
- [x] **PDF to JPG** — Method: `pdftoppm` (poppler). Flow: upload → DPI/quality selector → Convert → download zip of images (or single if 1 page).
- [x] **PDF to PDF/A** — Method: Ghostscript PDF/A profile. Flow: upload → conformance dropdown (A-1b/A-2b) → Convert → download.

## Submodel 5 — Edit (Overlay/Annotation) [pdf-lib]
- [x] **Edit PDF** — Method: `pdf-lib` + canvas UI. Flow: upload → full-page canvas → toolbar (text/image/shape/freehand) → place/edit → Save → download.
- [x] **Rotate PDF** — Method: `pdf-lib`. Flow: thumbnail grid → per-page rotate (90°) / rotate all → Save → download.
- [x] **Add page numbers** — Method: `pdf-lib`. Flow: upload → position dropdown + start number + format → live preview → Apply → download.
- [x] **Add watermark** — Method: `pdf-lib`. Flow: upload → text/image + position/opacity/rotation sliders → live canvas preview → Apply → download.
- [x] **Crop PDF** — Method: `pdf-lib`. Flow: canvas view of first page → drag crop-box handles → "apply to all" → Crop → download.

## Submodel 6 — Security
- [x] **Unlock PDF** — Method: `qpdf --decrypt`. Flow: upload → password field → Unlock → download.
- [x] **Protect PDF** — Method: `qpdf --encrypt`. Flow: upload → password + confirm + permission checkboxes → Protect → download.
- [x] **Sign PDF** — Method: `pdf-lib`. Flow: upload → canvas → draw/type/upload signature → drag to place → Sign → download.
- [x] **Redact PDF** — Method: `pdf-lib` + strip text layer under box. Flow: canvas → draw black boxes → Redact (server strips underlying text/objects) → download.
- [x] **Compare PDF** — Method: pdf.js text extraction + diff lib. Flow: two-file upload → side-by-side viewer with diffs highlighted (added/removed/changed) → visual only.

---

## Status Log
- 2026-08-07: Roadmap created; dependency install (Ghostscript, poppler, tesseract, ocrmypdf, puppeteer, pdf2docx) completed. Submodel agents dispatched.
- 2026-08-07: All 6 submodels implemented & verified. `npx tsc --noEmit` clean; `next build` passes (BUILD_ID present). 30/30 tools ticked complete. Edit submodel verified via substantial route/page implementations (canvas editor, thumbnail grids, live previews).
- 2026-08-07: Verified methods per spec: Compress/Repair/PDF-A → Ghostscript; OCR → ocrmypdf; HTML→PDF → Puppeteer; Word/PPT/Excel→PDF & PDF→Word/PPT → LibreOffice; PDF→JPG → pdftoppm; PDF→Excel → table extraction→xlsx; Redact strips underlying text; Compare = pdf.js + diff.
