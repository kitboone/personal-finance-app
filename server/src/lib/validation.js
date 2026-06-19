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

// Retirement-asset rules. The allowed asset types and currencies are mirrored
// in the client page; the DB CHECK constraints are the final backstop. Rates
// are integer basis points (2.5% = 250), keeping financial values off floats.
export const RETIREMENT_ASSET_TYPES = [
  'cpf_oa',
  'cpf_sa',
  'cpf_ma',
  'endowment',
  'sg_etf',
  'us_etf',
  'other',
];
export const RETIREMENT_CURRENCIES = ['SGD', 'USD'];

export function validateRetirementAssetInput(input) {
  const errors = [];

  if (!RETIREMENT_ASSET_TYPES.includes(input.assetType)) {
    errors.push('A valid asset type is required.');
  }

  if (
    typeof input.amountCents !== 'number' ||
    !Number.isInteger(input.amountCents) ||
    input.amountCents <= 0
  ) {
    errors.push('Amount must be a positive number.');
  }

  if (!RETIREMENT_CURRENCIES.includes(input.currency)) {
    errors.push('Currency must be SGD or USD.');
  }

  if (
    typeof input.rateBps !== 'number' ||
    !Number.isInteger(input.rateBps) ||
    input.rateBps < 0
  ) {
    errors.push('Return rate must be zero or a positive whole number of basis points.');
  }

  // Remarks are optional; when present, a short free-text note (<= 50 chars).
  if (input.remarks != null && (typeof input.remarks !== 'string' || input.remarks.length > 50)) {
    errors.push('Remarks must be 50 characters or fewer.');
  }

  return errors;
}

// Per-user projection settings. Years is a whole number in range; the FX rate
// is an integer scaled by 10000 (1.35 = 13500), matching the DB column.
export const MIN_PROJECTION_YEARS = 1;
export const MAX_PROJECTION_YEARS = 60;

export function validateSettingsInput(input) {
  const errors = [];

  if (
    typeof input.projectionYears !== 'number' ||
    !Number.isInteger(input.projectionYears) ||
    input.projectionYears < MIN_PROJECTION_YEARS ||
    input.projectionYears > MAX_PROJECTION_YEARS
  ) {
    errors.push(
      `Projection years must be a whole number between ${MIN_PROJECTION_YEARS} and ${MAX_PROJECTION_YEARS}.`
    );
  }

  if (
    typeof input.usdSgdRateE4 !== 'number' ||
    !Number.isInteger(input.usdSgdRateE4) ||
    input.usdSgdRateE4 <= 0
  ) {
    errors.push('USD to SGD rate must be a positive number.');
  }

  return errors;
}
