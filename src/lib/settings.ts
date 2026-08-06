/**
 * Site-wide settings store.
 *
 * Admin-editable configuration (site name, logo, primary color, and payment
 * gateway keys) lives in the `SiteSetting` table as a small key/value store.
 * Every reader merges persisted rows over safe in-code defaults so the app
 * still renders when the table is empty or the DB is unreachable.
 *
 * Server-only: imports `@/lib/prisma`. Never import from a client component.
 */
import { prisma } from '@/lib/prisma';

export const GATEWAY_NAMES = ['SNIPPE', 'MANUAL'] as const;
export type GatewayName = (typeof GATEWAY_NAMES)[number];

export type GatewayConfig = {
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  instructions?: string;
};

export type PaymentGateways = Record<string, GatewayConfig>;

export type SiteSettings = {
  siteName: string;
  siteTagline: string;
  /** Data URL or absolute URL for the site logo. Empty = use the text wordmark. */
  siteLogoUrl: string;
  sitePrimaryColor: string;
  defaultGateway: string;
  /** Public origin (https://…) used to build gateway webhook + redirect URLs. */
  appUrl: string;
  paymentGateways: PaymentGateways;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'PDF Master',
  siteTagline: 'Pro Document Platform',
  siteLogoUrl: '',
  sitePrimaryColor: '#E11D48',
  defaultGateway: 'MANUAL',
  appUrl: '',
  paymentGateways: {
    SNIPPE: { enabled: false, publicKey: '', secretKey: '', webhookSecret: '' },
    MANUAL: {
      enabled: true,
      instructions: 'Record bank transfers manually and confirm the subscription in the admin dashboard.',
    },
  },
};

export type SiteSettingsInput = Partial<SiteSettings>;

function defaultGateways(): PaymentGateways {
  return JSON.parse(JSON.stringify(DEFAULT_SITE_SETTINGS.paymentGateways));
}

/** Reads all rows into a `key -> value` map. Empty on any error. */
async function readRows(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSetting.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Full settings object: persisted values merged over defaults. */
export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await readRows();
  const gateways = defaultGateways();
  const stored = parseJson<PaymentGateways>(rows.paymentGateways, {});
  for (const name of GATEWAY_NAMES) {
    if (stored[name]) {
      gateways[name] = { ...gateways[name], ...stored[name] };
    }
  }
  return {
    siteName: rows.siteName ?? DEFAULT_SITE_SETTINGS.siteName,
    siteTagline: rows.siteTagline ?? DEFAULT_SITE_SETTINGS.siteTagline,
    siteLogoUrl: rows.siteLogoUrl ?? DEFAULT_SITE_SETTINGS.siteLogoUrl,
    sitePrimaryColor: rows.sitePrimaryColor ?? DEFAULT_SITE_SETTINGS.sitePrimaryColor,
    defaultGateway: rows.defaultGateway ?? DEFAULT_SITE_SETTINGS.defaultGateway,
    appUrl: rows.appUrl ?? DEFAULT_SITE_SETTINGS.appUrl,
    paymentGateways: gateways,
  };
}

/** Upserts each provided key. Unknown keys are ignored. */
export async function updateSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  const updates: Array<{ key: string; value: string }> = [];

  if (typeof input.siteName === 'string') {
    updates.push({ key: 'siteName', value: input.siteName.trim().slice(0, 80) });
  }
  if (typeof input.siteTagline === 'string') {
    updates.push({ key: 'siteTagline', value: input.siteTagline.trim().slice(0, 120) });
  }
  if (typeof input.siteLogoUrl === 'string') {
    updates.push({ key: 'siteLogoUrl', value: input.siteLogoUrl.slice(0, 2_000_000) });
  }
  if (typeof input.sitePrimaryColor === 'string') {
    updates.push({ key: 'sitePrimaryColor', value: input.sitePrimaryColor.slice(0, 32) });
  }
  if (typeof input.defaultGateway === 'string') {
    updates.push({ key: 'defaultGateway', value: input.defaultGateway });
  }
  if (typeof input.appUrl === 'string') {
    updates.push({ key: 'appUrl', value: input.appUrl.trim().slice(0, 2_000) });
  }
  if (input.paymentGateways && typeof input.paymentGateways === 'object') {
    const merged = defaultGateways();
    const current = await getSiteSettings();
    for (const name of GATEWAY_NAMES) {
      const incoming = input.paymentGateways[name];
      if (incoming && typeof incoming === 'object') {
        merged[name] = { ...merged[name], ...current.paymentGateways[name], ...incoming };
      }
    }
    updates.push({ key: 'paymentGateways', value: JSON.stringify(merged) });
  }

  for (const u of updates) {
    await prisma.siteSetting.upsert({
      where: { key: u.key },
      create: { key: u.key, value: u.value },
      update: { value: u.value },
    });
  }

  return getSiteSettings();
}

export type SiteBranding = Pick<SiteSettings, 'siteName' | 'siteTagline' | 'siteLogoUrl' | 'sitePrimaryColor'>;

/** Lightweight branding subset used by public + dashboard shells. */
export async function getSiteBranding(): Promise<SiteBranding> {
  const s = await getSiteSettings();
  return {
    siteName: s.siteName,
    siteTagline: s.siteTagline,
    siteLogoUrl: s.siteLogoUrl,
    sitePrimaryColor: s.sitePrimaryColor,
  };
}

/**
 * Webhook secret for a gateway, sourced from admin settings first and the
 * environment as a fallback (so existing deploys keep working).
 */
export async function getGatewaySecret(gateway: string): Promise<string> {
  const name = GATEWAY_NAMES.find((g) => g === gateway);
  if (!name) return '';
  const settings = await getSiteSettings();
  const fromDb = settings.paymentGateways[name]?.webhookSecret?.trim();
  if (fromDb) return fromDb;

  const envMap: Record<string, string> = {
    SNIPPE: 'SNIPPE_WEBHOOK_SECRET',
    MANUAL: 'MANUAL_WEBHOOK_SECRET',
  };
  return (process.env[envMap[name]] ?? '').trim();
}

/** Public origin for building gateway webhook/redirect URLs (settings → env). */
export async function getAppUrl(): Promise<string> {
  const settings = await getSiteSettings();
  return (settings.appUrl || process.env.APP_URL || '').trim().replace(/\/$/, '');
}

/**
 * API key (bearer token) for a gateway, sourced from the admin "Secret Key"
 * field first and the environment as a fallback.
 */
export async function getGatewayApiKey(gateway: string): Promise<string> {
  const name = GATEWAY_NAMES.find((g) => g === gateway);
  if (!name) return '';
  const settings = await getSiteSettings();
  const fromDb = settings.paymentGateways[name]?.secretKey?.trim();
  if (fromDb) return fromDb;

  const envMap: Record<string, string> = {
    SNIPPE: 'SNIPPE_API_KEY',
    MANUAL: 'MANUAL_API_KEY',
  };
  return (process.env[envMap[name]] ?? '').trim();
}
