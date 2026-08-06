import { PageContainer, Section } from '@/components/layout/PageShell';

export default function ContactPage() {
  return (
    <PageContainer>
      <Section>
        <h1 className="font-display font-extrabold text-4xl text-gray-900 mb-6">Contact Us</h1>
        <p className="text-gray-600 text-lg leading-relaxed">Have questions? Reach out to our team.</p>
      </Section>
    </PageContainer>
  );
}