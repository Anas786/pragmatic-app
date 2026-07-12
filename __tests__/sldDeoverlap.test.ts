/**
 * Invariants for the SLD node de-overlap pass (`resolveNodeRects`).
 *
 * Both the card layer and the Skia edge layer compute this map independently
 * and rely on it being deterministic and overlap-free — a regression here
 * shows up as cards stacked on each other or arrows detached from cards.
 */
import { it, expect, describe } from '@jest/globals';
import {
  getGraphBounds,
  isLogoNode,
  nodeRectInBounds,
  resolveNodeRects,
  SLDRect,
} from '../src/utils/sld';
import { sldGraphMock } from '../src/data/mock/sld';
import { SLDGraph, SLDNode } from '../src/types';

const overlaps = (a: SLDRect, b: SLDRect): boolean => {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 0 && oy > 0;
};

describe('resolveNodeRects', () => {
  const bounds = getGraphBounds(sldGraphMock);

  it('produces no overlapping cards for the reference graph', () => {
    const rects = Array.from(resolveNodeRects(sldGraphMock, bounds).values());
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it('separates cards that the backend placed on top of each other', () => {
    const source = sldGraphMock.nodes.find((n: SLDNode) => !isLogoNode(n))!;
    const collided: SLDGraph = {
      ...sldGraphMock,
      // A clone at the exact same position — guaranteed full overlap.
      nodes: [...sldGraphMock.nodes, { ...source, id: `${source.id}-clone` }],
    };
    const b = getGraphBounds(collided);
    const rects = Array.from(resolveNodeRects(collided, b).values());
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it('keeps the logo (plant) node anchored at its designed position', () => {
    const logo = sldGraphMock.nodes.find(isLogoNode)!;
    const rects = resolveNodeRects(sldGraphMock, bounds);
    expect(rects.get(logo.id)).toEqual(nodeRectInBounds(logo, bounds));
  });

  it('is deterministic across calls', () => {
    const a = resolveNodeRects(sldGraphMock, bounds);
    const b = resolveNodeRects(sldGraphMock, bounds);
    expect(Array.from(a.entries())).toEqual(Array.from(b.entries()));
  });

  it('keeps every card inside the graph frame', () => {
    resolveNodeRects(sldGraphMock, bounds).forEach(r => {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(bounds.width + 0.001);
      expect(r.y + r.h).toBeLessThanOrEqual(bounds.height + 0.001);
    });
  });
});
