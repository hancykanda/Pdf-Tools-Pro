'use client';

import * as React from 'react';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { formatCurrency } from '@/lib/format';
import { summarizeFeatures } from '@/lib/planFeatures';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  currency: string;
  features: string;
  active: boolean;
};

type StatusView = {
  active: boolean;
  status: string | null;
  planId: string | null;
  gateway: string | null;
};

const GATEWAYS = [
  { value: 'SNIPPE', label: 'Snippe (Mobile Money)' },
  { value: 'CLICKPESA', label: 'ClickPesa (Hosted)' },
  { value: 'MANUAL', label: 'Manual / Bank transfer' },
] as const;

export function SubscriptionManager({ initialActive }: { initialActive: boolean }) {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [status, setStatus] = React.useState<StatusView | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [planId, setPlanId] = React.useState<string>('');
  const [gateway, setGateway] = React.useState<string>('SNIPPE');
  const [submitting, setSubmitting] = React.useState(false);
  const [gatewayRef, setGatewayRef] = React.useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = React.useState<string | null>(null);
  const [backendReady, setBackendReady] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          fetch('/api/subscription'),
          fetch('/api/subscription/status'),
        ]);

        if (!plansRes.ok || !statusRes.ok) {
          if (!cancelled) setBackendReady(false);
          return;
        }

        const plansData = (await plansRes.json()) as { plans?: Plan[] } | Plan[];
        const statusData = (await statusRes.json()) as StatusView;

        if (cancelled) return;

        const list = Array.isArray(plansData)
          ? plansData
          : ((plansData as { plans?: Plan[] }).plans ?? []);
        setPlans(list);
        setStatus(statusData);
        if (list.length > 0) setPlanId(list[0].id);
      } catch {
        if (!cancelled) setBackendReady(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    if (!planId) {
      toast('Select a plan first', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      // Snippe/ClickPesa use their own endpoint that creates the embedded
      // checkout session; MANUAL uses the generic endpoint.
      const endpoint =
        gateway === 'SNIPPE'
          ? '/api/subscription/snippe'
          : gateway === 'CLICKPESA'
            ? '/api/subscription/clickpesa'
            : '/api/subscription';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, gateway }),
      });
      const data = (await res.json()) as {
        gatewayRef?: string;
        checkoutUrl?: string;
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        toast(data.error ?? 'Subscription request failed', { variant: 'error' });
        return;
      }
      setGatewayRef(data.gatewayRef ?? null);
      setCheckoutUrl(data.checkoutUrl ?? null);
      toast('Subscription request created', { variant: 'success' });
    } catch {
      toast('Could not reach the subscription service', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Poll subscription status after a checkout starts; the gateway webhook is
  // what flips PENDING -> ACTIVE, so we just watch for it.
  React.useEffect(() => {
    if (!gatewayRef) return;
    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/subscription/status');
        if (!res.ok) return;
        const data = (await res.json()) as StatusView & { gateway?: string | null };
        if (!active) return;
        setStatus((prev) =>
          prev
            ? { ...prev, active: data.active, status: data.status, gateway: data.gateway ?? prev.gateway }
            : { active: data.active, status: data.status, planId: null, gateway: data.gateway ?? null },
        );
        if (data.active) {
          clearInterval(interval);
          setCheckoutUrl(null);
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [gatewayRef]);

  async function handleCancel() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/subscription/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      if (!res.ok) {
        toast('Could not cancel subscription', { variant: 'error' });
        return;
      }
      toast('Subscription cancelled', { variant: 'success' });
      setStatus((s) => (s ? { ...s, active: false, status: 'CANCELLED' } : s));
    } catch {
      toast('Could not reach the subscription service', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function parseFeatures(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return raw ? [raw] : [];
    }
  }

  const isActive = status?.active ?? initialActive;

  return (
    <div className="space-y-6">
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading subscription…
          </CardContent>
        </Card>
      ) : !backendReady ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
            <p className="font-medium text-foreground">Subscription service is not connected yet</p>
            <p className="text-sm mt-1">
              The plans listed below are illustrative. Wire up the subscription backend to enable
              checkout.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {status && (
        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {isActive ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-amber-500" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {isActive ? 'Active' : status.status ?? 'No active plan'}
                  </span>
                  <Badge variant={isActive ? 'success' : 'warning'}>
                    {status.status ?? 'NONE'}
                  </Badge>
                </div>
                {status.gateway && (
                  <p className="text-sm text-muted-foreground">Gateway: {status.gateway}</p>
                )}
              </div>
            </div>
          </CardContent>
          {isActive && (
            <CardFooter>
              <Button variant="outline" onClick={handleCancel} disabled={submitting}>
                Cancel subscription
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {gatewayRef && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {checkoutUrl ? 'Complete payment' : 'Complete your payment'}
            </CardTitle>
            <CardDescription>
              {checkoutUrl
                ? 'Pay with mobile money in the widget below. It activates automatically once Snippe confirms the payment.'
                : 'Use the reference below when paying via the selected gateway. Status updates automatically via webhook.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checkoutUrl && (
              <div className="overflow-hidden rounded-xl border border-border bg-white">
                <iframe
                  src={checkoutUrl}
                  title="Snippe secure checkout"
                  className="h-[560px] w-full"
                  allow="payment"
                />
              </div>
            )}
            <div className="rounded-lg bg-white border border-border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Gateway Reference</p>
              <p className="font-mono text-lg font-semibold text-foreground break-all">{gatewayRef}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {checkoutUrl ? (
                <>
                  Prefer a separate tab?{' '}
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Open {gateway} checkout
                  </a>
                  . Payment is handled by {gateway}; no Stripe involved.
                </>
              ) : (
                <>
                  After paying through {gateway}, our server receives a webhook callback that marks this
                  subscription <Badge variant="success">ACTIVE</Badge>. No Stripe is involved — payment is
                  handled by the {gateway} gateway.
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && backendReady && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available plans</CardTitle>
            <CardDescription>Subscribe to unlock all premium teacher tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => {
                const features = summarizeFeatures(parseFeatures(plan.features));
                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-4 ${
                      planId === plan.id ? 'border-primary ring-1 ring-primary' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{plan.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(plan.priceMonthly, plan.currency)}/mo
                      </span>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                    )}
                    {features.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      type="button"
                      variant={planId === plan.id ? 'default' : 'outline'}
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => setPlanId(plan.id)}
                    >
                      {planId === plan.id ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gateway">Payment gateway</Label>
                <Select value={gateway} onValueChange={setGateway}>
                  <SelectTrigger id="gateway">
                    <SelectValue placeholder="Select gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {GATEWAYS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSubscribe} disabled={submitting || !planId} className="w-full sm:w-auto">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Subscribe via {gateway}
            </Button>

            <p className="text-xs text-muted-foreground">
              We don&apos;t use Stripe. After you subscribe, complete payment through the chosen
              gateway using the generated reference. The gateway sends a webhook to{' '}
              <code className="text-foreground">/api/webhooks/payment</code> which flips your
              status to ACTIVE automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
