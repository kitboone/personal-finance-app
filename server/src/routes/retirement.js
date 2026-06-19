import express from 'express';
import { getAuth } from '@clerk/express';
import { validateRetirementAssetInput } from '../lib/validation.js';

// CRUD for a user's retirement assets — the holdings the projection page
// compounds. Every query is scoped by the Clerk user id, so one user can
// never see or touch another's assets (same pattern as transactions).
export function retirementRouter(db) {
  const router = express.Router();

  // List this user's assets, oldest first (stable display order).
  router.get('/', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const rows = await db.all(
        'SELECT * FROM retirement_assets WHERE user_id = ? ORDER BY id',
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
      const errors = validateRetirementAssetInput(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const { assetType, amountCents, currency, rateBps, remarks } = req.body;
      const result = await db.run(
        `INSERT INTO retirement_assets (user_id, asset_type, amount_cents, currency, rate_bps, remarks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, assetType, amountCents, currency, rateBps, remarks ?? '']
      );

      const created = await db.get(
        'SELECT * FROM retirement_assets WHERE id = ?',
        [result.lastInsertRowid]
      );
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const errors = validateRetirementAssetInput(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const existing = await db.get(
        'SELECT id FROM retirement_assets WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (!existing) {
        return res.status(404).json({ errors: ['Asset not found.'] });
      }

      const { assetType, amountCents, currency, rateBps, remarks } = req.body;
      await db.run(
        `UPDATE retirement_assets
         SET asset_type = ?, amount_cents = ?, currency = ?, rate_bps = ?, remarks = ?
         WHERE id = ? AND user_id = ?`,
        [assetType, amountCents, currency, rateBps, remarks ?? '', req.params.id, userId]
      );

      const updated = await db.get(
        'SELECT * FROM retirement_assets WHERE id = ?',
        [req.params.id]
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const result = await db.run(
        'DELETE FROM retirement_assets WHERE id = ? AND user_id = ?',
        [req.params.id, userId]
      );
      if (result.changes === 0) {
        return res.status(404).json({ errors: ['Asset not found.'] });
      }
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
