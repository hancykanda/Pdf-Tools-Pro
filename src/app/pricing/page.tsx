import Link from 'next/link';
import { Check, GraduationCap, User, ShieldCheck, Sparkles } from 'lucide-react';
import { PageContainer, Section } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const tiers = [
  {
    name: 'Student',
    icon: User,
    price: '$0',
    period: 'forever',
    description: 'Free PDF tools — your personal dashboard is coming soon.',
    features: [
      'All free PDF tools (merge, split, compress, convert)',
      'No account required',
      'Student dashboard (coming soon)',
    ],
    cta: 'Browse Free Tools',
    href: '/tools',
    variant: 'outline' as const,
  },
  {
    name: 'Teacher',
    icon: GraduationCap,
    price: '$0',
    period: 'core tools',
    description: 'Free core tools, plus a low-cost monthly plan for premium AI teacher tools.',
    features: [
      'Everything in Student',
      'All free teacher tools included',
      'Premium tools (AI Editor, Exam Generator, Question Bank, Lesson Plans…) via monthly subscription',
      'Priority support',
    ],
    cta: 'Subscribe / Upgrade',
    href: '/dashboard/subscription',
    variant: 'default' as const,
    featured: true,
  },
  {
    name: 'Admin',
    icon: ShieldCheck,
    price: '—',
    period: '',
    description: 'Manage the whole system, users, roles, and subscriptions.',
    features: [
      'Everything teachers get',
      'User management & role control',
      'Subscription oversight',
      'Platform configuration',
    ],
    cta: 'Go to Admin',
    href: '/dashboard',
    variant: 'outline' as const,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageContainer>
        <Section>
          <div className="text-center mb-16">
            <Badge variant="warning" className="mb-4 gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Pricing
            </Badge>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-foreground mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Start free. Teachers upgrade with a small monthly subscription — no Stripe, paid via
              SNIPPE / Flutterwave.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${
                  tier.featured ? 'border-primary shadow-xl ring-1 ring-primary/30' : 'border-border'
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <tier.icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1 pt-2">
                    <span className="font-display font-extrabold text-4xl text-foreground">
                      {tier.price}
                    </span>
                    {tier.period && <span className="text-sm text-muted-foreground">{tier.period}</span>}
                  </div>
                  <CardDescription className="pt-1">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant={tier.variant} className="mt-auto w-full">
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
