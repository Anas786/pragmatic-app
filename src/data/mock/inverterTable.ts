export type InverterFilterOption = 'Custom' | 'Month' | 'Year' | 'Life Time';

/**
 * One inverter's figures for the selected period, parsed from the
 * `inverter_queries` report row. Every numeric field is `null` when the
 * backend sent nothing parseable ('NA', null, '') — a missing value is
 * never coerced to 0, because a real 0 means "produced nothing" and
 * counts in the fleet stats while a missing one doesn't.
 */
export interface InverterEntryData {
  /** 'Inverter 3' (or the backend id, in its own case, when non-numeric). */
  title: string;
  /** Energy for the period, kWh (`ed_solar`). */
  production: number | null;
  /** Specific yield (`yield`) — unit per the report mapping. */
  yield: number | null;
  /** Performance ratio, percent (`pr`). */
  performanceRatio: number | null;
  /** Uptime, percent (`up_percent`). */
  uptimePercent: number | null;
}

export const inverterFilters: InverterFilterOption[] = [
  'Custom',
  'Month',
  'Year',
  'Life Time',
];
