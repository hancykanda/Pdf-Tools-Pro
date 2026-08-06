'use client';

import { GraduationCap, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Role = 'TEACHER' | 'STUDENT';

const options: { role: Role; label: string; icon: typeof GraduationCap }[] = [
  { role: 'TEACHER', label: 'Teacher', icon: Presentation },
  { role: 'STUDENT', label: 'Student', icon: GraduationCap },
];

export function RoleSelector({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-white p-1 gap-1"
      role="radiogroup"
      aria-label="Account type"
    >
      {options.map((opt) => {
        const selected = value === opt.role;
        return (
          <button
            key={opt.role}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.role)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              selected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
