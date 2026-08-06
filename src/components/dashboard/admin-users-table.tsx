'use client';

import * as React from 'react';
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  subscriptionActive: boolean;
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
};

export function AdminUsersTable() {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/users');
        if (!res.ok) {
          if (!cancelled) setError('You are not authorized to view this page.');
          return;
        }
        const data = (await res.json()) as { users: UserRow[] };
        if (!cancelled) setUsers(data.users ?? []);
      } catch {
        if (!cancelled) setError('Failed to load users.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeRole(id: string, role: Role) {
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, role }),
      });
      if (!res.ok) {
        toast('Failed to update role', { variant: 'error' });
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      toast('Role updated', { variant: 'success' });
    } catch {
      toast('Failed to update role', { variant: 'error' });
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading users…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Subscription</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.name ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Select
                  value={u.role}
                  onValueChange={(value) => changeRole(u.id, value as Role)}
                  disabled={savingId === u.id}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Admin
                      </span>
                    </SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {u.subscriptionActive ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="w-3 h-3" /> None
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
