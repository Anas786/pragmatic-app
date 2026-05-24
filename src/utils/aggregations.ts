/**
 * Energy-report aggregation helpers shared by the Performance Report card.
 * Depend only on the networking types and the shared report/source utils
 * so they stay testable in isolation.
 */

import { EnergyReportRow } from 'src/networking';
import { ReportMapping } from 'src/types';
import { energyPalette } from 'src/theme';
import { formatChartLabel, resolveReportLabel } from './reports';
import { findSourceForColumn } from './sources';

export interface AggregatedSource {
  label: string;
  shortLabel: string;
  color: string;
  value: number;
  displayValue: string;
  percentage: string;
  percentNum: number;
}

export interface StackSegment {
  value: number;
  color: string;
  sourceLabel: string;
}

export interface StackBar {
  label: string;
  stacks: StackSegment[];
}

/** Internal source table — mirrors SOURCES in PerformanceReport/helpers but
 *  lives here so aggregations have no dependency on a screen-level file. */
const AGG_SOURCES = [
  { token: 'solar', fallbackLabel: 'Solar', color: energyPalette.solar },
  { token: 'wind', fallbackLabel: 'Wind', color: energyPalette.wind },
  { token: 'grid', fallbackLabel: 'Grid', color: energyPalette.grid },
  { token: 'genset', fallbackLabel: 'Genset', color: energyPalette.genset },
  { token: 'battery', fallbackLabel: 'Battery', color: energyPalette.battery },
] as const;

const formatKwh = (n: number): string =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const aggregateEnergy = (
  rows: EnergyReportRow[],
  mapping: ReportMapping | undefined | null,
): AggregatedSource[] => {
  const sums: Record<string, number> = {};
  const firstMatchedColumn: Record<string, string> = {};
  for (const s of AGG_SOURCES) sums[s.token] = 0;

  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (column === 'time') continue;
      const v = row[column];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const token = findSourceForColumn(column);
      if (!token) continue;
      sums[token] += v;
      if (!firstMatchedColumn[token]) {
        firstMatchedColumn[token] = column;
      }
    }
  }

  const total = AGG_SOURCES.reduce((acc, s) => acc + sums[s.token], 0);

  return AGG_SOURCES.map(src => {
    const value = sums[src.token];
    const matchedColumn = firstMatchedColumn[src.token];
    const pct = total > 0 ? (value / total) * 100 : 0;
    return {
      label: matchedColumn
        ? resolveReportLabel(mapping, matchedColumn, src.fallbackLabel)
        : src.fallbackLabel,
      shortLabel: src.fallbackLabel,
      color: src.color,
      value,
      displayValue: formatKwh(value),
      percentage: `${pct.toFixed(2)}%`,
      percentNum: pct,
    };
  });
};

export const buildStackData = (
  rows: EnergyReportRow[],
  pill: string,
  mapping: ReportMapping | undefined | null,
): StackBar[] =>
  rows
    .map(row => {
      const stacks: StackSegment[] = [];
      for (const src of AGG_SOURCES) {
        let value = 0;
        let matchedColumn: string | undefined;
        for (const column of Object.keys(row)) {
          if (column === 'time') continue;
          const v = row[column];
          if (typeof v !== 'number' || !Number.isFinite(v)) continue;
          const token = findSourceForColumn(column);
          if (token === src.token) {
            value += v;
            if (!matchedColumn) matchedColumn = column;
          }
        }
        if (value > 0) {
          const sourceLabel = matchedColumn
            ? resolveReportLabel(mapping, matchedColumn, src.fallbackLabel)
            : src.fallbackLabel;
          stacks.push({ value, color: src.color, sourceLabel });
        }
      }
      return { label: formatChartLabel(row.time, pill), stacks };
    })
    .filter(b => b.stacks.length > 0);
