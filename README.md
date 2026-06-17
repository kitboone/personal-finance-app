# Personal Finance App

A simple, private ledger for tracking your own income and expenses, set
monthly budgets per category, and see how you're tracking — all running
locally on your own Mac. No bank connections, no cloud, no other users.

## Requirements

- [Node.js](https://nodejs.org) (LTS — v20 or newer)
- A `client/.env` file with a Clerk publishable key (for sign-in):

  ```sh
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
  ```

  This file is git-ignored and is **not** committed. Get the key from the
  [Clerk dashboard](https://dashboard.clerk.com). Without it the app will
  refuse to start (with a clear error message).

The database is a local SQLite file created automatically the first time you
run the app; there's nothing else to install or configure.

## Running it

From the project root, first time only:

```sh
npm install
```

Then, every time you want to use the app:

```sh
npm run dev
```

This starts both the backend and the front end. Open
**http://localhost:5173** in your browser.

Press `Ctrl+C` in the terminal to stop the app. Your data is saved
automatically and will be there next time you run `npm run dev` — it lives
in `server/data/finance.db`.

## Where your data lives

Everything you enter is stored in a single file on your own machine:
`server/data/finance.db`. It is never uploaded anywhere and is excluded
from git (see `.gitignore`) so it can't accidentally end up on GitHub.

Some features (the FX rate used for multi-currency retirement tracking)
make a read-only request to a public exchange-rate service over the
internet — none of your personal data is included in that request, only a
currency pair like "SGD to USD".

## Project layout / contributing

See `CLAUDE.md` for the folder structure, data model, and conventions used
in this codebase. See `CHANGELOG.md` for a running log of notable decisions.
