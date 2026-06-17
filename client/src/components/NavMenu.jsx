import { NavLink, useNavigate } from 'react-router-dom';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/budgets', label: 'Budgets' },
  { to: '/account', label: 'Account' },
];

export function NavMenu() {
  const navigate = useNavigate();

  // Placeholder until Clerk auth (step 2). For now "Log out" just returns the
  // visitor to the landing page; it will call Clerk's signOut() later.
  function handleLogout() {
    navigate('/');
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
