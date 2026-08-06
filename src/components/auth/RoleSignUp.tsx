'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { RoleSelector, type Role } from '@/components/auth/RoleSelector';

export function RoleSignUp({ initialRole = 'STUDENT' }: { initialRole?: Role }) {
  const [role, setRole] = useState<Role>(initialRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how you&apos;ll use PDF Master.</p>
        </div>

        <div className="flex justify-center">
          <RoleSelector value={role} onChange={setRole} />
        </div>

        {/* Keyed by role so Clerk picks up the new unsafeMetadata on change. */}
        <SignUp key={role} unsafeMetadata={{ role }} />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
