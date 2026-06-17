import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import { openDb } from './db.js';
import { transactionsRouter } from './routes/transactions.js';
import { categoriesRouter } from './routes/categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// The Clerk secret key is required to verify sessions. Fail loudly if it's
// missing rather than silently letting every request through unauthenticated.
if (!process.env.CLERK_SECRET_KEY) {
  console.error(
    '[server] Missing CLERK_SECRET_KEY. Add it to server/.env (see server/.env.example).'
  );
  process.exit(1);
}

const db = openDb();
const app = express();

app.use(express.json());

// Reads/verifies the Clerk session on every request (from the Authorization
// bearer token the client sends). requireAuth() then rejects any /api request
// without a valid session with 401 — so the data routes can trust getAuth().
app.use(clerkMiddleware());

app.use('/api/transactions', requireAuth(), transactionsRouter(db));
app.use('/api/categories', requireAuth(), categoriesRouter(db));

// In production this same process serves the built client.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
