'use client';

import * as React from 'react';
import { Save, Upload, Trash2, Loader2, CreditCard, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';

const GATEWAYS = ['SNIPPE', 'MANUAL'] as const;
type GatewayName = (typeof GATEWAYS)[number];

type GatewayConfig = {
  enabled: boolean;
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  instructions?: string;
};

type Settings = {
  siteName: string;
  siteTagline: string;
  siteLogoUrl: string;
  sitePrimaryColor: string;
  defaultGateway: string;
  appUrl: string;
  paymentGateways: Record<string, GatewayConfig>;
};

const EMPTY: Settings = {
  siteName: 'PDF Master',
  siteTagline: 'Pro Document Platform',
  siteLogoUrl: '',
  sitePrimaryColor: '#E11D48',
  defaultGateway: 'MANUAL',
  appUrl: '',
  paymentGateways: {
    SNIPPE: { enabled: false, publicKey: '', secretKey: '', webhookSecret: '' },
    MANUAL: { enabled: true, instructions: '' },
  },
};

export function SiteSettingsForm() {
  const [settings, setSettings] = React.useState<Settings>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSettings({ ...EMPTY, ...data, paymentGateways: { ...EMPTY.paymentGateways, ...(data.paymentGateways || {}) } });
        } else if (res.status === 403) {
          if (!cancelled) toast('Admins only', { variant: 'error' });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function setGateway(name: GatewayName, patch: Partial<GatewayConfig>) {
    setSettings((s) => ({
      ...s,
      paymentGateways: { ...s.paymentGateways, [name]: { ...s.paymentGateways[name], ...patch } },
    }));
  }

  async function handleLogo(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('siteLogoUrl', String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Save failed (${res.status})`);
      }
      toast('Settings saved', { variant: 'success' });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to save settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <Tabs defaultValue="general" className="space-y-6">
      <TabsList>
        <TabsTrigger value="general">
          <Palette className="w-4 h-4 mr-1.5" /> General
        </TabsTrigger>
        <TabsTrigger value="gateways">
          <CreditCard className="w-4 h-4 mr-1.5" /> Payment Gateways
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>Brand &amp; Appearance</CardTitle>
            <CardDescription>These changes apply across the public site and dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => set('siteName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="siteTagline">Tagline</Label>
                <Input
                  id="siteTagline"
                  value={settings.siteTagline}
                  onChange={(e) => set('siteTagline', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  id="primaryColor"
                  type="color"
                  value={settings.sitePrimaryColor}
                  onChange={(e) => set('sitePrimaryColor', e.target.value)}
                  className="h-10 w-16 rounded-md border border-input bg-background p-1"
                />
                <Input
                  value={settings.sitePrimaryColor}
                  onChange={(e) => set('sitePrimaryColor', e.target.value)}
                  className="w-32"
                />
              </div>
            </div>

            <div>
              <Label>Site Logo</Label>
              <div className="mt-2 flex items-center gap-4">
                {settings.siteLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.siteLogoUrl} alt="logo" className="h-12 w-auto object-contain border rounded-md p-1" />
                ) : (
                  <div className="h-12 w-32 border rounded-md flex items-center justify-center text-xs text-muted-foreground">
                    No logo — text wordmark
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4" /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogo(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </Button>
                  {settings.siteLogoUrl && (
                    <Button variant="ghost" size="sm" onClick={() => set('siteLogoUrl', '')}>
                      <Trash2 className="w-4 h-4" /> Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Stored as a data URL. For production, point this at a CDN/object-storage URL.
              </p>
            </div>

            <div>
              <Label htmlFor="defaultGateway">Default Payment Gateway</Label>
              <select
                id="defaultGateway"
                value={settings.defaultGateway}
                onChange={(e) => set('defaultGateway', e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {GATEWAYS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="gateways">
        <Card>
          <CardHeader>
            <CardTitle>Public URL</CardTitle>
            <CardDescription>
              The public origin Snippe uses to reach your webhook and redirect customers after payment.
              Required for the embedded Snippe checkout to call back correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="appUrl">App URL</Label>
            <Input
              id="appUrl"
              value={settings.appUrl}
              onChange={(e) => set('appUrl', e.target.value)}
              placeholder="https://pdf-tools.example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used to build <code className="text-foreground">/api/webhooks/payment?gateway=snippe</code> and
              the post-payment redirect. Falls back to the request origin if empty.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {GATEWAYS.map((name) => {
            const g = settings.paymentGateways[name] || (EMPTY.paymentGateways[name] as GatewayConfig);
            return (
              <Card key={name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {name}
                      {settings.defaultGateway === name && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {name === 'MANUAL'
                        ? 'Admin-confirmed bank transfer — no live API.'
                        : 'Webhook-driven payment gateway.'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enable-${name}`} className="text-xs">
                      Enabled
                    </Label>
                    <Switch
                      id={`enable-${name}`}
                      checked={g.enabled}
                      onCheckedChange={(v) => setGateway(name, { enabled: v })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {name === 'MANUAL' ? (
                    <div className="md:col-span-2">
                      <Label htmlFor={`instr-${name}`}>Payment Instructions</Label>
                      <Textarea
                        id={`instr-${name}`}
                        value={g.instructions || ''}
                        onChange={(e) => setGateway(name, { instructions: e.target.value })}
                        placeholder="e.g. Transfer to account 1234… quote your user id."
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor={`pk-${name}`}>Public Key</Label>
                        <Input
                          id={`pk-${name}`}
                          value={g.publicKey || ''}
                          onChange={(e) => setGateway(name, { publicKey: e.target.value })}
                          placeholder="pk_…"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`sk-${name}`}>API Key (Bearer)</Label>
                        <Input
                          id={`sk-${name}`}
                          type="password"
                          value={g.secretKey || ''}
                          onChange={(e) => setGateway(name, { secretKey: e.target.value })}
                          placeholder="snp_…"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Snippe API key — used by the server to create checkout sessions.
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`wh-${name}`}>Webhook Secret</Label>
                        <Input
                          id={`wh-${name}`}
                          type="password"
                          value={g.webhookSecret || ''}
                          onChange={(e) => setGateway(name, { webhookSecret: e.target.value })}
                          placeholder="Used to verify gateway webhooks"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Admin-entered secrets are used for webhook verification (env var is the fallback).
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Webhook URL</Label>
                        <code className="block rounded-md bg-muted px-3 py-2 text-xs break-all">
                          {(settings.appUrl || (typeof window !== 'undefined' ? window.location.origin : ''))}/api/webhooks/payment?gateway=snippe
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Point this URL at Snippe (Dashboard → Settings → Webhooks) and set the Webhook Secret above to its signing key.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    </Tabs>
  );
}
