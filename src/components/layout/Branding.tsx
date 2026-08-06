'use client';

import * as React from 'react';

export type Branding = {
  siteName: string;
  siteTagline: string;
  siteLogoUrl: string;
  sitePrimaryColor: string;
};

const DEFAULT_BRANDING: Branding = {
  siteName: 'PDF Master',
  siteTagline: 'Pro Document Platform',
  siteLogoUrl: '',
  sitePrimaryColor: '#E11D48',
};

const BrandingContext = React.createContext<Branding>(DEFAULT_BRANDING);

export function useBranding(): Branding {
  return React.useContext(BrandingContext);
}

export function BrandingProvider({
  initial,
  children,
}: {
  initial?: Partial<Branding>;
  children: React.ReactNode;
}) {
  const [branding, setBranding] = React.useState<Branding>({ ...DEFAULT_BRANDING, ...initial });

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/public/branding')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setBranding({ ...DEFAULT_BRANDING, ...data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}
