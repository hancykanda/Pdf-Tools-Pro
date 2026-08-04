import Link from 'next/link';
import { ArrowLeft, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'Are my files safe and kept local without uploading?',
    a: 'Yes, 100%. PDF Tools Pro runs natively inside your web browser. Files are processed locally on your device without ever being uploaded to remote servers.',
  },
  {
    q: 'How does this compare to iLovePDF or Smallpdf?',
    a: 'Unlike traditional online converters that limit daily tasks or enforce cloud uploads, PDF Tools Pro offers unlimited local processing with no paywalls or limits.',
  },
  {
    q: 'Do I need to sign up to use free tools?',
    a: 'No. All free tools work instantly without registration. Sign up only if you want access to premium AI-powered teacher tools.',
  },
  {
    q: 'What premium tools are available?',
    a: 'Premium tools include AI PDF Editor, Exam Header Customizer, OCR + Organize PDF, Question Bank, Papers Bank, Exam Generator, and Lesson Plans Master.',
  },
  {
    q: 'Is there a limit on how many files I can process?',
    a: 'No. All free tools have no limits. You can process as many files as you need, completely free of charge.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'PDF Tools Pro works on all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using the latest version of your browser.',
  },
];

export default function FAQPage() {
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

      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 text-brand-red rounded-xl mb-4">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          Everything you need to know about processing PDFs with PDF Tools Pro.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden transition-all shadow-sm"
          >
            <div className="p-5">
              <h3 className="font-display font-bold text-sm text-brand-dark mb-2">{faq.q}</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{faq.a}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm mb-4">
          Still have questions? We are here to help.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
