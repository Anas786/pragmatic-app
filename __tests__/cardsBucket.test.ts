/**
 * Cards tab: section buckets, headings, tile labels, value display and
 * the rendered CardsView — pinned against REAL backend card names (audit
 * screenshots: CCI FGF; web cross-check 2026-10-01: Lucky Cement
 * Nooriabad, whose 17 Cards values must read exactly like the web portal).
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, {
  act,
  ReactTestInstance,
  ReactTestRenderer,
} from 'react-test-renderer';
import { Text, View } from 'react-native';
import {
  cardBucket,
  CardBucket,
  cardBucketTitle,
  cardTileLabel,
  formatCardDisplay,
  groupCardSections,
} from '../src/utils/cards';

/* ─────────── fixtures ─────────── */

/** Lucky Cement Nooriabad — the 17 cards and the values the web shows. */
const LUCKY_CARDS: {
  name: string;
  unit?: string;
  value: number;
  web: string;
}[] = [
  { name: 'Wind', unit: 'kW', value: 14463.03, web: '14,463.03 kW' },
  { name: 'Solar', unit: 'kW', value: 18942.4, web: '18,942.40 kW' },
  { name: 'Genset', unit: 'kW', value: 13726.96, web: '13,726.96 kW' },
  { name: 'Total Load', unit: 'kW', value: 49652.39, web: '49,652.39 kW' },
  {
    name: 'Wind Energy Today',
    unit: 'kWh',
    value: 147786,
    web: '147,786.00 kWh',
  },
  {
    name: 'PV Energy Today',
    unit: 'kWh',
    value: 119560.9,
    web: '119,560.90 kWh',
  },
  {
    name: 'Genset Energy Today',
    unit: 'kWh',
    value: 105024,
    web: '105,024.00 kWh',
  },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => ({
    name: `PV-SG-CI-0${i}`,
    unit: 'kWh',
    value: 14000 + i * 101.25,
    web: `${(14000 + i * 101.25).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kWh`,
  })),
  { name: 'Total Energy Consumed', value: 1188328.16, web: '1,188,328.16' },
  { name: 'Irradiance', unit: 'W/m2', value: 862, web: '862 W/m²' },
];

/* ─────────── cardBucket ─────────── */

describe('cardBucket — real production names', () => {
  const cases: [string, string | undefined, CardBucket][] = [
    // CCI FGF (audit screenshots)
    ['GRID ENERGY YTD', 'kWh', 'period'],
    ['PV ENERGY YTD SHAMS', 'kWh', 'period'],
    ['PV ENERGY YTD WATANIA', 'kWh', 'period'],
    ['GENSET ENERGY YTD', 'kWh', 'period'],
    ['PV ENERGY TODAY SHAMS', 'kWh', 'today'],
    ['PV TOTAL POWER', 'kW', 'now'],
    ['Plant Yield Today', 'kWh', 'today'],
    // Lucky Cement Nooriabad
    ['Wind', 'kW', 'now'],
    ['Solar', 'kW', 'now'],
    ['Genset', 'kW', 'now'],
    ['Total Load', 'kW', 'now'],
    ['Wind Energy Today', 'kWh', 'today'],
    ['PV Energy Today', 'kWh', 'today'],
    ['Genset Energy Today', 'kWh', 'today'],
    ['PV-SG-CI-01', 'kWh', 'energy'],
    ['Total Energy Consumed', 'kWh', 'energy'],
    ['Total Energy Consumed', undefined, 'other'],
    ['Irradiance', 'W/m2', 'other'],
    // shapes seen elsewhere
    ['Grid Import - RealTime', 'kW', 'now'],
    ['Wind Generation - RealTime', 'MW', 'now'],
    ['Total Plant Yield', 'kWh', 'lifetime'],
    ['Energy This Month', 'MWh', 'period'],
    ['Daily Generation', 'kWh', 'today'],
    ['Reactive Power', 'kVAr', 'now'],
    ['Reactive Energy YTD', 'kVArh', 'period'],
    ['Peak Power Today', 'kW', 'other'],
    ['Module Temperature', '°C', 'other'],
    ['Battery SOC', '%', 'other'],
  ];
  it.each(cases)('%s (%s) → %s', (name, unit, bucket) => {
    expect(cardBucket({ name, unit })).toBe(bucket);
  });

  it('accepts unit casing variants and a null unit', () => {
    expect(cardBucket({ name: 'Solar', unit: 'KW' })).toBe('now');
    expect(cardBucket({ name: 'PV Energy Today', unit: 'KWH' })).toBe('today');
    expect(cardBucket({ name: 'PV Energy Today', unit: null })).toBe('other');
  });

  it('never files a YTD / MTD / week counter under Energy today (SC-2)', () => {
    for (const name of [
      'GRID ENERGY YTD',
      'PV ENERGY YTD SHAMS',
      'Energy MTD',
      'Weekly Energy',
    ]) {
      expect(cardBucket({ name, unit: 'kWh' })).not.toBe('today');
    }
  });
});

/* ─────────── headings ─────────── */

describe('cardBucketTitle', () => {
  it('names the fixed buckets', () => {
    expect(cardBucketTitle('now')).toBe('Power now');
    expect(cardBucketTitle('today')).toBe('Energy today');
    expect(cardBucketTitle('lifetime')).toBe('Energy lifetime');
    expect(cardBucketTitle('energy')).toBe('Energy');
    expect(cardBucketTitle('other')).toBe('Other metrics');
  });

  it('names the period only when every card shares it', () => {
    const ytd = [
      { name: 'GRID ENERGY YTD', unit: 'kWh' },
      { name: 'PV ENERGY YTD SHAMS', unit: 'kWh' },
    ];
    expect(cardBucketTitle('period', ytd)).toBe('Energy this year');
    expect(
      cardBucketTitle('period', [{ name: 'Energy MTD', unit: 'kWh' }]),
    ).toBe('Energy this month');
    expect(
      cardBucketTitle('period', [{ name: 'Weekly Energy', unit: 'kWh' }]),
    ).toBe('Energy this week');
    expect(
      cardBucketTitle('period', [...ytd, { name: 'Energy MTD', unit: 'kWh' }]),
    ).toBe('Energy this period');
    expect(cardBucketTitle('period', [])).toBe('Energy this period');
  });
});

/* ─────────── sections ─────────── */

describe('groupCardSections', () => {
  it('orders sections, keeps backend order inside one, and indexes across all', () => {
    const sections = groupCardSections(LUCKY_CARDS, c => c);
    expect(sections.map(s => [s.title, s.items.length, s.startIndex])).toEqual([
      ['Power now', 4, 0],
      ['Energy today', 3, 4],
      ['Energy', 8, 7],
      ['Other metrics', 2, 15],
    ]);
    expect(sections[1].items.map(c => c.name)).toEqual([
      'Wind Energy Today',
      'PV Energy Today',
      'Genset Energy Today',
    ]);
    // ANIM_LIMIT indexing spans sections: the last tile is #16 of 17.
    const last = sections[sections.length - 1];
    expect(last.startIndex + last.items.length).toBe(LUCKY_CARDS.length);
  });

  it('drops empty buckets and handles an empty list', () => {
    expect(groupCardSections([], (c: { name: string }) => c)).toEqual([]);
    const only = groupCardSections(
      [{ name: 'Irradiance', unit: 'W/m2' }],
      c => c,
    );
    expect(only).toHaveLength(1);
    expect(only[0]).toMatchObject({ bucket: 'other', startIndex: 0 });
  });
});

/* ─────────── tile labels ─────────── */

describe('cardTileLabel', () => {
  it('keeps the original case and never truncates', () => {
    expect(
      cardTileLabel('PV ENERGY YTD SHAMS INDUSTRIAL ESTATE', 'period'),
    ).toBe('PV ENERGY YTD SHAMS INDUSTRIAL ESTATE');
    expect(cardTileLabel('PV-SG-CI-01', 'energy')).toBe('PV-SG-CI-01');
  });

  it("strips a trailing 'Today' only inside Energy today", () => {
    expect(cardTileLabel('Wind Energy Today', 'today')).toBe('Wind Energy');
    expect(cardTileLabel('Energy (Today)', 'today')).toBe('Energy');
    expect(cardTileLabel('Wind Energy Today', 'energy')).toBe(
      'Wind Energy Today',
    );
    // not trailing → kept
    expect(cardTileLabel('PV ENERGY TODAY SHAMS', 'today')).toBe(
      'PV ENERGY TODAY SHAMS',
    );
  });

  it("strips the ' - RealTime' tag in any section", () => {
    expect(cardTileLabel('Grid Import - RealTime', 'now')).toBe('Grid Import');
    expect(cardTileLabel('Wind Generation — RealTime', 'now')).toBe(
      'Wind Generation',
    );
  });

  it('falls back to the full name when stripping leaves nothing', () => {
    expect(cardTileLabel('Today', 'today')).toBe('Today');
  });
});

/* ─────────── value display (web parity) ─────────── */

describe('formatCardDisplay', () => {
  it.each(LUCKY_CARDS)(
    '$name reads like the web: $web',
    ({ value, unit, web }) => {
      const q = formatCardDisplay(value, unit);
      expect([q.text, q.unit].filter(Boolean).join(' ')).toBe(web);
      expect(q.value).toBe(value);
    },
  );

  it('accepts numeric strings the backend sometimes ships', () => {
    expect(formatCardDisplay('20115.07', 'kW').text).toBe('20,115.07');
  });

  it('never rescales — the backend unit is kept (casing normalised)', () => {
    const q = formatCardDisplay(5902224.1, 'kwh');
    expect(q.text).toBe('5,902,224.10');
    expect(q.unit).toBe('kWh');
  });

  it("treats a real 0 as a value and 'NA' / null / '' as missing", () => {
    expect(formatCardDisplay(0, 'kW')).toMatchObject({
      text: '0.00',
      unit: 'kW',
      isMissing: false,
    });
    for (const raw of ['NA', 'n/a', null, undefined, '', '  ', NaN]) {
      expect(formatCardDisplay(raw, 'kWh')).toMatchObject({
        isMissing: true,
        unit: '',
      });
    }
  });

  it('shows non-numeric backend text verbatim, without a unit', () => {
    expect(formatCardDisplay('Running', 'kW')).toMatchObject({
      text: 'Running',
      unit: '',
      spoken: 'Running',
      isMissing: false,
    });
  });

  it('speaks units as words', () => {
    expect(formatCardDisplay(147786, 'kWh').spoken).toBe(
      '147,786.00 kilowatt hours',
    );
  });
});

/* ─────────── CardsView render (Lucky Cement) ─────────── */

const mockSiteId = 'lucky-cement-nooriabad';
const mockHookState: { config: unknown; live: unknown; liveError?: Error } = {
  config: undefined,
  live: undefined,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return {
    ...actual,
    useRoute: () => ({ params: { siteId: mockSiteId } }),
    useIsFocused: () => true,
  };
});

jest.mock('src/hooks', () => {
  const actual = jest.requireActual('src/hooks') as object;
  const query = (data: unknown) => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  return {
    ...actual,
    useInteractionReady: () => true,
    useSiteConfig: () => query(mockHookState.config),
    useSiteData: () => ({
      ...query(mockHookState.live),
      isError: mockHookState.liveError !== undefined,
      error: mockHookState.liveError ?? null,
    }),
  };
});

import CardsView from '../src/components/screens/Authenticated/SiteDetail/components/CardsView';

const luckyConfig = {
  siteComponents: {
    cards: LUCKY_CARDS.map((c, i) => ({
      name: c.name,
      unit: c.unit,
      icon: i === 0 ? 'wind' : undefined,
      dataStore: 'processed',
      objKey: `c${i}`,
    })),
  },
};
const luckyLive = {
  live: { data: { live: {} } },
  processed: {
    data: {
      processed: Object.fromEntries(
        LUCKY_CARDS.map((c, i) => [`c${i}`, c.value]),
      ),
    },
  },
  alarms: [],
};

let tree: ReactTestRenderer | undefined;
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  mockHookState.liveError = undefined;
});

const textsOf = (root: ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map(t => {
      const c = t.props.children;
      return Array.isArray(c)
        ? c.join('')
        : typeof c === 'string' || typeof c === 'number'
        ? String(c)
        : '';
    })
    .filter(s => s.length > 0);

describe('CardsView (rendered)', () => {
  it('shows every Lucky Cement value exactly as the web portal does', () => {
    mockHookState.config = luckyConfig;
    mockHookState.live = luckyLive;
    act(() => {
      tree = renderer.create(React.createElement(CardsView));
    });
    const root = (tree as ReactTestRenderer).root;
    const texts = textsOf(root);

    // Static, honest header — no LIVE chip / bolt count.
    expect(texts).toContain('Key metrics');
    expect(texts).toContain('17 metrics');
    expect(texts.some(t => /^live/i.test(t))).toBe(false);

    // Section headings in order.
    const headings = ['Power now', 'Energy today', 'Energy', 'Other metrics'];
    const positions = headings.map(h => texts.indexOf(h));
    expect(positions.every(p => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    // One accessible element per tile, carrying the exact web value.
    const tiles = root.findAll(
      n =>
        n.type === View &&
        n.props.accessible === true &&
        typeof n.props.accessibilityLabel === 'string' &&
        /,/.test(n.props.accessibilityLabel),
    );
    const labels = tiles.map(t => t.props.accessibilityLabel as string);
    expect(labels).toContain('Wind, 14,463.03 kilowatts, wind');
    expect(labels).toContain(
      'Wind Energy Today, 147,786.00 kilowatt hours, wind',
    );
    expect(labels).toContain('Total Energy Consumed, 1,188,328.16');
    expect(labels).toContain('Irradiance, 862 watts per square metre');

    // Visible value + unit pairs read like the web.
    for (const c of LUCKY_CARDS) {
      const [num, ...unit] = c.web.split(' ');
      expect(texts).toContain(num);
      if (unit.length) expect(texts).toContain(unit.join(' '));
    }

    // No truncation, no shouted labels, no 'NA kWh' / '— kWh'.
    expect(texts.some(t => t.endsWith('…'))).toBe(false);
    expect(texts).toContain('Wind Energy'); // trailing 'Today' stripped in Energy today
    expect(texts).not.toContain('WIND ENERGY');
    expect(texts.some(t => /^(NA|—)$/.test(t))).toBe(false);
  });

  it("renders 'No data' (no unit) for a missing value and pads odd rows", () => {
    mockHookState.config = {
      siteComponents: {
        cards: [
          { name: 'Wind', unit: 'kW', dataStore: 'processed', objKey: 'a' },
          { name: 'Solar', unit: 'kW', dataStore: 'processed', objKey: 'b' },
          { name: 'Genset', unit: 'kW', dataStore: 'processed', objKey: 'c' },
        ],
      },
    };
    mockHookState.live = {
      processed: { data: { processed: { a: 1, b: 'NA', c: null } } },
    };
    act(() => {
      tree = renderer.create(React.createElement(CardsView));
    });
    const root = (tree as ReactTestRenderer).root;
    const texts = textsOf(root);
    expect(texts.filter(t => t === 'No data')).toHaveLength(2);
    expect(texts).not.toContain('NA');
    // 3 tiles in one section → one invisible spacer keeps the last tile half width.
    const spacers = root.findAll(
      n =>
        n.type === View &&
        n.props.importantForAccessibility === 'no-hide-descendants' &&
        n.props.accessible === false,
    );
    expect(spacers).toHaveLength(1);
    const labels = root
      .findAll(
        n =>
          n.type === View &&
          n.props.accessible === true &&
          typeof n.props.accessibilityLabel === 'string',
      )
      .map(n => n.props.accessibilityLabel);
    expect(labels).toContain('Solar, no data, solar');
  });

  it('a failed background refresh keeps the cached tiles and adds NO second error card', () => {
    // SiteDetail's one-line RefreshStatusStrip reports the failure (with
    // Retry) above every tab; the tab itself must not repeat it.
    mockHookState.config = luckyConfig;
    mockHookState.live = luckyLive;
    mockHookState.liveError = new Error('Network Error');
    act(() => {
      tree = renderer.create(React.createElement(CardsView));
    });
    const root = (tree as ReactTestRenderer).root;
    const texts = textsOf(root);
    expect(texts).toContain('14,463.03'); // cached Wind value still shown
    expect(texts.some(t => /couldn.t be refreshed/i.test(t))).toBe(false);
    expect(
      root.findAll(
        n => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Retry',
      ),
    ).toHaveLength(0);
  });
});
