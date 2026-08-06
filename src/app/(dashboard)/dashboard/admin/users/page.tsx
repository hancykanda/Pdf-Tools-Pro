import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminNav } from '@/components/dashboard/AdminNav';
import { AdminUsersTable } from '@/components/dashboard/admin-users-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">View all users and change their role.</p>
      </div>

      <AdminNav />

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Change a user&apos;s role using the dropdown in each row.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUsersTable />
        </CardContent>
      </Card>
    </div>
  );
}
