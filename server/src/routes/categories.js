import express from 'express';

export function categoriesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name').all();
    res.json(rows);
  });

  return router;
}
