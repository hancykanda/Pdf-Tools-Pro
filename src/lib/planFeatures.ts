/**
 * Catalog of selectable plan features used by both the admin Plans manager
 * (tickable checklist) and the public pricing page (feature lists).
 *
 * This is a PURE data module (no server-only imports) so it can be used from
 * client components, server components, and the seed script alike.
 *
 * A plan's `features` column stores an array of these `id`s as JSON. Unknown
 * ids fall back to a prettified label so legacy/raw strings still render.
 */

export type FeatureItem = { id: string; label: string };

export const FREE_TOOLS: FeatureItem[] = [
  { id: 'word-to-pdf', label: 'Word to PDF' },
  { id: 'excel-to-pdf', label: 'Excel to PDF' },
  { id: 'powerpoint-to-pdf', label: 'PowerPoint to PDF' },
  { id: 'html-to-pdf', label: 'HTML to PDF' },
  { id: 'jpg-to-pdf', label: 'JPG to PDF' },
  { id: 'scan-to-pdf', label: 'Scan to PDF' },
  { id: 'pdf-to-word', label: 'PDF to Word' },
  { id: 'pdf-to-excel', label: 'PDF to Excel' },
  { id: 'pdf-to-powerpoint', label: 'PDF to PowerPoint' },
  { id: 'pdf-to-jpg', label: 'PDF to JPG' },
  { id: 'pdf-to-markdown', label: 'PDF to Markdown' },
  { id: 'pdf-to-pdfa', label: 'PDF to PDF/A' },
  { id: 'edit-pdf', label: 'Edit PDF' },
  { id: 'watermark', label: 'Watermark' },
  { id: 'page-numbers', label: 'Page Numbers' },
  { id: 'crop-pdf', label: 'Crop PDF' },
  { id: 'rotate-pdf', label: 'Rotate PDF' },
  { id: 'redact-pdf', label: 'Redact PDF' },
  { id: 'sign-pdf', label: 'Sign PDF' },
  { id: 'protect-pdf', label: 'Protect PDF' },
  { id: 'unlock-pdf', label: 'Unlock PDF' },
  { id: 'repair-pdf', label: 'Repair PDF' },
  { id: 'compress-pdf', label: 'Compress PDF' },
  { id: 'merge', label: 'Merge PDF' },
  { id: 'split', label: 'Split PDF' },
  { id: 'organize-pdf', label: 'Organize PDF' },
  { id: 'compare-pdf', label: 'Compare PDF' },
  { id: 'summarize-pdf', label: 'AI Summarizer' },
  { id: 'translate-pdf', label: 'Translate PDF' },
  { id: 'ocr-pdf', label: 'OCR PDF' },
];

export const PREMIUM_TOOLS: FeatureItem[] = [
  { id: 'ai-editor', label: 'AI PDF Editor' },
  { id: 'exam-header', label: 'Exam Header Customizer' },
  { id: 'ocr-organize', label: 'OCR + Organize PDF' },
  { id: 'questions', label: 'Question Bank' },
  { id: 'papers', label: 'Papers Bank' },
  { id: 'exam-generator', label: 'Exam Generator' },
  { id: 'lesson-plans', label: 'Lesson Plans' },
  { id: 'remove-watermark', label: 'Remove Watermark' },
];

export const ALL_FREE_TOOL_IDS: string[] = FREE_TOOLS.map((t) => t.id);

export const PLAN_FEATURE_GROUPS: { group: string; items: FeatureItem[] }[] = [
  { group: 'Free Tools', items: FREE_TOOLS },
  { group: 'Premium Tools', items: PREMIUM_TOOLS },
];

const LABEL_BY_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const item of [...FREE_TOOLS, ...PREMIUM_TOOLS]) map[item.id] = item.label;
  return map;
})();

function prettify(id: string): string {
  return id
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Turn stored feature ids into human-readable labels (legacy strings pass through). */
export function resolveFeatureLabels(features: string[]): string[] {
  if (!Array.isArray(features)) return [];
  return features.map((f) => LABEL_BY_ID[f] ?? prettify(f));
}

/** True when every free tool id is present in the selection. */
export function hasAllFreeTools(features: string[]): boolean {
  const ids = Array.isArray(features) ? features : [];
  return ALL_FREE_TOOL_IDS.every((id) => ids.includes(id));
}

/**
 * Collapse a feature selection into display labels. When the plan includes
 * every free tool, the 30 individual free-tool entries are replaced by a
 * single "All free tools" line, followed by any premium tools individually.
 * Otherwise the selection is expanded to labels as-is.
 */
export function summarizeFeatures(features: string[]): string[] {
  const ids = Array.isArray(features) ? features : [];
  if (hasAllFreeTools(ids)) {
    const premium = PREMIUM_TOOLS.filter((t) => ids.includes(t.id)).map((t) => t.label);
    return ['All free tools', ...premium];
  }
  return resolveFeatureLabels(ids);
}
