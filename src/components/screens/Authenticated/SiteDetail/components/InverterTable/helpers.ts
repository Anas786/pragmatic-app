import { InverterReportRow } from 'src/networking';
import { InverterEntryData } from 'src/data/mock';
import { formatNumber } from 'src/utils';

export { accentForInverter, statusFor } from 'src/utils/colors';
export type { StatusKey } from 'src/utils/colors';

export const STAGGER_MS = 50;
export const STAGGER_CAP = 6;
export const ANIM_LIMIT = 10;
export const BAR_ANIM_MS = 900;

/** Gradient direction constants for the per-row tile accent sweep. */
export const GRADIENT_TL = { x: 0, y: 0 } as const;
export const GRADIENT_BR = { x: 1, y: 1 } as const;

export interface InverterEntry extends InverterEntryData {
  num: number;
  productionRaw: number | null;
}

export const mapRowsToEntries = (rows: InverterReportRow[]): InverterEntry[] =>
  rows.map(row => {
    const num =
      typeof row.inverter_num === 'number' && Number.isFinite(row.inverter_num)
        ? row.inverter_num
        : 0;
    const productionRaw =
      typeof row.ed_solar === 'number' && Number.isFinite(row.ed_solar)
        ? row.ed_solar
        : null;
    return {
      num,
      title: `Inverter ${row.inverter_num ?? '—'}`,
      production: formatNumber(row.ed_solar),
      productionRaw,
      yield: formatNumber(row.yield),
      performanceRatio:
        typeof row.pr === 'number' && Number.isFinite(row.pr) ? row.pr : 0,
      uptimePercent:
        typeof row.up_percent === 'number' && Number.isFinite(row.up_percent)
          ? row.up_percent
          : 0,
    };
  });
