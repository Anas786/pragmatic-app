/**
 * `presetsWithinRange` — the pure filter `DateRangePickerModal` uses to
 * decide which preset chips fit a given `maxRangeDays` cap. Presets carry
 * a static `maxSpanDays` (the widest span they can EVER produce, not
 * today's actual span) so a preset that could overflow the cap never
 * renders instead of silently clamping on apply.
 */
import { describe, expect, it } from '@jest/globals';
import {
  dayCellA11yLabel,
  presetMatchingRange,
  presetsWithinRange,
  PRESETS,
} from '../src/components/screens/Authenticated/SiteDetail/components/DateRangePickerModal';
import {
  clampMonthToNow,
  isFutureMonth,
  yearPageEnd,
} from '../src/components/screens/Authenticated/SiteDetail/components/MonthYearPickerModal';

describe('presetsWithinRange', () => {
  it('keeps every preset whose widest span fits the cap', () => {
    const presets = [
      { label: 'a', maxSpanDays: 1 },
      { label: 'b', maxSpanDays: 5 },
    ];
    expect(presetsWithinRange(presets, 10)).toEqual(presets);
  });

  it('drops presets whose widest span exceeds the cap', () => {
    const presets = [
      { label: 'a', maxSpanDays: 1 },
      { label: 'b', maxSpanDays: 10 },
    ];
    expect(presetsWithinRange(presets, 5).map(p => p.label)).toEqual(['a']);
  });

  it('is inclusive at the boundary (maxSpanDays === maxRangeDays + 1)', () => {
    const presets = [{ label: 'a', maxSpanDays: 8 }];
    expect(presetsWithinRange(presets, 7)).toEqual(presets);
    expect(presetsWithinRange(presets, 6)).toEqual([]);
  });

  it('returns an empty array when nothing fits', () => {
    const presets = [{ label: 'a', maxSpanDays: 30 }];
    expect(presetsWithinRange(presets, 2)).toEqual([]);
  });

  it('Trends cap (3-day span → maxRangeDays 2) shows only "Today"', () => {
    expect(presetsWithinRange(PRESETS, 2).map(p => p.label)).toEqual([
      'Today',
    ]);
  });

  it('Reports/Tables cap (31-day span → maxRangeDays 30) keeps every preset', () => {
    expect(presetsWithinRange(PRESETS, 30).map(p => p.label)).toEqual([
      'Today',
      'Last 7d',
      'This week',
      'Last 15d',
    ]);
  });
});

describe('presetMatchingRange — highlights the preset equal to the draft', () => {
  const today = new Date();
  const ago = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  it('matches by calendar day (time of day ignored)', () => {
    const start = ago(6);
    start.setHours(0, 0, 0, 0);
    expect(presetMatchingRange(PRESETS, start, today)?.label).toBe('Last 7d');
    expect(presetMatchingRange(PRESETS, ago(14), ago(0))?.label).toBe('Last 15d');
  });

  it('returns null for an incomplete or custom range', () => {
    expect(presetMatchingRange(PRESETS, ago(3), null)).toBeNull();
    expect(presetMatchingRange(PRESETS, null, null)).toBeNull();
    expect(presetMatchingRange(PRESETS, ago(20), ago(2))).toBeNull();
  });

  it('first match wins when two presets coincide (Today vs This week on a Sunday)', () => {
    const hit = presetMatchingRange(PRESETS, today, today);
    expect(hit?.label).toBe('Today');
  });
});

describe('dayCellA11yLabel — what VoiceOver/TalkBack say for a day', () => {
  const sep1 = new Date(2026, 8, 1);
  const none = { isStart: false, isEnd: false, isToday: false };

  it('reads "1 September, start date" (selected state comes from accessibilityState)', () => {
    expect(dayCellA11yLabel(sep1, { ...none, isStart: true }, 2026)).toBe('1 September, start date');
    expect(dayCellA11yLabel(sep1, { ...none, isEnd: true }, 2026)).toBe('1 September, end date');
    expect(dayCellA11yLabel(sep1, { isStart: true, isEnd: true, isToday: false }, 2026)).toBe(
      '1 September, start and end date',
    );
    expect(dayCellA11yLabel(sep1, { ...none, isToday: true }, 2026)).toBe('1 September, today');
  });

  it('adds the year only outside the current year', () => {
    expect(dayCellA11yLabel(sep1, none, 2026)).toBe('1 September');
    expect(dayCellA11yLabel(new Date(2025, 11, 31), none, 2026)).toBe('31 December 2025');
  });
});

describe('MonthYearPicker — no future periods', () => {
  const oct1 = new Date(2026, 9, 1);

  it('the first year page ends at the current year (2015 – 2026)', () => {
    expect(yearPageEnd(2026, 2026)).toBe(2026);
    expect(yearPageEnd(2015, 2026)).toBe(2026);
    expect(yearPageEnd(2014, 2026)).toBe(2014);
    expect(yearPageEnd(2003, 2026)).toBe(2014);
    expect(yearPageEnd(2002, 2026)).toBe(2002);
    // A future year is clamped onto the first page.
    expect(yearPageEnd(2030, 2026)).toBe(2026);
  });

  it('isFutureMonth: Nov 2026 and any 2027 month are future on 1 Oct 2026', () => {
    expect(isFutureMonth(2026, 10, oct1)).toBe(false);
    expect(isFutureMonth(2026, 11, oct1)).toBe(true);
    expect(isFutureMonth(2027, 1, oct1)).toBe(true);
    expect(isFutureMonth(2025, 12, oct1)).toBe(false);
  });

  it('clampMonthToNow snaps a future month of the current year to this month', () => {
    expect(clampMonthToNow(2026, 12, oct1)).toBe(10);
    expect(clampMonthToNow(2026, 3, oct1)).toBe(3);
    expect(clampMonthToNow(2025, 12, oct1)).toBe(12);
  });
});
