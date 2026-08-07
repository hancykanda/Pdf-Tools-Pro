export interface ToolCategory {
  id: string;
  name: string;
  tools: string[];
}

export const toolCategories: ToolCategory[] = [
  {
    id: 'convert-to-pdf',
    name: 'Convert to PDF',
    tools: [
      'word-to-pdf',
      'excel-to-pdf',
      'powerpoint-to-pdf',
      'html-to-pdf',
      'jpg-to-pdf',
      'scan-to-pdf',
    ],
  },
  {
    id: 'convert-from-pdf',
    name: 'Convert from PDF',
    tools: [
      'pdf-to-word',
      'pdf-to-excel',
      'pdf-to-powerpoint',
      'pdf-to-jpg',
      'pdf-to-markdown',
      'pdf-to-pdfa',
    ],
  },
  {
    id: 'edit-pdf',
    name: 'Edit & Annotate PDF',
    tools: [
      'edit-pdf',
      'watermark',
      'page-numbers',
      'crop-pdf',
      'rotate-pdf',
      'redact-pdf',
      'sign-pdf',
    ],
  },
  {
    id: 'protect-pdf',
    name: 'Protect & Repair PDF',
    tools: [
      'protect-pdf',
      'unlock-pdf',
      'repair-pdf',
      'compress-pdf',
    ],
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    tools: [
      'merge',
      'split',
      'organize-pdf',
      'remove-pages',
      'extract-pages',
      'compare-pdf',
    ],
  },
  {
    id: 'ai-pdf',
    name: 'AI & Analysis',
    tools: [
      'summarize-pdf',
      'translate-pdf',
      'ocr-pdf',
    ],
  },
];

export function getToolCategory(toolSlug: string): ToolCategory | undefined {
  return toolCategories.find((cat) => cat.tools.includes(toolSlug));
}

export function getRelatedTools(currentTool: string, limit = 4): string[] {
  const category = getToolCategory(currentTool);
  if (!category) return [];
  return category.tools.filter((tool) => tool !== currentTool).slice(0, limit);
}
