'use client';

import * as React from 'react';
import { Loader2, CheckCircle2, CalendarPlus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';

type Sub = {
  id: string;
  status: string;
  gateway: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  user: { id: string; name: string | null; email: string; role: string };
  plan: { id: string; name: string; priceMonthly: number } | null;
};

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function SubscriptionsManager() {
  const [subs, setSubs] = React.useState<Sub[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/subscriptions');
    if (res.ok) {
      const data = await res.json();
      setSubs(data.subscriptions ?? []);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function act(id: string, action: 'activate' | 'cancel' | 'extend') {
    if (action === 'cancel' && !confirm('Cancel this subscription?')) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, ...data.subscription } : s)));
      toast('Subscription updated', { variant: 'success' });
    } catch {
      toast('Failed to update', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
      </div>
    );
  }

  if (subs.length === 0) {
    return <p className="text-muted-foreground">No subscriptions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {subs.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {s.user.name || s.user.email}{' '}
                  <span className="text-xs text-muted-foreground">({s.user.role})</span>
                </span>
                <Badge
                  variant={
                    s.status === 'ACTIVE' ? 'success' : s.status === 'CANCELLED' ? 'destructive' : 'secondary'
                  }
                >
                  {s.status}
                </Badge>
              </div>
              <CardDescription>
                {s.plan?.name || 'No plan'} · {s.gateway} · Renews {fmt(s.currentPeriodEnd)}
                {s.cancelAtPeriodEnd && ' · cancels at period end'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === s.id}
                onClick={() => act(s.id, 'activate')}
              >
                <CheckCircle2 className="w-4 h-4" /> Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === s.id}
                onClick={() => act(s.id, 'extend')}
              >
                <CalendarPlus className="w-4 h-4" /> Extend
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={busyId === s.id}
                onClick={() => act(s.id, 'cancel')}
              >
                <XCircle className="w-4 h-4" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
