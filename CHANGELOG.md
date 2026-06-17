# Changelog / decisions log

A running, plain-English log of notable decisions — not a full commit
history (see `git log` for that).

## 2026-06-17 — Phase 2 step 2: Clerk authentication (frontend)

- Integrated **`@clerk/react` (v6)** for sign-up, login, logout, email
  verification, and password reset — all via Clerk's prebuilt components, so
  we never handle passwords.
- `ClerkProvider` reads the publishable key from `VITE_CLERK_PUBLISHABLE_KEY`
  (`client/.env`, git-ignored; documented via committed `.env.example`).
- Added `/sign-in` and `/sign-up` pages; `RequireAuth` gates the app routes
  (signed-out → landing); landing redirects signed-in users → dashboard;
  nav "Log out" calls Clerk's `signOut()`; Account page shows `<UserProfile>`.
- **Security note / not done yet:** this is a *frontend gate only*. The
  backend does not yet verify the Clerk session or scope data by user — every
  API call still returns all rows. Real per-user data security (the Clerk
  secret key + `user_id` columns + scoped queries) is **step 3**.

## 2026-06-17 — Phase 2 kickoff: family accounts (planning + step 1)

- **Goal:** turn the single-user local app into a small, family-only online
  app (not public). Brings hosting, a hosted database, and authentication
  into scope.
- **Approved stack:**
  - **Auth — Clerk.** Managed provider; gives signup/login/logout/password
    reset/email verification as drop-in components, never handling passwords
    ourselves. Has mobile SDKs (a mobile app is a stated future goal).
  - **Database — migrate SQLite → Turso** (hosted libSQL). It's
    SQLite-compatible, so the existing data layer carries over with minimal
    change; primary region pinned to Singapore.
  - **Hosting — Railway.** Chosen over Render because a future mobile app
    will call the Node API and Render's free-tier cold-starts hurt mobile
    UX. Railway has no idle-sleep for ~$5/mo. Express stays a clean
    standalone API (+ CORS) so web and mobile share it.
- **Cost flag:** ~$5/mo (Railway); Clerk + Turso free at family scale.
  Nothing paid signed up for without explicit OK.
- **Data-residency flag:** going online means family financial data moves
  off-device onto Clerk (identity) + Turso (data). Accepted as inherent to
  the "reachable online" goal; Turso DB pinned to Singapore.
- **Step 1 done (no backend/data changes):** added `react-router-dom`;
  restructured the front end into pages (Landing, Dashboard, Transactions,
  Budgets, Account); built a public landing page (calm ledger style) and a
  consistent nav menu. The working v1 transaction flow now lives on the
  Transactions page. Auth gating, Log in / Sign up, and Log out are
  placeholders until step 2.

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
