-- Add 'property' as an allowed retirement asset type.
--
-- As with 006, the asset_type CHECK can't be altered in place in SQLite, so we
-- rebuild the table with the widened CHECK and copy every row over. Columns are
-- listed explicitly so the copy is order-independent. This recreates the table
-- as it stood after 006 (all prior types incl. 'other', plus the remarks
-- column), with 'property' added to the asset_type CHECK.

CREATE TABLE retirement_assets_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (
    asset_type IN ('cpf_oa', 'cpf_sa', 'cpf_ma', 'endowment', 'sg_etf', 'us_etf', 'property', 'other')
  ),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency IN ('SGD', 'USD')),
  rate_bps INTEGER NOT NULL CHECK (rate_bps >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  remarks TEXT NOT NULL DEFAULT '' CHECK (length(remarks) <= 50)
);

INSERT INTO retirement_assets_new
  (id, user_id, asset_type, amount_cents, currency, rate_bps, created_at, remarks)
SELECT
  id, user_id, asset_type, amount_cents, currency, rate_bps, created_at, remarks
FROM retirement_assets;

DROP TABLE retirement_assets;
ALTER TABLE retirement_assets_new RENAME TO retirement_assets;

CREATE INDEX idx_retirement_assets_user ON retirement_assets(user_id);
