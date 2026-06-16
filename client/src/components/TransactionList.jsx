import { formatCents } from '../money.js';

export function TransactionList({ transactions, categoriesById }) {
  if (transactions.length === 0) {
    return <p className="empty-state">No transactions yet. Add your first one above.</p>;
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
          </li>
        );
      })}
    </ul>
  );
}
