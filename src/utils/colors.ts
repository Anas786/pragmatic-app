/**
 * Performance-ratio status for the inverter fleet (Tables tab).
 *
 * Status is SEMANTIC, never an energy-source colour (energyPalette means
 * energy source only): Excellent ≥ 90 and Good ≥ 80 → success, Fair ≥ 70
 * → warning, Poor < 70 → danger. A missing PR (null / non-numeric) is a
 * neutral 'No data' — never 'Poor', which would accuse an inverter the
 * backend simply didn't report on. A real 0 is Poor.
 *
 * Fills (bars, dots) come from `semantic.*`; text and pills use the
 * scheme's `statusInk` / `statusSoft` roles so they stay AA in both themes.
 */

import { ColorScheme, semantic } from 'src/theme';

export type StatusKey = 'excellent' | 'good' | 'fair' | 'poor' | 'none';

/** Semantic role behind a PR status; null = neutral (no data). */
export type PrStatusRole = 'success' | 'warning' | 'danger' | null;

export interface PrStatus {
  key: StatusKey;
  /** 'Excellent' / 'Good' / 'Fair' / 'Poor' / 'No data'. */
  label: string;
  role: PrStatusRole;
}

/** Lower bounds (inclusive, percent) of each PR status band. */
export const PR_STATUS_THRESHOLDS = { excellent: 90, good: 80, fair: 70 } as const;

const NO_DATA: PrStatus = Object.freeze({ key: 'none', label: 'No data', role: null });
const EXCELLENT: PrStatus = Object.freeze({ key: 'excellent', label: 'Excellent', role: 'success' });
const GOOD: PrStatus = Object.freeze({ key: 'good', label: 'Good', role: 'success' });
const FAIR: PrStatus = Object.freeze({ key: 'fair', label: 'Fair', role: 'warning' });
const POOR: PrStatus = Object.freeze({ key: 'poor', label: 'Poor', role: 'danger' });

/** Maps a performance ratio (percent) to its status band. */
export const statusFor = (pr: number | null | undefined): PrStatus => {
  if (typeof pr !== 'number' || !Number.isFinite(pr)) return NO_DATA;
  if (pr >= PR_STATUS_THRESHOLDS.excellent) return EXCELLENT;
  if (pr >= PR_STATUS_THRESHOLDS.good) return GOOD;
  if (pr >= PR_STATUS_THRESHOLDS.fair) return FAIR;
  return POOR;
};

/** Text / icon ink for a status (status pills, PR values). */
export const prStatusInk = (status: PrStatus, scheme: ColorScheme): string =>
  status.role ? scheme.statusInk[status.role] : scheme.textSecondary;

/** Soft pill fill for a status — pair with `prStatusInk`. */
export const prStatusSoft = (status: PrStatus, scheme: ColorScheme): string =>
  status.role ? scheme.statusSoft[status.role] : scheme.surfaceMuted;

/** Solid FILL for a status (bars, dots) — never used as text. */
export const prStatusFill = (status: PrStatus, scheme: ColorScheme): string =>
  status.role ? semantic[status.role] : scheme.textTertiary;
