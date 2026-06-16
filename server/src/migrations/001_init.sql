-- Initial schema: categories and transactions.
-- All money amounts are stored as integer cents (minor units) — never floats.

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  monthly_budget_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_budget_cents >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL CHECK (trim(description) != ''),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- Default categories. Colors are placeholders until the reference prototype's
-- palette is wired in.
INSERT INTO categories (name, color, sort_order) VALUES
  ('Housing', '#3f6657', 0),
  ('Groceries', '#5b8a72', 1),
  ('Dining', '#a98548', 2),
  ('Transport', '#4d7c8a', 3),
  ('Utilities', '#7a6f9b', 4),
  ('Entertainment', '#b5654d', 5),
  ('Health', '#6f8f4d', 6),
  ('Other', '#8a8478', 7);
