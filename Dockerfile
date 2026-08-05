FROM node:20-alpine AS base

# Install dependencies only
FROM base AS deps
RUN apk add --no-cache libc6-compat qpdf
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

# qpdf CLI is required at runtime by the protect-pdf / unlock-pdf API routes
RUN apk add --no-cache qpdf

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