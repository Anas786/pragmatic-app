/**
 * Dashboard SiteCard (the restored pre-v3 design — avatar ring, hero tile,
 * satellite chips — with honest data): the pure view-model (hero choice,
 * order, missing / negative values, labels, periods, a11y text) plus a
 * render pass over the card itself (freshness wording, no LIVE / pulse /
 * sparkline, values verbatim, one screen-reader stop, the toggleMetrics
 * custom action).
 *
 * Web-portal parity (O5): every value must be the backend site-list card's
 * own value — the model never sums or derives a number.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { AppState, Image, StyleSheet, Text, TextInput } from 'react-native';
import { Defs, LinearGradient as SvgLinearGradient, Path, Svg } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import {
  buildSiteCardModel,
  COLLAPSED_SATELLITES,
  heroTint,
  legendLabel,
  siteCardA11yLabel,
  toggleMetricsLabel,
  toggleMetricsText,
  visibleSatellites,
} from '../src/components/screens/Authenticated/Dashboard/siteCardModel';
import {
  SITE_CARD_AVATAR,
  SiteCard,
} from '../src/components/screens/Authenticated/Dashboard/components/SiteCard';
import SiteCardSkeleton from '../src/components/screens/Authenticated/Dashboard/components/SiteCardSkeleton';
import PulseDot from '../src/components/common/PulseDot';
import Skeleton from '../src/components/common/Skeleton';
import SearchBar, { SEARCH_HELPER_TEXT } from '../src/components/common/SearchBar';
import { useThemeStore } from '../src/hooks/useThemeStore';
import { DARK_SCHEME, LIGHT_SCHEME } from '../src/theme/useThemedStyles';
import { energyPalette, touch } from '../src/theme/tokens';
import { siteStatus } from '../src/utils/freshness';
import type { ISite, ISiteCard } from '../src/types';
import type { SourceToken } from '../src/utils/sources';

const card = (name: string, value: number | string, unit = 'kWh', color = '#00ff00'): ISiteCard => ({
  name,
  value,
  unit,
  color,
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
const LUCKY_CARDS = [
  card('Grid Energy Today', 200123.4),
  card('Solar Energy Today', 63210.5),
  card('Genset Energy Today', 105024),
  card('Wind Energy Today', 187400),
];
const LUCKY = site(LUCKY_CARDS);

/* ─────────── view-model ─────────── */

describe('buildSiteCardModel', () => {
  it('heroes the largest value; satellites in source order, then others in backend order', () => {
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
    expect(m.hero?.label).toBe('Genset');
    expect(m.satellites.map(x => x.label)).toEqual([
      'Solar',
      'Wind',
      // 'Discharge' is meaning — the name is kept, never cut to 'Battery'.
      'Battery Discharge Today',
      'Grid',
      'Total Energy Consumed',
      'MOBLE CARD',
    ]);
    // Reading order = hero first, then the chips.
    expect(m.metrics).toEqual([m.hero, ...m.satellites]);
  });

  it('shows each backend value as-is (compact) — no total, no share', () => {
    const m = buildSiteCardModel(LUCKY);
    const row = (x: { label: string; quantity: { value: number | null; text: string; unit: string } }) => [
      x.label,
      x.quantity.value,
      x.quantity.text,
      x.quantity.unit,
    ];
    expect(m.hero && row(m.hero)).toEqual(['Grid', 200123.4, '200', 'MWh']);
    expect(m.satellites.map(row)).toEqual([
      ['Solar', 63210.5, '63.2', 'MWh'],
      ['Wind', 187400, '187', 'MWh'],
      ['Genset', 105024, '105', 'MWh'],
    ]);
    // Verbatim: every metric carries exactly its own backend card's value.
    m.metrics.forEach(x => {
      const src = LUCKY_CARDS.find(c => c.name === x.name);
      expect(x.quantity.value).toBe(src?.value);
    });
    // O5: nothing on the model is a sum, a share or a derived figure.
    expect(Object.keys(m).sort()).toEqual(['controller', 'hero', 'metrics', 'satellites', 'sharedPeriod']);
    expect(m.sharedPeriod).toBe('today');
    expect(m.hero?.periodCaption).toBe('today');
    expect(m.satellites.every(x => x.periodSuffix === undefined)).toBe(true);
  });

  it('compares the hero in base units — 2 MWh beats 500 kWh', () => {
    const m = buildSiteCardModel(
      site([card('Grid Energy Today', 500, 'kwh'), card('Solar Energy Today', 2, 'MWh')]),
    );
    expect([m.hero?.label, m.hero?.quantity.text, m.hero?.quantity.unit]).toEqual(['Solar', '2', 'MWh']);
    expect(m.satellites.map(x => [x.label, x.quantity.text, x.quantity.unit])).toEqual([
      ['Grid', '500', 'kWh'],
    ]);
  });

  it('keeps source order on a tie and when nothing is numeric', () => {
    const tie = buildSiteCardModel(site([card('Grid Energy Today', 10), card('Solar Energy Today', 10)]));
    expect(tie.hero?.label).toBe('Solar');
    const none = buildSiteCardModel(site([card('Grid Energy Today', 'NA'), card('Solar Energy Today', 'NA')]));
    expect(none.hero?.label).toBe('Solar');
    expect(none.hero?.quantity).toMatchObject({ text: '—', unit: '', isMissing: true });
  });

  it('keeps negatives and zero as they are', () => {
    const m = buildSiteCardModel(
      site([
        card('Solar Energy Today', 40),
        card('Grid Energy Today', -15),
        card('Genset Energy Today', 0),
      ]),
    );
    expect([m.hero?.label, m.hero?.quantity.text]).toEqual(['Solar', '40']);
    expect(m.satellites.map(x => [x.label, x.quantity.text])).toEqual([
      ['Genset', '0'],
      ['Grid', '-15'],
    ]);
  });

  it("renders 'NA' as a missing value: '—', no unit, 'no data'", () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 12), card('Grid Energy Today', 'NA')]),
    );
    const [grid] = m.satellites;
    expect(grid.quantity).toMatchObject({ text: '—', unit: '', isMissing: true });
    expect(grid.spoken).toBe('Grid no data');
  });

  it('never infers a period from a power unit (no “Now” caption)', () => {
    const m = buildSiteCardModel(
      site([card('Wind Generation - RealTime', 14463.03, 'kW'), card('Solar - RealTime', 18942.4, 'kW')]),
    );
    expect(m.hero?.label).toBe('Solar');
    expect(m.hero?.periodCaption).toBeUndefined();
    expect(m.sharedPeriod).toBeUndefined();
    expect(m.satellites.map(x => [x.label, x.periodSuffix])).toEqual([['Wind', undefined]]);
  });

  it('gives each satellite its own period when periods are mixed', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10), card('Grid Energy This Month', 20)]),
    );
    expect(m.sharedPeriod).toBeUndefined();
    expect([m.hero?.label, m.hero?.periodCaption]).toEqual(['Grid', 'month']);
    expect(m.satellites.map(x => [x.label, x.periodSuffix])).toEqual([['Solar', 'today']]);
  });

  it('keeps non-source cards neutral-labelled; accents come from the palette, else the backend', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10), card('Total Energy Consumed', 1188.33, 'mWh')]),
    );
    const other = m.hero;
    expect(other).toMatchObject({
      label: 'Total Energy Consumed',
      source: undefined,
      sourceWord: false,
      accent: '#00ff00',
      periodCaption: undefined,
    });
    // 'mWh' is the backend's casing typo for MWh — normalised, never milli.
    expect([other?.quantity.text, other?.quantity.unit]).toEqual(['1.19', 'GWh']);
    const [solar] = m.satellites;
    expect(solar).toMatchObject({ label: 'Solar', sourceWord: true, accent: energyPalette.solar });
    // Not every name states 'today' → no shared period; solar carries its own.
    expect(m.sharedPeriod).toBeUndefined();
    expect(solar.periodSuffix).toBe('today');
    // A malformed backend colour falls back to a neutral 6-digit hex.
    const neutral = buildSiteCardModel(site([card('Total Energy Consumed', 1, 'kWh', 'red')]));
    expect(neutral.hero?.accent).toMatch(/^#[0-9A-F]{6}$/i);
    expect(neutral.hero?.accent).not.toBe('red');
  });

  it('falls back to full names when two cards shorten to the same source word', () => {
    const m = buildSiteCardModel(
      site([card('Solar Energy Today', 10), card('PV Energy Today (kWh)', 4)]),
    );
    expect(m.metrics.map(x => [x.label, x.sourceWord])).toEqual([
      ['Solar Energy Today', false],
      ['PV Energy Today', false],
    ]);
  });

  it('keeps Import / Export in the label', () => {
    const m = buildSiteCardModel(
      site([card('Grid Import Today', 10), card('Grid Export Today', 4)]),
    );
    expect(m.metrics.map(x => x.label)).toEqual(['Grid Import Today', 'Grid Export Today']);
  });

  it("keeps a lone qualified name: 'Grid Export Today' never reads as 'Grid'", () => {
    const m = buildSiteCardModel(site([card('Grid Export Today', 4)]));
    const grid = m.hero;
    expect(grid).toMatchObject({ label: 'Grid Export Today', source: 'grid', sourceWord: false });
    // The name already says 'Today' — no caption, not repeated in speech.
    expect(grid?.periodCaption).toBeUndefined();
    expect(grid?.spoken).toBe('Grid Export Today 4 kilowatt hours');
  });

  it("keeps 'Solar Irradiance' (W/m²) — not 'Solar'", () => {
    const m = buildSiteCardModel(
      site([card('Solar Irradiance', 862, 'W/m2'), card('Wind Energy Today', 147786)]),
    );
    expect([m.hero?.label, m.hero?.quantity.text, m.hero?.quantity.unit]).toEqual(['Wind', '148', 'MWh']);
    expect(m.satellites.map(x => [x.label, x.quantity.text, x.quantity.unit, x.periodSuffix])).toEqual([
      ['Solar Irradiance', '862', 'W/m²', undefined],
    ]);
  });

  it("doesn't repeat a period the full label already states", () => {
    const m = buildSiteCardModel(
      site([card('Grid Export Today', 4), card('Solar Energy This Month', 9)]),
    );
    expect(m.sharedPeriod).toBeUndefined();
    expect([m.hero?.label, m.hero?.periodCaption]).toEqual(['Solar', 'month']);
    expect(m.satellites.map(x => [x.label, x.periodSuffix])).toEqual([['Grid Export Today', undefined]]);
  });

  it('carries the controller flag and tolerates a missing cards array', () => {
    expect(buildSiteCardModel(site([], { controller: true })).controller).toBe(true);
    const m = buildSiteCardModel(site(undefined));
    expect(m).toEqual({ metrics: [], hero: null, satellites: [], sharedPeriod: undefined, controller: false });
  });
});

describe('legendLabel', () => {
  const cases: [string, SourceToken | undefined, string][] = [
    ['Solar Energy Today', 'solar', 'Solar'],
    ['PV Total Power', 'solar', 'Solar'],
    ['Wind Generation - RealTime', 'wind', 'Wind'],
    ['Solar - Real-Time', 'solar', 'Solar'],
    ['Solar Power - Live', 'solar', 'Solar'],
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
  it('shows up to 3 satellites, the rest behind the toggle', () => {
    expect(COLLAPSED_SATELLITES).toBe(3);
    const lucky = buildSiteCardModel(LUCKY);
    expect(visibleSatellites(lucky, false)).toEqual({ visible: lucky.satellites, hiddenCount: 0 });
    expect(FIVE.hero?.label).toBe('Solar');
    const collapsed = visibleSatellites(FIVE, false);
    expect(collapsed.visible.map(m => m.label)).toEqual(['Wind', 'Battery', 'Genset']);
    expect(collapsed.hiddenCount).toBe(1);
    expect(visibleSatellites(FIVE, true)).toEqual({ visible: FIVE.satellites, hiddenCount: 0 });
  });

  it('shows the toggle only when something is hidden; its label contains its text', () => {
    const lucky = buildSiteCardModel(LUCKY);
    expect(toggleMetricsText(lucky, false)).toBeNull();
    expect(toggleMetricsLabel(lucky, false)).toBeNull();
    expect(toggleMetricsText(FIVE, false)).toBe('Show all 5');
    expect(toggleMetricsLabel(FIVE, false)).toBe('Show all 5 metrics');
    expect(toggleMetricsText(FIVE, true)).toBe('Show less');
    expect(toggleMetricsLabel(FIVE, true)).toBe('Show fewer metrics');
  });
});

describe('siteCardA11yLabel', () => {
  it('reads name, status, controller and 3 metrics (hero first) + "and N more"', () => {
    const m = buildSiteCardModel({ ...site(FIVE_CARDS), controller: true, size: 2500 });
    expect(siteCardA11yLabel('CCI FGF', 'Live, updated 3 minutes ago', m, false)).toBe(
      'CCI FGF. Live, updated 3 minutes ago. Controller installed. ' +
        'Solar 15.6 megawatt hours today, Wind 1.25 megawatt hours today, ' +
        'Battery 300 kilowatt hours today, and 2 more',
    );
  });

  it('reads every metric once expanded', () => {
    const label = siteCardA11yLabel('CCI FGF', 'Live, updated just now', FIVE, true);
    expect(label).toContain('Genset 0 kilowatt hours today, Grid no data');
    expect(label).not.toContain('more');
  });

  it('says when a site has no summary metrics — and never mentions capacity', () => {
    const m = buildSiteCardModel(site([]));
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
const texts = (root: ReactTestInstance): string[] => textNodes(root).map(t => t.text);

const textNodes = (root: ReactTestInstance): { text: string; style: Record<string, unknown> }[] => {
  const out: { text: string; style: Record<string, unknown> }[] = [];
  const flatten = (n: ReactTestInstance | string): string =>
    typeof n === 'string' ? n : n.children.map(flatten).join('');
  const walk = (n: ReactTestInstance) => {
    if (n.type === Text) {
      out.push({ text: flatten(n), style: (StyleSheet.flatten(n.props.style) ?? {}) as Record<string, unknown> });
      return;
    }
    n.children.forEach(c => typeof c !== 'string' && walk(c));
  };
  walk(root);
  return out;
};

const textOf = (n: ReactTestInstance | string): string =>
  typeof n === 'string' ? n : n.children.map(textOf).join('');

/** The one outermost <Text> whose content is exactly `text`. */
const textInstance = (root: ReactTestInstance, text: string): ReactTestInstance => {
  const found = root.findAll(n => n.type === Text && textOf(n) === text);
  expect(found).toHaveLength(1);
  return found[0];
};

/** What a <Text> actually shows, after a textTransform. */
const shown = (t: { text: string; style: Record<string, unknown> }) =>
  t.style.textTransform === 'uppercase' ? t.text.toUpperCase() : t.text;

/** The card's tappable: the accessible host view carrying the hint. */
const cardPressable = (root: ReactTestInstance) =>
  root.findAll(
    n => typeof n.type === 'string' && n.props.accessibilityHint === 'Opens site details',
  )[0];

/** The avatar's status ring (52pt, 2pt border). */
const avatarRing = (root: ReactTestInstance) =>
  root.findAll(n => {
    if (typeof n.type !== 'string') return false;
    const s = StyleSheet.flatten(n.props.style) ?? {};
    return s.width === SITE_CARD_AVATAR && s.borderWidth === 2;
  })[0];

const activeScheme = () => (useThemeStore.getState().isDark ? DARK_SCHEME : LIGHT_SCHEME);

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

  it('renders the old layout — hero tile, then chips — with backend values verbatim', () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 3 * MIN) });
    const nodes = textNodes(t.root);
    const all = nodes.map(shown);
    // header: avatar initials (no logo_ext), name, status
    expect(all.slice(0, 3)).toEqual(['LC', 'Lucky Cement Nooriabad', 'Live · 3 min ago']);
    // hero: static dot + 'GRID · TODAY', the value, its unit
    expect(all.slice(3, 6)).toEqual(['GRID · TODAY', '200', 'MWh']);
    // chips, in source order
    expect(all.slice(6)).toEqual(['SOLAR', '63.2', 'MWh', 'WIND', '187', 'MWh', 'GENSET', '105', 'MWh']);
    // nothing derived: no total (≈556 MWh), no share %, no capacity
    expect(all.join('|')).not.toMatch(/556|%|30 MW/);
  });

  it('never says LIVE in the hero overline, and nothing pulses', () => {
    const t = renderCard({
      ...site([card('Solar Power - Live', 18942.4, 'kW'), card('Grid Power - Live', 120, 'kW')]),
      dataLastUpdate: String(NOW - 20_000),
    });
    const upper = textNodes(t.root).filter(n => n.style.textTransform === 'uppercase');
    expect(upper.map(shown)).toEqual(['SOLAR', 'GRID']);
    upper.forEach(n => expect(shown(n)).not.toMatch(/LIVE/));
    expect(texts(t.root).join('|')).not.toMatch(/LIVE/);
    expect(t.root.findAllByType(PulseDot)).toHaveLength(0);
  });

  it('draws no sparkline — no SVG at all on a card without a toggle', () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 3 * MIN) });
    expect(t.root.findAllByType(Svg)).toHaveLength(0);
    expect(t.root.findAllByType(Path)).toHaveLength(0);
  });

  it('only the toggle chevron is SVG when the toggle shows (no curve, no gradient defs)', () => {
    const t = renderCard({ ...site(FIVE_CARDS), dataLastUpdate: String(NOW - 3 * MIN) });
    const paths = t.root.findAllByType(Path);
    expect(paths.map(p => p.props.d)).toEqual(['M6 9L12 15L18 9']);
    expect(t.root.findAllByType(Defs)).toHaveLength(0);
    expect(t.root.findAllByType(SvgLinearGradient)).toHaveLength(0);
  });

  it.each([
    ['Live · just now', 'Online', NOW - 20_000],
    ['Delayed · 39 min ago', 'Online', NOW - 39 * MIN],
    ['No data for 4 h', 'Online', NOW - 4 * 60 * MIN],
    ['Offline · last data 28 Sep', 'OFFLINE', NOW - 3 * 24 * 60 * MIN],
    ['Last update unknown', 'Online', NOW + 60 * MIN],
  ])("status row comes from the freshness model: '%s'", (expected, state, last) => {
    const t = renderCard({ ...LUCKY, state, dataLastUpdate: String(last) });
    const status = texts(t.root)[2];
    expect(status).toBe(expected);
    expect(status).toBe(siteStatus(state, String(last), NOW).label);
    expect(texts(t.root)).not.toContain('Online');
  });

  it('rings the avatar in brand only while the site is live', () => {
    const scheme = activeScheme();
    const live = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 3 * MIN) });
    expect(StyleSheet.flatten(avatarRing(live.root).props.style).borderColor).toBe(scheme.brand);
    act(() => live.unmount());
    tree = undefined;
    const delayed = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 45 * MIN) });
    expect(StyleSheet.flatten(avatarRing(delayed.root).props.style).borderColor).toBe(scheme.hairline);
  });

  it('advances the age (and drops the ring) on the shared tick without a refetch', () => {
    const scheme = activeScheme();
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 20_000) });
    expect(texts(t.root)).toContain('Live · just now');
    act(() => {
      jest.advanceTimersByTime(90_000);
    });
    expect(texts(t.root)).toContain('Live · 1 min ago');
    expect(cardPressable(t.root).props.accessibilityLabel).toContain('Live, updated 1 minute ago');
    act(() => {
      jest.advanceTimersByTime(30 * MIN);
    });
    expect(texts(t.root)[2]).toMatch(/^Delayed · 3\d min ago$/);
    expect(StyleSheet.flatten(avatarRing(t.root).props.style).borderColor).toBe(scheme.hairline);
  });

  it('is one screen-reader stop with a composed label and hint', () => {
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 3 * MIN) });
    const p = cardPressable(t.root);
    expect(p.props.accessible).toBe(true);
    expect(p.props.accessibilityLabel).toBe(
      'Lucky Cement Nooriabad. Live, updated 3 minutes ago. ' +
        'Grid 200 megawatt hours today, Solar 63.2 megawatt hours today, ' +
        'Wind 187 megawatt hours today, and 1 more',
    );
    expect(p.props.accessibilityActions).toBeUndefined();
  });

  it('exposes the toggle as the toggleMetrics custom action, with a ≥ touch.min target', () => {
    const t = renderCard({ ...site(FIVE_CARDS), dataLastUpdate: String(NOW - 3 * MIN) });
    expect(texts(t.root)).toContain('Show all 5');
    expect(texts(t.root)).not.toContain('GRID');
    let p = cardPressable(t.root);
    expect(p.props.accessibilityActions).toEqual([
      { name: 'toggleMetrics', label: 'Show all 5 metrics' },
    ]);

    const toggle = t.root.findAll(
      n => typeof n.type === 'string' && n.props.accessibilityLabel === 'Show all 5 metrics',
    )[0];
    const box = StyleSheet.flatten((toggle.children[0] as ReactTestInstance).props.style);
    const slop = toggle.props.hitSlop as { top: number; bottom: number };
    expect(box.minHeight + slop.top + slop.bottom).toBeGreaterThanOrEqual(touch.min);

    act(() => p.props.onAccessibilityAction({ nativeEvent: { actionName: 'toggleMetrics' } }));
    p = cardPressable(t.root);
    expect(p.props.accessibilityActions).toEqual([{ name: 'toggleMetrics', label: 'Show fewer metrics' }]);
    expect(texts(t.root)).toContain('Show less');
    // Grid ('NA') appears once expanded: a muted '—' with no unit.
    const all = texts(t.root);
    expect(all.slice(all.indexOf('Grid'), all.indexOf('Grid') + 2)).toEqual(['Grid', '—']);
    expect(p.props.accessibilityLabel).toContain('Grid no data');
  });

  it("shows a missing hero value as '—' with no unit", () => {
    const t = renderCard({ ...site([card('Solar Energy Today', 'NA')]), dataLastUpdate: String(NOW - 3 * MIN) });
    const all = textNodes(t.root).map(shown);
    expect(all.slice(3)).toEqual(['SOLAR · TODAY', '—']);
  });

  it('gives a chip its period on its own line — never appended to the 1-line label', () => {
    const t = renderCard({
      ...site([
        card('Solar Energy Today', 10),
        card('Grid Energy This Month', 20),
        card('Wind Energy Today', 5),
      ]),
      dataLastUpdate: String(NOW - 3 * MIN),
    });
    expect(textNodes(t.root).map(shown).slice(3)).toEqual([
      'GRID · THIS MONTH',
      '20',
      'kWh',
      'SOLAR',
      '10',
      'kWh',
      'Today',
      'WIND',
      '5',
      'kWh',
      'Today',
    ]);
    const label = textInstance(t.root, 'Solar');
    expect(label.props.numberOfLines).toBe(1);
    // The caption shrinks to fit rather than being cut off.
    const captions = t.root.findAll(n => n.type === Text && textOf(n) === 'Today');
    expect(captions).toHaveLength(2);
    captions.forEach(c => {
      expect(c.props.numberOfLines).toBe(1);
      expect(c.props.adjustsFontSizeToFit).toBe(true);
    });
  });

  it('lets a backend-name chip label wrap to 2 lines; a source word stays on 1', () => {
    const t = renderCard({
      ...site([card('Solar Energy Today', 10), card('Grid Export Today', 4)]),
      dataLastUpdate: String(NOW - 3 * MIN),
    });
    expect(textInstance(t.root, 'Grid Export Today').props.numberOfLines).toBe(2);
    act(() => t.unmount());
    tree = undefined;
    const word = renderCard({
      ...site([card('Solar Energy Today', 1), card('Grid Energy Today', 4)]),
      dataLastUpdate: String(NOW - 3 * MIN),
    });
    expect(textInstance(word.root, 'Solar').props.numberOfLines).toBe(1);
  });

  it('tints the hero lighter in light mode (energyInk stays AA) and keeps 18% in dark', () => {
    expect(heroTint(energyPalette.genset, false)).toEqual({
      colors: [`${energyPalette.genset}20`, `${energyPalette.genset}0A`, `${energyPalette.genset}05`],
      border: `${energyPalette.genset}2E`,
    });
    expect(heroTint(energyPalette.genset, true).colors[0]).toBe(`${energyPalette.genset}2E`);
    const t = renderCard({ ...LUCKY, dataLastUpdate: String(NOW - 3 * MIN) });
    const gradient = t.root.findByType(LinearGradient);
    expect(gradient.props.colors).toEqual(
      heroTint(energyPalette.grid, useThemeStore.getState().isDark).colors,
    );
  });

  it("labels a controller site 'Controller' (not 'PRO')", () => {
    const t = renderCard({ ...LUCKY, controller: true, dataLastUpdate: String(NOW - 3 * MIN) });
    expect(texts(t.root)).toContain('Controller');
    expect(texts(t.root)).not.toContain('PRO');
    expect(cardPressable(t.root).props.accessibilityLabel).toContain('Controller installed');
  });

  it('shows the site logo in the avatar, initials after a load error, and retries on fresh data', () => {
    const withLogo = { ...LUCKY, logo_ext: '1/72/.png', dataLastUpdate: String(NOW - 3 * MIN) };
    const t = renderCard(withLogo);
    const image = () => t.root.findAllByType(Image);
    expect(image()).toHaveLength(1);
    expect(image()[0].props.source.uri).toMatch(/\/public\/1\/72\/site-1\/logo\.png$/);
    expect(texts(t.root)).not.toContain('LC');
    act(() => image()[0].props.onError());
    expect(image()).toHaveLength(0);
    expect(texts(t.root)[0]).toBe('LC');
    // A refreshed site object (new payload) gets a fresh attempt.
    act(() => t.update(React.createElement(SiteCard, { site: { ...withLogo }, index: 99, onPress: jest.fn() })));
    expect(image()).toHaveLength(1);
  });

  it("shows 'No summary metrics' for a site without cards", () => {
    const t = renderCard({ ...site([]), dataLastUpdate: String(NOW - 3 * MIN) });
    expect(texts(t.root)).toEqual(['LC', 'Lucky Cement Nooriabad', 'Live · 3 min ago', 'No summary metrics']);
  });
});

/* ─────────── SiteCardSkeleton ─────────── */

describe('<SiteCardSkeleton />', () => {
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
  });

  it('splits the chip row by flex, so it never overflows a narrow card', () => {
    const t = render(React.createElement(SiteCardSkeleton));
    const blocks = t.root.findAllByType(Skeleton);
    // avatar, 2 text lines, the hero, then the 3 chip placeholders
    expect(blocks).toHaveLength(7);
    const chips = blocks.slice(4);
    chips.forEach(chip => {
      expect(chip.props.width).toBe('100%');
      const slot = chip.parent as ReactTestInstance;
      // A third of the row each, not a fixed 32% (3 × 32% + 2 gaps
      // overflowed every phone narrower than 400pt).
      expect(StyleSheet.flatten(slot.props.style)).toMatchObject({ flex: 1 });
    });
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
