import express from 'express';
import { getAuth } from '@clerk/express';
import { ensureUserCategories } from '../lib/categories.js';

export function categoriesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { userId } = getAuth(req);
    // First visit for this user → give them their own default categories.
    ensureUserCategories(db, userId);
    const rows = db
      .prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order, name')
      .all(userId);
    res.json(rows);
  });

  return router;
}
