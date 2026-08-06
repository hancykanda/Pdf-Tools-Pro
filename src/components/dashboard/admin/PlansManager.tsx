'use client';

import * as React from 'react';
import { Loader2, Plus, Trash2, Save, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { PLAN_FEATURE_GROUPS, ALL_FREE_TOOL_IDS } from '@/lib/planFeatures';
import { formatCurrency } from '@/lib/format';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  currency: string;
  features: string;
  active: boolean;
};

function parseFeatures(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function PlanFeatureChecklist({
  selected,
  onToggle,
  onToggleGroup,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  onToggleGroup: (ids: string[], add: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      {PLAN_FEATURE_GROUPS.map((group) => {
        const groupIds = group.items.map((i) => i.id);
        const allSelected = groupIds.every((id) => selected.includes(id));
        const isFreeGroup = group.group === 'Free Tools';
        return (
          <div key={group.group}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.group}
              </p>
              {isFreeGroup && (
                <button
                  type="button"
                  onClick={() => onToggleGroup(groupIds, !allSelected)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border',
                      allSelected ? 'border-primary bg-primary text-white' : 'border-input',
                    )}
                  >
                    {allSelected && <Check className="h-2.5 w-2.5" />}
                  </span>
                  Select all free tools
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.items.map((item) => {
              const checked = selected.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onToggle(item.id)}
                  aria-pressed={checked}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors',
                    checked
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-white text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                      checked ? 'border-primary bg-primary text-white' : 'border-input',
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
           </div>
          </div>
        );
      })}
    </div>
  );
}

export function PlansManager() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/plans');
    if (res.ok) {
      const data = await res.json();
      setPlans(data.plans ?? []);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  function update(id: string, patch: Partial<Plan>) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function save(id: string) {
    setSavingId(id);
    const plan = plans.find((p) => p.id === id)!;
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          priceMonthly: plan.priceMonthly,
          currency: plan.currency,
          active: plan.active,
          features: parseFeatures(plan.features),
        }),
      });
      if (!res.ok) throw new Error();
      toast('Plan saved', { variant: 'success' });
    } catch {
      toast('Failed to save plan', { variant: 'error' });
    } finally {
      setSavingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this plan?')) return;
    const res = await fetch(`/api/admin/plans?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast('Plan deleted', { variant: 'success' });
    } else {
      toast('Failed to delete plan', { variant: 'error' });
    }
  }

  async function createPlan() {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Free Plan',
          priceMonthly: 0,
          features: ALL_FREE_TOOL_IDS,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Request failed');
      }
      toast('Plan added', { variant: 'success' });
      await load();
      requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add plan', { variant: 'error' });
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
    <div className="space-y-4">
      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                {plan.name}
                {!plan.active && <Badge variant="secondary">Inactive</Badge>}
              </CardTitle>
              <CardDescription>Monthly plan · {formatCurrency(plan.priceMonthly, plan.currency)}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor={`active-${plan.id}`} className="text-xs">Active</Label>
              <Switch
                id={`active-${plan.id}`}
                checked={plan.active}
                onCheckedChange={(v) => update(plan.id, { active: v })}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(plan.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={plan.name} onChange={(e) => update(plan.id, { name: e.target.value })} />
            </div>
            <div>
              <Label>Price ({plan.currency})</Label>
              <Input
                type="number"
                step="0.01"
                value={plan.priceMonthly}
                onChange={(e) => update(plan.id, { priceMonthly: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input
                value={plan.description ?? ''}
                onChange={(e) => update(plan.id, { description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Features &amp; Tools</Label>
              <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                <PlanFeatureChecklist
                  selected={parseFeatures(plan.features)}
                  onToggle={(id) => {
                    const cur = parseFeatures(plan.features);
                    const next = cur.includes(id)
                      ? cur.filter((x) => x !== id)
                      : [...cur, id];
                    update(plan.id, { features: JSON.stringify(next) });
                  }}
                  onToggleGroup={(ids, add) => {
                    const cur = parseFeatures(plan.features);
                    const next = add
                      ? Array.from(new Set([...cur, ...ids]))
                      : cur.filter((x) => !ids.includes(x));
                    update(plan.id, { features: JSON.stringify(next) });
                  }}
                />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="button" onClick={() => save(plan.id)} disabled={savingId === plan.id}>
                {savingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={createPlan}>
        <Plus className="w-4 h-4" /> Add Plan
      </Button>
    </div>
  );
}
