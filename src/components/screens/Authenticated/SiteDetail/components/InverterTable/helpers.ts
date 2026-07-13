import { InverterReportRow } from 'src/networking';
import { InverterEntryData } from 'src/data/mock';
import { formatNumber, numericCardValue } from 'src/utils';

export { accentForInverter, statusFor } from 'src/utils/colors';
export type { StatusKey } from 'src/utils/colors';

export const STAGGER_MS = 50;
export const STAGGER_CAP = 6;
export const ANIM_LIMIT = 10;
export const BAR_ANIM_MS = 900;

/**
 * Rows revealed per frame by InverterTableCard's chunked progressive
 * mount (same rAF-counter convention as LiveParameterView — the list
 * can't virtualise inside SiteDetail's ScrollView, so an unbounded
 * fleet must not land in one Fabric commit). Kept ≥ ANIM_LIMIT so the
 * first chunk still carries the full FadeInDown stagger.
 */
export const MOUNT_CHUNK = 12;

/** Gradient direction constants for the per-row tile accent sweep. */
export const GRADIENT_TL = { x: 0, y: 0 } as const;
export const GRADIENT_BR = { x: 1, y: 1 } as const;

export interface InverterEntry extends InverterEntryData {
  num: number;
  productionRaw: number | null;
}

/**
 * Map raw report rows into render-ready entries. The backend ships
 * numerics inconsistently (numbers OR numeric strings — CLAUDE.md §14),
 * so every numeric field goes through `numericCardValue` instead of a
 * `typeof === 'number'` gate that would zero out string payloads.
 */
export const mapRowsToEntries = (rows: InverterReportRow[]): InverterEntry[] =>
  rows.map(row => {
    const num = numericCardValue(row.inverter_num) ?? 0;
    const productionRaw = numericCardValue(row.ed_solar);
    return {
      num,
      title: `Inverter ${row.inverter_num ?? '—'}`,
      production: formatNumber(row.ed_solar),
      productionRaw,
      yield: formatNumber(row.yield),
      performanceRatio: numericCardValue(row.pr) ?? 0,
      uptimePercent: numericCardValue(row.up_percent) ?? 0,
    };
  });
