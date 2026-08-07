# Remove Watermark / Logo — Python sidecar

A small FastAPI service that the pdf-tools-pro Node backend calls to remove
watermarks/logos from PDFs and images using OpenCV.

## Endpoint

`POST /remove-watermark` (multipart/form-data)

| field        | type   | required | notes                                            |
|--------------|--------|----------|--------------------------------------------------|
| `file`       | file   | yes      | PDF or image (PNG/JPG) to clean                  |
| `template`   | file   | no       | Reference logo image for auto-detect (match) mode |
| `box`        | string | no       | Manual box JSON `{"x","y","w","h"}` in 0..1       |
| `applyToAll` | string | no       | `"true"` (default) / `"false"` (first page only) |

One of `template` or `box` is required. Returns the cleaned file
(`application/pdf` or `image/png`) with a `Content-Disposition` header.

Method: `cv2.matchTemplate` (multi-scale) to locate the logo, then
`cv2.inpaint` (TELEA) to fill the region. Without a template, the manual box
is inpainted instead. Multi-page PDFs are rasterized (poppler), cleaned per
page, and reassembled with `img2pdf`.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# poppler-utils must be installed on the host for PDF rendering
./start.sh
```

The Node route calls this service at `PYTHON_SIDECAR_URL` (default
`http://localhost:8001`).
