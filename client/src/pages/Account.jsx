import { UserProfile } from '@clerk/react';

// Clerk's prebuilt profile management UI: update email, change password,
// manage the account. No data of ours to wire in yet.
export default function Account() {
  return (
    <div className="page">
      <h1 className="page-title">Account</h1>
      <UserProfile />
    </div>
  );
}
