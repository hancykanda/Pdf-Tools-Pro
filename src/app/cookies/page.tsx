import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-red transition-all group"
        >
          <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 space-y-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
            Cookie Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: August 2026
          </p>
        </div>

        <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-brand-dark">What Are Cookies</h2>
            <p>
              Cookies are small text files that are placed on your computer or mobile device when you visit a website.
              They are widely used to make websites work more efficiently and to provide information to the website owners.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-brand-dark">How We Use Cookies</h2>
            <p>
              PDF Tools Pro uses cookies to enhance your browsing experience, analyze site traffic, and personalize content.
              All processing happens locally in your browser, and we do not upload your files to any server.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-brand-dark">Types of Cookies We Use</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Essential Cookies:</strong> Required for the website to function properly.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website.</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-brand-dark">Managing Cookies</h2>
            <p>
              You can control and manage cookies through your browser settings. Please note that removing or blocking cookies
              may impact your user experience and some features may no longer function properly.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-display font-bold text-lg text-brand-dark">Contact Us</h2>
            <p>
              If you have any questions about our Cookie Policy, please contact us through our{' '}
              <Link href="/contact" className="text-brand-red hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
