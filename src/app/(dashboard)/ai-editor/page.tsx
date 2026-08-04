import { BrainCircuit, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

const features = [
  { title: 'AI-Powered Editing', description: 'Edit PDF content using natural language prompts powered by Gemini.' },
  { title: 'Smart Formatting', description: 'Automatically reformat, summarize, and restructure document content.' },
  { title: 'Export Ready', description: 'Download your edited PDF instantly with changes applied server-side.' },
];

export default function AiEditorPage() {
  return (
    <PageContainer>
      <Section>
        <PageHeader title="AI PDF Editor" description="Edit and enhance PDFs using AI." icon={BrainCircuit} />

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