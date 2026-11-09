import { describe, it, expect } from 'vitest';
import { euclidPatch } from '../src/geometry/euclid';

function planar(g: { verts: number[][] }): boolean {
  return g.verts.every((v) => Math.abs((v[2] ?? 0)) < 1e-9);
}
function uniform(g: { verts: number[][]; edges: [number, number][] }): boolean {
  const lens = g.edges.map(([a, b]) => Math.hypot(...g.verts[a].map((x, k) => x - g.verts[b][k])));
  return lens.every((l) => Math.abs(l - lens[0]) < 1e-9);
}
function eulerPoly(verts: number, edges: number, polys: number): number {
  return verts - edges + polys;
}

describe('euclidean tilings', () => {
  it('{4,4} square tiling patch', () => {
    const g = euclidPatch('4,4')!;
    expect(g.verts.length).toBe(49);
    expect(g.edges.length).toBe(84);
    expect(g.faces.length).toBe(72);
    expect(planar(g)).toBe(true);
    expect(uniform(g)).toBe(true);
    expect(eulerPoly(g.verts.length, g.edges.length, g.faces.length / 2)).toBe(1);
  });
  it('{3,6} triangular tiling patch', () => {
    const g = euclidPatch('3,6')!;
    expect(g.verts.length).toBe(37);
    expect(g.edges.length).toBe(90);
    expect(g.faces.length).toBe(54);
    expect(planar(g)).toBe(true);
    expect(uniform(g)).toBe(true);
    expect(eulerPoly(g.verts.length, g.edges.length, g.faces.length)).toBe(1);
  });
  it('{6,3} hexagonal tiling patch is a topological disk', () => {
    const g = euclidPatch('6,3')!;
    expect(planar(g)).toBe(true);
    expect(uniform(g)).toBe(true);
    expect(eulerPoly(g.verts.length, g.edges.length, g.faces.length / 4)).toBe(1);
    expect(g.faces.length).toBe(76);
  });
  it('{4,3,4} cubic honeycomb patch is a closed surface', () => {
    const g = euclidPatch('4,3,4')!;
    expect(g.verts.length).toBe(56);
    expect(g.edges.length).toBe(108);
    expect(g.faces.length).toBe(108);
    expect(uniform(g)).toBe(true);
    expect(g.verts.length - g.edges.length + g.faces.length / 2).toBe(2);
  });
});
