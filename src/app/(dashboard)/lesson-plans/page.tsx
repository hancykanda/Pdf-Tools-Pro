import { GraduationCap, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PageContainer, Section, PageHeader, Card, ActionButton } from '@/components/layout/PageShell';

const features = [
  { title: 'Plan Lessons', description: 'Create structured lesson plans with objectives and materials.' },
  { title: 'AI Assistance', description: 'Generate lesson content with Gemini when needed.' },
  { title: 'Organize by Subject', description: 'Filter plans by class, subject, and topic.' },
];

export default function LessonPlansPage() {
  return (
    <PageContainer>
      <Section>
        <PageHeader title="Lesson Plans Master" description="Create and manage lesson plans." icon={GraduationCap} />

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