import express from 'express';
import { getAuth } from '@clerk/express';
import { ensureUserCategories } from '../lib/categories.js';

export function categoriesRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      // First visit for this user → give them their own default categories.
      await ensureUserCategories(db, userId);
      const rows = await db.all(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order, name',
        [userId]
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // Set a category's monthly budget. Scoped to the user's own category, so one
  // user can never edit another's. A budget of 0 means "no budget" (the
  // schema's default and what the dashboard treats as untracked).
  router.put('/:id', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const { monthlyBudgetCents } = req.body;
      if (
        typeof monthlyBudgetCents !== 'number' ||
        !Number.isInteger(monthlyBudgetCents) ||
        monthlyBudgetCents < 0
      ) {
        return res
          .status(400)
          .json({ errors: ['Budget must be zero or a positive whole number of cents.'] });
      }

      const result = await db.run(
        'UPDATE categories SET monthly_budget_cents = ? WHERE id = ? AND user_id = ?',
        [monthlyBudgetCents, req.params.id, userId]
      );
      if (result.changes === 0) {
        return res.status(404).json({ errors: ['Category not found.'] });
      }

      const updated = await db.get(
        'SELECT * FROM categories WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
