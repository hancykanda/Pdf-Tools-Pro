import React from 'react';

/**
 * SVG ring spinner (Loading.io "ring" style) with explicitly hardcoded colors.
 * Uses no Tailwind color/opacity classes, so it renders reliably regardless of
 * the build's utility generation.
 */
export function Spinner({
  size = 40,
  color = '#e11d48',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  const stroke = Math.max(3, Math.round(size / 10));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * 0.7;
  const gap = circumference - dash;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`animate-spin ${className}`}
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle cx={c} cy={c} r={r} stroke={color} strokeOpacity={0.25} strokeWidth={stroke} />
      <circle
        cx={c}
        cy={c}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
      />
    </svg>
  );
}
