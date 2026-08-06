import { PageContainer, Section } from '@/components/layout/PageShell';

export default function PrivacyPage() {
  return (
    <PageContainer>
      <Section>
        <h1 className="font-display font-extrabold text-4xl text-gray-900 mb-6">Privacy Policy</h1>
        <p className="text-gray-600 text-lg leading-relaxed">Your privacy is important to us. This policy explains how we handle your data.</p>
      </Section>
    </PageContainer>
  );
}