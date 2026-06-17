import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { AddTransactionForm } from '../components/AddTransactionForm.jsx';
import { TransactionList } from '../components/TransactionList.jsx';

// The working transaction flow from v1, now living on its own page.
export default function Transactions() {
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

  return (
    <div className="page">
      <h1 className="page-title">Transactions</h1>

      {loading && <p className="status-message">Loading…</p>}
      {loadError && (
        <p className="status-message error">Couldn't load data: {loadError}</p>
      )}

      {!loading && !loadError && (
        <>
          <AddTransactionForm categories={categories} onAdd={handleAdd} />
          <section>
            <h2>Recent activity</h2>
            <TransactionList transactions={transactions} categoriesById={categoriesById} />
          </section>
        </>
      )}
    </div>
  );
}
