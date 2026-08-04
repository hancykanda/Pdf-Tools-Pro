import Link from 'next/link';
import { ShieldCheck, Sparkles, GraduationCap, Zap, FileStack, Scissors } from 'lucide-react';

const tools = [
  { name: 'Merge PDF', href: '/tools/merge', description: 'Combine multiple PDFs into one', icon: FileStack },
  { name: 'Split PDF', href: '/tools/split', description: 'Extract pages from PDFs', icon: Scissors },
  { name: 'Compress PDF', href: '/tools/compress', description: 'Reduce PDF file size', icon: ShieldCheck },
  { name: 'Word to PDF', href: '/tools/word-to-pdf', description: 'Convert Word documents to PDF', icon: GraduationCap },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', description: 'Convert PDF to editable Word', icon: FileStack },
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', description: 'Convert images to PDF', icon: GraduationCap },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', description: 'Extract images from PDFs', icon: Scissors },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-50/80 border border-red-100 text-brand-red rounded-full text-xs font-bold tracking-wide shadow-2xs mb-8">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>100% Free Tools, No Limits</span>
          </div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-brand-dark tracking-tight leading-[1.1] mb-6">
            Professional PDF Tools
            <br />
            <span className="text-brand-red">For Everyone</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Merge, split, compress, and convert PDFs with our free online tools.
            No uploads, no limits, no sign-up required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tools" className="px-8 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10">
              Start Using Tools
            </Link>
            <Link href="/pricing" className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              View Premium Plans
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
              Free PDF Tools
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              All tools run locally in your browser. Your files never leave your device.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((tool) => (
              <Link
                key={tool.name}
                href={tool.href}
                className="group relative flex flex-col bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-brand-red/30 transition-all cursor-pointer overflow-hidden transform hover:-translate-y-1.5"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-red-50 transition-colors">
                    <tool.icon className="w-6 h-6 text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-brand-dark group-hover:text-brand-red transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-gray-500 text-xs sm:text-sm">{tool.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 text-xs font-bold text-gray-400 group-hover:text-brand-red transition-all">
                  <span>Open Tool</span>
                  <Zap className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-b border-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 rounded-full text-xs font-bold tracking-wide mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Premium Teacher Workspace</span>
          </div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
            AI-Powered Tools for Educators
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto mb-10">
            Unlock AI PDF editing, exam header customization, OCR, question banks, exam generation, and lesson plans.
          </p>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-8 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10">
            <Sparkles className="w-5 h-5" />
            Upgrade to Premium
          </Link>
        </div>
      </section>
    </div>
  );
}