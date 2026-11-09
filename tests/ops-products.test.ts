import { describe, it, expect } from 'vitest';
import { parseSchlafli } from '../src/schlafli/parser';
import { buildGeometry } from '../src/geometry/builder';

describe('stacked operators', () => {
  it('parses tr{4,3} as ops t then r', () => {
    expect(parseSchlafli('tr{4,3}').ops).toEqual(['t', 'r']);
  });
  it('parses tt{4,3} as double truncate', () => {
    expect(parseSchlafli('tt{4,3}').ops).toEqual(['t', 't']);
  });
  it('builds tr{4,3} to 48 verts', () => {
    expect(buildGeometry('tr{4,3}').vertices.length).toBe(48);
  });
  it('sequential t/r stacks exist as best-effort solids', () => {
    expect(buildGeometry('tt{4,3}').vertices.length).toBe(72);
    expect(buildGeometry('tt{4,3}').note).toMatch(/best-effort/);
  });
  it('stacks without a generic definition are rejected', () => {
    expect(() => buildGeometry('ts{4,3}')).toThrow(/not a Wythoff position/);
  });
});

describe('combined operator edges', () => {
  it('tt{4,3} keeps all 108 edges', () => {
    const g = buildGeometry('tt{4,3}');
    expect(g.vertices.length).toBe(72);
    expect(g.edges.length).toBe(108);
  });
  it('rt{4,3} keeps all 72 edges over 36 verts', () => {
    const g = buildGeometry('rt{4,3}');
    expect(g.vertices.length).toBe(36);
    expect(g.edges.length).toBe(72);
  });
  it('tr{4,3} keeps all 72 edges over 48 verts', () => {
    const g = buildGeometry('tr{4,3}');
    expect(g.vertices.length).toBe(48);
    expect(g.edges.length).toBe(72);
  });
});

describe('exact uniform operator solids', () => {
  it('tr{4,3} is the great rhombicuboctahedron with uniform edges', () => {
    const g = buildGeometry('tr{4,3}');
    expect(g.vertices.length).toBe(48);
    expect(g.edges.length).toBe(72);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('sr{4,3} is the snub cube with 60 visible edges', () => {
    const g = buildGeometry('sr{4,3}');
    expect(g.vertices.length).toBe(24);
    expect(g.edges.length).toBe(60);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('rr{4,3} is the small rhombicuboctahedron', () => {
    const g = buildGeometry('rr{4,3}');
    expect(g.vertices.length).toBe(24);
    expect(g.edges.length).toBe(48);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('tr{3,3} is the truncated octahedron', () => {
    const g = buildGeometry('tr{3,3}');
    expect(g.vertices.length).toBe(24);
    expect(g.edges.length).toBe(36);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('rr{3,3} is the cuboctahedron', () => {
    const g = buildGeometry('rr{3,3}');
    expect(g.vertices.length).toBe(12);
    expect(g.edges.length).toBe(24);
  });
  it('s{4,3} is the exact snub cube', () => {
    const g = buildGeometry('s{4,3}');
    expect(g.vertices.length).toBe(24);
    expect(g.edges.length).toBe(60);
  });
  it('s{3,3} is the icosahedron', () => {
    const g = buildGeometry('s{3,3}');
    expect(g.vertices.length).toBe(12);
    expect(g.edges.length).toBe(30);
  });
});

describe('product geometry', () => {
  it('prism {4}x{} is a cube with 12 edges', () => {
    const g = buildGeometry('{4}x{}');
    expect(g.vertices.length).toBe(8);
    expect(g.edges.length).toBe(12);
  });
  it('tegum {3}+{4} has 7 verts 19 edges', () => {
    const g = buildGeometry('{3}+{4}');
    expect(g.vertices.length).toBe(7);
    expect(g.edges.length).toBe(19);
  });
  it('join {4,3}v() is a pyramid over a cube', () => {
    const g = buildGeometry('{4,3}v()');
    expect(g.vertices.length).toBe(9);
    expect(g.dim).toBe(4);
    expect(g.edges.length).toBe(20);
  });
  it('join {4,3}v{3,3} combines both factors', () => {
    const g = buildGeometry('{4,3}v{3,3}');
    expect(g.vertices.length).toBe(12);
    expect(g.dim).toBe(7);
  });
  it('operated prism t{4,3}x{} has 48 verts 96 edges', () => {
    const g = buildGeometry('t{4,3}x{}');
    expect(g.vertices.length).toBe(48);
    expect(g.edges.length).toBe(96);
  });
  it('{}x{} is a square with 4 edges', () => {
    const g = buildGeometry('{}x{}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(4);
    expect(g.dim).toBe(2);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('{}x{} has 2 face triangles', () => {
    expect(buildGeometry('{}x{}').faces.length).toBe(2);
  });
  it('{}x{4,3} is a cubic prism with 16 verts 32 edges', () => {
    const g = buildGeometry('{}x{4,3}');
    expect(g.vertices.length).toBe(16);
    expect(g.edges.length).toBe(32);
  });
  it('{2} is a segment with 2 verts 1 edge', () => {
    const g = buildGeometry('{2}');
    expect(g.vertices.length).toBe(2);
    expect(g.edges.length).toBe(1);
  });
  it('{2}x{2} is a square', () => {
    const g = buildGeometry('{2}x{2}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(4);
  });
  it('{}+{} is a diamond with 4 verts 4 edges', () => {
    const g = buildGeometry('{}+{}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(4);
    expect(g.dim).toBe(2);
    const lens = g.edges.map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])));
    for (const l of lens) expect(Math.abs(l - lens[0])).toBeLessThan(1e-6);
  });
  it('{}+{} has 2 face triangles', () => {
    expect(buildGeometry('{}+{}').faces.length).toBe(2);
  });
  it('{2}+{2} is a diamond', () => {
    const g = buildGeometry('{2}+{2}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(4);
  });
  it('{3}+{2} is a triangular bipyramid with 5 verts 9 edges', () => {
    const g = buildGeometry('{3}+{2}');
    expect(g.vertices.length).toBe(5);
    expect(g.edges.length).toBe(9);
  });
  it('{4}+{} is an octahedron with 6 verts 12 edges', () => {
    const g = buildGeometry('{4}+{}');
    expect(g.vertices.length).toBe(6);
    expect(g.edges.length).toBe(12);
  });
  it('{}v{} is a disphenoid with 4 verts 6 edges', () => {
    const g = buildGeometry('{}v{}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(6);
    expect(g.dim).toBe(3);
    expect(g.faces.length).toBe(4);
  });
  it('{}v() is an isosceles triangle', () => {
    const g = buildGeometry('{}v()');
    expect(g.vertices.length).toBe(3);
    expect(g.edges.length).toBe(3);
    expect(g.dim).toBe(2);
    const lens = g.edges
      .map(([a, b]) => Math.hypot(...g.vertices[a].map((x, k) => x - g.vertices[b][k])))
      .sort((x, y) => x - y);
    expect(Math.abs(lens[0] - lens[1])).toBeLessThan(1e-9);
    expect(lens[2]).toBeGreaterThan(lens[0]);
    expect(g.faces.length).toBe(1);
  });
  it('{2}v() and ()v{2} are triangles', () => {
    for (const s of ['{2}v()', '()v{2}']) {
      const g = buildGeometry(s);
      expect(g.vertices.length).toBe(3);
      expect(g.edges.length).toBe(3);
    }
  });
  it('{2}v{2} is a disphenoid', () => {
    const g = buildGeometry('{2}v{2}');
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(6);
  });
  it('{4,3}v() is a pyramid over a cube', () => {
    const g = buildGeometry('{4,3}v()');
    expect(g.vertices.length).toBe(9);
    expect(g.edges.length).toBe(20);
    expect(g.dim).toBe(4);
  });
  it('{}v{}v{} joins disphenoid with segment: 6 verts 15 edges', () => {
    const g = buildGeometry('{}v{}v{}');
    expect(g.vertices.length).toBe(6);
    expect(g.edges.length).toBe(15);
    expect(g.dim).toBe(5);
  });
  it('{4}x{}x{} is a tesseract', () => {
    const g = buildGeometry('{4}x{}x{}');
    expect(g.vertices.length).toBe(16);
    expect(g.edges.length).toBe(32);
  });
  it('{5/2}v() is a pentagram pyramid', () => {
    const g = buildGeometry('{5/2}v()');
    expect(g.vertices.length).toBe(6);
    expect(g.edges.length).toBe(10);
  });
  it('t{}x{4} builds a cube without crashing', () => {
    const g = buildGeometry('t{}x{4}');
    expect(g.vertices.length).toBe(8);
    expect(g.edges.length).toBe(12);
  });
});
