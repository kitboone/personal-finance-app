// All amounts move around the app as integer cents (minor units). This is
// the one place that turns cents into a display string, so formatting stays
// consistent everywhere. Base currency is SGD for v1.

const formatter = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
});

export function formatCents(cents) {
  return formatter.format(cents / 100);
}

// Parses user input like "12.34" or "12" into integer cents. Returns null
// if the input isn't a valid positive amount, so callers can show a
// validation error instead of saving garbage.
export function parseAmountToCents(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents > 0 ? cents : null;
}
