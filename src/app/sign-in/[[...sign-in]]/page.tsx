import { SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'Sign in — PDF Master',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      <SignIn />
    </div>
  );
}
