'use client';

import * as React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

type Counts = {
  questions: number;
  papers: number;
  lessonPlans: number;
  examHeaders: number;
};

const LABELS: Record<keyof Counts, string> = {
  questions: 'Questions',
  papers: 'Papers',
  lessonPlans: 'Lesson Plans',
  examHeaders: 'Exam Headers',
};

export function ContentManager() {
  const [counts, setCounts] = React.useState<Counts | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<keyof Counts | null>(null);

  async function load() {
    const res = await fetch('/api/admin/content');
    if (res.ok) {
      const data = await res.json();
      setCounts(data);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function clearAll(type: keyof Counts) {
    if (!confirm(`Delete ALL ${LABELS[type]}? This cannot be undone.`)) return;
    setBusy(type);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, confirm: true }),
      });
      if (!res.ok) throw new Error();
      toast(`Cleared ${LABELS[type]}`, { variant: 'success' });
      await load();
    } catch {
      toast('Failed to delete', { variant: 'error' });
    } finally {
      setBusy(null);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(Object.keys(LABELS) as (keyof Counts)[]).map((type) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {LABELS[type]}
              <span className="text-2xl font-bold text-foreground">{counts?.[type] ?? 0}</span>
            </CardTitle>
            <CardDescription>Total {LABELS[type].toLowerCase()} created on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy === type || (counts?.[type] ?? 0) === 0}
              onClick={() => clearAll(type)}
            >
              {busy === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete all
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
