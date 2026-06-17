import express from 'express';
import { getAuth } from '@clerk/express';
import { validateTransactionInput } from '../lib/validation.js';

export function transactionsRouter(db) {
  const router = express.Router();

  // Confirms a category exists AND belongs to this user. Prevents a user from
  // attaching their transaction to someone else's category id.
  function ownsCategory(userId, categoryId) {
    return db
      .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
      .get(categoryId, userId);
  }

  // List this user's transactions, most recent first. ?month=YYYY-MM scopes
  // to a single month.
  router.get('/', (req, res) => {
    const { userId } = getAuth(req);
    const { month } = req.query;
    const rows = month
      ? db
          .prepare(
            `SELECT * FROM transactions
             WHERE user_id = ? AND date LIKE ?
             ORDER BY date DESC, id DESC`
          )
          .all(userId, `${month}%`)
      : db
          .prepare(
            `SELECT * FROM transactions
             WHERE user_id = ?
             ORDER BY date DESC, id DESC`
          )
          .all(userId);
    res.json(rows);
  });

  router.post('/', (req, res) => {
    const { userId } = getAuth(req);
    const errors = validateTransactionInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    if (!ownsCategory(userId, req.body.categoryId)) {
      return res.status(400).json({ errors: ['Category does not exist.'] });
    }

    const { description, amountCents, type, categoryId, date } = req.body;
    const result = db
      .prepare(
        `INSERT INTO transactions (user_id, description, amount_cents, type, category_id, date)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(userId, description.trim(), amountCents, type, categoryId, date);

    const created = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(result.lastInsertRowid);
    res.status(201).json(created);
  });

  router.put('/:id', (req, res) => {
    const { userId } = getAuth(req);
    const errors = validateTransactionInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const existing = db
      .prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?')
      .get(req.params.id, userId);
    if (!existing) {
      return res.status(404).json({ errors: ['Transaction not found.'] });
    }
    if (!ownsCategory(userId, req.body.categoryId)) {
      return res.status(400).json({ errors: ['Category does not exist.'] });
    }

    const { description, amountCents, type, categoryId, date } = req.body;
    db.prepare(
      `UPDATE transactions
       SET description = ?, amount_cents = ?, type = ?, category_id = ?, date = ?
       WHERE id = ? AND user_id = ?`
    ).run(description.trim(), amountCents, type, categoryId, date, req.params.id, userId);

    const updated = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(req.params.id);
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const { userId } = getAuth(req);
    const result = db
      .prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
      .run(req.params.id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ errors: ['Transaction not found.'] });
    }
    res.status(204).end();
  });

  return router;
}
