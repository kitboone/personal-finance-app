import { useState } from 'react';
import { parseAmountToCents } from '../money.js';

const TODAY = new Date().toISOString().slice(0, 10);

export function AddTransactionForm({ categories, onAdd }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [date, setDate] = useState(TODAY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (description.trim() === '') {
      setError('Description is required.');
      return;
    }
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError('Enter an amount greater than zero (e.g. 12.50).');
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        description: description.trim(),
        amountCents,
        type,
        categoryId: Number(categoryId),
        date,
      });
      setDescription('');
      setAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="add-transaction-form" onSubmit={handleSubmit}>
      <h2>Add transaction</h2>

      <div className="field">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Groceries at NTUC"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Add transaction'}
      </button>
    </form>
  );
}
