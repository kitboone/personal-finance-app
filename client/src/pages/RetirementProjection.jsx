import { useMemo, useState } from 'react';
import { formatCents, formatCentsIn, parseAmountToCents } from '../money.js';

// Retirement asset growth projection. A self-contained calculator: nothing is
// fetched or saved (the retirement schema isn't built yet — see CLAUDE.md), so
// this page only does arithmetic in the browser. Money is integer cents end to
// end, like the rest of the app; SGD is the base currency and non-SGD holdings
// are converted back to SGD with a user-supplied FX rate.

// The supported asset types, each with a sensible *default* annual return and
// denominating currency the user can override. The CPF rates reflect
// Singapore's prevailing floor rates (OA 2.5%, SA/MA 4%); the rest are rough
// long-run assumptions, not guarantees.
const ASSET_TYPES = [
  { id: 'cpf_oa', label: 'CPF OA', defaultRate: 2.5, currency: 'SGD' },
  { id: 'cpf_sa', label: 'CPF SA', defaultRate: 4, currency: 'SGD' },
  { id: 'cpf_ma', label: 'CPF MA', defaultRate: 4, currency: 'SGD' },
  { id: 'endowment', label: 'Endowment', defaultRate: 3, currency: 'SGD' },
  { id: 'sg_etf', label: 'SG ETF', defaultRate: 5, currency: 'SGD' },
  { id: 'us_etf', label: 'US ETF', defaultRate: 7, currency: 'USD' },
];
const ASSET_BY_ID = Object.fromEntries(ASSET_TYPES.map((a) => [a.id, a]));
const CURRENCIES = ['SGD', 'USD'];

const DEFAULT_YEARS = 10;
const MAX_YEARS = 60;
const DEFAULT_USD_SGD = 1.35;

// Stable keys for the editable rows (independent of array index, so removing a
// row doesn't reshuffle React's reconciliation).
let nextKey = 1;
function makeAsset(typeId = 'cpf_oa') {
  const t = ASSET_BY_ID[typeId];
  return {
    key: nextKey++,
    typeId,
    amount: '',
    currency: t.currency,
    rate: String(t.defaultRate),
  };
}

// "2.5" / "4" -> 2.5 ; null for anything that isn't a non-negative number.
function parseRate(value) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export default function RetirementProjection() {
  const [assets, setAssets] = useState(() => [makeAsset('cpf_oa')]);
  const [yearsInput, setYearsInput] = useState(String(DEFAULT_YEARS));
  const [fxInput, setFxInput] = useState(String(DEFAULT_USD_SGD));

  const years = clampYears(yearsInput);
  const fx = parseRate(fxInput) ?? DEFAULT_USD_SGD;
  const hasForeign = assets.some((a) => a.currency !== 'SGD');

  function updateAsset(key, patch) {
    setAssets((prev) =>
      prev.map((a) => (a.key === key ? { ...a, ...patch } : a))
    );
  }

  // Changing the asset type re-seeds that row's default rate and currency, so
  // picking "US ETF" immediately shows 7% / USD without extra clicks.
  function changeType(key, typeId) {
    const t = ASSET_BY_ID[typeId];
    updateAsset(key, { typeId, rate: String(t.defaultRate), currency: t.currency });
  }

  function addAsset() {
    setAssets((prev) => [...prev, makeAsset()]);
  }

  function removeAsset(key) {
    setAssets((prev) => prev.filter((a) => a.key !== key));
  }

  const projection = useMemo(
    () => computeProjection(assets, years, fx),
    [assets, years, fx]
  );

  return (
    <div className="page">
      <h1 className="page-title">Retirement projection</h1>
      <p className="page-intro">
        Project the compounded growth of your retirement assets. Amounts are in
        each holding's own currency and converted to SGD (the base) for the
        totals. Returns are assumptions, not guarantees — edit any rate to match
        your own estimate.
      </p>

      <section className="proj-config">
        <div className="proj-assets">
          {assets.map((asset) => (
            <AssetRow
              key={asset.key}
              asset={asset}
              canRemove={assets.length > 1}
              onChangeType={(t) => changeType(asset.key, t)}
              onPatch={(patch) => updateAsset(asset.key, patch)}
              onRemove={() => removeAsset(asset.key)}
            />
          ))}
        </div>

        <button type="button" className="proj-add" onClick={addAsset}>
          + Add asset
        </button>

        <div className="proj-controls">
          <label className="field">
            Years to project
            <input
              type="number"
              min="1"
              max={MAX_YEARS}
              value={yearsInput}
              onChange={(e) => setYearsInput(e.target.value)}
            />
          </label>
          {hasForeign && (
            <label className="field">
              USD → SGD rate
              <input
                type="text"
                inputMode="decimal"
                value={fxInput}
                onChange={(e) => setFxInput(e.target.value)}
              />
            </label>
          )}
        </div>
      </section>

      <Results projection={projection} years={years} fx={fx} />
    </div>
  );
}

function AssetRow({ asset, canRemove, onChangeType, onPatch, onRemove }) {
  return (
    <div className="proj-asset-row">
      <label className="field">
        Asset type
        <select value={asset.typeId} onChange={(e) => onChangeType(e.target.value)}>
          {ASSET_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Amount
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={asset.amount}
          onChange={(e) => onPatch({ amount: e.target.value })}
        />
      </label>

      <label className="field proj-narrow">
        Currency
        <select
          value={asset.currency}
          onChange={(e) => onPatch({ currency: e.target.value })}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="field proj-narrow">
        Return %
        <input
          type="text"
          inputMode="decimal"
          value={asset.rate}
          onChange={(e) => onPatch({ rate: e.target.value })}
        />
      </label>

      <button
        type="button"
        className="proj-remove"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Remove asset"
        title="Remove asset"
      >
        ×
      </button>
    </div>
  );
}

function Results({ projection, years, fx }) {
  const { rows, series, totalStartSgd, totalEndSgd, anyInvalid } = projection;

  if (rows.length === 0) {
    return (
      <p className="empty-state">
        Enter an amount for at least one asset to see the projection.
      </p>
    );
  }

  const totalGrowth = totalEndSgd - totalStartSgd;

  return (
    <>
      <section className="dashboard-section">
        <h2>Value after {years} {years === 1 ? 'year' : 'years'}</h2>
        <div className="proj-table-wrap">
          <table className="proj-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th className="num">Starting</th>
                <th className="num">Return</th>
                <th className="num">Final ({years}y)</th>
                <th className="num">Final (SGD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td className="num">{formatCentsIn(r.startCents, r.currency)}</td>
                  <td className="num">{r.rate}%</td>
                  <td className="num">{formatCentsIn(r.endCents, r.currency)}</td>
                  <td className="num">{formatCents(r.endSgdCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total (SGD)</td>
                <td className="num">{formatCents(totalStartSgd)}</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{formatCents(totalEndSgd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="proj-growth">
          Total growth: <strong>{formatCents(totalGrowth)}</strong> over {years}{' '}
          {years === 1 ? 'year' : 'years'}
          {rows.some((r) => r.currency !== 'SGD') &&
            ` (USD converted at ${fx} to SGD)`}
          .
        </p>
        {anyInvalid && (
          <p className="proj-note">
            Some rows were skipped — check that every amount and return is a
            valid number.
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Year-by-year (SGD)</h2>
        <div className="proj-table-wrap">
          <table className="proj-table">
            <thead>
              <tr>
                <th>Year</th>
                {rows.map((r) => (
                  <th key={r.key} className="num">
                    {r.label}
                  </th>
                ))}
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr
                  key={point.year}
                  className={point.year === years ? 'proj-final-row' : undefined}
                >
                  <td>{point.year}</td>
                  {rows.map((r) => (
                    <td key={r.key} className="num">
                      {formatCents(point.perAsset[r.key])}
                    </td>
                  ))}
                  <td className="num">{formatCents(point.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function clampYears(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_YEARS;
  return Math.min(n, MAX_YEARS);
}

// Pure projection math. For each valid asset, compound the starting amount at
// its annual return over `years`, convert to SGD, and also build a per-year
// SGD series for the year-by-year table. Cents stay integers at every boundary
// the user sees (compounding happens on the exact cents, rounded for display).
function computeProjection(assets, years, fx) {
  const toSgd = (cents, currency) =>
    currency === 'SGD' ? cents : Math.round(cents * fx);

  let anyInvalid = false;
  const rows = [];

  for (const asset of assets) {
    const startCents = parseAmountToCents(asset.amount);
    const rate = parseRate(asset.rate);
    if (startCents === null || rate === null) {
      // A blank, untouched row isn't an error; a half-filled one is.
      if (asset.amount.trim() !== '' || asset.rate.trim() === '') anyInvalid = true;
      continue;
    }
    const growth = 1 + rate / 100;
    const endCents = Math.round(startCents * growth ** years);
    rows.push({
      key: asset.key,
      label: ASSET_BY_ID[asset.typeId].label,
      currency: asset.currency,
      rate,
      growth,
      startCents,
      endCents,
      startSgdCents: toSgd(startCents, asset.currency),
      endSgdCents: toSgd(endCents, asset.currency),
    });
  }

  // One point per year, 1..years, each carrying every asset's SGD value plus
  // the running total — this is what the year-by-year table renders.
  const series = [];
  for (let y = 1; y <= years; y++) {
    const perAsset = {};
    let total = 0;
    for (const r of rows) {
      const valueCents = Math.round(r.startCents * r.growth ** y);
      const sgd = toSgd(valueCents, r.currency);
      perAsset[r.key] = sgd;
      total += sgd;
    }
    series.push({ year: y, perAsset, total });
  }

  const totalStartSgd = rows.reduce((sum, r) => sum + r.startSgdCents, 0);
  const totalEndSgd = rows.reduce((sum, r) => sum + r.endSgdCents, 0);

  return { rows, series, totalStartSgd, totalEndSgd, anyInvalid };
}
