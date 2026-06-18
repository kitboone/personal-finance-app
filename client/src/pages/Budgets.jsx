import { useEffect, useState } from 'react';
import { api } from '../api.js';

// Per-category monthly budgets. Each row edits one category's budget on its
// own; an empty or zero value means "no budget" (untracked on the dashboard).
export default function Budgets() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Replace the saved category in place so its row reflects the stored value.
  function handleSaved(updated) {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Budgets</h1>
      <p className="page-intro">
        Set a monthly spending budget for each category. Leave a category blank
        for no budget. Progress shows on the Dashboard.
      </p>

      {loading && <p className="status-message">Loading…</p>}
      {loadError && (
        <p className="status-message error">Couldn't load categories: {loadError}</p>
      )}

      {!loading && !loadError && (
        <ul className="budget-list">
          {categories.map((c) => (
            <BudgetRow key={c.id} category={c} onSaved={handleSaved} />
          ))}
        </ul>
      )}
    </div>
  );
}

// Dollars (e.g. "" or "0" or "12.50") to integer cents. Returns null for
// anything that isn't a valid non-negative amount. Unlike money.js's
// parseAmountToCents, this allows zero and empty (both mean "no budget").
function parseBudgetToCents(value) {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function centsToInput(cents) {
  return cents > 0 ? (cents / 100).toFixed(2) : '';
}

function BudgetRow({ category, onSaved }) {
  const [draft, setDraft] = useState(centsToInput(category.monthly_budget_cents));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState(null);

  // The draft differs from what's stored, so there's something to save.
  const dirty = parseBudgetToCents(draft) !== category.monthly_budget_cents;

  async function handleSave(e) {
    e.preventDefault();
    const cents = parseBudgetToCents(draft);
    if (cents === null) {
      setStatus('error');
      setError('Enter an amount like 250 or 250.00.');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      const updated = await api.updateCategoryBudget(category.id, cents);
      onSaved(updated);
      setDraft(centsToInput(updated.monthly_budget_cents));
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <li className="budget-row">
      <form className="budget-form" onSubmit={handleSave}>
        <span className="budget-name" style={{ color: category.color }}>
          {category.name}
        </span>
        <div className="budget-input-wrap">
          <span className="budget-currency">S$</span>
          <input
            type="text"
            inputMode="decimal"
            className="budget-input"
            value={draft}
            placeholder="0.00"
            aria-label={`Monthly budget for ${category.name}`}
            onChange={(e) => {
              setDraft(e.target.value);
              if (status !== 'idle') setStatus('idle');
            }}
          />
        </div>
        <button
          type="submit"
          className="budget-save"
          disabled={!dirty || status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <span className="budget-status" aria-live="polite">
          {status === 'saved' && !dirty && '✓ Saved'}
          {status === 'error' && (
            <span className="budget-error">{error}</span>
          )}
        </span>
      </form>
    </li>
  );
}
