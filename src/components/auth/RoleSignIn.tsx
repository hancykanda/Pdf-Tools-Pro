'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { RoleSelector, type Role } from '@/components/auth/RoleSelector';

export function RoleSignIn() {
  const [role, setRole] = useState<Role>('STUDENT');

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in, or pick a role to create a new account.
          </p>
        </div>

        <div className="flex justify-center">
          <RoleSelector value={role} onChange={setRole} />
        </div>

        <SignIn />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link
            href={`/sign-up?role=${role}`}
            className="font-medium text-primary hover:underline"
          >
            Create a {role === 'TEACHER' ? 'teacher' : 'student'} account
          </Link>
        </p>
      </div>
    </div>
  );
}
