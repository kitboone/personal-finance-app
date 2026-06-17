// Placeholder for the account / profile page. Becomes real with Clerk auth
// (step 2) — it will show the signed-in user's profile and sign-out.
export default function Account() {
  return (
    <div className="page">
      <h1 className="page-title">Account</h1>
      <div className="placeholder-card">
        <p>Your profile and account settings will appear here once sign-in is added.</p>
        <p className="placeholder-note">Coming with authentication.</p>
      </div>
    </div>
  );
}
