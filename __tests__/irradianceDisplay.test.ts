/**
 * Irradiance reads the same on every screen — a grouped whole number
 * ('862 W/m²', '1,024 W/m²'), never '862.00' (product decision,
 * 2026-10-01). Every surface that prints a reading goes through ONE
 * predicate (`isIrradiance`, units.ts); this suite pins each surface to it
 * with the real Lucky Cement card ('Irradiance', W/m², live.p993).
 */
import { describe, expect, it } from '@jest/globals';
import { formatCardDisplay } from '../src/utils/cards';
import { extractLiveParams } from '../src/utils/liveParams';
import { formatSldValue, makeMapResolver } from '../src/utils/sld';
import { buildSldGrouping, classifySldNode, makeGroupedResolver } from '../src/utils/sldGroup';
import { buildSiteCardModel } from '../src/components/screens/Authenticated/Dashboard/siteCardModel';
import { sldGraphMock } from '../src/data/mock/sld';
import { ISite, SLDGraph } from '../src/types';

const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime();

describe('Cards tab', () => {
  it("Lucky Cement 'Irradiance' (W/m², live.p993) → '862 W/m²', spoken the same", () => {
    const q = formatCardDisplay(862, 'W/m2', 'Irradiance');
    expect([q.text, q.unit]).toEqual(['862', 'W/m²']);
    expect(q.spoken).toBe('862 watts per square metre');
    expect(q.value).toBe(862);
    expect(formatCardDisplay(1024.37, 'W/m²').text).toBe('1,024');
  });

  it('a unitless card named as irradiance rounds too; other cards keep 2 decimals', () => {
    expect(formatCardDisplay(862.4, '', 'POA Irradiance').text).toBe('862');
    expect(formatCardDisplay(862.4, 'kW', 'PV Total Power').text).toBe('862.40');
  });

  it('missing stays missing', () => {
    for (const raw of [null, undefined, '', 'NA']) {
      expect(formatCardDisplay(raw, 'W/m2', 'Irradiance')).toMatchObject({ text: '—', isMissing: true });
    }
  });
});

describe('Live tab', () => {
  const extract = (unitIndex: Record<string, string>) =>
    Object.fromEntries(
      extractLiveParams(
        {
          live: {
            data: {
              live: {
                p993: { value: 862.37, update_at: NOW },
                p994: { value: 1024.6, update_at: NOW },
                p10500: { value: 49.745, update_at: NOW },
                p995: { value: null, update_at: NOW },
              },
            },
          },
        },
        {
          mapping: {
            p993: 'POA Irradiance 4',
            p994: 'GHI',
            p10500: 'Bus Frequency',
            p995: 'POA Irradiance 5',
          },
          unitIndex,
          fetchNow: NOW,
        },
      ).map(p => [p.code, p]),
    );

  it('a W/m² tile prints a whole number with grouping, and says so', () => {
    const p = extract({ p993: 'W/m²', p994: 'W/m²', p10500: 'Hz' });
    expect([p.p993.displayValue, p.p993.displayUnit]).toEqual(['862', 'W/m²']);
    expect([p.p994.displayValue, p.p994.displayUnit]).toEqual(['1,025', 'W/m²']);
    expect(p.p993.a11yLabel).toBe('POA Irradiance 4, 862 watts per square metre, updated just now');
    expect(p.p993.numeric).toBe(862.37); // sorting keeps the untouched value
    // Other units keep the web's 2 decimals.
    expect(p.p10500.displayValue).toBe('49.75');
  });

  it('with no known unit the NAME decides (POA / GHI are whole words)', () => {
    const p = extract({});
    expect([p.p993.displayValue, p.p993.displayUnit]).toEqual(['862', '']);
    expect(p.p994.displayValue).toBe('1,025');
    expect(p.p10500.displayValue).toBe('49.75');
  });

  it('missing stays the muted dash', () => {
    const p = extract({ p995: 'W/m²' });
    expect([p.p995.displayValue, p.p995.isMissing]).toEqual(['—', true]);
  });

  it("a name that states another unit ('Insolation (kWh/m2)') keeps its decimals", () => {
    const [p] = extractLiveParams(
      { live: { data: { live: { p1: { value: 5.43, update_at: NOW } } } } },
      { mapping: { p1: 'Insolation (kWh/m2)' }, unitIndex: {}, fetchNow: NOW },
    );
    expect(p.displayValue).toBe('5.43');
    expect(p.a11yLabel).toBe('Insolation (kWh/m2), 5.43, updated just now');
  });
});

describe('SLD key rows', () => {
  it('inline: a W/m² key, or a unitless POA / GHI label, prints a whole number', () => {
    expect(formatSldValue(862.37, 'W/m2', 'Irr')).toBe('862');
    expect(formatSldValue('1024.6', 'W/m²', 'G')).toBe('1,025');
    expect(formatSldValue(862.37, undefined, 'POA')).toBe('862');
    expect(formatSldValue(862.37, '', 'GHI')).toBe('862');
  });

  it('inline: missing and every other key are unchanged', () => {
    expect(formatSldValue(null, 'W/m2', 'Irr')).toBe('—');
    expect(formatSldValue('', 'W/m2', 'Irr')).toBe('—');
    expect(formatSldValue(862.37, 'kW', 'P')).toBe(formatSldValue(862.37));
    expect(formatSldValue(0.785, '%', 'PF')).toBe(formatSldValue(0.785));
    expect(formatSldValue(862.37, 'kW', 'P')).toMatch(/^862[.,]37$/);
  });

  it('grouped: the members’ irradiance is AVERAGED, still a whole number', () => {
    const g: SLDGraph = JSON.parse(JSON.stringify(sldGraphMock));
    const pv = g.nodes.filter(n => classifySldNode(n) === 'solar');
    expect(pv.length).toBeGreaterThanOrEqual(2);
    pv.forEach((n, i) => {
      n.data.keys = [
        { param: `p.${i}`, label: 'P', unit: 'kW' },
        { param: `irr.${i}`, label: 'Irradiance', unit: 'W/m2' },
      ];
    });
    const { groups } = buildSldGrouping(g);
    const solar = groups.find(x => x.type === 'solar')!;
    const irr = solar.keys.find(k => k.label === 'Irradiance')!;
    expect(irr).toBeDefined();

    const values: Record<string, number> = {};
    pv.forEach((_, i) => {
      values[`p.${i}`] = 100;
      values[`irr.${i}`] = 860 + i * 1.37; // fractional mean
    });
    const resolve = makeGroupedResolver(makeMapResolver(values), groups);
    const mean = pv.reduce((s, _, i) => s + values[`irr.${i}`], 0) / pv.length;
    expect(resolve(irr.param)).toBeCloseTo(mean, 9);
    expect(Number.isInteger(mean)).toBe(false);
    // What the group card renders: the averaged value, 0 decimals.
    expect(formatSldValue(resolve(irr.param), irr.unit, irr.label)).toBe(String(Math.round(mean)));
  });
});

describe('Dashboard site card', () => {
  it('an irradiance chip is a whole number too', () => {
    const site: ISite = {
      id: 'site-1',
      name: 'Lucky Cement Nooriabad',
      logo_ext: '',
      size: 30000,
      controller: false,
      state: 'Online',
      dataLastUpdate: String(NOW),
      cards: [
        { name: 'Wind Energy Today', value: 147786, unit: 'kWh', color: '#00ff00', icon: 'wind' },
        { name: 'Solar Irradiance', value: 45.67, unit: 'W/m2', color: '#00ff00', icon: 'solar' },
      ],
    };
    const m = buildSiteCardModel(site);
    const chip = m.satellites.find(x => x.label === 'Solar Irradiance');
    expect([chip?.quantity.text, chip?.quantity.unit]).toEqual(['46', 'W/m²']);
  });
});
