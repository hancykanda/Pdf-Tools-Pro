import * as React from 'react';

type LogoProps = {
  /** Extra classes for the wrapper. */
  className?: string;
  /** Classes for the wordmark text (default: text-2xl). */
  textClassName?: string;
  /** Use light wordmark colors (white "Master") for dark backgrounds. */
  onDark?: boolean;
};

/**
 * Single-line text logo: "Pdf Master" — "Pdf" in red, "Master" in black
 * (white on dark). No icon; just the wordmark.
 */
export function Logo({
  className = '',
  textClassName = 'text-2xl',
  onDark = false,
}: LogoProps) {
  const masterColor = onDark ? '#F8FAFC' : '#111827';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-extrabold tracking-tight leading-none ${textClassName} ${className}`}
    >
      <span style={{ color: '#E11D48' }}>Pdf</span>
      <span className="mx-0.5" style={{ color: masterColor }}>Master</span>
    </span>
  );
}

export default Logo;
