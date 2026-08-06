'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Menu, X } from 'lucide-react';

const navLinks = [
  { name: 'Pricing', href: '/pricing' },
  { name: 'For Teachers', href: '/upgrade' },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-500 text-white rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-gray-900">PDF Master</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
          >
            Sign up free
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-gray-500 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 py-4 space-y-1">
            {/* Simple Links */}
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            {/* Divider */}
            <div className="my-3 border-t border-gray-100" />

            {/* Auth Actions */}
            <Link
              href="/sign-in"
              className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="block w-full text-center px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors mt-2"
              onClick={() => setMobileOpen(false)}
            >
              Sign up free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
