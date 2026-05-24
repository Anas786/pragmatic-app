/**
 * Energy-source helpers shared across the Dashboard SiteCard, the
 * SiteDetail Cards / Live tabs, Reports, and any other surface that
 * classifies a backend card by its source name.
 *
 * Backend `card.name` shipping is text-only ("Solar Energy Today",
 * "Grid Import — RealTime", "Wind Generation", …). These helpers
 * normalise the text into a stable token from the v2 `energyPalette`
 * so colours + short labels stay consistent on every screen.
 */

import { energyPalette } from 'src/theme';

export type SourceToken = keyof typeof energyPalette;

/**
 * Match the lowercased `name` against the source dictionary. Returns
 * `undefined` for unrecognised values — callers should fall back to a
 * neutral colour / label.
 */
export const sourceTokenFromName = (
  name: string,
): SourceToken | undefined => {
  const n = name.toLowerCase();
  if (n.includes('solar') || n.includes('pv')) return 'solar';
  if (n.includes('wind')) return 'wind';
  if (n.includes('grid')) return 'grid';
  if (n.includes('genset') || n.includes('dg')) return 'genset';
  if (n.includes('battery') || n.includes('bess')) return 'battery';
  return undefined;
};

/**
 * Concise label for the source. Drops common decoration ("- RealTime",
 * "Today", etc.) and falls back to a 14-char prefix when the source
 * doesn't match the known set.
 */
export const shortSourceLabel = (name: string): string => {
  const token = sourceTokenFromName(name);
  if (token === 'solar') return 'Solar';
  if (token === 'wind') return 'Wind';
  if (token === 'grid') return 'Grid';
  if (token === 'genset') return 'Genset';
  if (token === 'battery') return 'Battery';
  const words = name.split(' ').slice(0, 2).join(' ');
  return words.length > 14 ? words.slice(0, 14) + '…' : words;
};

/**
 * Compact K/M/B formatter for cramped UI slots. Mirrors the legacy
 * `formatCompactNumber` in `utils/cards.ts` but treats *number-or-
 * string-or-NA* inputs uniformly (string passes through, NaN → "—").
 *
 * Examples (default 1 decimal):
 *   121393.6        → "121.4K"
 *   17_000          → "17K"
 *   1_005_727_768   → "1.0B"
 *   850             → "850"
 */
export const formatCompact = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return value;
    return formatCompact(parsed);
  }
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9)
    return (value / 1e9).toFixed(value >= 10e9 ? 0 : 1) + 'B';
  if (abs >= 1e6)
    return (value / 1e6).toFixed(value >= 10e6 ? 0 : 1) + 'M';
  if (abs >= 1e3)
    return (value / 1e3).toFixed(value >= 10e3 ? 0 : 1) + 'K';
  return value.toFixed(0);
};

/**
 * Match a backend column name (e.g. `ed_solar`, `et_grid_import`) against
 * the known source tokens via case-insensitive substring matching. Callers
 * use the returned token to look up colours and labels from `energyPalette`.
 * Returns `undefined` for unrecognised columns.
 */
export const findSourceForColumn = (column: string): SourceToken | undefined =>
  sourceTokenFromName(column);

/** Coerce a card-style value (`number | "NA" | etc.`) to a finite
 *  number, or `null` when it can't be parsed. */
export const numericCardValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};
