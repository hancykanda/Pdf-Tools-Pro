import { FileQuestion, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

const features = [
  { title: 'Create Questions', description: 'Add questions tagged by class, subject, and topic.' },
  { title: 'Visibility Control', description: 'Toggle each question between public and private.' },
  { title: 'Reusable Bank', description: 'Build a searchable question bank for exams.' },
];

export default function QuestionsPage() {
  return (
    <PageContainer>
      <Section>
        <PageHeader title="Question Bank" description="Create and organize exam questions." icon={FileQuestion} />

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