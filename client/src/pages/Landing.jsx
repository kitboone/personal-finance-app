import { Link } from 'react-router-dom';

// Public welcome page. The Log in / Sign up buttons route to the app for now;
// step 2 (Clerk auth) replaces these targets with real sign-in / sign-up flows.
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="landing-brand">Ledger</span>
        <div className="landing-nav-actions">
          <Link to="/dashboard" className="btn btn-ghost">
            Log in
          </Link>
          <Link to="/dashboard" className="btn btn-amber">
            Sign up
          </Link>
        </div>
      </header>

      <main className="landing-hero">
        <h1>A calm, private ledger for your money.</h1>
        <p className="landing-lead">
          Track income and spending, set monthly budgets, and see at a glance how
          you're doing — for you and your family, each with your own private space.
        </p>
        <div className="landing-cta">
          <Link to="/dashboard" className="btn btn-amber btn-lg">
            Get started
          </Link>
          <Link to="/dashboard" className="btn btn-ghost btn-lg">
            Log in
          </Link>
        </div>

        <ul className="landing-points">
          <li>
            <strong>Simple by design</strong>
            Record income and expenses, categorize them, done.
          </li>
          <li>
            <strong>Budgets that nudge</strong>
            A monthly amount per category, with clear progress bars.
          </li>
          <li>
            <strong>Yours alone</strong>
            Each family member sees only their own finances.
          </li>
        </ul>
      </main>

      <footer className="landing-footer">
        <span>Ledger — a personal finance tracker for your family.</span>
      </footer>
    </div>
  );
}
