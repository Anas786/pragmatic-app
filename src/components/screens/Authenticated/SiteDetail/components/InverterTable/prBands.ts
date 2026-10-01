import { ColorScheme, PrBand, prBandPalette } from 'src/theme';

/**
 * Performance-ratio bands for the inverter fleet (Tables tab) — the web
 * portal's own rule, so a PR reads the same colour in the app and on the
 * web (Lucky Cement Tables tab, 2026-10-01):
 *
 *   < 40 Poor · 40–< 62 Fair · 62–< 82 Good · ≥ 82 Excellent
 *
 * Bars and band dots use the web's gradients (`prBandPalette`, identical
 * in light and dark); PR text uses the scheme's `prBandInk` (same hue, AA).
 * A missing PR (null / '' / NaN) is a neutral 'No data' — never 'Poor',
 * which would accuse an inverter the backend simply didn't report on. A
 * real 0 is Poor.
 */

export type StatusKey = PrBand | 'none';

export interface PrStatus {
  key: StatusKey;
  /** 'Excellent' / 'Good' / 'Fair' / 'Poor' / 'No data'. */
  label: string;
  /** The PR band; null = neutral (no data). */
  band: PrBand | null;
}

/** Lower bounds (inclusive, percent) of each PR band — the web's 40/62/82. */
export const PR_BAND_THRESHOLDS = { excellent: 82, good: 62, fair: 40 } as const;

const NO_DATA: PrStatus = Object.freeze({ key: 'none', label: 'No data', band: null });
const EXCELLENT: PrStatus = Object.freeze({ key: 'excellent', label: 'Excellent', band: 'excellent' });
const GOOD: PrStatus = Object.freeze({ key: 'good', label: 'Good', band: 'good' });
const FAIR: PrStatus = Object.freeze({ key: 'fair', label: 'Fair', band: 'fair' });
const POOR: PrStatus = Object.freeze({ key: 'poor', label: 'Poor', band: 'poor' });

/** Maps a performance ratio (percent) to its band. */
export const statusFor = (pr: number | null | undefined): PrStatus => {
  if (typeof pr !== 'number' || !Number.isFinite(pr)) return NO_DATA;
  if (pr >= PR_BAND_THRESHOLDS.excellent) return EXCELLENT;
  if (pr >= PR_BAND_THRESHOLDS.good) return GOOD;
  if (pr >= PR_BAND_THRESHOLDS.fair) return FAIR;
  return POOR;
};

/** Text ink for a PR value in its band; neutral secondary text when missing. */
export const prBandInk = (status: PrStatus, scheme: ColorScheme): string =>
  status.band ? scheme.prBandInk[status.band] : scheme.textSecondary;

/** The band's bar gradient (left → right); null when the PR is missing. */
export const prBandGradient = (status: PrStatus): [string, string] | null =>
  status.band ? prBandPalette[status.band] : null;

/** Solid band colour for small markers (hero dots) — the gradient's bright stop. */
export const prBandDotColor = (status: PrStatus): string | null =>
  status.band ? prBandPalette[status.band][1] : null;

/** Uptime bars are always the 'excellent' gradient — the web never grades uptime. */
export const UPTIME_GRADIENT: [string, string] = prBandPalette.excellent;
