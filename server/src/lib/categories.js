// The default category set every new user starts with. Each user gets their
// own private copy (seeded lazily on first use) so they can rename/remove
// categories without affecting anyone else.

export const DEFAULT_CATEGORIES = [
  { name: 'Housing', color: '#3f6657', sort_order: 0 },
  { name: 'Groceries', color: '#5b8a72', sort_order: 1 },
  { name: 'Dining', color: '#a98548', sort_order: 2 },
  { name: 'Transport', color: '#4d7c8a', sort_order: 3 },
  { name: 'Utilities', color: '#7a6f9b', sort_order: 4 },
  { name: 'Entertainment', color: '#b5654d', sort_order: 5 },
  { name: 'Health', color: '#6f8f4d', sort_order: 6 },
  { name: 'Other', color: '#8a8478', sort_order: 7 },
];

// Ensures the given user has their default categories. Runs once per user
// (the first time they have none); a no-op thereafter. The inserts run as a
// single batch so a user never ends up with a half-seeded set.
export async function ensureUserCategories(db, userId) {
  const { n } = await db.get(
    'SELECT count(*) AS n FROM categories WHERE user_id = ?',
    [userId]
  );
  if (n > 0) return;

  await db.batch(
    DEFAULT_CATEGORIES.map((c) => ({
      sql: 'INSERT INTO categories (user_id, name, color, sort_order) VALUES (?, ?, ?, ?)',
      args: [userId, c.name, c.color, c.sort_order],
    }))
  );
}
