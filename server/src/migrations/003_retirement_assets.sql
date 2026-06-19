-- Retirement assets: persist each user's holdings for the projection page.
--
-- Mirrors the per-user scoping of categories/transactions (002): every row
-- carries a NOT NULL user_id (the Clerk user id). One user never sees or
-- edits another's assets.
--
-- Conventions kept from the rest of the app:
--   * money as integer cents (amount_cents).
--   * rates as integer BASIS POINTS, not floats — 2.5% is 250 bps. Keeps the
--     "no floating-point for financial values" rule intact (a return rate
--     compounds money, so its precision matters too).
--   * CHECK constraints as a backstop to the app-level validation.

CREATE TABLE retirement_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (
    asset_type IN ('cpf_oa', 'cpf_sa', 'cpf_ma', 'endowment', 'sg_etf', 'us_etf')
  ),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency IN ('SGD', 'USD')),
  rate_bps INTEGER NOT NULL CHECK (rate_bps >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_retirement_assets_user ON retirement_assets(user_id);
