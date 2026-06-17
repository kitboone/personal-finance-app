-- Phase 2 step 3: scope all data per user (by Clerk user id).
--
-- The tables from 001 hold only disposable defaults at this point (the 8 seed
-- categories and ZERO transactions), so we recreate them rather than do a
-- complex in-place migration. No real user data is lost.
--
-- Changes vs 001:
--   * every row now carries a NOT NULL user_id (the Clerk user id, a string).
--   * category names are unique PER USER, not globally — two family members
--     can each have a "Groceries".
--   * no global seed: each user gets their own default categories, seeded
--     lazily on first use (see lib/categories.js).

DROP TABLE transactions;
DROP TABLE categories;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  monthly_budget_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_budget_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, name)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL CHECK (trim(description) != ''),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
