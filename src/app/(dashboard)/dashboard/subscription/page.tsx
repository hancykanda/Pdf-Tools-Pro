import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { SubscriptionManager } from '@/components/dashboard/subscription-manager';

export default async function SubscriptionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl text-foreground">Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your premium teacher plan. Payments are handled by SNIPPE — not
          Stripe.
        </p>
      </div>

      <SubscriptionManager initialActive={user.subscriptionActive} />
    </div>
  );
}
