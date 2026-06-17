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

  return router;
}
