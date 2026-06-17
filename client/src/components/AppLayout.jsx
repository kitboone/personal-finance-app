import { Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/react';
import { NavMenu } from './NavMenu.jsx';
import { setTokenGetter } from '../api.js';

// Shared shell for the signed-in app: the nav menu on top, the active page
// rendered into <Outlet />.
export function AppLayout() {
  const { getToken } = useAuth();
  // Register Clerk's token getter during render (before child pages' effects
  // run), so the first API call from any page already carries the token.
  setTokenGetter(getToken);

  return (
    <div className="app-shell">
      <NavMenu />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
