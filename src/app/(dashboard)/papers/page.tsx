import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

const features = [
  { title: 'Search Papers', description: 'Find past exam papers by subject and class.' },
  { title: 'Download Securely', description: 'Access files through protected premium routes.' },
  { title: 'Curated Library', description: 'Build a reusable papers bank for teachers.' },
];

export default function PapersPage() {
  return (
    <PageContainer>
      <Section>
        <PageHeader title="Papers Bank" description="Search and download past exam papers." icon={BookOpen} />

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