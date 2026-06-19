// Thin wrapper around fetch for the backend API. Throws on non-2xx so
// callers can catch a single error type instead of checking res.ok everywhere.

// The backend now requires a Clerk session token on every call. A signed-in
// part of the app registers Clerk's getToken() here (see AppLayout) so this
// module stays framework-agnostic. We attach the token as a bearer header.
let tokenGetter = null;
export function setTokenGetter(fn) {
  tokenGetter = fn;
}

async function request(path, options) {
  const token = tokenGetter ? await tokenGetter() : null;
  const res = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.errors?.join(' ') || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getCategories: () => request('/categories'),
  updateCategoryBudget: (id, monthlyBudgetCents) =>
    request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ monthlyBudgetCents }),
    }),
  getTransactions: (month) => request(`/transactions${month ? `?month=${month}` : ''}`),
  createTransaction: (data) =>
    request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) =>
    request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  getRetirementAssets: () => request('/retirement-assets'),
  createRetirementAsset: (data) =>
    request('/retirement-assets', { method: 'POST', body: JSON.stringify(data) }),
  updateRetirementAsset: (id, data) =>
    request(`/retirement-assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRetirementAsset: (id) =>
    request(`/retirement-assets/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/settings'),
  updateSettings: (data) =>
    request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
};
