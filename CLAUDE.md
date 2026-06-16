# CLAUDE.md

Project context for whoever (human or AI) works on this codebase next.

## What this is

A personal finance tracker for a single local user. Manual transaction entry
(no bank syncing), categorized spending, monthly budgets, and a dashboard.
See `README.md` for the product brief and `CHANGELOG.md` for a running log
of notable decisions.

## How to run it

Requires Node.js (v20+; developed on v24) and npm. No other system
dependencies — SQLite is bundled via `better-sqlite3`.

```sh
npm install   # once, from the repo root (installs both workspaces)
npm run dev   # starts the API server (3001) and Vite dev server (5173)
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` requests to
the Express server, so the browser only ever talks to one origin.

For a production-style run (single process, single port):

```sh
npm run build   # builds the React app
npm start       # serves the built app + API from one Express process
```

## Folder structure

```
personal-finance-app/
├── client/                  # React + Vite front end
│   └── src/
│       ├── api.js           # fetch wrapper for the backend
│       ├── money.js         # cents <-> display string conversions
│       ├── App.jsx
│       └── components/
├── server/                  # Express + SQLite backend
│   ├── data/                 # finance.db lives here (gitignored — real data)
│   └── src/
│       ├── index.js          # app entry: wires routes, serves built client in prod
│       ├── db.js              # opens the DB, runs migrations
│       ├── migrations/        # numbered .sql files, applied once each, in order
│       ├── routes/            # one file per resource
│       └── lib/                # shared validation etc.
├── package.json              # npm workspaces root; `dev`/`build`/`start` scripts
├── CLAUDE.md                  # this file
├── README.md                  # plain-English setup/run instructions
└── CHANGELOG.md                # running log of notable decisions
```

## Data model

All money amounts are **integer cents** (minor units) end to end — in the
database, in API payloads, and in JS state. They are converted to a display
string (e.g. via `Intl.NumberFormat`) only at the point of rendering. Never
store or compute with floating-point dollars — that's how rounding bugs
creep into a finance app.

### `categories`
| column | type | notes |
|---|---|---|
| id | integer pk | |
| name | text | unique |
| color | text | hex string, for charts/badges |
| monthly_budget_cents | integer | default 0; budget feature reads/writes this |
| sort_order | integer | controls display order |

Seeded by `001_init.sql` with the default set: Housing, Groceries, Dining,
Transport, Utilities, Entertainment, Health, Other. Users can add/rename/
remove categories later (not yet built as a UI — currently DB-seeded only).

### `transactions`
| column | type | notes |
|---|---|---|
| id | integer pk | |
| description | text | required, non-empty (enforced in app + DB CHECK) |
| amount_cents | integer | required, > 0 (enforced in app + DB CHECK) — always positive; `type` carries the sign |
| type | text | `'income'` or `'expense'` |
| category_id | integer | FK -> categories.id |
| date | text | `YYYY-MM-DD` |
| created_at | text | ISO timestamp, set automatically |

No `account_id` column yet — out of scope for v1 (single implicit account).
Adding multi-account support later is a one-line migration
(`ALTER TABLE transactions ADD COLUMN account_id ...`) plus a default-backfill
for existing rows; the migration-runner pattern below supports this without
touching already-applied migrations.

### Retirement assets (planned, not yet built)
Will track CPF SA/OA/MA, ETF, and endowment balances over time, in multiple
currencies with SGD as the base. Not implemented yet — noted here so the
eventual schema doesn't surprise anyone.

## Conventions

- **Migrations**: add a new numbered `.sql` file to `server/src/migrations/`
  (e.g. `002_add_x.sql`). Never edit an already-applied migration — write a
  new one. `db.js` tracks what's been applied in a `schema_migrations` table
  and runs new files automatically on server start.
- **Validation**: input rules (non-empty description, positive amount, valid
  type/category/date) live in `server/src/lib/validation.js` and are checked
  before any DB write. The DB also has `CHECK` constraints as a backstop —
  belt and suspenders, since this is financial data.
- **API shape**: REST-ish, JSON in/out, cents for all money fields. Routes
  are one file per resource under `server/src/routes/`.
- **No ORM**: raw SQL via `better-sqlite3` (synchronous, simple, fast for a
  single local user). Kept deliberately small rather than reaching for an
  ORM/migration framework — revisit if/when the schema grows substantially.
- **Styling**: currently a minimal placeholder theme (see `index.css`
  variables). Intended to be replaced with the reference "calm ledger"
  prototype's palette (deep spruce green / amber accent / warm neutral) once
  shared.

## Out of scope (do not build without explicit sign-off)

Bank/account syncing, multiple accounts, multi-user/login, recurring
transactions, reports/exports/multi-month trends, mobile app, cloud hosting.
