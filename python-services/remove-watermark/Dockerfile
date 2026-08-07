FROM python:3.12-slim

# poppler-utils provides pdftoppm used by pdf2image to rasterize PDF pages.
RUN apt-get update -qq \
    && apt-get install -y -qq poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
