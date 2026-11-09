import { describe, it, expect } from 'vitest';
import { parseSchlafli } from '../src/schlafli/parser';
import { buildGeometry } from '../src/geometry/builder';
import { regularVertices } from '../src/geometry/regular';

describe('non-integer schlafli', () => {
  it('parses {4.5} decimal', () => {
    expect(parseSchlafli('{4.5}').base[0]).toBe(4.5);
  });
  it('parses {3.5,5} honeycomb-like decimals', () => {
    const r = parseSchlafli('{3.5,5}');
    expect(r.base[0]).toBe(3.5);
  });
  it('builds decimal polygon without throw', () => {
    const g = buildGeometry('{4.5}');
    expect(g.vertices.length).toBeGreaterThan(0);
  });
});

describe('{3,3} tetrahedron', () => {
  it('simplex 3d is regular (all edges equal)', () => {
    const v = regularVertices('simplex', 3);
    expect(v.length).toBe(4);
    const ds = v.flatMap((a, i) => v.slice(i + 1).map((b) => Math.hypot(...a.map((x, k) => x - b[k]))));
    for (const d of ds) expect(Math.abs(d - ds[0])).toBeLessThan(1e-6);
  });
  it('tetrahedron has 4 verts 6 edges', () => {
    const g = buildGeometry('{3,3}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(6);
  });
});

describe('face coloring', () => {
  it('cube has faces for coloring', () => {
    const g = buildGeometry('{4,3}');
    expect(g.faces.length).toBeGreaterThan(0);
    expect(g.faces[0].length).toBeGreaterThanOrEqual(3);
  });
  it('tetrahedron has 4 triangular faces', () => {
    const g = buildGeometry('{3,3}');
    expect(g.faces.length).toBe(4);
  });
});
