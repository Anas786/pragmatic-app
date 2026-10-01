/**
 * formatQuantity / unit helpers — the app-wide number + unit vocabulary.
 * Formatting is presentation only: `value` must always be the untouched
 * backend number (web-portal parity).
 */
import { describe, expect, it } from '@jest/globals';
import {
  formatEnergy,
  formatQuantity,
  formatSig3,
  isRateUnit,
  normalizeUnit,
  pickScale,
  splitLabelUnit,
  spokenUnit,
  unitFamily,
} from '../src/utils/units';
import { metricA11yLabel } from '../src/utils/a11y';

const q = (value: unknown, unit?: string | null, opts?: Parameters<typeof formatQuantity>[2]) => {
  const r = formatQuantity(value, unit, opts);
  return [r.text, r.unit];
};

describe('formatQuantity — compact (default)', () => {
  it('rescales up within the family at 3 significant digits', () => {
    expect(q(15642, 'kWh')).toEqual(['15.6', 'MWh']);
    expect(q(850, 'kwh')).toEqual(['850', 'kWh']);
    expect(q(999.4, 'kWh')).toEqual(['999', 'kWh']);
    expect(q(1049999, 'kWh')).toEqual(['1.05', 'GWh']);
    expect(q(1250, 'kW')).toEqual(['1.25', 'MW']);
  });

  it('rolls over when rounding reaches 1000', () => {
    expect(q(999.95, 'kWh')).toEqual(['1.00', 'MWh']);
  });

  it('keeps the sign', () => {
    expect(q(-121393, 'kWh')).toEqual(['-121', 'MWh']);
  });

  it('a real zero is a value, not missing', () => {
    const r = formatQuantity(0, 'kWh');
    expect([r.text, r.unit, r.isMissing, r.value]).toEqual(['0', 'kWh', false, 0]);
  });

  it.each(['NA', null, undefined, '', '  ', NaN, Infinity, {}])(
    'non-numeric %p is missing',
    v => {
      expect(formatQuantity(v, 'kWh')).toEqual({
        text: '—',
        unit: '',
        spoken: 'no data',
        isMissing: true,
        value: null,
      });
    },
  );

  it('parses numeric strings (backend ships numbers as strings)', () => {
    expect(q('15642', 'kWh')).toEqual(['15.6', 'MWh']);
  });

  it('never rescales or K-suffixes non-power units', () => {
    expect(q(12345, 'V')).toEqual(['12,345', 'V']);
    expect(q(862, 'w/m2')).toEqual(['862', 'W/m²']);
    expect(q(49.98, 'hz')).toEqual(['50.0', 'Hz']);
    expect(q(87.25, '%')).toEqual(['87.3', '%']);
  });

  it('integer values carry no padding decimals', () => {
    expect(q(17000, 'kWh')).toEqual(['17', 'MWh']);
    expect(q(5, 'kWh')).toEqual(['5', 'kWh']);
  });

  it('unitless values keep an empty unit', () => {
    expect(q(1234.5, null)).toEqual(['1,235', '']);
  });

  it('value stays the untouched input', () => {
    expect(formatQuantity(142781.74, 'MWh').value).toBe(142781.74);
  });
});

describe('formatQuantity — precise', () => {
  it('fixed decimals with grouping below 10,000', () => {
    expect(q(1498.7, 'kWh', { mode: 'precise' })).toEqual(['1,498.70', 'kWh']);
    expect(q(9999.994, 'kWh', { mode: 'precise' })).toEqual(['9,999.99', 'kWh']);
  });

  it('rescales once |v| ≥ 10,000, until below 1000', () => {
    expect(q(5902224.1, 'kWh', { mode: 'precise' })).toEqual(['5.90', 'GWh']);
    expect(q(12345, 'kWh', { mode: 'precise' })).toEqual(['12.35', 'MWh']);
  });

  it('list rows use 1 decimal', () => {
    expect(q(450712, 'kWh', { mode: 'precise', decimals: 1 })).toEqual(['450.7', 'MWh']);
    expect(q(12900, 'kWh', { mode: 'precise', decimals: 1 })).toEqual(['12.9', 'MWh']);
  });

  it('rescale:false pins the backend unit — the Summary yield reads like the web', () => {
    // p24 is lifetime MWh; the web prints "142,781.74 mWh" (a casing typo).
    expect(q(142781.74, 'mWh', { mode: 'precise', rescale: false })).toEqual([
      '142,781.74',
      'MWh',
    ]);
    // Rescaling it stays in the MWh family upward — never down to kWh.
    expect(q(142781.74, 'mWh', { mode: 'precise' })).toEqual(['142.78', 'GWh']);
    expect(q(142781.74, 'mWh', { rescale: false })).toEqual(['142,782', 'MWh']);
  });

  it('rescale:false keeps web-verified Cards values exactly as the web prints them', () => {
    // Lucky Cement, web portal 2026-10-01: 147,786.00 kWh · 14,463.03 kW.
    expect(q(147786, 'kWh', { mode: 'precise', rescale: false })).toEqual(['147,786.00', 'kWh']);
    expect(q(14463.03, 'kW', { mode: 'precise', rescale: false })).toEqual(['14,463.03', 'kW']);
  });

  it('non-power units keep their unit and 2 decimals', () => {
    expect(q(12345, 'V', { mode: 'precise' })).toEqual(['12,345.00', 'V']);
  });

  it('0 is "0.00" and missing is "—"', () => {
    expect(q(0, 'kWh', { mode: 'precise' })).toEqual(['0.00', 'kWh']);
    expect(q('NA', 'kWh', { mode: 'precise' })).toEqual(['—', '']);
  });
});

describe('spoken text', () => {
  it('spells units out', () => {
    expect(formatQuantity(15642, 'kWh').spoken).toBe('15.6 megawatt hours');
    expect(formatQuantity(609, 'kW').spoken).toBe('609 kilowatts');
    expect(formatQuantity(-121393, 'kWh').spoken).toBe('minus 121 megawatt hours');
    expect(formatQuantity(862, 'W/m2').spoken).toBe('862 watts per square metre');
  });

  it('tiny non-zero readings are shown and spoken as below 0.001, not as zero', () => {
    const pos = formatQuantity(0.0004, 'kWh');
    expect([pos.text, pos.unit, pos.isMissing]).toEqual(['<0.001', 'kWh', false]);
    expect(pos.spoken).toBe('less than 0.001 kilowatt hours');
    const neg = formatQuantity(-0.0004, 'kWh');
    expect(neg.text).toBe('>-0.001');
    expect(neg.spoken).toBe('between minus 0.001 and 0 kilowatt hours');
    expect(formatQuantity(0, 'kWh').text).toBe('0');
  });

  it('spokenUnit covers the reactive / apparent families', () => {
    expect(spokenUnit('kVAr')).toBe('kilovolt-amperes reactive');
    expect(spokenUnit('MVA')).toBe('megavolt-amperes');
    expect(spokenUnit('%')).toBe('percent');
    expect(spokenUnit('furlongs')).toBe('furlongs');
  });

  it('metricA11yLabel composes name, value and extras', () => {
    expect(metricA11yLabel('PV total power', formatQuantity(609, 'kW'), ['solar'])).toBe(
      'PV total power, 609 kilowatts, solar',
    );
    expect(metricA11yLabel('Grid', formatQuantity('NA', 'kW'))).toBe('Grid, no data');
    expect(metricA11yLabel('Grid', formatQuantity(1, 'kW'), ['', '  '])).toBe('Grid, 1 kilowatts');
  });
});

describe('unit helpers', () => {
  it('normalizeUnit fixes casing', () => {
    expect(normalizeUnit('kwh')).toBe('kWh');
    expect(normalizeUnit('KWH')).toBe('kWh');
    expect(normalizeUnit('mwh')).toBe('MWh');
    expect(normalizeUnit('mWh')).toBe('MWh');
    expect(normalizeUnit('kvar')).toBe('kVAr');
    expect(normalizeUnit('w/m2')).toBe('W/m²');
    expect(normalizeUnit(' Hz ')).toBe('Hz');
    expect(normalizeUnit('Tons')).toBe('Tons');
    expect(normalizeUnit(null)).toBe('');
  });

  it('unitFamily / isRateUnit', () => {
    expect(unitFamily('kWh')).toBe('energy');
    expect(unitFamily('MW')).toBe('power');
    expect(unitFamily('kVAr')).toBe('reactive');
    expect(unitFamily('kvarh')).toBe('reactive');
    expect(unitFamily('kVA')).toBe('apparent');
    expect(unitFamily('V')).toBe('other');
    expect(unitFamily(undefined)).toBe('other');
    expect(isRateUnit('kW')).toBe(true);
    expect(isRateUnit('kWh')).toBe(false);
    expect(isRateUnit('W/m²')).toBe(false);
  });

  it('pickScale finds a shared display scale', () => {
    expect(pickScale(5902224, 'kWh')).toEqual({ unit: 'GWh', divisor: 1e6 });
    expect(pickScale(850, 'kWh')).toEqual({ unit: 'kWh', divisor: 1 });
    expect(pickScale(12345, 'V')).toEqual({ unit: 'V', divisor: 1 });
  });

  it('splitLabelUnit strips only a recognised trailing unit', () => {
    expect(splitLabelUnit('Active Power (kW)')).toEqual({ label: 'Active Power', unit: 'kW' });
    expect(splitLabelUnit('Irradiance [w/m2]')).toEqual({ label: 'Irradiance', unit: 'W/m²' });
    expect(splitLabelUnit('Inverter (Block A)')).toEqual({ label: 'Inverter (Block A)', unit: null });
    expect(splitLabelUnit('Frequency')).toEqual({ label: 'Frequency', unit: null });
    expect(splitLabelUnit('(kW)')).toEqual({ label: '(kW)', unit: null });
  });

  it('formatEnergy is formatQuantity in kWh', () => {
    expect(formatEnergy(15642)).toEqual(formatQuantity(15642, 'kWh'));
  });

  it('formatSig3 edge cases', () => {
    expect(formatSig3(0.987)).toBe('0.987');
    // Tiny non-zero magnitudes never read like a real zero ('0').
    expect(formatSig3(0.0004)).toBe('<0.001');
    expect(formatSig3(-0.0001)).toBe('>-0.001');
    expect(formatSig3(0.001)).toBe('0.00100');
    expect(formatSig3(0)).toBe('0');
    expect(formatSig3(NaN)).toBe('—');
  });
});
