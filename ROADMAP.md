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

---

## Phase 3: Shared Design System & Layout Standardization
**Goal:** Make every page and tool feel like one coherent product by reusing the homepage layout, typography, and component patterns.

- [x] Audit current homepage layout, spacing, colors, and component patterns
- [x] Extract shared layout primitives into `src/components/layout/`
  - [x] `AppHeader` / `PublicHeader`
  - [x] `AppFooter`
  - [x] `Container` / `Section` spacing helpers
- [x] Extract shared UI primitives into `src/components/ui/`
  - [x] `Button`
  - [x] `Card`
  - [x] `Badge`
  - [x] `Input`
  - [x] `UploadDropzone`
- [x] Apply shared header/footer to all public tool pages
- [x] Apply shared header/footer to auth pages
- [x] Ensure responsive behavior matches homepage on mobile/tablet/desktop
- [x] Run visual regression checks or manual page sweep
- [x] Push standardized layout changes and update roadmap

**Milestone 3 Deliverable:** Consistent layout and styling across all public pages and tools.

---

## Phase 4: Premium Dashboard Shell
**Goal:** Complete the authenticated teacher workspace shell and prepare it for premium features.

- [ ] Finalize dashboard sidebar navigation with active states
- [ ] Add dashboard header with user menu and premium badge
- [ ] Create premium placeholders for:
  - `/dashboard/ai-editor`
  - `/dashboard/exam-header`
  - `/dashboard/ocr-organize`
  - `/dashboard/questions`
  - `/dashboard/papers`
  - `/dashboard/exam-generator`
  - `/dashboard/lesson-plans`
  - `/dashboard/settings`
- [ ] Verify proxy redirects unauthenticated users to `/auth/signin`
- [ ] Verify proxy redirects non-premium users to `/upgrade`
- [ ] Push dashboard shell changes and update roadmap

**Milestone 4 Deliverable:** Fully navigable premium dashboard shell with auth gating enforced.

---

## Phase 5: Premium API Infrastructure
**Goal:** Build the backend routes and infrastructure needed for premium features.

- [ ] Set up MinIO client and file upload/download helpers
- [ ] Create `/api/premium/upload` route for secure file handling
- [ ] Create `/api/premium/files/:id` route for signed downloads
- [ ] Set up BullMQ + Redis job queues
- [ ] Create `/api/premium/jobs/:id/status` route
- [ ] Add Gemini API wrapper with rate-limit handling
- [ ] Create `/api/premium/ai/generate` route
- [ ] Test premium API routes with authenticated requests
- [ ] Push premium API infrastructure and update roadmap

**Milestone 5 Deliverable:** Secure premium API layer with file storage, job queue, and AI wrapper.

---

## Phase 6: Premium Features - AI & OCR
**Goal:** Implement the AI-powered teacher tools.

### AI PDF Editor
- [ ] Build editor UI with pdfjs-dist page rendering
- [ ] Add Gemini-powered text editing prompts
- [ ] Apply edits server-side with pdf-lib
- [ ] Test AI edit flow

### OCR + Organize PDF
- [ ] Build OCR upload UI
- [ ] Create `/api/premium/ocr` route using Gemini Vision
- [ ] Build page reorder/delete UI with pdf-lib
- [ ] Test OCR + organize flow

### Exam Header Customizer
- [ ] Build header upload and preview UI
- [ ] Create `/api/premium/exam-header` route with logo/text detection
- [ ] Port Gemini Vision logo detection logic from standalone Exam Header Editor
- [ ] Test header customization flow

**Milestone 6 Deliverable:** Three core AI premium tools are functional.

---

## Phase 7: Premium Features - Data & Exams
**Goal:** Implement question banks, papers bank, exam generator, and lesson plans.

### Question Bank
- [ ] Build question CRUD UI
- [ ] Create `/api/premium/questions` routes
- [ ] Add public/private toggle with visibility filter
- [ ] Test question bank flow

### Papers Bank
- [ ] Build papers list/search UI
- [ ] Create `/api/premium/papers` routes
- [ ] Add MinIO-backed file downloads
- [ ] Test papers bank flow

### Exam Generator
- [ ] Build exam builder UI with class/subject/topic selectors
- [ ] Create `/api/premium/exam-generate` route
- [ ] Integrate with question bank and exam header branding
- [ ] Generate formatted downloadable exam PDF
- [ ] Test exam generation flow

### Lesson Plans Master
- [ ] Build lesson plan CRUD UI
- [ ] Create `/api/premium/lesson-plans` routes
- [ ] Add AI-assisted generation via Gemini
- [ ] Test lesson plan flow

**Milestone 7 Deliverable:** All premium teacher tools are functional and integrated.

---

## Phase 8: Polish, Testing & Deployment
**Goal:** Production readiness.

- [ ] Add error boundaries and loading states to all tools
- [ ] Add E2E tests for critical flows
- [ ] Add unit tests for PDF utility functions
- [ ] Optimize images and static assets
- [ ] Configure production environment variables
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production
- [ ] Push final release and update roadmap

---

## Current Sprint Focus
**Sprint:** Layout Standardization & Shared Design System
**Target:** Extract homepage layout into reusable components and apply to all pages/tools.

---

## Change Log
- 2026-08-04: Initialized repo, created ROADMAP.md, committed scaffold
- 2026-08-04: Standardized public tool pages with shared PageShell layout components
