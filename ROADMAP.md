# Pdf Tools Pro - Development Roadmap

> Project: Pdf Tools Pro
> Stack: Next.js 16 App Router, TypeScript, Tailwind v4, Prisma, MariaDB, MinIO, pdf-lib, pdfjs-dist, BullMQ, Redis, Gemini API
> Status: Active Development

---

## Legend
- [ ] Not started
- [~] In progress
- [x] Completed

---

## Phase 1: Foundation & Scaffolding
**Goal:** Establish project structure, database schema, authentication, and core routing.

- [x] Initialize Next.js 16 App Router + TypeScript project at `/root/pdf-tools`
- [x] Configure Tailwind v4, ESLint, and base theme tokens
- [x] Create route groups: `(public)` for free tools, `(dashboard)` for premium features
- [x] Create API folder structure: `/api/tools`, `/api/premium`, `/api/auth`
- [x] Set up Prisma schema with `User`, `Question`, `Paper`, `LessonPlan`, `ExamHeader` models
- [x] Wire auth layer with JWT sessions and `premium` flag on `User`
- [x] Implement `proxy.ts` to centrally guard `/dashboard` and `/api/premium`
- [x] Add auth pages: `/auth/signin`, `/auth/register`, `/auth/error`
- [x] Add public pages: `/`, `/tools`, `/pricing`, `/upgrade`, `/about`, `/privacy`, `/terms`, `/contact`
- [x] Verify `npm run build` passes

**Milestone 1 Deliverable:** Running Next.js app with auth-gated dashboard routes and public landing experience.

---

## Phase 2: Free Tools v1 (Public Zone)
**Goal:** Port and adapt the core free PDF tools from the original React repo into Next.js server-rendered pages and API routes.

### Merge PDF
- [x] Port merge logic from `/tmp/pdf-master/src/lib/pdfUtils.ts`
- [x] Create `/api/tools/merge` route
- [x] Create `/tools/merge` page with upload + reorder UI
- [x] Test merge flow end-to-end

### Split PDF
- [x] Port split logic from `/tmp/pdf-master/src/lib/pdfUtils.ts`
- [x] Create `/api/tools/split` route
- [x] Create `/tools/split` page with page-range input
- [x] Test split flow end-to-end

### Compress PDF
- [x] Create `/api/tools/compress` route using pdf-lib object streams
- [x] Create `/tools/compress` page with upload + size stats
- [x] Test compression flow end-to-end

### Word to PDF
- [x] Create `/api/tools/word-to-pdf` route using Mammoth + pdf-lib
- [x] Create `/tools/word-to-pdf` page with drag/drop upload
- [x] Test Word-to-PDF conversion flow

### PDF to Word
- [x] Create `/api/tools/pdf-to-word` route using pdf-parse
- [x] Create `/tools/pdf-to-word` page with text extraction + Word download
- [x] Test PDF-to-Word extraction flow

### JPG to PDF
- [x] Port image-to-PDF logic from `/tmp/pdf-master/src/lib/pdfUtils.ts`
- [x] Create `/api/tools/jpg-to-pdf` route
- [x] Create `/tools/jpg-to-pdf` page with margin options
- [x] Test JPG-to-PDF conversion flow

### PDF to JPG
- [x] Create `/tools/pdf-to-jpg` page using pdfjs-dist client-side rendering
- [x] Validate PDF upload and page preview rendering
- [x] Test PDF-to-JPG flow in browser

**Milestone 2 Deliverable:** All 7 free tools are functional in the public zone with working API routes and UI.

### Additional Free Tools v1 (Public Zone)
**Goal:** Expand the public toolset to match competitor coverage and increase organic traffic.

#### Organize PDF
- [x] Add `/tools/organize-pdf` page with drag/drop reorder, add, and delete UI
- [x] Test organize flow end-to-end

#### Optimize PDF
- [x] Add `/tools/repair-pdf` page and API route
- [x] Add `/tools/ocr-pdf` public free tier route and page

#### Convert to PDF
- [x] Add `/tools/powerpoint-to-pdf` page and API route
- [x] Add `/tools/excel-to-pdf` page and API route
- [x] Add `/tools/html-to-pdf` page and API route

#### Convert from PDF
- [x] Add `/tools/pdf-to-powerpoint` page and API route
- [x] Add `/tools/pdf-to-excel` page and API route
- [x] Add `/tools/pdf-to-pdfa` page and API route

#### Edit PDF
- [x] Add `/tools/rotate-pdf` page and API route
- [x] Add `/tools/page-numbers` page and API route
- [x] Add `/tools/watermark` page and API route
- [x] Add `/tools/crop-pdf` page and API route
- [x] Add `/tools/edit-pdf` page with text/image/shape annotations

#### PDF Security
- [x] Add `/tools/unlock-pdf` page and API route
- [x] Add `/tools/protect-pdf` page and API route
- [x] Add `/tools/sign-pdf` page and API route
- [x] Add `/tools/redact-pdf` page and API route
- [x] Add `/tools/compare-pdf` page and API route

#### PDF Intelligence
- [x] Add `/tools/summarize-pdf` page and API route
- [x] Add `/tools/translate-pdf` page and API route
- [x] Add `/tools/pdf-to-markdown` page and API route

#### Scan
- [x] Add `/tools/scan-to-pdf` page and API route

**Milestone 2b Deliverable:** Public toolset covers merge, split, compress, convert, edit, organize, security, OCR, AI intelligence, and scan tools.

---

## Phase 3: Shared Design System & Layout Standardization
**Goal:** Make every page and tool feel like one coherent product by reusing the homepage layout, typography, and component patterns.

- [x] Audit current homepage layout, spacing, colors, and component patterns
- [x] Extract shared layout primitives into `src/components/layout/`
  - [x] `PageContainer`, `Section`, `PageHeader`, `UploadZone`, `ActionButton`, `Alert`, `Card`, `AuthLayout`
- [x] Extract shared UI primitives into `src/components/ui/`
  - [x] `Button`, `Card`, `Badge`, `Input`, `UploadDropzone`
- [x] Apply shared layout components to all public tool pages
- [x] Apply shared layout components to auth pages
- [x] Apply shared layout components to public info pages (pricing, upgrade, about, privacy, terms, contact)
- [x] Ensure responsive behavior matches homepage on mobile/tablet/desktop
- [x] Run `npm run build` after each batch of changes
- [x] Push standardized layout changes and update roadmap

**Milestone 3 Deliverable:** Consistent layout and styling across all public pages and tools.

---

## Phase 4: Premium Dashboard Shell
**Goal:** Complete the authenticated teacher workspace shell and prepare it for premium features.

- [x] Finalize dashboard sidebar navigation with active states
- [x] Add dashboard header with user menu and premium badge
- [x] Create premium placeholders for:
  - [x] `/dashboard/ai-editor`
  - [x] `/dashboard/exam-header`
  - [x] `/dashboard/ocr-organize`
  - [x] `/dashboard/questions`
  - [x] `/dashboard/papers`
  - [x] `/dashboard/exam-generator`
  - [x] `/dashboard/lesson-plans`
  - [x] `/dashboard/settings`
- [x] Verify proxy redirects unauthenticated users to `/auth/signin`
- [x] Verify proxy redirects non-premium users to `/upgrade`
- [x] Push dashboard shell changes and update roadmap

**Milestone 4 Deliverable:** Fully navigable premium dashboard shell with auth gating enforced.

---

## Phase 5: Premium API Infrastructure
**Goal:** Build the backend routes and infrastructure needed for premium features.

- [x] Set up MinIO client and file upload/download helpers
- [x] Create `/api/premium/upload` route for secure file handling
- [x] Create `/api/premium/files/:id` route for signed downloads
- [x] Set up BullMQ + Redis job queues
- [x] Create `/api/premium/jobs/:id/status` route
- [x] Add Gemini API wrapper with rate-limit handling
- [x] Create `/api/premium/ai/generate` route
- [x] Test premium API routes with authenticated requests
- [x] Push premium API infrastructure and update roadmap

**Milestone 5 Deliverable:** Secure premium API layer with file storage, job queue, and AI wrapper.

---

## Phase 6: Premium Features - AI & OCR
**Goal:** Implement the AI-powered teacher tools.

### AI PDF Editor
- [x] Build editor UI with upload, prompt input, and download flow
- [x] Add Gemini-powered text editing prompts
- [x] Apply edits server-side with pdf-lib and MinIO/BullMQ job flow
- [x] Test AI edit flow

### OCR + Organize PDF
- [x] Build OCR upload UI with page reorder controls
- [x] Create `/api/premium/ocr` route using Gemini Vision
- [x] Build page reorder/delete UI with pdf-lib
- [x] Test OCR + organize flow

### Exam Header Customizer
- [x] Build header upload and preview UI
- [x] Create `/api/premium/exam-header` route with Gemini Vision analysis
- [x] Port logo/text detection logic via Gemini prompts
- [x] Test header customization flow

**Milestone 6 Deliverable:** Three core AI premium tools are functional.

---

## Phase 7: Premium Features - Data & Exams
**Goal:** Implement question banks, papers bank, exam generator, and lesson plans.

### Question Bank
- [x] Build question CRUD UI with subject/topic/difficulty filters
- [x] Create `/api/premium/questions` routes
- [x] Add public/private toggle with visibility filter
- [x] Test question bank flow

### Papers Bank
- [x] Build papers list/search UI with upload form
- [x] Create `/api/premium/papers` routes with MinIO-backed downloads
- [x] Add metadata tagging and download counts
- [x] Test papers bank flow

### Exam Generator
- [x] Build exam builder UI with class/subject/topic selectors
- [x] Create `/api/premium/exam-generate` route
- [x] Integrate with question bank and exam header branding
- [x] Generate formatted downloadable exam PDF
- [x] Test exam generation flow

### Lesson Plans Master
- [x] Build lesson plan CRUD UI
- [x] Create `/api/premium/lesson-plans` routes
- [x] Add AI-assisted generation via Gemini
- [x] Test lesson plan flow

**Milestone 7 Deliverable:** All premium teacher tools are functional and integrated.

---

## Phase 8: Polish, Testing & Deployment
**Goal:** Production readiness.

- [x] Add error boundaries and loading states to all tools
- [x] Add E2E tests for critical flows
- [x] Add unit tests for PDF utility functions
- [x] Optimize images and static assets
- [x] Configure production environment variables
- [x] Set up CI/CD pipeline
- [x] Deploy to production
- [x] Push final release and update roadmap

---

## Current Sprint Focus
**Sprint:** Premium Features - AI & OCR
**Target:** Implement AI PDF editor, OCR + organize PDF, and exam header customizer.

---

## Change Log
- 2026-08-04: Initialized repo, created ROADMAP.md, committed scaffold
- 2026-08-04: Standardized public tool pages with shared PageShell layout components
- 2026-08-04: Applied shared layout to auth pages and public info pages; build passes
- 2026-08-04: Added premium dashboard shell with placeholder pages and premium API route stubs
- 2026-08-04: Implemented Phase 5 premium API infrastructure (MinIO, BullMQ, Gemini, upload/files/jobs/ai routes); build passes
- 2026-08-04: Audited iLovePDF tool catalog and expanded Phase 2 roadmap with 23 additional public tools across organize, optimize, convert, edit, security, and AI intelligence categories
- 2026-08-04: Updated public tools listing page and header/footer tool navigation to reflect expanded roadmap
- 2026-08-04: Implemented all 30 public PDF tools with functional pages and API routes
- 2026-08-04: Fixed header clickability, mobile menu overlay, upload zones, and dev-server cross-origin/font issues
- 2026-08-04: Implemented Phase 6 premium AI tools: AI PDF Editor, OCR + Organize, Exam Header Customizer
- 2026-08-04: Implemented Phase 7 premium data tools: Question Bank, Papers Bank, Exam Generator, Lesson Plans
- 2026-08-04: Implemented Phase 8 polish: error boundaries, loading states, unit tests, E2E tests, CI/CD, Docker, and deployment configs
- 2026-08-04: Phase 8 complete — error boundaries, loading states, unit tests, E2E tests, optimized assets, production env vars, CI/CD pipeline, Docker deployment; build passes
