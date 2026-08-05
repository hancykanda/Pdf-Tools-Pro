import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Award, FileText, FileQuestion, BookOpen, ClipboardList, GraduationCap, Settings } from 'lucide-react';

const tools = [
  { name: 'AI PDF Editor', href: '/ai-editor', icon: BrainCircuit, description: 'AI-powered PDF editing and analysis' },
  { name: 'Exam Header Customizer', href: '/exam-header', icon: Award, description: 'Customize exam headers with logo detection' },
  { name: 'OCR + Organize PDF', href: '/ocr-organize', icon: FileText, description: 'OCR and page organization' },
  { name: 'Question Bank', href: '/questions', icon: FileQuestion, description: 'Create and manage questions' },
  { name: 'Papers Bank', href: '/papers', icon: BookOpen, description: 'Search and download past papers' },
  { name: 'Exam Generator', href: '/exam-generator', icon: ClipboardList, description: 'Generate formatted exam PDFs' },
  { name: 'Lesson Plans', href: '/lesson-plans', icon: GraduationCap, description: 'AI-assisted lesson planning' },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Manage your account' },
];

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Welcome back, {user.name || 'Educator'}! Choose a premium tool below.</p>
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
              <BrainCircuit className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}