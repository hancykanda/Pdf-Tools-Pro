import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminNav } from '@/components/dashboard/AdminNav';
import { SiteSettingsForm } from '@/components/dashboard/admin/SiteSettingsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Site Settings</h1>
        <p className="text-muted-foreground mt-1">
          Control branding and payment gateways. Changes apply across the platform.
        </p>
      </div>

      <AdminNav />

      <SiteSettingsForm />
    </div>
  );
}
