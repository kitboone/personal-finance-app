import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import Landing from './pages/Landing.jsx';
import SignInPage from './pages/SignInPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Budgets from './pages/Budgets.jsx';
import Account from './pages/Account.jsx';
import './App.css';

export default function App() {
  return (
    <Routes>
      {/* Public landing page — what a logged-out visitor sees. */}
      <Route path="/" element={<Landing />} />

      {/* Clerk's sign-in / sign-up flows. The "/*" lets Clerk own its internal
          sub-steps (email verification, password reset, etc.). */}
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* The signed-in app. RequireAuth redirects logged-out visitors to "/". */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  );
}
