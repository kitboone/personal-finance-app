import { Outlet } from 'react-router-dom';
import { NavMenu } from './NavMenu.jsx';

// Shared shell for the signed-in app: the nav menu on top, the active page
// rendered into <Outlet />.
export function AppLayout() {
  return (
    <div className="app-shell">
      <NavMenu />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
