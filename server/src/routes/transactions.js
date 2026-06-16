import express from 'express';
import { validateTransactionInput } from '../lib/validation.js';

export function transactionsRouter(db) {
  const router = express.Router();

  // List transactions, most recent first. Supports ?month=YYYY-MM to scope
  // to a single month (used by the dashboard's month filter later).
  router.get('/', (req, res) => {
    const { month } = req.query;
    let rows;
    if (month) {
      rows = db
        .prepare(
          `SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC`
        )
        .all(`${month}%`);
    } else {
      rows = db.prepare(`SELECT * FROM transactions ORDER BY date DESC, id DESC`).all();
    }
    res.json(rows);
  });

  router.post('/', (req, res) => {
    const errors = validateTransactionInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const category = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(req.body.categoryId);
    if (!category) {
      return res.status(400).json({ errors: ['Category does not exist.'] });
    }

    const { description, amountCents, type, categoryId, date } = req.body;
    const result = db
      .prepare(
        `INSERT INTO transactions (description, amount_cents, type, category_id, date)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(description.trim(), amountCents, type, categoryId, date);

    const created = db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .get(result.lastInsertRowid);
    res.status(201).json(created);
  });

  router.put('/:id', (req, res) => {
    const errors = validateTransactionInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const existing = db.prepare('SELECT id FROM transactions WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ errors: ['Transaction not found.'] });
    }

    const category = db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .get(req.body.categoryId);
    if (!category) {
      return res.status(400).json({ errors: ['Category does not exist.'] });
    }

    const { description, amountCents, type, categoryId, date } = req.body;
    db.prepare(
      `UPDATE transactions
       SET description = ?, amount_cents = ?, type = ?, category_id = ?, date = ?
       WHERE id = ?`
    ).run(description.trim(), amountCents, type, categoryId, date, req.params.id);

    const updated = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ errors: ['Transaction not found.'] });
    }
    res.status(204).end();
  });

  return router;
}
