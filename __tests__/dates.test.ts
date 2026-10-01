/**
 * Date display vocabulary: ranges, months, relative ages. DD/MM/YY is
 * gone; ages are relative up to a day, then an absolute date.
 */
import { describe, expect, it } from '@jest/globals';
import {
  addDays,
  formatDateRange,
  formatMonthYear,
  formatShortDate,
  toEpochMs,
} from '../src/utils/dates';
import {
  formatClock,
  formatDateTimeShort,
  formatRelativeTime,
} from '../src/utils/format';

const d = (y: number, m: number, day: number, h = 12, min = 0) =>
  new Date(y, m - 1, day, h, min);

describe('formatDateRange', () => {
  it('same month → "1 – 30 Sep 2026"', () => {
    expect(formatDateRange(d(2026, 9, 1), d(2026, 9, 30))).toBe('1 – 30 Sep 2026');
  });
  it('same year → "1 Sep – 1 Oct 2026"', () => {
    expect(formatDateRange(d(2026, 9, 1), d(2026, 10, 1))).toBe('1 Sep – 1 Oct 2026');
  });
  it('across years → "28 Dec 2025 – 3 Jan 2026"', () => {
    expect(formatDateRange(d(2025, 12, 28), d(2026, 1, 3))).toBe('28 Dec 2025 – 3 Jan 2026');
  });
  it('a single day → "1 Oct 2026"', () => {
    expect(formatDateRange(d(2026, 10, 1, 0, 0), d(2026, 10, 1, 23, 59))).toBe('1 Oct 2026');
  });
  it('reversed inputs are ordered', () => {
    expect(formatDateRange(d(2026, 9, 30), d(2026, 9, 1))).toBe('1 – 30 Sep 2026');
  });
});

describe('formatMonthYear / formatShortDate', () => {
  it('1-based month → long name', () => {
    expect(formatMonthYear({ month: 9, year: 2026 })).toBe('September 2026');
    expect(formatMonthYear({ month: 1, year: 2025 })).toBe('January 2025');
  });
  it('omits the year only when it matches now', () => {
    const now = d(2026, 10, 1).getTime();
    expect(formatShortDate(d(2026, 9, 28).getTime(), now)).toBe('28 Sep');
    expect(formatShortDate(d(2025, 9, 28).getTime(), now)).toBe('28 Sep 2025');
  });
  it('addDays rolls months over', () => {
    expect(addDays(d(2026, 1, 30), 5).getDate()).toBe(4);
  });
});

describe('toEpochMs', () => {
  const ms = d(2026, 10, 1, 14, 29).getTime();
  it('accepts ms numbers, numeric strings, ISO strings and Dates', () => {
    expect(toEpochMs(ms)).toBe(ms);
    expect(toEpochMs(String(ms))).toBe(ms);
    expect(toEpochMs(new Date(ms).toISOString())).toBe(ms);
    expect(toEpochMs(new Date(ms))).toBe(ms);
  });
  it('reads epoch seconds as seconds', () => {
    expect(toEpochMs(Math.floor(ms / 1000))).toBe(Math.floor(ms / 1000) * 1000);
  });
  it.each([null, undefined, '', 'NA', 0, -5, NaN, {}, 'not a date'])('%p → null', v => {
    expect(toEpochMs(v)).toBeNull();
  });
});

describe('formatRelativeTime', () => {
  const now = d(2026, 10, 1, 14, 0).getTime();
  const ago = (ms: number) => formatRelativeTime(now - ms, now);
  it.each([
    [30_000, 'Just now'],
    [12 * 60_000, '12 min ago'],
    [4 * 3_600_000, '4 h ago'],
    [3 * 86_400_000, '28 Sep'],
  ])('%p ms ago → %p', (ms, text) => {
    expect(ago(ms)).toBe(text);
  });
  it('treats up to 5 min of future skew as "Just now"', () => {
    expect(ago(-2 * 60_000)).toBe('Just now');
  });
  it('further in the future is bad data → "—"', () => {
    expect(ago(-10 * 60_000)).toBe('—');
  });
  it('unparsable input → "—"', () => {
    expect(formatRelativeTime('NA', now)).toBe('—');
    expect(formatRelativeTime(null, now)).toBe('—');
  });
  it('accepts ISO strings', () => {
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5 min ago');
  });
});

describe('clock helpers', () => {
  const ms = d(2026, 9, 30, 14, 5).getTime();
  it('formatClock shows hour and minute', () => {
    expect(formatClock(ms)).toMatch(/(14|02|2):05/);
  });
  it('formatDateTimeShort → "30 Sep, <clock>"', () => {
    const now = d(2026, 10, 1).getTime();
    expect(formatDateTimeShort(ms, now)).toBe(`30 Sep, ${formatClock(ms)}`);
    expect(formatDateTimeShort(ms, d(2027, 1, 1).getTime())).toBe(
      `30 Sep 2026, ${formatClock(ms)}`,
    );
  });
});
