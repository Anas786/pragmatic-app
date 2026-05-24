/**
 * Calendar-safe date arithmetic helpers. Centralised here so every
 * component that needs month-boundary math uses the same JS `setMonth`
 * behaviour (the runtime resolves overflows like 31 Jan + 1 → 28/29 Feb).
 */

export const addMonths = (d: Date, months: number): Date => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

export const addDays = (d: Date, days: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
