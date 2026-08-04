import { FileText, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

const features = [
  { title: 'OCR Powered by Gemini Vision', description: 'Extract text from scanned PDFs and images.' },
  { title: 'Page Reordering', description: 'Drag-and-drop page organization before export.' },
  { title: 'Clean Export', description: 'Save organized PDFs with improved readability.' },
];

export default function OcrOrganizePage() {
  return (
    <PageContainer>
      <Section>
        <PageHeader title="OCR + Organize PDF" description="Scan, recognize, and reorganize documents." icon={FileText} />

        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-brand-dark">How it works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div key={feature.title} className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-display font-semibold text-brand-dark mb-1">{feature.title}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <ActionButton>
          <ArrowRight className="w-5 h-5" />
          Coming Soon
        </ActionButton>
      </Section>
    </PageContainer>
  );
}