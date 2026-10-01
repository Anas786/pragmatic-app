/**
 * `presetsWithinRange` — the pure filter `DateRangePickerModal` uses to
 * decide which preset chips fit a given `maxRangeDays` cap. Presets carry
 * a static `maxSpanDays` (the widest span they can EVER produce, not
 * today's actual span) so a preset that could overflow the cap never
 * renders instead of silently clamping on apply.
 */
import { describe, expect, it } from '@jest/globals';
import {
  presetsWithinRange,
  PRESETS,
} from '../src/components/screens/Authenticated/SiteDetail/components/DateRangePickerModal';

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
