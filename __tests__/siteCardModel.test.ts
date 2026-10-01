/**
 * Dashboard SiteCard v3: the pure view-model (order, mix eligibility,
 * missing / negative values, labels, a11y text) plus a render pass over the
 * card itself (freshness wording, no LIVE/pulse, one screen-reader stop,
 * the toggleMetrics custom action).
 *
 * Web-portal parity (O5): every value must be the backend site-list card's
 * own value — the model never sums or derives a number.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { AppState, StyleSheet, Text, TextInput } from 'react-native';
import {
  buildSiteCardModel,
  capacityText,
  legendLabel,
  LEGEND_COLLAPSED_LIMIT,
  siteCardA11yLabel,
  toggleMetricsLabel,
  visibleMetrics,
} from '../src/components/screens/Authenticated/Dashboard/siteCardModel';
import { SiteCard } from '../src/components/screens/Authenticated/Dashboard/components/SiteCard';
import SearchBar, { SEARCH_HELPER_TEXT } from '../src/components/common/SearchBar';
import { touch } from '../src/theme/tokens';
import type { ISite, ISiteCard } from '../src/types';
import type { SourceToken } from '../src/utils/sources';

const card = (name: string, value: number | string, unit = 'kWh'): ISiteCard => ({
  name,
  value,
  unit,
  color: '#00ff00',
  icon: 'solar',
});

const site = (cards: ISiteCard[] | undefined, extra: Partial<ISite> = {}): ISite => ({
  id: 'site-1',
  name: 'Lucky Cement Nooriabad',
  logo_ext: '',
  size: 30000,
  controller: false,
  state: 'Online',
  dataLastUpdate: String(Date.now()),
  cards,
  ...extra,
});

/** Shaped like Lucky Cement's site-list row (backend order Grid, Solar,
 *  Genset, Wind — the order the API ships). */
const LUCKY = site([
  card('Grid Energy Today', 200123.4),
  card('Solar Energy Today', 63210.5),
  card('Genset Energy Today', 105024),
  card('Wind Energy Today', 187400),
]);

/* ─────────── view-model ─────────── */

describe('buildSiteCardModel', () => {
  it('orders sources solar → wind → battery → genset → grid, then others in backend order', () => {
    const m = buildSiteCardModel(
      site([
        card('Total Energy Consumed', 5),
        card('Grid Energy Today', 1),
        card('Battery Discharge Today', 2),
        card('MOBLE CARD', 3, 'kwh'),
        card('Solar Energy Today', 4),
        card('Wind Energy Today', 6),
        card('Genset Energy Today', 7),
      ]),
    );
    expect(m.metrics.map(x => x.label)).toEqual([
      'Solar',
      'Wind',
      // 'Discharge' is meaning — the name is kept, never cut to 'Battery'.
      'Battery Discharge Today',
      'Genset',
      'Grid',
      'Total Energy Consumed',
      'MOBLE CARD',
    ]);
  });

  it('shows each backend value as-is (compact) — no total, no share', () => {
    const m = buildSiteCardModel(LUCKY);
    expect(m.metrics.map(x => [x.label, x.quantity.value, x.quantity.text, x.quantity.unit])).toEqual([
      ['Solar', 63210.5, '63.2', 'MWh'],
      ['Wind', 187400, '187', 'MWh'],
      ['Genset', 105024, '105', 'MWh'],
      ['Grid', 200123.4, '200', 'MWh'],
    ]);
    // O5: nothing on the model is a sum or a derived figure.
    expect(Object.keys(m).sort()).toEqual(
      ['capacity', 'capacityKw', 'controller', 'metrics', 'mix', 'sharedPeriod', 'showCapacity'].sort(),
    );
    expect(m.sharedPeriod).toBe('today');
    expect(m.metrics.every(x => x.periodSuffix === undefined)).toBe(true);
  });

  it('draws the mix bar from the same values, in base units and legend order', () => {
    const m = buildSiteCardModel(LUCKY);
    expect(m.mix?.map(s => [s.key, s.source])).toEqual([
      ['1:Solar Energy Today', 'solar'],
      ['3:Wind Energy Today', 'wind'],
      ['2:Genset Energy Today', 'genset'],
      ['0:Grid Energy Today', 'grid'],
    ]);
    const weights = m.mix?.map(s => s.weight) ?? [];
    [63210.5e3, 187400e3, 105024e3, 200123.4e3].forEach((w, i) => expect(weights[i]).toBeCloseTo(w, 3));
    expect(m.metrics.every(x => x.inMix)).toBe(true);
  });

  it('puts kWh and MWh on one scale', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 2, 'MWh'), card('Grid Energy Today', 500, 'kwh')]),
    );
    expect(m.mix?.map(s => s.weight)).toEqual([2e6, 500e3]);
  });

  it('drops the bar when periods are mixed', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10), card('Grid Energy This Month', 20)]),
    );
    expect(m.mix).toBeNull();
    expect(m.sharedPeriod).toBeUndefined();
    // …and each item then states its own period.
    expect(m.metrics.map(x => x.periodSuffix)).toEqual(['today', 'month']);
  });

  it('drops the bar when units are mixed (energy vs power)', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10, 'kWh'), card('Grid Power Today', 20, 'kW')]),
    );
    expect(m.mix).toBeNull();
    expect(m.sharedPeriod).toBe('today');
  });

  it('drops the bar for non-W units', () => {
    const m = buildSiteCardModel(site([card('Solar Today', 10, '%'), card('Grid Today', 20, '%')]));
    expect(m.mix).toBeNull();
  });

  it('allows an all-power realtime mix (period inferred from the unit) without a caption', () => {
    const m = buildSiteCardModel(
      site([card('Wind Generation - RealTime', 14463.03, 'kW'), card('Solar - RealTime', 18942.4, 'kW')]),
    );
    expect(m.mix?.map(s => s.source)).toEqual(['solar', 'wind']);
    // 'RealTime' isn't a period the name parser states → no caption (O5).
    expect(m.sharedPeriod).toBeUndefined();
    expect(m.metrics.map(x => x.periodSuffix)).toEqual([undefined, undefined]);
  });

  it('keeps negatives and zero in the legend but out of the bar', () => {
    const m = buildSiteCardModel(
      site([
        card('Solar Energy Today', 40),
        card('Grid Energy Today', -15),
        card('Genset Energy Today', 0),
      ]),
    );
    expect(m.metrics.map(x => [x.label, x.quantity.text, x.inMix])).toEqual([
      ['Solar', '40', true],
      ['Genset', '0', false],
      ['Grid', '-15', false],
    ]);
    expect(m.mix?.map(s => s.source)).toEqual(['solar']);
  });

  it("renders 'NA' as a missing value: '—', no unit, 'no data', no segment", () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 12), card('Grid Energy Today', 'NA')]),
    );
    const grid = m.metrics[1];
    expect(grid.quantity).toMatchObject({ text: '—', unit: '', isMissing: true });
    expect(grid.spoken).toBe('Grid no data');
    expect(grid.inMix).toBe(false);
    expect(m.mix?.map(s => s.source)).toEqual(['solar']);
  });

  it('has no bar when nothing is positive', () => {
    const m = buildSiteCardModel(site([card('Solar Energy Today', 0), card('Grid Energy Today', 'NA')]));
    expect(m.mix).toBeNull();
  });

  it('keeps non-source cards neutral, full-named and out of the bar', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10), card('Total Energy Consumed', 1188.33, 'mWh')]),
    );
    const other = m.metrics[1];
    expect(other).toMatchObject({ label: 'Total Energy Consumed', source: undefined, inMix: false });
    // 'mWh' is the backend's casing typo for MWh — normalised, never milli.
    expect([other.quantity.text, other.quantity.unit]).toEqual(['1.19', 'GWh']);
    // Not every name states 'today' → no shared caption; solar carries its own.
    expect(m.sharedPeriod).toBeUndefined();
    expect(m.metrics[0].periodSuffix).toBe('today');
    expect(other.periodSuffix).toBeUndefined();
  });

  it('falls back to full names when two cards shorten to the same source word', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10), card('PV Energy Today (kWh)', 4)]),
    );
    expect(m.metrics.map(x => x.label)).toEqual(['Solar Energy Today', 'PV Energy Today']);
  });

  it('keeps Import / Export in the label', () => {
    const m = buildSiteCardModel(
      site([card('Grid Import Today', 10), card('Grid Export Today', 4)]),
    );
    expect(m.metrics.map(x => x.label)).toEqual(['Grid Import Today', 'Grid Export Today']);
  });

  it("keeps a lone qualified name: 'Grid Export Today' never reads as 'Grid'", () => {
    const m = buildSiteCardModel(site([card('Grid Export Today', 4)]));
    const [grid] = m.metrics;
    expect(grid.label).toBe('Grid Export Today');
    expect(grid.source).toBe('grid');
    // The name already says 'Today' — not repeated in speech.
    expect(grid.spoken).toBe('Grid Export Today 4 kilowatt hours');
  });

  it("keeps 'Solar Irradiance' (W/m²) — not 'Solar'", () => {
    const m = buildSiteCardModel(
      site([card('Solar Irradiance', 862, 'W/m2'), card('Wind Energy Today', 147786)]),
    );
    expect(m.metrics.map(x => [x.label, x.quantity.text, x.quantity.unit])).toEqual([
      ['Solar Irradiance', '862', 'W/m²'],
      ['Wind', '148', 'MWh'],
    ]);
    // Mixed periods: the short label carries its period; the full name
    // (no period stated) gets none.
    expect(m.metrics.map(x => x.periodSuffix)).toEqual([undefined, 'today']);
  });

  it("doesn't repeat a period the full label already states", () => {
    const m = buildSiteCardModel(
      site([card('Grid Export Today', 4), card('Solar Energy This Month', 9)]),
    );
    expect(m.sharedPeriod).toBeUndefined();
    expect(m.metrics.map(x => [x.label, x.periodSuffix])).toEqual([
      ['Solar', 'month'],
      ['Grid Export Today', undefined],
    ]);
  });

  it('formats capacity compactly and hides missing / zero capacity', () => {
    const m = buildSiteCardModel(LUCKY);
    expect(capacityText(m)).toBe('30 MW');
    expect(m.capacityKw).toBe(30000);
    expect(capacityText(buildSiteCardModel(site([], { size: '2500' })))).toBe('2.50 MW');
    expect(capacityText(buildSiteCardModel(site([], { size: 0 })))).toBeUndefined();
    const na = buildSiteCardModel(site([], { size: 'NA' }));
    expect(capacityText(na)).toBeUndefined();
    expect(na.capacityKw).toBeNull();
  });

  it('tolerates a missing cards array', () => {
    const m = buildSiteCardModel(site(undefined));
    expect(m.metrics).toEqual([]);
    expect(m.mix).toBeNull();
  });
});

describe('legendLabel', () => {
  const cases: [string, SourceToken | undefined, string][] = [
    ['Solar Energy Today', 'solar', 'Solar'],
    ['PV Total Power', 'solar', 'Solar'],
    ['Wind Generation - RealTime', 'wind', 'Wind'],
    ['Solar - Real-Time', 'solar', 'Solar'],
    ['Genset Energy This Month', 'genset', 'Genset'],
    ['DG Energy Today', 'genset', 'Genset'],
    ['Battery Energy Today', 'battery', 'Battery'],
    ['Solar Energy (kWh)', 'solar', 'Solar'],
    // anything beyond source + generic wording keeps the backend name
    ['Grid Export Today', 'grid', 'Grid Export Today'],
    ['Grid Import - RealTime', 'grid', 'Grid Import - RealTime'],
    ['Battery Discharge Today', 'battery', 'Battery Discharge Today'],
    ['Solar Irradiance', 'solar', 'Solar Irradiance'],
    ['BESS SOC', 'battery', 'BESS SOC'],
    ['PV1 Energy Today', 'solar', 'PV1 Energy Today'],
    ['Wind Turbine Energy', 'wind', 'Wind Turbine Energy'],
    // two different sources named → the name stays
    ['Grid Solar Energy', 'solar', 'Grid Solar Energy'],
    // non-source names only lose a recognised trailing unit
    ['Total Energy Consumed (kWh)', undefined, 'Total Energy Consumed'],
    ['Inverter (Block A)', undefined, 'Inverter (Block A)'],
  ];
  it.each(cases)('%s (%s) → %s', (name, source, expected) => {
    expect(legendLabel(name, source)).toBe(expected);
  });
});

/* ─────────── collapse + a11y text ─────────── */

const FIVE_CARDS = [
  card('Solar Energy Today', 15600),
  card('Genset Energy Today', 0),
  card('Grid Energy Today', 'NA'),
  card('Wind Energy Today', 1250),
  card('Battery Energy Today', 300),
];
const FIVE = buildSiteCardModel(site(FIVE_CARDS));

describe('collapse / expand', () => {
  it('shows everything up to the limit, else 3 + "+N more"', () => {
    expect(LEGEND_COLLAPSED_LIMIT).toBe(4);
    expect(visibleMetrics(buildSiteCardModel(LUCKY), false)).toMatchObject({ hiddenCount: 0 });
    expect(visibleMetrics(buildSiteCardModel(LUCKY), false).visible).toHaveLength(4);
    const collapsed = visibleMetrics(FIVE, false);
    expect(collapsed.visible.map(m => m.label)).toEqual(['Solar', 'Wind', 'Battery']);
    expect(collapsed.hiddenCount).toBe(2);
    expect(visibleMetrics(FIVE, true)).toMatchObject({ hiddenCount: 0 });
    expect(visibleMetrics(FIVE, true).visible).toHaveLength(5);
  });

  it('labels the toggle only when something is hidden', () => {
    expect(toggleMetricsLabel(buildSiteCardModel(LUCKY), false)).toBeNull();
    expect(toggleMetricsLabel(FIVE, false)).toBe('Show all 5 metrics');
    expect(toggleMetricsLabel(FIVE, true)).toBe('Show fewer metrics');
  });
});

describe('siteCardA11yLabel', () => {
  it('reads name, status, facts and 3 metrics + "and N more"', () => {
    const m = buildSiteCardModel({ ...site(FIVE_CARDS), controller: true, size: 2500 });
    expect(siteCardA11yLabel('CCI FGF', 'Live, updated 3 minutes ago', m, false)).toBe(
      'CCI FGF. Live, updated 3 minutes ago. Capacity 2.50 megawatts, controller installed. ' +
        'Solar 15.6 megawatt hours today, Wind 1.25 megawatt hours today, ' +
        'Battery 300 kilowatt hours today, and 2 more',
    );
  });

  it('reads every metric once expanded', () => {
    const label = siteCardA11yLabel('CCI FGF', 'Live, updated just now', FIVE, true);
    expect(label).toContain('Genset 0 kilowatt hours today, Grid no data');
    expect(label).not.toContain('more');
  });

  it('says when a site has no summary metrics', () => {
    const m = buildSiteCardModel(site([], { size: 'NA' }));
    expect(siteCardA11yLabel('Al Nasr', 'No data for 4 hours', m, false)).toBe(
      'Al Nasr. No data for 4 hours. No summary metrics',
    );
  });
});

/* ─────────── rendered card ─────────── */

const MIN = 60_000;
const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime();

let tree: ReactTestRenderer | undefined;
const render = (el: React.ReactElement) => {
  act(() => {
    tree = renderer.create(el);
  });
  return tree as ReactTestRenderer;
};

/** Flattened text of every outermost <Text> (nested spans joined). */
const texts = (root: ReactTestInstance): string[] => {
  const out: string[] = [];
  const flatten = (n: ReactTestInstance | string): string =>
    typeof n === 'string' ? n : n.children.map(flatten).join('');
  const walk = (n: ReactTestInstance) => {
    if (n.type === Text) {
      out.push(flatten(n));
      return;
    }
    n.children.forEach(c => typeof c !== 'string' && walk(c));
  };
  walk(root);
  return out;
};

/** The card's tappable: the accessible host view carrying the hint. */
const cardPressable = (root: ReactTestInstance) =>
  root.findAll(
    n => typeof n.type === 'string' && n.props.accessibilityHint === 'Opens site details',
  )[0];

const renderCard = (s: ISite) => render(React.createElement(SiteCard, { site: s, index: 99, onPress: jest.fn() }));

describe('<SiteCard />', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    (AppState as unknown as { currentState: string }).currentState = 'active';
  });
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    jest.useRealTimers();
  });

  it('shows status from the freshness model — never LIVE', () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 4 * 60 * MIN) });
    const all = texts(t.root);
    expect(all).toContain('No data for 4 h · 30 MW');
    expect(all.join('|')).not.toMatch(/LIVE/);
    expect(all).toContain('Today');
    expect(all).toEqual(expect.arrayContaining(['Solar', '63.2 MWh', 'Grid', '200 MWh']));
  });

  it("reads 'Offline · last data …' for an offline site", () => {
    const t = renderCard({ ...LUCKY, state: 'OFFLINE', dataLastUpdate: String(NOW - 41 * MIN) });
    expect(texts(t.root)).toContain('Offline · last data 41 min ago · 30 MW');
  });

  it("reads 'Last update unknown' for a future timestamp", () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW + 60 * MIN) });
    expect(texts(t.root)).toContain('Last update unknown · 30 MW');
  });

  it('advances the age on the shared tick without a refetch', () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 20_000) });
    expect(texts(t.root)).toContain('Live · just now · 30 MW');
    act(() => {
      jest.advanceTimersByTime(90_000);
    });
    expect(texts(t.root)).toContain('Live · 1 min ago · 30 MW');
    expect(cardPressable(t.root).props.accessibilityLabel).toContain('Live, updated 1 minute ago');
  });

  it('is one screen-reader stop with a composed label and hint', () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 3 * MIN) });
    const p = cardPressable(t.root);
    expect(p.props.accessible).toBe(true);
    expect(p.props.accessibilityLabel).toBe(
      'Lucky Cement Nooriabad. Live, updated 3 minutes ago. Capacity 30 megawatts. ' +
        'Solar 63.2 megawatt hours today, Wind 187 megawatt hours today, ' +
        'Genset 105 megawatt hours today, and 1 more',
    );
    expect(p.props.accessibilityActions).toBeUndefined();
  });

  it('exposes "+N more" as the toggleMetrics custom action', () => {
    const t = renderCard({ ...site(FIVE_CARDS), dataLastUpdate: String(NOW - 3 * MIN) });
    expect(texts(t.root)).toContain('+2 more');
    let p = cardPressable(t.root);
    expect(p.props.accessibilityActions).toEqual([
      { name: 'toggleMetrics', label: 'Show all 5 metrics' },
    ]);
    act(() => p.props.onAccessibilityAction({ nativeEvent: { actionName: 'toggleMetrics' } }));
    p = cardPressable(t.root);
    expect(p.props.accessibilityActions).toEqual([{ name: 'toggleMetrics', label: 'Show fewer metrics' }]);
    expect(texts(t.root)).toContain('Show less');
    expect(texts(t.root)).toEqual(expect.arrayContaining(['Genset', 'Grid', '—']));
  });

  it("shows 'No summary metrics' and no bar for a site without cards", () => {
    const t = renderCard({ ...site([]), dataLastUpdate: String(NOW - 3 * MIN) });
    expect(texts(t.root)).toContain('No summary metrics');
  });
});

/* ─────────── Dashboard SearchBar ─────────── */

describe('<SearchBar /> (Dashboard search)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    jest.useRealTimers();
  });

  const setup = () => {
    const onChange = jest.fn();
    const t = render(
      React.createElement(SearchBar, { onDebouncedChange: onChange, minChars: 2, placeholder: 'Search sites by name' }),
    );
    const input = () => t.root.findByType(TextInput);
    const type = (v: string) => act(() => input().props.onChangeText(v));
    return { t, onChange, input, type };
  };

  it("shows 'Keep typing to search' for 1 character and doesn't search", () => {
    const { t, onChange, type } = setup();
    type('C');
    expect(texts(t.root)).toContain(SEARCH_HELPER_TEXT);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onChange).not.toHaveBeenCalledWith('C');
  });

  it('searches 2 characters after the debounce', () => {
    const { t, onChange, type } = setup();
    type('CC');
    expect(texts(t.root)).not.toContain(SEARCH_HELPER_TEXT);
    expect(onChange).not.toHaveBeenCalledWith('CC');
    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(onChange).toHaveBeenLastCalledWith('CC');
  });

  it('the Search key runs a 1-character query at once and hides the hint', () => {
    const { t, onChange, type, input } = setup();
    type('C');
    act(() => input().props.onSubmitEditing());
    expect(onChange).toHaveBeenLastCalledWith('C');
    expect(texts(t.root)).not.toContain(SEARCH_HELPER_TEXT);
    // The submitted short query stays in force (no '' emitted after it).
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onChange).toHaveBeenLastCalledWith('C');
  });

  it('has a ≥ touch.min clear button that resets the search', () => {
    const { t, onChange, type } = setup();
    type('CCI');
    act(() => {
      jest.advanceTimersByTime(350);
    });
    const clear = t.root.findAll(
      n => typeof n.type === 'string' && n.props.accessibilityLabel === 'Clear search',
    )[0];
    expect(clear.props.accessibilityRole).toBe('button');
    const box = StyleSheet.flatten(clear.children[0] && (clear.children[0] as ReactTestInstance).props.style);
    expect(box.width).toBeGreaterThanOrEqual(touch.min);
    expect(box.height).toBeGreaterThanOrEqual(touch.min);
    act(() => clear.props.onClick?.() ?? clear.props.onPress?.());
    expect(onChange).toHaveBeenLastCalledWith('');
  });
});
