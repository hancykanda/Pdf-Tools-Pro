'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  FileText,
  BrainCircuit,
  BookOpen,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  ClipboardList,
  FileQuestion,
  Award,
  Crown,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI PDF Editor', href: '/dashboard/ai-editor', icon: BrainCircuit, premium: true },
  { name: 'Exam Header Customizer', href: '/dashboard/exam-header', icon: Award, premium: true },
  { name: 'OCR + Organize PDF', href: '/dashboard/ocr-organize', icon: FileText, premium: true },
  { name: 'Question Bank', href: '/dashboard/questions', icon: FileQuestion, premium: true },
  { name: 'Papers Bank', href: '/dashboard/papers', icon: BookOpen, premium: true },
  { name: 'Exam Generator', href: '/dashboard/exam-generator', icon: ClipboardList, premium: true },
  { name: 'Lesson Plans', href: '/dashboard/lesson-plans', icon: GraduationCap, premium: true },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-brand-red text-white rounded-lg shadow-sm">
                <span className="font-quintessential font-bold text-[11px] tracking-tight">PDF</span>
              </div>
              <span className="font-bree text-base tracking-tight text-gray-900 flex items-center">
                <span>PDF</span>
                <span className="font-quintessential font-bold text-brand-red ml-1">Master</span>
              </span>
            </Link>
            <button
              className="lg:hidden p-2 text-gray-500 hover:text-brand-red"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-red text-white shadow-md shadow-red-500/20'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-brand-dark'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {item.premium && (
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      <Sparkles className="w-3 h-3" />
                      Pro
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer - User Menu */}
          <div className="p-3 border-t border-gray-100">
            <div className="relative">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 bg-brand-red/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-red" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-gray-900 truncate">Teacher Name</p>
                  <p className="text-xs text-gray-500 truncate">teacher@school.edu</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-20">
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await fetch('/api/auth/logout', { method: 'POST' });
                        router.push('/');
                        router.refresh();
                      }}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 lg:ml-64">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 text-gray-500 hover:text-brand-red"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-display font-semibold text-gray-900">
                {navigation.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200/50">
                <Crown className="w-3.5 h-3.5" />
                <span>Premium</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
