import { PageContainer, Section } from '@/components/layout/PageShell';

export default function TermsPage() {
  return (
    <PageContainer>
      <Section>
        <h1 className="font-display font-extrabold text-4xl text-gray-900 mb-6">Terms of Service</h1>
        <p className="text-gray-600 text-lg leading-relaxed">These terms govern your use of PDF Master.</p>
      </Section>
    </PageContainer>
  );
}