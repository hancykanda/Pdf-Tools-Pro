import { SignUp } from '@clerk/nextjs';

export const metadata = {
  title: 'Create your account — PDF Master',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] py-12 px-4 sm:px-6 lg:px-8">
      <SignUp />
    </div>
  );
}
