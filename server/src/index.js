import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { transactionsRouter } from './routes/transactions.js';
import { categoriesRouter } from './routes/categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const db = openDb();
const app = express();

app.use(express.json());

app.use('/api/transactions', transactionsRouter(db));
app.use('/api/categories', categoriesRouter(db));

// In production there's no Vite dev server — this same process serves the
// built client so `npm start` is one process on one port.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
