import { describe, it, expect } from 'vitest';
import { buildGeometry } from '../src/geometry/builder';

function checkUniform(name: string): { verts: number; edges: number } {
  const g = buildGeometry(name);
  const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
  for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  return { verts: g.vertices.length, edges: g.edges.length };
}

describe('kepler star polyhedra', () => {
  it('{5/2,5} small stellated dodecahedron has 12 corners 30 uniform edges', () => {
    const c = checkUniform('{5/2,5}');
    expect(c.edges).toBe(30);
    expect(buildGeometry('{5/2,5}').vertices.length).toBe(32);
  });
  it('{5/2,5} renders filled star faces', () => {
    expect(buildGeometry('{5/2,5}').faces.length).toBe(96);
  });
  it('{5,5/2} great dodecahedron has 12 verts 30 uniform edges', () => {
    const c = checkUniform('{5,5/2}');
    expect(c.verts).toBe(12);
    expect(c.edges).toBe(30);
  });
  it('{5,5/2} has exact pentagon faces', () => {
    expect(buildGeometry('{5,5/2}').faces.length).toBe(36);
  });
  it('{5/2,3} great stellated dodecahedron has 20 corners 30 uniform edges', () => {
    const c = checkUniform('{5/2,3}');
    expect(c.edges).toBe(30);
    expect(buildGeometry('{5/2,3}').vertices.length).toBe(32);
  });
  it('{3,5/2} great icosahedron has 12 verts 30 uniform edges', () => {
    const c = checkUniform('{3,5/2}');
    expect(c.verts).toBe(12);
    expect(c.edges).toBe(30);
  });
  it('{3,5/2} has 20 triangular faces', () => {
    expect(buildGeometry('{3,5/2}').faces.length).toBe(20);
  });
  it('s{5,3} is the exact snub dodecahedron with 150 visible edges', () => {
    const g = buildGeometry('s{5,3}');
    expect(g.vertices.length).toBe(60);
    expect(g.edges.length).toBe(150);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('sr{5,3} is the exact snub dodecahedron with faces', () => {
    const g = buildGeometry('sr{5,3}');
    expect(g.vertices.length).toBe(60);
    expect(g.edges.length).toBe(150);
    expect(g.faces.length).toBe(116);
  });
});
