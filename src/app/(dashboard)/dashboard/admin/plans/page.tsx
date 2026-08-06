import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminNav } from '@/components/dashboard/AdminNav';
import { PlansManager } from '@/components/dashboard/admin/PlansManager';

export const dynamic = 'force-dynamic';

export default async function AdminPlansPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Subscription Plans</h1>
        <p className="text-muted-foreground mt-1">Create and manage the plans teachers can subscribe to.</p>
      </div>

      <AdminNav />

      <PlansManager />
    </div>
  );
}
