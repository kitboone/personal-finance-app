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
  const [deleteError, setDeleteError] = useState(null);

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

  // Delete on the server first, then drop it from the list, so a failed
  // request leaves the row in place (with an error shown) rather than
  // making it vanish optimistically and reappear.
  async function handleDelete(id) {
    setDeleteError(null);
    try {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setDeleteError(err.message);
    }
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
            {deleteError && (
              <p className="form-error">Couldn't delete: {deleteError}</p>
            )}
            <TransactionList
              transactions={transactions}
              categoriesById={categoriesById}
              onDelete={handleDelete}
            />
          </section>
        </>
      )}
    </div>
  );
}
