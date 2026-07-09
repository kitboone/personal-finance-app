import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/react';
import './index.css';
import App from './App.jsx';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Fail loudly in development if the key is missing, rather than rendering a
// confusing half-broken app.
if (!publishableKey) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to client/.env (see README).'
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
);

// Register the PWA service worker in production only. In dev, Vite serves fresh
// modules and a caching SW would just get in the way.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: the app works without the SW, just without offline caching.
    });
  });
}
