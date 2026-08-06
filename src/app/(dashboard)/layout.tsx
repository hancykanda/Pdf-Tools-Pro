import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getSiteBranding } from '@/lib/settings';
import { DashboardShell, type DashboardUser } from '@/components/dashboard/shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  const dashboardUser: DashboardUser = {
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    subscriptionActive: user.subscriptionActive,
  };

  const branding = await getSiteBranding();

  return (
    <DashboardShell user={dashboardUser} branding={branding}>
      {children}
    </DashboardShell>
  );
}
