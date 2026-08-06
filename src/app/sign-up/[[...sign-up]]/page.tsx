import { RoleSignUp } from '@/components/auth/RoleSignUp';

export const metadata = {
  title: 'Create your account — PDF Master',
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialRole = role === 'TEACHER' || role === 'STUDENT' ? role : 'STUDENT';
  return <RoleSignUp initialRole={initialRole} />;
}
