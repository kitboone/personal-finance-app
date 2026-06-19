# Changelog / decisions log

A running, plain-English log of notable decisions — not a full commit
history (see `git log` for that).

## 2026-06-19 — Asset mix pie chart

- The Retirement page now shows a **"Current assets by category"** donut chart:
  each asset's current value, converted to SGD and summed by asset type, with a
  legend of value + percentage. Rendered as **pure inline SVG** (slices are a
  circle's `stroke-dasharray` arcs) — no charting dependency, matching the
  hand-rolled CSS bars on the Dashboard. Asset types gained palette `color`s.

## 2026-06-19 — "Other" asset type

- Added **Other** as a retirement asset type (default 3%, SGD), for holdings
  that don't fit the named buckets. Since SQLite can't alter a CHECK in place,
  `006_asset_type_other.sql` rebuilds `retirement_assets` with the widened
  `asset_type` CHECK, copying every row over. Also added to the app-level
  validation list and the client's asset-type dropdown.

## 2026-06-19 — Persist projection settings + show totals

- The Retirement page's **projection settings** (years horizon + USD→SGD rate)
  now **persist per user**, so they survive reloads and follow you across
  devices. New `user_settings` table (`005_user_settings.sql`, one row per
  user) + `GET`/`PUT /api/settings` in `server/src/routes/settings.js` (PUT
  upserts). The page loads them on mount and saves via a **Save** button in the
  settings card (with ✓/error feedback, like Budgets).
- FX rate stored as an **integer ×10000** (1.35 = 13500), keeping it off floats
  like cents and basis points; years is a plain 1–60 integer (app + DB CHECK).
- The projection now states **Total starting value** and **Total final value**
  (SGD) just above the total-growth line.

## 2026-06-19 — Asset remarks field

- Each retirement asset gains an optional **remarks** note (≤ 50 chars), e.g.
  "OCBC endowment, matures 2031". New `remarks` column
  (`004_asset_remarks.sql`, `TEXT NOT NULL DEFAULT ''` with a `length <= 50`
  CHECK); validation caps it at 50 chars; the input enforces `maxLength`.
- Editable in the add form and each saved asset row; shown as a column in the
  "Value after N years" summary table.

## 2026-06-19 — Persist retirement assets per user

- Retirement assets are now **saved to the database**, scoped per user, the
  same way transactions are. New `retirement_assets` table
  (`003_retirement_assets.sql`) + user-scoped CRUD in
  `server/src/routes/retirement.js`, wired at `/api/retirement-assets`. Every
  query is filtered by the Clerk user id; one user can never see another's.
- The projection page now **loads, adds, edits, and deletes** real assets
  (add form + inline-editable saved rows with Save/Delete, like Budgets)
  instead of holding them only in browser state.
- **Rates stored as integer basis points** (`rate_bps`, 2.5% = 250), not
  floats — same discipline as money-as-cents, since a return compounds money.
  Amounts remain integer cents. DB CHECK constraints backstop the app-level
  validation (`validateRetirementAssetInput`).
- The projection **horizon (years) and USD→SGD FX rate stay client-side** —
  they're view settings, not per-asset data. Balance *history over time* is
  still future work; each row holds one current balance for now.

## 2026-06-19 — Retirement projection page (calculator only)

- Added a **Retirement** page (`/retirement`, in the nav) that projects the
  compounded growth of retirement assets. Asset types: CPF OA / SA / MA,
  Endowment, SG ETF, US ETF — each with an editable default annual return
  (CPF rates reflect the SG floor: OA 2.5%, SA/MA 4%) and currency.
- **Frontend-only, nothing persisted.** The retirement *schema* is still
  unbuilt (see the data-model note in CLAUDE.md); this is pure in-browser
  arithmetic, so it adds no migrations or API surface. When the schema lands,
  this page can read real balances instead of manual input.
- **Money stays integer cents**; compounding runs on exact cents and is only
  rounded at display. SGD is the base — non-SGD holdings (e.g. US ETF in USD)
  convert back with a user-supplied USD→SGD rate (default 1.35).
- Years to project defaults to **10** (1–60). Output is two tables: a per-asset
  summary at the horizon (with an SGD total) and a year-by-year SGD breakdown.
- New `formatCentsIn(cents, currency)` helper in `money.js` for the non-SGD
  display; the existing SGD `formatCents` is unchanged.

## 2026-06-17 — Phase 2 steps 3 & 4: per-user data + deployed online (COMPLETE)

- **Step 3 — per-user data.** Backend now verifies the Clerk session on every
  `/api` call and scopes every query by `user_id`; one user can never see or
  touch another's rows. Categories seed lazily per user (each gets their own
  8 defaults). Backend requires `CLERK_SECRET_KEY` **and**
  `CLERK_PUBLISHABLE_KEY` (the publishable key is needed server-side to verify
  tokens); unauthenticated `/api` calls get a JSON 401, not a redirect.
- **Step 4 — online.** Data layer switched from `better-sqlite3` to libsql
  (`@libsql/client`) behind a small async `db.get/all/run/batch` helper: a
  local SQLite file in dev, hosted **Turso** (Tokyo region) in prod, chosen by
  env vars. Deployed on **Railway** (one service builds the client + runs the
  server; HTTPS automatic, ~$5/mo). Secrets live only in Railway variables.
- **Gotcha learned:** `VITE_CLERK_PUBLISHABLE_KEY` is baked into the client at
  *build* time — it must be a Railway variable before the build, or the page
  renders blank. Documented in the README.
- **Verified end-to-end on the live URL:** two accounts, fully isolated data,
  over HTTPS, against Turso.
- **Still using Clerk *test* keys** (dev instance). Optional future hardening:
  promote to a Clerk production instance tied to the Railway domain.

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
