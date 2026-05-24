/**
 * Color derivation helpers for data-driven UI elements (inverter cards,
 * status badges) that cycle through or map to the energy palette.
 */

import { energyPalette, semantic } from 'src/theme';

export type StatusKey = 'excellent' | 'good' | 'fair' | 'poor';

const ACCENT_CYCLE: string[] = [
  energyPalette.solar,
  energyPalette.wind,
  energyPalette.grid,
  energyPalette.genset,
  energyPalette.battery,
];

/** Cycles through the five energy-palette colours by 1-based inverter number. */
export const accentForInverter = (num: number): string =>
  ACCENT_CYCLE[(num - 1 + ACCENT_CYCLE.length) % ACCENT_CYCLE.length];

/** Maps a performance-ratio value to a labelled status badge.
 *  Thresholds: ≥90 Excellent, ≥80 Good, ≥70 Fair, <70 Poor. */
export const statusFor = (
  pr: number,
): { key: StatusKey; label: string; color: string } => {
  if (pr >= 90) return { key: 'excellent', label: 'Excellent', color: semantic.success };
  if (pr >= 80) return { key: 'good', label: 'Good', color: energyPalette.solar };
  if (pr >= 70) return { key: 'fair', label: 'Fair', color: semantic.warning };
  return { key: 'poor', label: 'Poor', color: semantic.danger };
};
