import { describe, it, expect } from 'vitest';
import { wythoffHyperbolic, geodesicPoints, buildHyperbolicTiling } from '../src/geometry/wythoff';

function coshAll(g: { verts: number[][]; edges: [number, number][] }): number[] {
  const sq = (v: number[]): number => v.reduce((s, x) => s + x * x, 0);
  return g.edges.map(([a, b]) => {
    const u = g.verts[a];
    const v = g.verts[b];
    const uu = 1 - sq(u);
    const vv = 1 - sq(v);
    const dd = u.reduce((s, x, k) => s + (x - v[k]) * (x - v[k]), 0);
    return 1 + (2 * dd) / (uu * vv);
  });
}
function checkUniform(g: { verts: number[][]; edges: [number, number][] }): void {
  const cs = coshAll(g);
  for (const c of cs) expect(Math.abs(c - cs[0]) / cs[0]).toBeLessThan(1e-6);
}
function checkInside(g: { verts: number[][] }): void {
  for (const v of g.verts) expect(Math.hypot(...v)).toBeLessThan(1);
}

describe('hyperbolic wythoff tilings', () => {
  it('{4,5} poincare disk patch', () => {
    const g = wythoffHyperbolic([4, 5], { maxDepth: 12 })!;
    expect(g.verts.length).toBe(74);
    expect(g.edges.length).toBe(110);
    expect(g.verts[0].length).toBe(2);
    checkInside(g);
    checkUniform(g);
  });
  it('{3,7} poincare disk patch', () => {
    const g = wythoffHyperbolic([3, 7], { maxDepth: 10 })!;
    expect(g.verts.length).toBe(22);
    expect(g.edges.length).toBe(45);
    checkInside(g);
    checkUniform(g);
  });
  it('{4,3,5} poincare ball honeycomb', () => {
    const g = wythoffHyperbolic([4, 3, 5], { maxDepth: 10 })!;
    expect(g.verts.length).toBe(57);
    expect(g.edges.length).toBe(99);
    expect(g.verts[0].length).toBe(3);
    checkInside(g);
    checkUniform(g);
  });
  it('{3,5,3} poincare ball honeycomb', () => {
    const g = wythoffHyperbolic([3, 5, 3], { maxDepth: 10 })!;
    expect(g.verts.length).toBe(49);
    expect(g.edges.length).toBe(124);
    checkInside(g);
    checkUniform(g);
  });
  it('rejects non-hyperbolic input', () => {
    expect(wythoffHyperbolic([4, 3])).toBeNull();
    expect(wythoffHyperbolic([3, 4, 3])).toBeNull();
    expect(wythoffHyperbolic([4.5])).toBeNull();
  });
});

describe('hyperbolic geodesics', () => {
  it('interpolates diameters as straight segments', () => {
    const pts = geodesicPoints([0.1, 0.05], [-0.2, -0.1], 4);
    expect(pts.length).toBe(5);
    expect(pts[0]).toEqual([0.1, 0.05]);
    expect(pts[4]).toEqual([-0.2, -0.1]);
    for (let i = 1; i < pts.length; i++) {
      const t = i / 4;
      expect(Math.abs(pts[i][0] - (0.1 + (-0.3) * t))).toBeLessThan(1e-12);
    }
  });
  it('bulges off-chord arcs away from the chord midpoint', () => {
    const a = [0.3, 0.1];
    const b = [-0.1, 0.35];
    const pts = geodesicPoints(a, b, 8);
    expect(pts.length).toBe(9);
    expect(pts[0]).toEqual(a);
    expect(pts[8]).toEqual(b);
    for (const p of pts) expect(Math.hypot(...p)).toBeLessThan(1);
    const mid = pts[4];
    const chord = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    expect(Math.hypot(...mid)).toBeLessThan(Math.hypot(...chord) - 1e-9);
  });
  it('arc points lie on a circle orthogonal to the unit circle', () => {
    const a = [0.3, 0.1];
    const b = [-0.1, 0.35];
    const pts = geodesicPoints(a, b, 8);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const nl = Math.hypot(nx, ny);
    nx /= nl;
    ny /= nl;
    const t = (1 - (mx * mx + my * my) + ((mx - a[0]) * (mx - a[0]) + (my - a[1]) * (my - a[1]))) / (2 * (nx * a[0] + ny * a[1]));
    const cc = [mx + t * nx, my + t * ny];
    const r = Math.hypot(a[0] - cc[0], a[1] - cc[1]);
    for (const p of pts) expect(Math.abs(Math.hypot(p[0] - cc[0], p[1] - cc[1]) - r)).toBeLessThan(1e-9);
    expect(Math.abs(cc[0] * cc[0] + cc[1] * cc[1] - 1 - r * r)).toBeLessThan(1e-9);
  });
});

describe('hyperbolic tilings with faces', () => {
  it('{4,5} patch has 21 quad cells and 336 face triangles', () => {
    const g = buildHyperbolicTiling([4, 5], { maxDepth: 10, subdiv: 4 })!;
    expect(g.cells).toBe(21);
    expect(g.faces.length).toBe(336);
    expect(g.verts.length).toBe(257);
    expect(g.edges.length).toBe(256);
    for (const v of g.verts) expect(Math.hypot(...v)).toBeLessThan(1);
    for (const f of g.faces) {
      expect(new Set(f).size).toBe(3);
      const [p, q, r] = f.map((i) => g.verts[i]);
      const area = Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / 2;
      expect(area).toBeGreaterThan(0);
    }
  });
  it('{3,7} patch has 24 triangular cells', () => {
    const g = buildHyperbolicTiling([3, 7], { maxDepth: 10, subdiv: 4 })!;
    expect(g.cells).toBe(24);
    expect(g.faces.length).toBe(288);
  });
});
