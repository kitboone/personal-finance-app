import express from 'express';
import { getAuth } from '@clerk/express';
import { validateSettingsInput } from '../lib/validation.js';

// Per-user projection settings for the Retirement page (horizon + USD->SGD
// rate). GET returns the saved row, or the defaults below if the user hasn't
// saved any yet. PUT upserts the single row, scoped to the Clerk user id.
const DEFAULTS = { projection_years: 10, usd_sgd_rate_e4: 13500 };

export function settingsRouter(db) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const row = await db.get(
        'SELECT projection_years, usd_sgd_rate_e4 FROM user_settings WHERE user_id = ?',
        [userId]
      );
      res.json(row ?? DEFAULTS);
    } catch (err) {
      next(err);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      const { userId } = getAuth(req);
      const errors = validateSettingsInput(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      const { projectionYears, usdSgdRateE4 } = req.body;
      await db.run(
        `INSERT INTO user_settings (user_id, projection_years, usd_sgd_rate_e4, updated_at)
         VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(user_id) DO UPDATE SET
           projection_years = excluded.projection_years,
           usd_sgd_rate_e4 = excluded.usd_sgd_rate_e4,
           updated_at = excluded.updated_at`,
        [userId, projectionYears, usdSgdRateE4]
      );

      const row = await db.get(
        'SELECT projection_years, usd_sgd_rate_e4 FROM user_settings WHERE user_id = ?',
        [userId]
      );
      res.json(row);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
