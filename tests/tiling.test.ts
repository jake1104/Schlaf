import { describe, it, expect } from 'vitest';
import { buildGeometry } from '../src/geometry/builder';

describe('tiling routing', () => {
  it('{4,4} renders a euclidean square patch', () => {
    const g = buildGeometry('{4,4}');
    expect(g.note).toMatch(/euclidean/);
    expect(g.vertices.length).toBe(49);
    expect(g.vertices.every((v) => Math.abs(v[2] ?? 0) < 1e-9)).toBe(true);
  });
  it('{4,4} respects the range option', () => {
    expect(buildGeometry('{4,4}', { range: 1 }).vertices.length).toBe(9);
  });
  it('{4,5} renders a hyperbolic disk patch', () => {
    const g = buildGeometry('{4,5}');
    expect(g.note).toMatch(/hyperbolic/);
    expect(g.vertices.length).toBeGreaterThan(50);
    expect(g.vertices.every((v) => Math.hypot(...v) < 1)).toBe(true);
    expect(g.edges.length).toBeGreaterThan(50);
    expect(g.faces.length).toBeGreaterThan(0);
  });
  it('{4,3,4} renders a euclidean cube patch', () => {
    const g = buildGeometry('{4,3,4}');
    expect(g.note).toMatch(/euclidean/);
    expect(g.vertices.length).toBe(56);
    expect(g.edges.length).toBe(108);
  });
  it('{4,3,5} renders a hyperbolic ball patch', () => {
    const g = buildGeometry('{4,3,5}');
    expect(g.note).toMatch(/hyperbolic/);
    expect(g.vertices.length).toBeGreaterThan(20);
    expect(g.vertices.every((v) => Math.hypot(...v) < 1)).toBe(true);
  });
  it('operated euclidean tilings render from the wythoff engine', () => {
    for (const sym of ['t{4,4}', 'r{4,4}', 'rr{4,4}', 'tr{4,4}', 's{4,4}', 's{6,3}', 'sr{6,3}', 'tr{6,3}']) {
      const g = buildGeometry(sym, { range: 2 });
      expect(g.note).toMatch(/euclidean/);
      expect(g.vertices.length).toBeGreaterThan(20);
      expect(g.edges.length).toBeGreaterThan(20);
      expect(g.faces.length).toBeGreaterThan(0);
      expect(g.vertices.every((v) => Math.abs(v[2] ?? 0) < 1e-9)).toBe(true);
    }
  });
  it('operated hyperbolic tilings use the wythoff generator positions', () => {
    const degrees = new Map<string, number>([
      ['t{4,5}', 3],
      ['r{4,5}', 4],
      ['rr{4,5}', 4],
      ['tr{4,5}', 3],
      ['s{4,5}', 5],
      ['t{5,4}', 3],
      ['r{5,4}', 4],
      ['tr{7,3}', 3],
    ]);
    for (const [sym, deg] of degrees) {
      const g = buildGeometry(sym, { range: 1 });
      expect(g.note).toMatch(/hyperbolic/);
      expect(g.vertices.length).toBeGreaterThan(10);
      const count = new Map<number, number>();
      for (const [a, b] of g.edges) {
        count.set(a, (count.get(a) ?? 0) + 1);
        count.set(b, (count.get(b) ?? 0) + 1);
      }
      const interior = [...count.values()].sort((x, y) => y - x);
      expect(interior[0]).toBe(deg);
    }
  });
});
