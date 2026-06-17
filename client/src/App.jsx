import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
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

      {/* The app shell (nav menu + page content). Once Clerk auth lands in
          step 2, these routes get wrapped so only signed-in users reach them. */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/account" element={<Account />} />
      </Route>
    </Routes>
  );
}
