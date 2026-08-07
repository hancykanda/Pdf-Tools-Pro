"""
Remove Watermark / Logo — Python sidecar service.

FastAPI app exposing POST /remove-watermark used by the pdf-tools-pro Node
backend. It uses OpenCV template matching + inpainting:

  1. Render each PDF page (or the uploaded image) to a raster.
  2. If a reference logo/template is supplied: cv2.matchTemplate() locates it
     (multi-scale) and the matched region is inpainted with cv2.inpaint().
  3. Otherwise fall back to a manual box (normalized 0..1) and inpaint that.
  4. Reassemble the cleaned pages back into a PDF (or return the cleaned image).

Run:  uvicorn main:app --host 0.0.0.0 --port 8001
"""
from __future__ import annotations

import io
import os
from typing import List, Optional, Tuple

import cv2
import numpy as np
import img2pdf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from PIL import Image
from pdf2image import convert_from_bytes

app = FastAPI(title="pdf-tools remove-watermark sidecar")

# Minimum template-match confidence required to treat a hit as the watermark.
MATCH_THRESHOLD = 0.55
# Inpainting radius (pixels).
INPAINT_RADIUS = 4


def _is_pdf(data: bytes) -> bool:
    return data[:4] == b"%PDF" or data[:5] == b"%PDF-"


def _to_bgr(image: Image.Image) -> np.ndarray:
    """PIL RGB/RGBA -> OpenCV BGR uint8."""
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def _pil_to_png_bytes(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    image.save(buf, format="PNG")
    return buf.getvalue()


def _inpaint_region(bgr: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    hh, ww = bgr.shape[:2]
    x0, y0 = max(0, int(x)), max(0, int(y))
    x1, y1 = min(ww, int(x + w)), min(hh, int(y + h))
    if x1 <= x0 or y1 <= y0:
        return bgr
    mask = np.zeros((hh, ww), dtype=np.uint8)
    mask[y0:y1, x0:x1] = 255
    return cv2.inpaint(bgr, mask, INPAINT_RADIUS, cv2.INPAINT_TELEA)


def _match_template(bgr: np.ndarray, template_bgr: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """Return (x, y, w, h) of the best multi-scale template match, or None."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    tpl_gray = cv2.cvtColor(template_bgr, cv2.COLOR_BGR2GRAY)

    best: Optional[Tuple[float, Tuple[int, int], Tuple[int, int]]] = None
    for scale in np.linspace(0.4, 1.6, 13):
        nw, nh = int(tpl_gray.shape[1] * scale), int(tpl_gray.shape[0] * scale)
        if nw < 8 or nh < 8:
            continue
        if nw > gray.shape[1] or nh > gray.shape[0]:
            continue
        resized = cv2.resize(tpl_gray, (nw, nh))
        try:
            res = cv2.matchTemplate(gray, resized, cv2.TM_CCOEFF_NORMED)
        except cv2.error:
            continue
        _, maxv, _, maxloc = cv2.minMaxLoc(res)
        if best is None or maxv > best[0]:
            best = (float(maxv), maxloc, (nw, nh))

    if best is None or best[0] < MATCH_THRESHOLD:
        return None
    (top_left_x, top_left_y), (bw, bh) = best[1], best[2]
    return (top_left_x, top_left_y, bw, bh)


def _clean_page(
    bgr: np.ndarray,
    template_bgr: Optional[np.ndarray],
    box: Optional[dict],
    apply_to_all: bool,
    is_first: bool,
) -> np.ndarray:
    # Only the first page is cleaned with the manual box unless apply_to_all.
    if template_bgr is not None:
        region = _match_template(bgr, template_bgr)
        if region is not None:
            x, y, w, h = region
            return _inpaint_region(bgr, x, y, w, h)
        # No confident match: leave the page untouched.
        return bgr

    if box is not None and (apply_to_all or is_first):
        hh, ww = bgr.shape[:2]
        x = box["x"] * ww
        y = box["y"] * hh
        w = box["w"] * ww
        h = box["h"] * hh
        return _inpaint_region(bgr, x, y, w, h)

    return bgr


def _render_pages(data: bytes) -> List[Image.Image]:
    if _is_pdf(data):
        return convert_from_bytes(data, dpi=150)
    return [Image.open(io.BytesIO(data))]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/remove-watermark")
async def remove_watermark(
    file: UploadFile = File(...),
    template: Optional[UploadFile] = File(None),
    box: Optional[str] = Form(None),
    applyToAll: Optional[str] = Form("true"),
):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File is required")

    template_bgr: Optional[np.ndarray] = None
    if template is not None:
        tpl_bytes = await template.read()
        if tpl_bytes:
            try:
                template_bgr = _to_bgr(Image.open(io.BytesIO(tpl_bytes)))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid template image")

    parsed_box: Optional[dict] = None
    if box:
        try:
            import json

            parsed_box = json.loads(box)
            for k in ("x", "y", "w", "h"):
                if k not in parsed_box:
                    raise ValueError("missing key")
                parsed_box[k] = float(parsed_box[k])
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid box JSON (need x,y,w,h in 0..1)")

    if template_bgr is None and parsed_box is None:
        raise HTTPException(
            status_code=400,
            detail="Provide a reference logo (template) or a manual box to locate the watermark.",
        )

    apply_all = str(applyToAll).lower() != "false"

    try:
        pages = _render_pages(data)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"Could not read document: {exc}")

    cleaned: List[bytes] = []
    for idx, page in enumerate(pages):
        bgr = _to_bgr(page)
        bgr = _clean_page(bgr, template_bgr, parsed_box, apply_all, is_first=(idx == 0))
        cleaned.append(_pil_to_png_bytes(Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))))

    base_name = os.path.splitext(file.filename or "document")[0]

    if _is_pdf(data):
        try:
            pdf_bytes = img2pdf.convert(cleaned)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"Failed to reassemble PDF: {exc}")
        media_type = "application/pdf"
        disposition = f'attachment; filename="{base_name}-clean.pdf"'
        body = pdf_bytes
    else:
        media_type = "image/png"
        disposition = f'attachment; filename="{base_name}-clean.png"'
        body = cleaned[0]

    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": disposition},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
