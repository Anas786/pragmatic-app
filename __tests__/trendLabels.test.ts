/**
 * Series-label resolution for the Trends tab (`selectTrends`).
 *
 * Labels must resolve through /public/config/params-mapping when the trend
 * config carries no meaningful `display` — otherwise legends/tooltips show
 * raw p-codes ("p10436" instead of "SVG 4 Active Power").
 */
import { describe, expect, it } from '@jest/globals';
import { selectTrends } from '../src/utils/trends';

const MAPPING = {
  p10436: 'SVG 4 Active Power',
  p5002: 'DG 3 Active Power',
  pBad: 42, // non-string values must be ignored (ParamsMapping is loosely typed)
};

const config = (aggregations: unknown[]) => ({
  siteComponents: {
    trends: [{ heading: 'Power', payload: { aggregations } }],
  },
});

const firstDisplays = (cfg: unknown, mapping?: typeof MAPPING) =>
  selectTrends(cfg, mapping)[0]?.aggregations.map(a => a.display);

describe('selectTrends series labels', () => {
  it('maps param codes through params-mapping when display is absent', () => {
    const cfg = config([
      { param: 'p10436', type: 'line' },
      { param: 'p5002', type: 'bar' },
    ]);
    expect(firstDisplays(cfg, MAPPING)).toEqual([
      'SVG 4 Active Power',
      'DG 3 Active Power',
    ]);
  });

  it('treats a display equal to the raw p-code as absent', () => {
    const cfg = config([{ param: 'p10436', type: 'line', display: 'p10436' }]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['SVG 4 Active Power']);
  });

  it('lets an explicit, meaningful config display win over the mapping', () => {
    const cfg = config([
      { param: 'p10436', type: 'line', display: 'Custom Series Name' },
    ]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['Custom Series Name']);
  });

  it('falls back to the raw code when neither display nor mapping resolve', () => {
    const cfg = config([{ param: 'p999999', type: 'area' }]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['p999999']);
    expect(firstDisplays(cfg)).toEqual(['p999999']); // no mapping at all
  });

  it('ignores non-string mapping values', () => {
    const cfg = config([{ param: 'pBad', type: 'line' }]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['pBad']);
  });
});
