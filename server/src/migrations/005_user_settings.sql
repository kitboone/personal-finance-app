-- Per-user projection view settings for the Retirement page: the horizon
-- (years) and the USD->SGD rate. One row per user (user_id PK), created on the
-- first save (PUT upserts). Until then the API returns the defaults below.
--
-- The FX rate is stored as an integer scaled by 10000 (1.35 -> 13500), keeping
-- financial values off floats — consistent with cents (money) and basis points
-- (return rates) elsewhere in the schema.

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  projection_years INTEGER NOT NULL DEFAULT 10 CHECK (projection_years >= 1 AND projection_years <= 60),
  usd_sgd_rate_e4 INTEGER NOT NULL DEFAULT 13500 CHECK (usd_sgd_rate_e4 > 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
