import { SignIn } from '@clerk/react';

// Clerk's prebuilt sign-in UI (handles login, email verification, and password
// reset). Path routing means Clerk's internal steps live under /sign-in/*,
// which is why App.jsx registers this route as "/sign-in/*".
export default function SignInPage() {
  return (
    <div className="auth-page">
      <SignIn path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
