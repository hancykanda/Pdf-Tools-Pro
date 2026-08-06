'use client';

import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { BrandingProvider } from '@/components/layout/Branding';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-brand-dark">
        <SiteHeader />

        {/* Main Content */}
        <main className="flex-grow">{children}</main>

        <SiteFooter />
      </div>
    </BrandingProvider>
  );
}
