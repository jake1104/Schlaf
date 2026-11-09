import { describe, it, expect } from 'vitest';
import { buildGeometry } from '../src/geometry/builder';
describe('builder', () => {
  it('cube {4,3} -> 8 verts 12 edges', () => {
    const g = buildGeometry('{4,3}');
    expect(g.vertices.length).toBe(8);
    expect(g.edges.length).toBe(12);
  });
  it('tesseract {4,3,3} -> 16 verts', () => {
    expect(buildGeometry('{4,3,3}').vertices.length).toBe(16);
  });
  it('prism {4}x{} -> cube', () => {
    expect(buildGeometry('{4}x{}').vertices.length).toBe(8);
  });
  it('hyperbolic honeycomb returns cutoff info', () => {
    const g = buildGeometry('H:{4,3,5}');
    expect(g.vertices.length).toBeGreaterThan(0);
    expect(g.note).toMatch(/cutoff|hyperbolic/i);
  });
  it('hull faces merge coplanar triples into one polygon fan', () => {
    expect(buildGeometry('{4,3}').faces.length).toBe(12);
    expect(buildGeometry('t{4,3}').faces.length).toBe(44);
    expect(buildGeometry('tt{4,3}').faces.length).toBe(140);
    expect(buildGeometry('tr{4,3}').faces.length).toBe(92);
  });
  it('stacks without a generic definition throw instead of rendering blobs', () => {
    for (const s of ['ts{4,3}', 'st{4,3}', 'ss{4,3}', 's{4}']) {
      expect(() => buildGeometry(s)).toThrow(/not a Wythoff position/);
    }
  });
  it('operated euclidean tilings avoid the spherical operator stack', () => {
    for (const s of ['t{4,4}', 'r{4,4}', 's{4,4}']) {
      expect(() => buildGeometry(s, { range: 2 })).not.toThrow();
    }
  });
  it('regular 4-polytopes derive from the rank-4 wythoff engine', () => {
    const a = buildGeometry('{5,3,3}');
    expect(a.vertices.length).toBe(600);
    expect(a.edges.length).toBe(1200);
    expect(a.faces.length).toBeGreaterThan(0);
    const b = buildGeometry('{3,3,5}');
    expect(b.vertices.length).toBe(120);
    expect(b.edges.length).toBe(720);
    expect(b.faces.length).toBeGreaterThan(0);
    const c = buildGeometry('{3,4,3}');
    expect(c.vertices.length).toBe(24);
    expect(c.edges.length).toBe(96);
  });
  it('4D uniform operators extend the same wythoff positions', () => {
    const t = buildGeometry('t{5,3,3}');
    expect(t.vertices.length).toBe(2400);
    expect(t.edges.length).toBe(4800);
    const r = buildGeometry('r{3,3,5}');
    expect(r.vertices.length).toBe(720);
    expect(r.edges.length).toBe(3600);
  }, 60000);
  it('concave regular star polychora render', () => {
    const g = buildGeometry('{5/2,3,3}');
    expect(g.vertices.length).toBe(600);
    expect(g.edges.length).toBe(1200);
    expect(g.note).toMatch(/star/);
    expect(buildGeometry('{5/2,5,3}').vertices.length).toBe(120);
    expect(buildGeometry('{5/2,5/2,5}').vertices.length).toBe(120);
    for (const sym of ['{5/2,3,3}', '{5,3,5/2}', '{5,5/2,3}', '{3,3,5/2}', '{5/2,5,5/2}', '{3,5/2,5}']) {
      expect(buildGeometry(sym).faces.length).toBeGreaterThan(0);
    }
    expect(() => buildGeometry('{5/2,3,3,3}')).toThrow(/no regular star/);
  }, 60000);
  it('5D regular polytopes and star hyperbolic honeycombs route correctly', () => {
    const cube = buildGeometry('{4,3,3,3}');
    expect(cube.vertices.length).toBe(32);
    expect(cube.note).toMatch(/polytope/);
    const simplex = buildGeometry('{3,3,3,3}');
    expect(simplex.vertices.length).toBe(6);
    const honey = buildGeometry('{5,3,3,3}', { range: 1 });
    expect(honey.vertices.length).toBeGreaterThan(20);
    expect(honey.note).toMatch(/hyperbolic honeycomb/);
    for (const sym of ['{5/2,5,3,3}', '{3,3,5,5/2}', '{5,5/2,5,3}', '{3,5,5/2,5}']) {
      const star = buildGeometry(sym, { range: 1 });
      expect(star.note).toMatch(/hyperbolic honeycomb/);
      expect(star.vertices.length).toBeGreaterThan(20);
      expect(star.edges.length).toBeGreaterThan(20);
      expect(star.faces.length).toBeGreaterThan(0);
      expect(star.vertices.every((v) => Math.hypot(...v) < 1)).toBe(true);
    }
  }, 60000);
  it('merged hull faces form a closed oriented manifold', () => {
    for (const s of ['{4,3}', 't{4,3}', 'tt{4,3}', '{3,5}']) {
      const g = buildGeometry(s);
      const use = new Map<string, number>();
      for (const f of g.faces) {
        expect(f.length).toBe(3);
        for (let k = 0; k < 3; k++) {
          const a = Math.min(f[k], f[(k + 1) % 3]);
          const b = Math.max(f[k], f[(k + 1) % 3]);
          const key = `${a}-${b}`;
          use.set(key, (use.get(key) ?? 0) + 1);
        }
      }
      for (const n of use.values()) expect(n).toBe(2);
      const center = [0, 1, 2].map((d) => g.vertices.reduce((t, v) => t + v[d], 0) / g.vertices.length);
      for (const f of g.faces) {
        const [p, q, r] = f.map((i) => g.vertices[i]);
        const n = [
          (q[1] - p[1]) * (r[2] - p[2]) - (q[2] - p[2]) * (r[1] - p[1]),
          (q[2] - p[2]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[2] - p[2]),
          (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]),
        ];
        const fc = [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3, (p[2] + q[2] + r[2]) / 3];
        const out = [fc[0] - center[0], fc[1] - center[1], fc[2] - center[2]];
        expect(n[0] * out[0] + n[1] * out[1] + n[2] * out[2]).toBeGreaterThan(0);
      }
    }
  });
  it('concave star polygon renders filled pentagram faces', () => {
    const g = buildGeometry('{5/2}');
    expect(g.vertices.length).toBe(10);
    expect(g.edges.length).toBe(5);
    expect(g.faces.length).toBe(8);
    const signed = (f: number[]): number => {
      const [p, q, r] = f.map((i) => g.vertices[i]);
      return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    };
    for (const f of g.faces) {
      expect(f.length).toBe(3);
      expect(signed(f)).toBeGreaterThan(1e-12);
    }
    expect(buildGeometry('{5}').faces.length).toBe(3);
    expect(buildGeometry('{7/2}').faces.length).toBe(12);
  });
});
