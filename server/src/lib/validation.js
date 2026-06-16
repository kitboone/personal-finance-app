// Shared input validation for transactions. Kept in one place so the rules
// (no empty description, no zero/negative amounts, etc.) can't drift between
// the create and update code paths.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateTransactionInput(input) {
  const errors = [];

  if (typeof input.description !== 'string' || input.description.trim() === '') {
    errors.push('Description is required.');
  }

  if (
    typeof input.amountCents !== 'number' ||
    !Number.isInteger(input.amountCents) ||
    input.amountCents <= 0
  ) {
    errors.push('Amount must be a positive number.');
  }

  if (input.type !== 'income' && input.type !== 'expense') {
    errors.push('Type must be "income" or "expense".');
  }

  if (
    typeof input.categoryId !== 'number' ||
    !Number.isInteger(input.categoryId)
  ) {
    errors.push('A category is required.');
  }

  if (typeof input.date !== 'string' || !DATE_RE.test(input.date)) {
    errors.push('Date must be in YYYY-MM-DD format.');
  }

  return errors;
}
