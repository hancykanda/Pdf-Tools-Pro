import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Master - Professional PDF Tools Platform',
  description: 'Free PDF tools and premium teacher workspace.',
  keywords: ['PDF', 'merge', 'split', 'compress', 'convert', 'teacher tools'],
  authors: [{ name: 'PDF Master' }],
};

export const viewport: Viewport = {
  themeColor: '#E11D48',
  width: 'device-width',
  initialScale: 1,
};

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen bg-[#F8F9FA] text-brand-dark antialiased">
        {children}
      </body>
    </html>
  );
}