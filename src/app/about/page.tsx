import { PageContainer, Section } from '@/components/layout/PageShell';

export default function AboutPage() {
  return (
    <PageContainer>
      <Section>
        <h1 className="font-display font-extrabold text-4xl text-gray-900 mb-6">About PDF Master</h1>
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-lg leading-relaxed mb-6">
            PDF Master is a professional document platform built for educators and professionals.
            We provide free browser-based PDF tools alongside premium AI-powered workspace features.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Our mission is to make document processing accessible, private, and intelligent.
          </p>
        </div>
      </Section>
    </PageContainer>
  );
}