# Changelog / decisions log

A running, plain-English log of notable decisions — not a full commit
history (see `git log` for that).

## 2026-06-16 — Project setup

- **Stack:** React + Vite front end, Node/Express + SQLite (`better-sqlite3`)
  backend, npm workspaces monorepo (`client/`, `server/`). Chosen over a
  no-backend (browser-storage-only) approach because the data is genuinely
  relational (transactions roll up by category and month) and SQLite gives
  transactional safety for money data essentially for free.
- **One-command dev:** `npm run dev` runs both processes via plain shell job
  control (`cmd & cmd & wait`) rather than the `concurrently` package — it
  pulled in a dev dependency (`shell-quote`) with a known critical
  advisory. Dropping the dependency removes the issue entirely and keeps
  the dependency list smaller.
- **Money handling:** all amounts stored and passed around as integer
  cents, never floating-point dollars. Converted to a display string only
  at render time.
- **Migrations:** hand-rolled, minimal migration runner (numbered `.sql`
  files + a `schema_migrations` table) instead of pulling in a migration
  framework — the schema is small enough that this stays simple.
- **Account ID:** deliberately *not* added to the `transactions` table yet,
  even though multi-account support is a documented future possibility.
  Adding it later is a one-line migration; an unused column today would
  just be dead weight in a small schema.
- **Recommender / retirement data sourcing:** investment and CPF/ETF growth
  assumptions ship as a curated, dated local reference table rather than
  live-scraped — Singapore safe-asset rates don't have a stable free public
  API, and a scraper would be fragile. Only currency exchange rates are
  fetched live, from the free, no-key-required Frankfurter API. No data
  ever sent out includes personal balances — only currency pairs.
- **Credentials:** git configured to use macOS Keychain
  (`credential.helper osxkeychain`) for GitHub auth — no tokens stored in
  plaintext anywhere in the repo or filesystem.

## 2026-06-16 — v1 milestone 1: data layer + add-transaction flow

- `categories` and `transactions` tables created, default 8 categories
  seeded (Housing, Groceries, Dining, Transport, Utilities, Entertainment,
  Health, Other).
- End-to-end flow verified: add a transaction via the UI → persists to
  SQLite → survives a full server restart.
- Styling is a placeholder (not yet matched to the reference "calm ledger"
  prototype) — pending the prototype being shared.
