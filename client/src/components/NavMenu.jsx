import { NavLink } from 'react-router-dom';
import { useClerk } from '@clerk/react';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/account', label: 'Account' },
];

export function NavMenu() {
  const { signOut } = useClerk();

  // Ends the Clerk session; ClerkProvider's afterSignOutUrl="/" returns the
  // user to the landing page.
  function handleLogout() {
    signOut();
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/dashboard" className="nav-brand">
          Ledger
        </NavLink>

        <nav className="nav-links" aria-label="Main navigation">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="nav-logout" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
