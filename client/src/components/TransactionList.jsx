import { useState } from 'react';
import { formatCents } from '../money.js';

export function TransactionList({ transactions, categoriesById, onDelete }) {
  // Which row is mid-delete, so we can disable its button and avoid a
  // double-submit while the request is in flight.
  const [deletingId, setDeletingId] = useState(null);

  if (transactions.length === 0) {
    return <p className="empty-state">No transactions yet. Add your first one above.</p>;
  }

  async function handleDeleteClick(t) {
    // Deleting financial data is irreversible — confirm first.
    if (!window.confirm(`Delete "${t.description}"? This can't be undone.`)) {
      return;
    }
    setDeletingId(t.id);
    try {
      await onDelete(t.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ul className="transaction-list">
      {transactions.map((t) => {
        const category = categoriesById.get(t.category_id);
        return (
          <li key={t.id} className={`transaction-row ${t.type}`}>
            <span className="transaction-date">{t.date}</span>
            <span className="transaction-description">{t.description}</span>
            <span className="transaction-category" style={{ color: category?.color }}>
              {category?.name ?? 'Uncategorized'}
            </span>
            <span className="transaction-amount">
              {t.type === 'income' ? '+' : '−'}
              {formatCents(t.amount_cents)}
            </span>
            <button
              type="button"
              className="transaction-delete"
              onClick={() => handleDeleteClick(t)}
              disabled={deletingId === t.id}
              aria-label={`Delete ${t.description}`}
            >
              {deletingId === t.id ? '…' : 'Delete'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
