'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import PublicLayout from './(public)/layout';
import {
  ShieldCheck,
  Sparkles,
  Zap,
  FileText,
  FileStack,
  Scissors,
  LockKeyhole,
  BrainCircuit,
  School,
  ArrowRight,
  TrendingUp,
  Sliders,
  ChevronDown,
  ChevronUp,
  Search,
  X,
} from 'lucide-react';

const tools = [
  { name: 'Merge PDF', href: '/tools/merge', description: 'Combine multiple PDFs into one', icon: FileStack, category: 'edit', popular: true },
  { name: 'Split PDF', href: '/tools/split', description: 'Extract pages from PDFs', icon: Scissors, category: 'edit' },
  { name: 'Compress PDF', href: '/tools/compress', description: 'Reduce PDF file size', icon: ShieldCheck, category: 'edit' },
  { name: 'Word to PDF', href: '/tools/word-to-pdf', description: 'Convert Word documents to PDF', icon: FileText, category: 'convert' },
  { name: 'PDF to Word', href: '/tools/pdf-to-word', description: 'Convert PDF to editable Word', icon: FileText, category: 'convert', popular: true },
  { name: 'JPG to PDF', href: '/tools/jpg-to-pdf', description: 'Convert images to PDF', icon: FileText, category: 'convert' },
  { name: 'PDF to JPG', href: '/tools/pdf-to-jpg', description: 'Extract images from PDFs', icon: FileText, category: 'convert' },
];

const categories = [
  { id: 'all', label: 'All Tools', icon: Sliders },
  { id: 'edit', label: 'Edit PDF', icon: FileText },
  { id: 'convert', label: 'Convert', icon: Zap },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'ai', label: 'AI Tools', icon: Sparkles },
] as const;

const featureStats = [
  {
    id: 'tools',
    title: '7+ Free Tools',
    subtitle: 'Complete Utility Suite',
    badge: 'Free',
    icon: Sliders,
    bg: 'bg-red-50 text-red-600 border-red-100',
    hoverBorder: 'hover:border-red-300 hover:shadow-red-500/5',
    iconBg: 'bg-red-500/10 text-brand-red',
  },
  {
    id: 'privacy',
    title: '100% Private',
    subtitle: 'Files processed locally',
    badge: 'Secure',
    icon: ShieldCheck,
    bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    hoverBorder: 'hover:border-emerald-300 hover:shadow-emerald-500/5',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    id: 'uploads',
    title: 'No Uploads',
    subtitle: 'Browser-based processing',
    badge: 'Local',
    icon: LockKeyhole,
    bg: 'bg-blue-50 text-blue-600 border-blue-100',
    hoverBorder: 'hover:border-blue-300 hover:shadow-blue-500/5',
    iconBg: 'bg-blue-500/10 text-blue-600',
  },
  {
    id: 'cost',
    title: 'No Limits',
    subtitle: 'Use tools as much as you want',
    badge: 'Free',
    icon: Sparkles,
    bg: 'bg-purple-50 text-purple-600 border-purple-100',
    hoverBorder: 'hover:border-purple-300 hover:shadow-purple-500/5',
    iconBg: 'bg-purple-500/10 text-purple-600',
  },
];

const homeFaqs = [
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
];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'edit' | 'security' | 'convert' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const [isStatsPaused, setIsStatsPaused] = useState(false);
  const statsSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStatsPaused) return;
    const interval = setInterval(() => {
      setActiveStatIndex((prev) => {
        const next = (prev + 1) % featureStats.length;
        statsSliderRef.current?.scrollTo({ left: next * 280, behavior: 'smooth' });
        return next;
      });
    }, 3200);
    return () => clearInterval(interval);
  }, [isStatsPaused]);

  const filteredTools = tools.filter((tool) => {
    const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getIcon = (IconComponent: React.ComponentType<{ className?: string }>, category: string) => {
    let colorClass = 'text-brand-red';
    if (category === 'convert') colorClass = 'text-emerald-600';
    if (category === 'security') colorClass = 'text-indigo-600';
    if (category === 'ai') colorClass = 'text-purple-600';

    return <IconComponent className={`w-6 h-6 ${colorClass}`} />;
  };

  return (
    <PublicLayout>
      {/* Hero Section */}
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
            <Link
              href="#tools"
              className="px-8 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10"
            >
              Start Using Tools
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              View Premium Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats Slider */}
      <div
        className="max-w-6xl mx-auto w-full px-2 mt-12"
        onMouseEnter={() => setIsStatsPaused(true)}
        onMouseLeave={() => setIsStatsPaused(false)}
      >
        <div className="relative group">
          <button
            onClick={() => {
              const next = (activeStatIndex - 1 + featureStats.length) % featureStats.length;
              setActiveStatIndex(next);
              statsSliderRef.current?.scrollTo({ left: next * 280, behavior: 'smooth' });
            }}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 shadow-md hover:bg-brand-red hover:text-white hover:border-brand-red transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            aria-label="Previous stat"
          >
            <ChevronDown className="w-4 h-4 rotate-90" />
          </button>

          <div
            ref={statsSliderRef}
            className="flex items-center gap-4 overflow-x-auto scroll-smooth py-2 px-1 scrollbar-none snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {featureStats.map((stat, idx) => {
              const Icon = stat.icon;
              const isActive = idx === activeStatIndex;

              return (
                <div
                  key={stat.id}
                  onClick={() => {
                    setActiveStatIndex(idx);
                    statsSliderRef.current?.scrollTo({ left: idx * 280, behavior: 'smooth' });
                  }}
                  className={`flex-shrink-0 w-[280px] sm:w-[320px] lg:flex-1 bg-white border rounded-2xl p-4 flex items-center gap-3.5 shadow-xs transition-all duration-300 cursor-pointer snap-start select-none ${
                    isActive
                      ? 'border-brand-red/50 shadow-md shadow-red-500/5 ring-1 ring-red-500/20 scale-[1.01]'
                      : `border-gray-100 ${stat.hoverBorder}`
                  }`}
                >
                  <div className={`p-3 rounded-xl flex-shrink-0 ${stat.iconBg} transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="font-display font-bold text-xs sm:text-sm text-brand-dark leading-snug">
                        {stat.title}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${stat.bg} flex-shrink-0`}>
                        {stat.badge}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-400 font-medium leading-normal">
                      {stat.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              const next = (activeStatIndex + 1) % featureStats.length;
              setActiveStatIndex(next);
              statsSliderRef.current?.scrollTo({ left: next * 280, behavior: 'smooth' });
            }}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 shadow-md hover:bg-brand-red hover:text-white hover:border-brand-red transition-all cursor-pointer opacity-0 group-hover:opacity-100"
            aria-label="Next stat"
          >
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {featureStats.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveStatIndex(idx);
                statsSliderRef.current?.scrollTo({ left: idx * 280, behavior: 'smooth' });
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === activeStatIndex ? 'w-5 bg-brand-red' : 'w-1.5 bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark mb-4">
              Free PDF Tools
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              All tools run locally in your browser. Your files never leave your device.
            </p>
          </div>

          {/* Search & Categories */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-red-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 text-gray-400 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:flex-1 md:min-w-0">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                const count = cat.id === 'all' ? tools.length : tools.filter((t) => t.category === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
                      isActive
                        ? 'bg-brand-red text-white shadow-md shadow-red-500/20 scale-105'
                        : 'bg-white text-gray-600 hover:text-brand-dark hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools Grid */}
          {filteredTools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-50 text-brand-red rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="font-display font-bold text-lg text-brand-dark mb-1">No tools found</h3>
              <p className="text-gray-400 text-sm max-w-sm mb-6">
                We couldn&apos;t find any PDF utilities matching &quot;{searchQuery}&quot;.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-brand-red text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/10"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map((tool) => (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group relative flex flex-col bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-brand-red/30 transition-all cursor-pointer overflow-hidden transform hover:-translate-y-1.5"
                >
                  {tool.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500" />
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-red-50 transition-colors">
                      {getIcon(tool.icon, tool.category)}
                    </div>
                    {tool.popular && (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/50">
                        <TrendingUp className="w-3 h-3" />
                        Popular
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-lg text-brand-dark group-hover:text-brand-red transition-colors mb-2">
                    {tool.name}
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mb-6 flex-grow">{tool.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 text-xs font-bold text-gray-400 group-hover:text-brand-red transition-all">
                    <span>Open Tool</span>
                    <div className="w-7 h-7 bg-gray-50 group-hover:bg-brand-red group-hover:text-white rounded-full flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why PDF Master Section */}
      <section className="bg-white border-t border-b border-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-brand-red rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Next-Gen Technology
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-dark">
              Why PDF Tools Pro?
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              Unlike traditional online converters that limit daily tasks or enforce cloud uploads, PDF Tools Pro offers unlimited local processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-100/80 space-y-3">
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold">
                <LockKeyhole className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-brand-dark">100% Private</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                Files are processed locally on your device. Nothing is uploaded to any server.
              </p>
            </div>

            <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-100/80 space-y-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-brand-dark">AI-Powered</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                Smart document parsing, AI editing, OCR, and automated exam generation for educators.
              </p>
            </div>

            <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-100/80 space-y-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                <School className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-brand-dark">Educator Focused</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                Purpose-built tools for teachers: question banks, exam headers, lesson plans, and paper management.
              </p>
            </div>

            <div className="bg-gray-50/60 p-6 rounded-2xl border border-gray-100/80 space-y-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base text-brand-dark">Lightning Fast</h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                Browser-native processing means no waiting for uploads or downloads. Instant results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-brand-dark">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm">
              Everything you need to know about processing PDFs with PDF Tools Pro:
            </p>
          </div>

          <div className="space-y-3">
            {homeFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-display font-bold text-sm text-brand-dark flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-red flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-gray-500 text-xs sm:text-sm leading-relaxed border-t border-gray-50 pt-3 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="bg-white border-t border-gray-100 py-20">
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
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-red text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/10"
          >
            <Sparkles className="w-5 h-5" />
            Upgrade to Premium
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
