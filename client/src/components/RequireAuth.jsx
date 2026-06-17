import { useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';

// Gate for the signed-in app. While Clerk is still loading we render a small
// status line (avoids a flash of the wrong screen); once loaded, a signed-out
// visitor is sent back to the public landing page.
export function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <p className="status-message">Loading…</p>;
  }
  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
}
