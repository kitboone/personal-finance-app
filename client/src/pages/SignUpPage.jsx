import { SignUp } from '@clerk/react';

// Clerk's prebuilt sign-up UI (account creation + email verification).
export default function SignUpPage() {
  return (
    <div className="auth-page">
      <SignUp path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
