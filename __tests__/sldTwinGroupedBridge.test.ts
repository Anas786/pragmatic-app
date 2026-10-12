/**
 * SLD web twin — the page bridge's "grouped looks" (scripts/web-twin/bridge.js),
 * run as shipped against the web's OWN `fromSldV2` / `lookOf`, taken from the
 * committed generated page (the vendored chunk that registers them; the
 * module ids are the page config's `sldModel` / `sldLook`):
 *
 *  - a member resolves exactly as the twin resolves a node — Lucky matches
 *    the web reference table (SPEC §8: GW turbines wind/directDrive, PV
 *    solarLg/fixed, WHR genset/steam, Captive genset/gasEngine, …);
 *  - a group node (Grouped mode) gets its members' MAJORITY model, pinned the
 *    lightest way `lookOf` confirms: "Wind · 6" → wind/directDrive via
 *    `look`, "Solar · 9" → solarLg/fixed via the members' icon (colour
 *    kept), members with a catalogue asset via `asset`; ties → the earliest
 *    member;
 *  - `pesGroupMembers` is always removed, nothing else changes (same
 *    objects), the input is never mutated, and nothing throws: no modules /
 *    a throwing lookOf → the group keeps its own icon and title.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import luckyFixture from '../scripts/web-twin/fixtures/lucky.json';
import { twinDataFor } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinGrouped';
import { TwinJson } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/protocol';
import { selectSldGraph } from '../src/utils/sld';
import { buildSldGrouping } from '../src/utils/sldGroup';
import { energyPalette } from '../src/theme/tokens';

type Json = Record<string, any>;
interface Look {
  kind: string;
  variant: string | null;
  asset: string | null;
}
interface WebSld {
  fromSldV2: (sld: unknown) => { nodes: Record<string, Json> };
  lookOf: (args: Json) => Look;
}
interface LogEntry {
  id: string;
  title: string;
  members: number;
  via: 'asset' | 'look' | 'icon' | 'own';
  want?: { kind: string; variant: string | null };
  drawn?: { kind: string; variant: string | null };
  reason?: string;
}
interface Bridge {
  resolveGroupLooks: (sld: unknown, look: WebSld | null) => { sld: Json; log: LogEntry[] };
  lookOfNode: (look: WebSld, raw: unknown) => (Look & { icon: unknown }) | null;
}

// ---- the web's own modules, from the generated page ----------------------------------
const GENERATED = path.resolve(
  __dirname,
  '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinHtml.generated.js',
);
const loadWebSld = (): WebSld => {
  const page = require(GENERATED).TWIN_HTML as string;
  const config = JSON.parse(/window\.__PES_TWIN_CONFIG__=(\{.*?\});\n/.exec(page)![1]) as {
    modules: Record<string, number>;
  };
  const exportsById: Record<number, Json> = {};
  const scripts = page.matchAll(/<script data-chunk="[^"]+">([\s\S]*?)<\/script>/g);
  for (const [, escaped] of scripts) {
    if (!escaped.includes('"lookOf",0,')) continue;
    const code = escaped.replace(/<\\\/(script)/gi, '</$1');
    const pushes: unknown[][] = [];
    // eslint-disable-next-line no-new-func
    new Function('globalThis', 'document', code)({ TURBOPACK: { push: (a: unknown[]) => pushes.push(a) } }, undefined);
    for (const a of pushes) {
      let ids: number[] = [];
      for (const item of a.slice(1)) {
        if (typeof item !== 'function') {
          ids.push(item as number);
          continue;
        }
        if (ids.includes(config.modules.sldLook)) {
          // turbopack's esm export: [name, 0, value | name, getter, …]
          (item as (ctx: Json) => void)({
            s: (list: unknown[], id: number) => {
              const out: Json = {};
              for (let i = 0; i < list.length; ) {
                const name = list[i++] as string;
                const tag = list[i++];
                out[name] = typeof tag === 'number' ? list[i++] : (tag as () => unknown)();
              }
              exportsById[id] = out;
            },
          });
        }
        ids = [];
      }
    }
  }
  const fromSldV2 = exportsById[config.modules.sldModel]?.fromSldV2;
  const lookOf = exportsById[config.modules.sldLook]?.lookOf;
  if (typeof fromSldV2 !== 'function' || typeof lookOf !== 'function') {
    throw new Error('the generated page has no fromSldV2 / lookOf under its sldModel / sldLook ids');
  }
  return { fromSldV2, lookOf };
};

const loadBridge = (): Bridge => {
  const src = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/bridge.js'), 'utf8');
  const start = src.indexOf('// ---- grouped looks');
  const end = src.indexOf('// ---- turbopack require');
  if (start < 0 || end < start) throw new Error('bridge.js: the "grouped looks" section markers moved');
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end)}; return { resolveGroupLooks, lookOfNode };`)() as Bridge;
};

const web = loadWebSld();
const bridge = loadBridge();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const groupedSld = (sld: unknown): Json => {
  const graph = selectSldGraph({ siteComponents: { sldV2: sld } });
  return twinDataFor('grouped', sld as TwinJson, graph ? buildSldGrouping(graph) : null, { live: {} }).sld as Json;
};

const LUCKY = luckyFixture.sld as unknown as Json;
const look = (raw: unknown) => {
  const l = bridge.lookOfNode(web, raw);
  return l && `${l.kind}/${l.variant}`;
};

describe('a member resolves as the twin resolves a node', () => {
  it('Lucky matches the web reference table (SPEC §8)', () => {
    const byHeading = (h: string) => LUCKY.nodes.find((n: Json) => n.data.heading === h);
    ['GW-WTG-01', 'GW-WTG-02', 'GW-WTG-03', 'GW-WTG-04', 'GW-WTG-05', 'GW-WTG-06'].forEach(h =>
      expect([h, look(byHeading(h))]).toEqual([h, 'wind/directDrive']),
    );
    LUCKY.nodes
      .filter((n: Json) => /PV/.test(n.data.heading))
      .forEach((n: Json) => expect([n.data.heading, look(n)]).toEqual([n.data.heading, 'solarLg/fixed']));
    expect(look(byHeading('WHR Plant'))).toBe('genset/steam');
    expect(look(byHeading('Captive Plant'))).toBe('genset/gasEngine');
    expect(look(byHeading('BESS'))).toBe('battery/container');
    expect(look(byHeading('SVG'))).toBe('power/statcom');
  });
});

describe('Lucky grouped', () => {
  const input = groupedSld(LUCKY);
  const before = clone(input);
  const { sld, log } = bridge.resolveGroupLooks(input, web);
  const node = (h: string) => sld.nodes.find((n: Json) => n.data.heading === h);

  it('Wind · 6 = the members’ direct-drive turbine (look); Solar · 9 = their solarLg array (icon)', () => {
    expect(log).toEqual([
      {
        id: 'sldgrp:wind:1',
        title: 'Wind · 6',
        members: 6,
        via: 'look',
        want: { kind: 'wind', variant: 'directDrive' },
        drawn: { kind: 'wind', variant: 'directDrive' },
      },
      {
        id: 'sldgrp:solar:1',
        title: 'Solar · 9',
        members: 9,
        via: 'icon',
        want: { kind: 'solarLg', variant: 'fixed' },
        drawn: { kind: 'solarLg', variant: 'fixed' },
      },
    ]);
    expect(node('Wind · 6').data.look).toBe('directDrive');
    // The members' BACKEND colour (twinGrouped.ts) — Lucky's turbines are the
    // backend orange, its PV the backend green — never the palette's.
    expect(node('Wind · 6').data.icon).toEqual({ name: 'wind', color: '#ff7d00' });
    expect(node('Wind · 6').data.icon.color).not.toBe(energyPalette.wind);
    expect(node('Solar · 9').data.look).toBe('fixed');
    expect(node('Solar · 9').data.icon).toEqual({ name: 'solarLg', color: '#00ff00' });
    expect(look(node('Wind · 6'))).toBe('wind/directDrive');
    expect(look(node('Solar · 9'))).toBe('solarLg/fixed');
  });

  it('removes pesGroupMembers and nothing else; never mutates the input', () => {
    expect(sld.nodes.some((n: Json) => 'pesGroupMembers' in n.data)).toBe(false);
    expect(sld.nodes).toHaveLength(7);
    sld.nodes.forEach((n: Json, i: number) => {
      if (!String(n.id).startsWith('sldgrp:')) expect(n).toBe(input.nodes[i]);
    });
    expect(sld.edges).toBe(input.edges);
    const wind = node('Wind · 6');
    const rest = { ...input.nodes[1].data };
    delete rest.pesGroupMembers;
    expect(wind.data).toEqual({ ...rest, look: 'directDrive' });
    expect(input).toEqual(before);
  });

  it('a diagram without group nodes is returned as is', () => {
    expect(bridge.resolveGroupLooks(LUCKY, web)).toEqual({ sld: LUCKY, log: [] });
    expect(bridge.resolveGroupLooks(LUCKY, web).sld).toBe(LUCKY);
    expect(bridge.resolveGroupLooks(null, web).sld).toBeNull();
    const odd = { nodes: 'x' };
    expect(bridge.resolveGroupLooks(odd, web).sld).toBe(odd);
  });
});

describe('other groups', () => {
  const plant = { id: '1', type: 'custom', position: { x: 0, y: 500 }, data: { heading: 'Plant', keys: [], type: 'logo', edgesConnect: 'target' } };
  const unit = (id: string, heading: string, icon: string, extra: Json = {}) => ({
    id,
    type: 'custom',
    position: { x: Number(id) * 120, y: 0 },
    data: { heading, edgesConnect: 'source', icon: { name: icon, color: '#ff7d00' }, keys: [{ label: 'P', unit: 'kW', param: `live.p${id}.value` }], ...extra },
  });
  const toPlant = (ids: string[]) =>
    ids.map(id => ({ id: `e${id}-1`, source: id, target: '1', sourceHandle: 'r', targetHandle: 'l', type: 'buttonedge', style: { stroke: '#61656b' } }));
  const resolve = (units: Json[]) =>
    bridge.resolveGroupLooks(groupedSld({ nodes: [plant, ...units], edges: toPlant(units.map(u => u.id)) }), web);

  it('WHR units → the steam turbine (their icon + the group title)', () => {
    const { log } = resolve([unit('2', 'WHR Plant 1', 'genset'), unit('3', 'WHR Plant 2', 'genset')]);
    expect(log).toEqual([expect.objectContaining({ title: 'WHR · 2', via: 'look', drawn: { kind: 'genset', variant: 'steam' } })]);
  });

  it('members with a catalogue asset → pinned by that asset', () => {
    const extra = { asset: 'wind.vertical-axis' };
    const { sld, log } = resolve([unit('2', 'T1', 'wind', extra), unit('3', 'T2', 'wind', extra), unit('4', 'WTG 3', 'wind')]);
    expect(log).toEqual([
      expect.objectContaining({ title: 'Wind · 3', via: 'asset', want: { kind: 'wind', variant: 'vertical' }, drawn: { kind: 'wind', variant: 'vertical' } }),
    ]);
    expect(sld.nodes[1].data.asset).toBe('wind.vertical-axis');
  });

  it('the majority model wins; a tie goes to the earliest member', () => {
    const tubular = (id: string) => unit(id, `WTG ${id}`, 'wind');
    const direct = (id: string) => unit(id, `GW WTG ${id}`, 'wind');
    expect(resolve([tubular('2'), direct('3'), direct('4')]).log[0].drawn).toEqual({ kind: 'wind', variant: 'directDrive' });
    expect(resolve([tubular('2'), direct('3'), tubular('4'), direct('5')]).log[0].drawn).toEqual({ kind: 'wind', variant: 'tubular' });
    expect(resolve([direct('2'), tubular('3'), tubular('4'), direct('5')]).log[0].drawn).toEqual({ kind: 'wind', variant: 'directDrive' });
  });

  it('never throws: no modules / a failing lookOf → the group keeps its own icon and title', () => {
    const units = [unit('2', 'WTG 1', 'wind'), unit('3', 'WTG 2', 'wind')];
    const input = groupedSld({ nodes: [plant, ...units], edges: toPlant(['2', '3']) });
    const own = (out: { sld: Json; log: LogEntry[] }) => {
      expect(out.log[0].via).toBe('own');
      expect(typeof out.log[0].reason).toBe('string');
      const rest = { ...input.nodes[1].data };
      delete rest.pesGroupMembers;
      expect(out.sld.nodes[1].data).toEqual(rest);
    };
    own(bridge.resolveGroupLooks(input, null));
    own(bridge.resolveGroupLooks(input, { fromSldV2: web.fromSldV2, lookOf: () => { throw new Error('boom'); } }));
    own(bridge.resolveGroupLooks(input, { fromSldV2: () => { throw new Error('boom'); }, lookOf: web.lookOf }));
    own(bridge.resolveGroupLooks(input, { fromSldV2: () => ({ nodes: {} }), lookOf: web.lookOf }));
    // Garbage members.
    const garbage = clone(input);
    garbage.nodes[1].data.pesGroupMembers = 'nope';
    own(bridge.resolveGroupLooks(garbage, web));
  });
});
