import { describe, it, expect } from 'vitest';
import { buildGeometry } from '../src/geometry/builder';

function edgeLengths(g: { vertices: number[][]; edges: [number, number][] }): number[] {
  return g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
}
function expectUniform(name: string) {
  const g = buildGeometry(name);
  const lens = edgeLengths(g);
  for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
}

describe('uniform truncation', () => {
  it('t{4,3} has all equal edge lengths', () => {
    expectUniform('t{4,3}');
  });
  it('t{3,3} has all equal edge lengths', () => {
    expectUniform('t{3,3}');
  });
  it('t{3,4} has all equal edge lengths', () => {
    expectUniform('t{3,4}');
  });
  it('t{4,3} keeps 24 verts 36 edges', () => {
    const g = buildGeometry('t{4,3}');
    expect(g.vertices.length).toBe(24);
    expect(g.edges.length).toBe(36);
  });
});
