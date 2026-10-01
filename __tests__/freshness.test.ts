/**
 * The one freshness model: live ≤ 15 min, delayed ≤ 2 h, stale beyond,
 * offline when the backend says so, unknown when we can't tell.
 */
import { describe, expect, it } from '@jest/globals';
import {
  dataFreshness,
  FRESH_DELAYED_MS,
  FRESH_LIVE_MS,
  freshnessDot,
  freshnessText,
  FUTURE_SKEW_MS,
  siteStatus,
  toEpochMs,
} from '../src/utils/freshness';
import { ColorScheme, darkScheme, lightScheme, semantic } from '../src/theme/tokens';

const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime();
const MIN = 60_000;
const HOUR = 3_600_000;
const at = (agoMs: number) => NOW - agoMs;

describe('thresholds', () => {
  it('match the web portal header (online < 30 min, warning to 60 min)', () => {
    expect(FRESH_LIVE_MS).toBe(30 * MIN);
    expect(FRESH_DELAYED_MS).toBe(60 * MIN);
    expect(FUTURE_SKEW_MS).toBe(5 * MIN);
  });
});

describe('dataFreshness', () => {
  it.each([
    [3 * MIN, 'live'],
    [17 * MIN, 'live'], // the web header read "ONLINE · 17 MINUTES"
    [30 * MIN, 'live'],
    [30 * MIN + 1000, 'delayed'],
    [45 * MIN, 'delayed'],
    [60 * MIN, 'delayed'],
    [60 * MIN + 1000, 'stale'],
    [2 * HOUR, 'stale'],
    [4 * HOUR, 'stale'],
  ])('%p ms old → %p', (age, level) => {
    expect(dataFreshness(at(age), NOW)).toEqual({ level, ageMs: age });
  });

  it.each([null, undefined, '', 'NA'])('%p → unknown', raw => {
    expect(dataFreshness(raw, NOW)).toEqual({ level: 'unknown', ageMs: null });
  });

  it('+10 min in the future → unknown', () => {
    expect(dataFreshness(NOW + 10 * MIN, NOW)).toEqual({ level: 'unknown', ageMs: null });
  });

  it('+2 min in the future → live, age clamped to 0 ("Just now")', () => {
    const f = dataFreshness(NOW + 2 * MIN, NOW);
    expect(f).toEqual({ level: 'live', ageMs: 0 });
    expect(freshnessText(f.level, f.ageMs, 'status', NOW)).toBe('Live · just now');
  });

  it('accepts numeric-string ms and ISO input', () => {
    expect(dataFreshness(String(at(3 * MIN)), NOW).level).toBe('live');
    expect(dataFreshness(new Date(at(45 * MIN)).toISOString(), NOW).level).toBe('delayed');
    expect(toEpochMs(String(at(0)))).toBe(NOW);
  });
});

describe('siteStatus', () => {
  it.each(['OFFLINE', 'Offline', 'device offline'])(
    'state %p → offline regardless of age',
    state => {
      expect(siteStatus(state, at(1 * MIN), NOW).level).toBe('offline');
      expect(siteStatus(state, null, NOW).level).toBe('offline');
    },
  );

  it('other states fall through to the data age', () => {
    expect(siteStatus('WARNING', at(41 * MIN), NOW).level).toBe('delayed');
    expect(siteStatus('ONLINE', at(4 * HOUR), NOW).level).toBe('stale');
    expect(siteStatus(null, at(3 * MIN), NOW).level).toBe('live');
  });

  it('labels — the five status wordings', () => {
    expect(siteStatus(null, at(3 * MIN), NOW).label).toBe('Live · 3 min ago');
    expect(siteStatus(null, at(45 * MIN), NOW).label).toBe('Delayed · 45 min ago');
    expect(siteStatus(null, at(4 * HOUR), NOW).label).toBe('No data for 4 h');
    expect(siteStatus('OFFLINE', new Date(2026, 8, 28, 9).getTime(), NOW).label).toBe(
      'Offline · last data 28 Sep',
    );
    expect(siteStatus(null, 'NA', NOW).label).toBe('Last update unknown');
  });

  it('matches the web wording for a 41-minute-old site ("last sync 41 minutes ago")', () => {
    const s = siteStatus('WARNING', at(41 * MIN), NOW);
    expect(s.label).toBe('Delayed · 41 min ago');
    expect(s.spoken).toBe('Delayed, last updated 41 minutes ago');
  });

  it('spoken text has no symbols or abbreviations', () => {
    expect(siteStatus(null, at(1 * MIN), NOW).spoken).toBe('Live, updated 1 minute ago');
    expect(siteStatus(null, at(4 * HOUR), NOW).spoken).toBe('No data for 4 hours');
    expect(siteStatus(null, at(3 * 24 * HOUR), NOW).spoken).toBe('No data for 3 days');
    expect(siteStatus('Offline', at(2 * HOUR), NOW).spoken).toBe(
      'Offline, last data 2 hours ago',
    );
    expect(siteStatus('Offline', null, NOW).spoken).toBe('Offline');
  });
});

describe('freshnessText', () => {
  it('"updated" variant', () => {
    expect(freshnessText('live', 3 * MIN, 'updated', NOW)).toBe('Updated 3 min ago');
    expect(freshnessText('stale', 4 * HOUR, 'updated', NOW)).toBe('Updated 4 h ago');
    expect(freshnessText('offline', 4 * HOUR, 'updated', NOW)).toBe('Offline · updated 4 h ago');
    expect(freshnessText('unknown', null, 'updated', NOW)).toBe('Last update unknown');
  });

  it('stale beyond a day reads in days', () => {
    expect(freshnessText('stale', 3 * 24 * HOUR, 'status', NOW)).toBe('No data for 3 d');
  });

  it('offline under a day keeps the relative age', () => {
    expect(freshnessText('offline', 41 * MIN, 'status', NOW)).toBe('Offline · last data 41 min ago');
  });
});

describe('freshnessDot', () => {
  const schemes: [string, ColorScheme][] = [
    ['light', lightScheme],
    ['dark', darkScheme],
  ];
  it.each(schemes)('%s scheme', (_n, scheme) => {
    expect(freshnessDot('live', scheme)).toEqual({ color: scheme.brand, hollow: false });
    expect(freshnessDot('delayed', scheme)).toEqual({ color: semantic.warning, hollow: false });
    expect(freshnessDot('offline', scheme)).toEqual({ color: semantic.danger, hollow: false });
    expect(freshnessDot('stale', scheme)).toEqual({ color: scheme.textTertiary, hollow: true });
    expect(freshnessDot('unknown', scheme)).toEqual({ color: scheme.textTertiary, hollow: true });
  });
});
