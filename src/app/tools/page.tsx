import Link from 'next/link';
import { ShieldCheck, Sparkles, GraduationCap, Zap, FileStack, Scissors, FileText, FileImage } from 'lucide-react';

const tools = [
  { name: 'Merge PDF', href: '/tools/merge', description: 'Combine multiple PDFs into one', icon: FileStack },
  { name: 'Split PDF', href: '/tools/split', description: 'Extract pages from PDFs', icon: Scissors },
  { name: 'Compress PDF', href: '/tools/compress', description: 'Reduce PDF file size', icon: ShieldCheck },
  { name: 'Word to PDF', href: '/tools/word-to-pdf', description: 'Convert Word documents to PDF', icon: GraduationCap },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', description: 'Convert PDF to editable Word', icon: FileText },
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', description: 'Convert images to PDF', icon: FileImage },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', description: 'Extract images from PDFs', icon: Scissors },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
            Free PDF Tools
          </h1>
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
    </div>
  );
}