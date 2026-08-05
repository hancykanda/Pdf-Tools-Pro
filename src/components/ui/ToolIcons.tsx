import React from 'react';

const viewBox = '0 0 40 40';

export const PageStackIcon = ({ accentColor = '#f97316', light = '#fed7aa', arrowDirection = 'inward' }: { accentColor?: string; light?: string; arrowDirection?: 'inward' | 'outward' }) => (
  <svg className="w-10 h-10" viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back page */}
    <rect x="8" y="7" width="22" height="26" rx="3" fill={light} />
    {/* Front page */}
    <rect x="12" y="11" width="22" height="26" rx="3" fill="white" stroke="#e5e7eb" strokeWidth="1" />
    {/* Dog ear */}
    <path d="M12 11L22 11L12 21Z" fill="#f3f4f6" />
    {/* Arrows */}
    {arrowDirection === 'inward' ? (
      <>
        <path d="M10 10L14 14" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M30 30L26 26" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M14 14L10 10" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M26 26L30 30" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" />
      </>
    )}
  </svg>
);

export const ConversionIcon = ({ badgeLetter, badgeColor = '#2563eb', pageColor = '#dce5fa', direction = 'inward' }: { badgeLetter: string; badgeColor?: string; pageColor?: string; direction?: 'inward' | 'outward' }) => (
  <svg className="w-10 h-10" viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Page */}
    <rect x="10" y="6" width="22" height="28" rx="3" fill={pageColor} stroke="#e5e7eb" strokeWidth="1" />
    {/* Dog ear */}
    <path d="M10 6L20 6L10 16Z" fill="#f3f4f6" />
    {/* Badge */}
    <rect x="22" y="24" width="12" height="12" rx="3" fill={badgeColor} />
    <text x="28" y="33" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="system-ui">{badgeLetter}</text>
    {/* Arrow */}
    {direction === 'inward' ? (
      <path d="M12 12L8 8" stroke={badgeColor} strokeWidth="1.5" strokeLinecap="round" />
    ) : (
      <path d="M8 8L12 12" stroke={badgeColor} strokeWidth="1.5" strokeLinecap="round" />
    )}
  </svg>
);

export const CompressIcon = () => (
  <svg className="w-10 h-10" viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="10" width="10" height="10" rx="2" fill="#bbf7d0" />
    <rect x="20" y="10" width="10" height="10" rx="2" fill="#bbf7d0" />
    <rect x="10" y="20" width="10" height="10" rx="2" fill="#bbf7d0" />
    <rect x="20" y="20" width="10" height="10" rx="2" fill="#bbf7d0" />
    <path d="M14 14L12 12" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M26 14L28 12" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 26L12 28" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M26 26L28 28" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const SecurityIcon = ({ accentColor = '#ef4444', light = '#fecaca', symbol = 'lock' }: { accentColor?: string; light?: string; symbol?: 'lock' | 'pen' }) => (
  <svg className="w-10 h-10" viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Page stack */}
    <rect x="9" y="6" width="22" height="26" rx="3" fill={light} />
    <rect x="13" y="10" width="22" height="26" rx="3" fill="white" stroke="#e5e7eb" strokeWidth="1" />
    {/* Dog ear */}
    <path d="M13 10L23 10L13 20Z" fill="#f3f4f6" />
    {/* Symbol */}
    {symbol === 'lock' ? (
      <path d="M24 18v-4a4 4 0 0 1 8 0v4" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M20 24l4 4 6-8" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);
