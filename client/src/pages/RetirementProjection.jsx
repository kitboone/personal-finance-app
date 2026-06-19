import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatCents, formatCentsIn, parseAmountToCents } from '../money.js';

// Retirement asset growth projection. Assets are now persisted per user (see
// server/src/routes/retirement.js); this page loads them, lets the user
// add/edit/remove them, and projects their compounded growth. Money is integer
// cents and rates are integer basis points end to end — converted to display
// strings only at the edges. SGD is the base currency; non-SGD holdings are
// converted back with a user-supplied FX rate. The projection horizon (years)
// and FX rate are view settings, not persisted.

// Supported asset types, each with a sensible *default* annual return (percent)
// and denominating currency used when adding a new row. The CPF rates reflect
// Singapore's prevailing floor rates (OA 2.5%, SA/MA 4%); the rest are rough
// long-run assumptions, not guarantees. The `id` matches the DB asset_type.
const ASSET_TYPES = [
  { id: 'cpf_oa', label: 'CPF OA', defaultRate: 2.5, currency: 'SGD' },
  { id: 'cpf_sa', label: 'CPF SA', defaultRate: 4, currency: 'SGD' },
  { id: 'cpf_ma', label: 'CPF MA', defaultRate: 4, currency: 'SGD' },
  { id: 'endowment', label: 'Endowment', defaultRate: 3, currency: 'SGD' },
  { id: 'sg_etf', label: 'SG ETF', defaultRate: 5, currency: 'SGD' },
  { id: 'us_etf', label: 'US ETF', defaultRate: 7, currency: 'USD' },
  { id: 'other', label: 'Other', defaultRate: 3, currency: 'SGD' },
];
const ASSET_BY_ID = Object.fromEntries(ASSET_TYPES.map((a) => [a.id, a]));
const CURRENCIES = ['SGD', 'USD'];

const DEFAULT_YEARS = 10;
const MAX_YEARS = 60;
const DEFAULT_USD_SGD = 1.35;

// "12.34"/"12" dollars -> integer cents (positive only), or null if invalid.
// parseAmountToCents lives in money.js; re-exported intent here for clarity.
const amountToCents = parseAmountToCents;

// "2.5"/"4" percent -> integer basis points (250/400), or null if invalid.
// Allows zero and up to two decimal places of a percent (i.e. whole bps).
function rateToBps(value) {
  const trimmed = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

function centsToInput(cents) {
  return cents > 0 ? (cents / 100).toFixed(2) : '';
}
function bpsToInput(bps) {
  // 250 -> "2.5", 700 -> "7" (no trailing ".00").
  return String(bps / 100);
}

export default function RetirementProjection() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [yearsInput, setYearsInput] = useState(String(DEFAULT_YEARS));
  const [fxInput, setFxInput] = useState(String(DEFAULT_USD_SGD));
  // The last-persisted settings, for dirty detection. null until loaded.
  const [savedSettings, setSavedSettings] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState('idle'); // idle | saving | saved | error
  const [settingsError, setSettingsError] = useState(null);

  const years = clampYears(yearsInput);
  const fx = parseFx(fxInput);
  const hasForeign = assets.some((a) => a.currency !== 'SGD');

  // The settings the projection currently uses, as stored ints, for comparison
  // against what's persisted.
  const yearsToSave = years;
  const rateE4ToSave = Math.round(fx * 10000);
  const settingsDirty =
    savedSettings != null &&
    (yearsToSave !== savedSettings.projection_years ||
      rateE4ToSave !== savedSettings.usd_sgd_rate_e4);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getRetirementAssets(), api.getSettings()])
      .then(([rows, settings]) => {
        if (cancelled) return;
        setAssets(rows);
        setYearsInput(String(settings.projection_years));
        setFxInput(fxFromE4(settings.usd_sgd_rate_e4));
        setSavedSettings(settings);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings() {
    setSettingsStatus('saving');
    setSettingsError(null);
    try {
      const updated = await api.updateSettings({
        projectionYears: yearsToSave,
        usdSgdRateE4: rateE4ToSave,
      });
      setSavedSettings(updated);
      // Normalize the inputs to the stored values (e.g. clamped years).
      setYearsInput(String(updated.projection_years));
      setFxInput(fxFromE4(updated.usd_sgd_rate_e4));
      setSettingsStatus('saved');
    } catch (err) {
      setSettingsStatus('error');
      setSettingsError(err.message);
    }
  }

  function handleCreated(asset) {
    setAssets((prev) => [...prev, asset]);
  }
  function handleSaved(updated) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }
  function handleDeleted(id) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  const projection = useMemo(
    () => computeProjection(assets, years, fx),
    [assets, years, fx]
  );

  return (
    <div className="page">
      <h1 className="page-title">Retirement projection</h1>
      <p className="page-intro">
        Track your retirement assets and project their compounded growth. Assets
        are saved to your account. Amounts are in each holding's own currency and
        converted to SGD (the base) for the totals. Returns are assumptions, not
        guarantees — edit any rate to match your own estimate.
      </p>

      {loading && <p className="status-message">Loading…</p>}
      {loadError && (
        <p className="status-message error">Couldn't load assets: {loadError}</p>
      )}

      {!loading && !loadError && (
        <>
          <section className="dashboard-section">
            <h2>Your assets</h2>
            {assets.length === 0 ? (
              <p className="empty-state">
                No assets yet. Add one below to start projecting.
              </p>
            ) : (
              <div className="proj-assets">
                {assets.map((asset) => (
                  <AssetRow
                    key={asset.id}
                    asset={asset}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            )}
          </section>

          <AddAssetForm onCreated={handleCreated} />

          <section className="proj-config proj-settings">
            <h2>Projection settings</h2>
            <p className="field-hint proj-settings-note">
              Saved to your account and reused next time.
            </p>
            <div className="proj-controls">
              <label className="field">
                Years to project
                <input
                  type="number"
                  min="1"
                  max={MAX_YEARS}
                  value={yearsInput}
                  onChange={(e) => {
                    setYearsInput(e.target.value);
                    if (settingsStatus !== 'idle') setSettingsStatus('idle');
                  }}
                />
              </label>
              <label className="field">
                USD → SGD rate
                <input
                  type="text"
                  inputMode="decimal"
                  value={fxInput}
                  onChange={(e) => {
                    setFxInput(e.target.value);
                    if (settingsStatus !== 'idle') setSettingsStatus('idle');
                  }}
                />
                {!hasForeign && (
                  <span className="field-hint">
                    Applies to USD holdings (e.g. US ETF).
                  </span>
                )}
              </label>
              <button
                type="button"
                className="proj-save"
                onClick={saveSettings}
                disabled={!settingsDirty || settingsStatus === 'saving'}
              >
                {settingsStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </div>
            <span className="proj-settings-status" aria-live="polite">
              {settingsStatus === 'saved' && !settingsDirty && '✓ Saved'}
              {settingsStatus === 'error' && (
                <span className="proj-row-error">{settingsError}</span>
              )}
            </span>
          </section>

          <Results projection={projection} years={years} fx={fx} />
        </>
      )}
    </div>
  );
}

// One persisted asset, editable inline. Saves the whole row on demand (like the
// Budgets page), and can delete itself. Drafts live in local state so editing
// doesn't churn the parent list until a save succeeds.
function AssetRow({ asset, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(() => toDraft(asset));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const parsedAmount = amountToCents(draft.amount);
  const parsedBps = rateToBps(draft.rate);
  const dirty =
    draft.assetType !== asset.asset_type ||
    draft.currency !== asset.currency ||
    parsedAmount !== asset.amount_cents ||
    parsedBps !== asset.rate_bps ||
    draft.remarks !== (asset.remarks ?? '');

  function patch(next) {
    setDraft((prev) => ({ ...prev, ...next }));
    if (status !== 'idle') setStatus('idle');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (parsedAmount === null || parsedBps === null) {
      setStatus('error');
      setError('Enter a valid amount (e.g. 1000) and return (e.g. 4).');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      const updated = await api.updateRetirementAsset(asset.id, {
        assetType: draft.assetType,
        amountCents: parsedAmount,
        currency: draft.currency,
        rateBps: parsedBps,
        remarks: draft.remarks,
      });
      onSaved(updated);
      setDraft(toDraft(updated));
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteRetirementAsset(asset.id);
      onDeleted(asset.id);
    } catch (err) {
      setDeleting(false);
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <form className="proj-asset-row" onSubmit={handleSave}>
      <AssetFields draft={draft} onPatch={patch} />
      <div className="proj-row-actions">
        <button
          type="submit"
          className="proj-save"
          disabled={!dirty || status === 'saving' || deleting}
        >
          {status === 'saving' ? 'Saving…' : status === 'saved' && !dirty ? '✓' : 'Save'}
        </button>
        <button
          type="button"
          className="proj-remove"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete asset"
          title="Delete asset"
        >
          ×
        </button>
      </div>
      <label className="field proj-remarks">
        Remarks
        <input
          type="text"
          maxLength={50}
          placeholder="Optional note (max 50 chars)"
          value={draft.remarks}
          onChange={(e) => patch({ remarks: e.target.value })}
        />
      </label>
      {status === 'error' && <span className="proj-row-error">{error}</span>}
    </form>
  );
}

function AddAssetForm({ onCreated }) {
  const [draft, setDraft] = useState(() => blankDraft('cpf_oa'));
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [error, setError] = useState(null);

  // Picking a type seeds that type's default rate and currency.
  function changeType(typeId) {
    setDraft((prev) => ({ ...blankDraft(typeId), remarks: prev.remarks }));
    setStatus('idle');
  }
  function patch(next) {
    setDraft((prev) => ({ ...prev, ...next }));
    if (status !== 'idle') setStatus('idle');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const amountCents = amountToCents(draft.amount);
    const rateBps = rateToBps(draft.rate);
    if (amountCents === null || rateBps === null) {
      setStatus('error');
      setError('Enter a valid amount (e.g. 1000) and return (e.g. 4).');
      return;
    }
    setStatus('saving');
    setError(null);
    try {
      const created = await api.createRetirementAsset({
        assetType: draft.assetType,
        amountCents,
        currency: draft.currency,
        rateBps,
        remarks: draft.remarks,
      });
      onCreated(created);
      setDraft(blankDraft('cpf_oa'));
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <section className="proj-config">
      <h2>Add asset</h2>
      {status === 'error' && <p className="form-error">{error}</p>}
      <form className="proj-asset-row" onSubmit={handleSubmit}>
        <AssetFields draft={draft} onPatch={patch} onChangeType={changeType} />
        <div className="proj-row-actions">
          <button type="submit" className="proj-save" disabled={status === 'saving'}>
            {status === 'saving' ? 'Adding…' : 'Add'}
          </button>
        </div>
        <label className="field proj-remarks">
          Remarks
          <input
            type="text"
            maxLength={50}
            placeholder="Optional note (max 50 chars)"
            value={draft.remarks}
            onChange={(e) => patch({ remarks: e.target.value })}
          />
        </label>
      </form>
    </section>
  );
}

// The four editable fields shared by the add form and each saved row. When
// onChangeType is provided (the add form), changing the type re-seeds defaults;
// otherwise (a saved row) it just changes the type.
function AssetFields({ draft, onPatch, onChangeType }) {
  return (
    <>
      <label className="field">
        Asset type
        <select
          value={draft.assetType}
          onChange={(e) =>
            onChangeType ? onChangeType(e.target.value) : onPatch({ assetType: e.target.value })
          }
        >
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
          value={draft.amount}
          onChange={(e) => onPatch({ amount: e.target.value })}
        />
      </label>

      <label className="field proj-narrow">
        Currency
        <select value={draft.currency} onChange={(e) => onPatch({ currency: e.target.value })}>
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
          value={draft.rate}
          onChange={(e) => onPatch({ rate: e.target.value })}
        />
      </label>
    </>
  );
}

function Results({ projection, years, fx }) {
  const { rows, series, totalStartSgd, totalEndSgd } = projection;

  if (rows.length === 0) {
    return (
      <p className="empty-state">
        Add at least one asset above to see the projection.
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
                <th>Remarks</th>
                <th className="num">Starting</th>
                <th className="num">Return</th>
                <th className="num">Final ({years}y)</th>
                <th className="num">Final (SGD)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td className="proj-remarks-cell">{r.remarks}</td>
                  <td className="num">{formatCentsIn(r.startCents, r.currency)}</td>
                  <td className="num">{r.ratePercent}%</td>
                  <td className="num">{formatCentsIn(r.endCents, r.currency)}</td>
                  <td className="num">{formatCents(r.endSgdCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total (SGD)</td>
                <td></td>
                <td className="num">{formatCents(totalStartSgd)}</td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">{formatCents(totalEndSgd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="proj-totals">
          Total starting value: <strong>{formatCents(totalStartSgd)}</strong>
          <span className="proj-totals-sep"> · </span>
          Total final value: <strong>{formatCents(totalEndSgd)}</strong>
        </p>
        <p className="proj-growth">
          Total growth: <strong>{formatCents(totalGrowth)}</strong> over {years}{' '}
          {years === 1 ? 'year' : 'years'}
          {rows.some((r) => r.currency !== 'SGD') && ` (USD converted at ${fx} to SGD)`}.
        </p>
      </section>

      <section className="dashboard-section">
        <h2>Year-by-year (SGD)</h2>
        <div className="proj-table-wrap">
          <table className="proj-table">
            <thead>
              <tr>
                <th>Year</th>
                {rows.map((r) => (
                  <th key={r.id} className="num">
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
                    <td key={r.id} className="num">
                      {formatCents(point.perAsset[r.id])}
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

function toDraft(asset) {
  return {
    assetType: asset.asset_type,
    amount: centsToInput(asset.amount_cents),
    currency: asset.currency,
    rate: bpsToInput(asset.rate_bps),
    remarks: asset.remarks ?? '',
  };
}
function blankDraft(typeId) {
  const t = ASSET_BY_ID[typeId];
  return {
    assetType: typeId,
    amount: '',
    currency: t.currency,
    rate: String(t.defaultRate),
    remarks: '',
  };
}

function clampYears(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_YEARS;
  return Math.min(n, MAX_YEARS);
}
function parseFx(value) {
  const trimmed = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return DEFAULT_USD_SGD;
  return Number(trimmed);
}
// Stored FX rate (int x 10000) -> input string. 13500 -> "1.35".
function fxFromE4(e4) {
  return String(e4 / 10000);
}

// Pure projection math. For each saved asset, compound the starting cents at its
// annual return (basis points) over `years`, convert to SGD, and build a
// per-year SGD series for the year-by-year table. Compounding runs on exact
// cents; values are rounded to whole cents at each boundary the user sees.
function computeProjection(assets, years, fx) {
  const toSgd = (cents, currency) =>
    currency === 'SGD' ? cents : Math.round(cents * fx);

  const rows = assets.map((a) => {
    const growth = 1 + a.rate_bps / 10000; // 250 bps -> 1.025
    const startCents = a.amount_cents;
    const endCents = Math.round(startCents * growth ** years);
    return {
      id: a.id,
      label: ASSET_BY_ID[a.asset_type]?.label ?? a.asset_type,
      remarks: a.remarks ?? '',
      currency: a.currency,
      ratePercent: a.rate_bps / 100,
      growth,
      startCents,
      endCents,
      startSgdCents: toSgd(startCents, a.currency),
      endSgdCents: toSgd(endCents, a.currency),
    };
  });

  // One point per year, 1..years, each carrying every asset's SGD value plus
  // the running total — what the year-by-year table renders.
  const series = [];
  for (let y = 1; y <= years; y++) {
    const perAsset = {};
    let total = 0;
    for (const r of rows) {
      const valueCents = Math.round(r.startCents * r.growth ** y);
      const sgd = toSgd(valueCents, r.currency);
      perAsset[r.id] = sgd;
      total += sgd;
    }
    series.push({ year: y, perAsset, total });
  }

  const totalStartSgd = rows.reduce((sum, r) => sum + r.startSgdCents, 0);
  const totalEndSgd = rows.reduce((sum, r) => sum + r.endSgdCents, 0);

  return { rows, series, totalStartSgd, totalEndSgd };
}
