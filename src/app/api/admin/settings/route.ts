import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import {
  getSiteSettings,
  updateSiteSettings,
  GATEWAY_NAMES,
  type PaymentGateways,
  type GatewayConfig,
} from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole(['ADMIN']);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    const status = /authenticat/i.test(msg) ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

function sanitizeGateways(input: unknown): PaymentGateways | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  const result: PaymentGateways = {};
  for (const name of GATEWAY_NAMES) {
    const raw = obj[name];
    if (!raw || typeof raw !== 'object') continue;
    const g = raw as Record<string, unknown>;
    const cfg: GatewayConfig = {
      enabled: Boolean(g.enabled),
      publicKey: typeof g.publicKey === 'string' ? g.publicKey : '',
      secretKey: typeof g.secretKey === 'string' ? g.secretKey : '',
      webhookSecret: typeof g.webhookSecret === 'string' ? g.webhookSecret : '',
      instructions: typeof g.instructions === 'string' ? g.instructions : undefined,
    };
    result[name] = cfg;
  }
  return result;
}

export async function PUT(request: NextRequest) {
  try {
    await requireRole(['ADMIN']);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Forbidden';
    const status = /authenticat/i.test(msg) ? 401 : 403;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    const body = await request.json();

    const patch: Parameters<typeof updateSiteSettings>[0] = {};
    if (typeof body.siteName === 'string') patch.siteName = body.siteName;
    if (typeof body.siteTagline === 'string') patch.siteTagline = body.siteTagline;
    if (typeof body.siteLogoUrl === 'string') patch.siteLogoUrl = body.siteLogoUrl;
    if (typeof body.sitePrimaryColor === 'string') patch.sitePrimaryColor = body.sitePrimaryColor;
    if (typeof body.defaultGateway === 'string') patch.defaultGateway = body.defaultGateway;
    const gateways = sanitizeGateways(body.paymentGateways);
    if (gateways) patch.paymentGateways = gateways;

    const updated = await updateSiteSettings(patch);
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
