/**
 * Safe coercion helpers for values arriving from the backend where the
 * TypeScript type is `unknown` (live-data envelope entries, config blobs).
 */

/** Coerce `v` to a finite number, or `undefined` when it can't be parsed.
 *  Strings are tried with `parseFloat`-equivalent `Number(v)`; non-finite
 *  results (NaN, ±Infinity) are treated as absent. */
export const tryNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};
