import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { PageContainer, Section } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function UpgradePage() {
  return (
    <PageContainer>
      <Section className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-2xl mb-6">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="font-display font-bold text-3xl text-foreground mb-4">Premium Required</h2>
            <p className="text-muted-foreground mb-8">
              This feature is only available to premium teachers. Upgrade your account to unlock
              AI-powered teacher tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/subscription">Manage Subscription</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </PageContainer>
  );
}
