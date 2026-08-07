FROM node:20-alpine AS base

# Install dependencies only
FROM base AS deps
# qpdf CLI is required by protect-pdf / unlock-pdf routes.
# LibreOffice (writer + calc + impress) powers the Office <-> PDF conversions.
# Chromium is used by Puppeteer for html-to-pdf (the bundled download is
# glibc-only, so on Alpine we point Puppeteer at the system build instead).
RUN apk add --no-cache libc6-compat qpdf \
    libreoffice-writer libreoffice-calc libreoffice-impress \
    chromium nss freetype harfbuzz \
    fontconfig ttf-dejavu ttf-liberation \
    poppler-utils
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Install Playwright browsers for E2E tests
FROM deps AS e2e-deps
RUN npx playwright install --with-deps chromium

# Rebuild source
FROM deps AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production runner
FROM base AS runner
WORKDIR /app

# qpdf CLI is required at runtime by the protect-pdf / unlock-pdf API routes.
# LibreOffice powers the Office <-> PDF conversions at runtime.
# Chromium backs Puppeteer for html-to-pdf.
RUN apk add --no-cache qpdf \
    libreoffice-writer libreoffice-calc libreoffice-impress \
    chromium nss freetype harfbuzz \
    fontconfig ttf-dejavu ttf-liberation \
    poppler-utils
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]