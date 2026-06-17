import express from 'express';
import { getAuth } from '@clerk/express';
import { validateTransactionInput } from '../lib/validation.js';

export function transactionsRouter(db) {
  const router = express.Router();

  // Confirms a category exists AND belongs to this user. Prevents a user from
  // attaching their transaction to someone else's category id.
  async function ownsCategory(userId, categoryId) {
    const row = await db.get(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );
    return Boolean(row);
  }

  // List this user's transactions, most recent first. ?month=YYYY-MM scopes
  // to a single month.
  router.get('/', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const { month } = req.query;
      const rows = month
        ? await db.all(
            `SELECT * FROM transactions
             WHERE user_id = ? AND date LIKE ?
             ORDER BY date DESC, id DESC`,
            [userId, `${month}%`]
          )
        : await db.all(
            `SELECT * FROM transactions
             WHERE user_id = ?
             ORDER BY date DESC, id DESC`,
            [userId]
          );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const errors = validateTransactionInput(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
      if (!(await ownsCategory(userId, req.body.categoryId))) {
        return res.status(400).json({ errors: ['Category does not exist.'] });
      }

      const { description, amountCents, type, categoryId, date } = req.body;
      const result = await db.run(
        `INSERT INTO transactions (user_id, description, amount_cents, type, category_id, date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, description.trim(), amountCents, type, categoryId, date]
      );

      const created = await db.get('SELECT * FROM transactions WHERE id = ?', [
        result.lastInsertRowid,
      ]);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const errors = validateTransactionInput(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const existing = await db.get(
        'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (!existing) {
        return res.status(404).json({ errors: ['Transaction not found.'] });
      }
      if (!(await ownsCategory(userId, req.body.categoryId))) {
        return res.status(400).json({ errors: ['Category does not exist.'] });
      }

      const { description, amountCents, type, categoryId, date } = req.body;
      await db.run(
        `UPDATE transactions
         SET description = ?, amount_cents = ?, type = ?, category_id = ?, date = ?
         WHERE id = ? AND user_id = ?`,
        [description.trim(), amountCents, type, categoryId, date, req.params.id, userId]
      );

      const updated = await db.get('SELECT * FROM transactions WHERE id = ?', [
        req.params.id,
      ]);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const result = await db.run(
        'DELETE FROM transactions WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (result.changes === 0) {
        return res.status(404).json({ errors: ['Transaction not found.'] });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
