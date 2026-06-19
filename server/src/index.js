import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clerkMiddleware, getAuth } from '@clerk/express';
import { openDb } from './db.js';
import { transactionsRouter } from './routes/transactions.js';
import { categoriesRouter } from './routes/categories.js';
import { retirementRouter } from './routes/retirement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Clerk needs both keys to verify sessions: the secret key to validate, and
// the publishable key to resolve which Clerk instance the tokens belong to.
// Without either, every /api request fails at runtime with a 500, so fail
// loudly at startup instead.
const missingKeys = ['CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY'].filter(
  (k) => !process.env[k]
);
if (missingKeys.length > 0) {
  console.error(
    `[server] Missing ${missingKeys.join(' and ')}. Add to server/.env (see server/.env.example).`
  );
  process.exit(1);
}

const db = await openDb();
const app = express();

app.use(express.json());

// Reads/verifies the Clerk session on every request (from the Authorization
// bearer token the client sends). requireAuth() then rejects any /api request
// without a valid session with 401 — so the data routes can trust getAuth().
app.use(clerkMiddleware());

// Our /api routes are called by fetch(), not browser navigation, so a missing
// session should return a JSON 401 the client can catch — not Clerk's default
// redirect to a sign-in page (which would hand back HTML to a fetch call).
function requireUser(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ errors: ['Not signed in'] });
  }
  next();
}

app.use('/api/transactions', requireUser, transactionsRouter(db));
app.use('/api/categories', requireUser, categoriesRouter(db));
app.use('/api/retirement-assets', requireUser, retirementRouter(db));

// In production this same process serves the built client.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Any error thrown in an async route handler lands here. Return JSON (not the
// default HTML error page) so the client's fetch wrapper can parse it.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({ errors: ['Something went wrong.'] });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
