import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Master - Professional PDF Tools Platform',
  description: 'Free PDF tools: merge, split, compress, convert. Premium teacher tools: AI editor, exam builder, question bank, lesson plans.',
  keywords: ['PDF', 'merge', 'split', 'compress', 'convert', 'Word to PDF', 'PDF to Word', 'teacher tools', 'exam builder'],
  authors: [{ name: 'PDF Master' }],
  openGraph: {
    title: 'PDF Master - Professional PDF Tools Platform',
    description: 'Free PDF tools and premium teacher workspace.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#E11D48',
  width: 'device-width',
  initialScale: 1,
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable}`}>
        <body className="min-h-screen bg-[#F8F9FA] text-brand-dark antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}