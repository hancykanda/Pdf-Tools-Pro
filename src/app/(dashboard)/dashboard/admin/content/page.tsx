import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminNav } from '@/components/dashboard/AdminNav';
import { ContentManager } from '@/components/dashboard/admin/ContentManager';

export const dynamic = 'force-dynamic';

export default async function AdminContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Content Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Review platform content volume and remove user-generated data when needed.
        </p>
      </div>

      <AdminNav />

      <ContentManager />
    </div>
  );
}
