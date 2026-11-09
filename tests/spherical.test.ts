import { describe, it, expect } from 'vitest';
import { buildGeometry } from '../src/geometry/builder';

function onSphere(g: { vertices: number[][] }): boolean {
  return g.vertices.every((v) => Math.abs(Math.hypot(...v) - 1) < 1e-9);
}
function uniform(g: { vertices: number[][]; edges: [number, number][] }): boolean {
  const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
  return lens.every((l) => Math.abs(l - lens[0]) < 1e-9);
}
function nonDegenerate(g: { vertices: number[][]; faces: number[][] }): boolean {
  return g.faces.every((f) => {
    if (f.length !== 3 || !f.every((v) => v >= 0 && v < g.vertices.length)) return false;
    const [p, q, r] = f.map((i) => g.vertices[i]);
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
    const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
    return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 1e-12;
  });
}
function edgeUse(g: { edges: [number, number][]; faces: number[][] }): Map<string, number> {
  const use = new Map<string, number>();
  for (const f of g.faces) {
    for (let k = 0; k < f.length; k++) {
      const a = Math.min(f[k], f[(k + 1) % f.length]);
      const b = Math.max(f[k], f[(k + 1) % f.length]);
      const key = `${a}-${b}`;
      use.set(key, (use.get(key) ?? 0) + 1);
    }
  }
  return use;
}
function outward(g: { vertices: number[][]; faces: number[][] }): boolean {
  return g.faces.every((f) => {
    const [a, b, c] = f.map((i) => g.vertices[i]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    return n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] > 0;
  });
}

describe('spherical tilings', () => {
  it('{2,5} hosohedron has 2 poles, 5 meridian lunes, manifold strip faces', () => {
    const g = buildGeometry('{2,5}');
    expect(g.vertices.length).toBe(57);
    expect(g.edges.length).toBe(60);
    expect(g.faces.length).toBe(110);
    expect(onSphere(g)).toBe(true);
    expect(uniform(g)).toBe(true);
    expect(nonDegenerate(g)).toBe(true);
    expect(outward(g)).toBe(true);
    for (const n of edgeUse(g).values()) expect(n).toBe(2);
    expect(g.note).toMatch(/spherical/);
  });
  it('{5,2} dihedron is two hemispherical pentagon caps', () => {
    const g = buildGeometry('{5,2}');
    expect(g.vertices.length).toBe(37);
    expect(g.edges.length).toBe(5);
    expect(g.faces.length).toBe(70);
    expect(onSphere(g)).toBe(true);
    expect(uniform(g)).toBe(true);
    expect(nonDegenerate(g)).toBe(true);
    expect(outward(g)).toBe(true);
    const use = edgeUse(g);
    for (const [a, b] of g.edges) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      expect(use.get(key)).toBe(2);
    }
    expect(g.note).toMatch(/spherical/);
  });
  it('{2,1} single-lune hosohedron renders sphere plus meridian', () => {
    const g = buildGeometry('{2,1}');
    expect(g.vertices.length).toBe(125);
    expect(g.edges.length).toBe(12);
    expect(g.faces.length).toBe(224);
    expect(onSphere(g)).toBe(true);
    expect(nonDegenerate(g)).toBe(true);
    expect(outward(g)).toBe(true);
  });
  it('{1,2} monogon dihedron renders a loop with two disk faces', () => {
    const g = buildGeometry('{1,2}');
    expect(g.vertices.length).toBe(24);
    expect(g.edges.length).toBe(24);
    expect(g.faces.length).toBe(44);
    expect(onSphere(g)).toBe(true);
    expect(nonDegenerate(g)).toBe(true);
  });
});

describe('nonexistent symbols', () => {
  it.each(['{1,3}', '{3,1}', '{1,1}', '{4,0}', '{5/0}', '{0,3}'])('%s does not exist', (s) => {
    expect(() => buildGeometry(s)).toThrow(/존재하지 않/);
  });
});
