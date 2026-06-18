import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatCents } from '../money.js';

// The current month as YYYY-MM, in the user's local time (not UTC), so the
// dashboard opens on "this month" even near a month boundary in Singapore.
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// The monthly overview: net / income / spent, spending by category, and
// progress against any budgets the user has set. All amounts are integer
// cents; the math here is plain addition, so it's computed in the browser
// from the existing transactions + categories endpoints rather than a new
// server aggregation.
export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth);
  // The fetched result is tagged with the month it belongs to, so we can
  // derive "loading" during render (result is for an older month, or absent)
  // instead of toggling a loading flag inside the effect.
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getCategories(), api.getTransactions(month)])
      .then(([categories, transactions]) => {
        if (!cancelled) setResult({ month, categories, transactions });
      })
      .catch((err) => {
        if (!cancelled) setResult({ month, error: err.message });
      });
    // If the user switches months quickly, ignore the older request's result.
    return () => {
      cancelled = true;
    };
  }, [month]);

  const ready = result?.month === month;
  const loading = !ready;
  const loadError = ready ? result.error ?? null : null;

  const summary = useMemo(
    () =>
      computeSummary(
        ready && !result.error ? result.transactions : [],
        ready && !result.error ? result.categories : []
      ),
    [ready, result]
  );

  return (
    <div className="page">
      <div className="dashboard-head">
        <h1 className="page-title">Dashboard</h1>
        <label className="month-picker">
          <span className="sr-only">Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
          />
        </label>
      </div>

      {loading && <p className="status-message">Loading…</p>}
      {loadError && (
        <p className="status-message error">Couldn't load data: {loadError}</p>
      )}

      {!loading && !loadError && (
        <>
          <section className="summary-cards">
            <SummaryCard
              label="Net"
              cents={summary.net}
              tone={summary.net >= 0 ? 'income' : 'expense'}
              signed
            />
            <SummaryCard label="Income" cents={summary.income} tone="income" />
            <SummaryCard label="Spent" cents={summary.spent} tone="expense" />
          </section>

          <section className="dashboard-section">
            <h2>Spending by category</h2>
            {summary.spending.length === 0 ? (
              <p className="empty-state">No spending recorded this month.</p>
            ) : (
              <ul className="breakdown-list">
                {summary.spending.map((row) => (
                  <li key={row.id} className="breakdown-row">
                    <div className="breakdown-top">
                      <span
                        className="breakdown-name"
                        style={{ color: row.color }}
                      >
                        {row.name}
                      </span>
                      <span className="breakdown-amount">
                        {formatCents(row.spent)}
                      </span>
                    </div>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${row.share}%`,
                          background: row.color,
                        }}
                      />
                    </div>
                    <span className="breakdown-share">{row.share}% of spending</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard-section">
            <h2>Budget progress</h2>
            {summary.budgets.length === 0 ? (
              <p className="empty-state">
                No budgets set yet. Add monthly budgets on the Budgets page to
                track them here.
              </p>
            ) : (
              <ul className="breakdown-list">
                {summary.budgets.map((row) => (
                  <li
                    key={row.id}
                    className={`breakdown-row ${row.over ? 'over-budget' : ''}`}
                  >
                    <div className="breakdown-top">
                      <span
                        className="breakdown-name"
                        style={{ color: row.color }}
                      >
                        {row.name}
                      </span>
                      <span className="breakdown-amount">
                        {formatCents(row.spent)} / {formatCents(row.budget)}
                      </span>
                    </div>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(row.used, 100)}%`,
                          background: row.over ? 'var(--expense)' : row.color,
                        }}
                      />
                    </div>
                    <span className="breakdown-share">
                      {row.over
                        ? `Over by ${formatCents(row.spent - row.budget)}`
                        : `${row.used}% used`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, cents, tone, signed }) {
  const sign = signed && cents > 0 ? '+' : signed && cents < 0 ? '−' : '';
  return (
    <div className={`summary-card ${tone}`}>
      <span className="summary-label">{label}</span>
      <span className="summary-value">
        {sign}
        {formatCents(Math.abs(cents))}
      </span>
    </div>
  );
}

// Turns a month's transactions + the user's categories into the numbers the
// dashboard renders. Pure, so it's easy to reason about and reuse.
function computeSummary(transactions, categories) {
  const byId = new Map(categories.map((c) => [c.id, c]));

  let income = 0;
  let spent = 0;
  const spentByCategory = new Map();

  for (const t of transactions) {
    if (t.type === 'income') {
      income += t.amount_cents;
    } else {
      spent += t.amount_cents;
      spentByCategory.set(
        t.category_id,
        (spentByCategory.get(t.category_id) || 0) + t.amount_cents
      );
    }
  }

  // Spending breakdown: one row per category that had any expense, biggest
  // first. Share is a whole percent of the month's total spending.
  const spending = [...spentByCategory.entries()]
    .map(([categoryId, amount]) => {
      const cat = byId.get(categoryId);
      return {
        id: categoryId,
        name: cat?.name ?? 'Uncategorized',
        color: cat?.color ?? 'var(--text-muted)',
        spent: amount,
        share: spent > 0 ? Math.round((amount / spent) * 100) : 0,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  // Budget progress: only categories with a budget set. "used" can exceed 100
  // (the caller clamps the bar width); over-budget rows are flagged for styling.
  const budgets = categories
    .filter((c) => c.monthly_budget_cents > 0)
    .map((c) => {
      const used = spentByCategory.get(c.id) || 0;
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        spent: used,
        budget: c.monthly_budget_cents,
        used: Math.round((used / c.monthly_budget_cents) * 100),
        over: used > c.monthly_budget_cents,
      };
    })
    .sort((a, b) => b.used - a.used);

  return { income, spent, net: income - spent, spending, budgets };
}
