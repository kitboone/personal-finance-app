// Opens the database and applies any migrations that haven't run yet.
//
// We use libsql (the SQLite-compatible client behind Turso). The same async
// API talks to two backends:
//   - Production: a hosted Turso database (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
//   - Local dev: a plain SQLite file in server/data/ (no env vars needed).
//
// Migrations live in ./migrations as plain .sql files, named with a numeric
// prefix (001_init.sql, 002_..., ...) so they apply in order. Each one runs
// at most once, tracked in the schema_migrations table. There's no rollback
// support — for a small app, "edit forward" is simpler and plenty safe.

import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Turso in production if its env vars are present; otherwise a local file.
function resolveConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return { url, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return { url: `file:${path.join(dataDir, 'finance.db')}` };
}

async function runMigrations(client) {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const result = await client.execute('SELECT name FROM schema_migrations');
  const applied = new Set(result.rows.map((row) => row.name));

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    // executeMultiple runs each statement in the file in order. Migrations are
    // hand-written and run once, so we don't wrap them in an extra transaction.
    await client.executeMultiple(sql);
    await client.execute({
      sql: 'INSERT INTO schema_migrations (name) VALUES (?)',
      args: [file],
    });
    console.log(`[db] applied migration ${file}`);
  }
}

// Wraps the libsql client in a small async interface the routes use:
//   db.get(sql, args)   -> first row as a plain object (or undefined)
//   db.all(sql, args)   -> all rows as plain objects
//   db.run(sql, args)   -> { changes, lastInsertRowid }
//   db.batch(statements)-> run [{sql, args}, ...] atomically
// Rows are copied into plain objects so they serialize cleanly to JSON.
function wrap(client) {
  const toObjects = (rs) =>
    rs.rows.map((row) => {
      const obj = {};
      for (const col of rs.columns) obj[col] = row[col];
      return obj;
    });

  return {
    raw: client,
    async get(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return toObjects(rs)[0];
    },
    async all(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return toObjects(rs);
    },
    async run(sql, args = []) {
      const rs = await client.execute({ sql, args });
      return {
        changes: rs.rowsAffected,
        lastInsertRowid:
          rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined,
      };
    },
    async batch(statements) {
      await client.batch(statements, 'write');
    },
  };
}

export async function openDb() {
  const client = createClient(resolveConfig());
  // App-level checks already enforce per-user ownership; this is belt-and-braces
  // for the category_id foreign key on the local file backend.
  await client.execute('PRAGMA foreign_keys = ON');
  await runMigrations(client);
  return wrap(client);
}
