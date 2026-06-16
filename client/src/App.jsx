import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import { AddTransactionForm } from './components/AddTransactionForm.jsx';
import { TransactionList } from './components/TransactionList.jsx';
import './App.css';

export default function App() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getTransactions()])
      .then(([cats, txns]) => {
        setCategories(cats);
        setTransactions(txns);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  async function handleAdd(input) {
    const created = await api.createTransaction(input);
    setTransactions((prev) => [created, ...prev]);
  }

  if (loading) return <p className="status-message">Loading…</p>;
  if (loadError) return <p className="status-message error">Couldn't load data: {loadError}</p>;

  return (
    <div className="app">
      <header>
        <h1>Ledger</h1>
      </header>

      <main>
        <AddTransactionForm categories={categories} onAdd={handleAdd} />
        <section>
          <h2>Recent activity</h2>
          <TransactionList transactions={transactions} categoriesById={categoriesById} />
        </section>
      </main>
    </div>
  );
}
