import Link from 'next/link';
import { Sparkles, Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Basic PDF tools with no sign-up required.',
    features: ['Merge, split, compress PDF', 'PDF to Word and Excel', 'Image conversions', 'No account needed'],
    cta: 'Use Free Tools',
    href: '/tools',
  },
  {
    name: 'Premium',
    price: '$9',
    period: '/month',
    description: 'Full AI-powered teacher workspace.',
    features: ['AI PDF Editor', 'Exam Header Customizer', 'OCR + Organize PDF', 'Question Bank', 'Papers Bank', 'Exam Generator', 'Lesson Plans AI', 'Priority support'],
    cta: 'Get Premium',
    href: '/auth/register',
    featured: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-gray-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Start for free. Upgrade when you need AI-powered teacher tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-3xl border-2 ${
                plan.featured ? 'border-brand-red shadow-2xl' : 'border-gray-100'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-brand-red text-white text-sm font-bold rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="font-display font-bold text-2xl text-gray-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-display font-extrabold text-5xl text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="text-gray-500 mt-4">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center px-6 py-3 font-semibold rounded-xl transition-colors ${
                  plan.featured
                    ? 'bg-brand-red text-white hover:bg-red-700 shadow-lg shadow-red-500/10'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}