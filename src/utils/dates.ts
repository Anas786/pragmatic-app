/**
 * Calendar-safe date arithmetic helpers. Centralised here so every
 * component that needs day-boundary math uses the same JS `setDate`
 * rollover behaviour (e.g. 30 Jan + 5 days → 4 Feb).
 */

export const addDays = (d: Date, days: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
