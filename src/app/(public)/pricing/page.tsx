import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { summarizeFeatures } from '@/lib/planFeatures';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

function parseFeatures(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

type ViewPlan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: string[];
};

export default async function PricingPage() {
  const dbPlans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }],
  });

  const plans: ViewPlan[] = dbPlans.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.priceMonthly,
    currency: p.currency,
    description: p.description ?? '',
    features: summarizeFeatures(parseFeatures(p.features)),
  }));

  const featuredIndex = plans.findIndex((p) => p.price > 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Badge variant="warning" className="mb-4 gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Pricing
          </Badge>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-foreground mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Start free with every PDF tool. Teachers upgrade with a small monthly subscription — paid
            via SNIPPE, no Stripe.
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="text-center text-muted-foreground">No plans available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => {
              const isFree = plan.price === 0;
              const featured = i === featuredIndex;
              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${
                    featured ? 'border-primary shadow-xl ring-1 ring-primary/30' : 'border-border'
                  }`}
                >
                  {featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1 pt-2">
                      <span className="font-display font-extrabold text-4xl text-foreground">
                        {isFree ? 'Free' : formatCurrency(plan.price, plan.currency)}
                      </span>
                      {!isFree && <span className="text-sm text-muted-foreground">/month</span>}
                    </div>
                    <CardDescription className="pt-1">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant={featured ? 'default' : 'outline'} className="mt-auto w-full">
                      <Link href={isFree ? '/tools' : '/upgrade'}>
                        {isFree ? 'Browse Free Tools' : 'Choose Plan'}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
