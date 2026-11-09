import { describe, it, expect } from 'vitest';
import { createOrbit, applyDrag } from '../src/render/orbit';
import { buildGeometry } from '../src/geometry/builder';

describe('mouse 3d orbit', () => {
  it('drag changes yaw/pitch', () => {
    const o = createOrbit();
    const o2 = applyDrag(o, 100, 50);
    expect(o2.yaw).not.toBe(o.yaw);
    expect(o2.pitch).not.toBe(o.pitch);
  });
});

describe('concave star edges', () => {
  it('{5/2} connects pentagram steps of 2', () => {
    const g = buildGeometry('{5/2}');
    expect(g.vertices.length).toBe(10);
    // pentagram: each corner connects to i+2 and i-2, never to i+1
    const set = new Set(g.edges.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
    expect(set.has('0-1')).toBe(false);
    expect(set.has('0-2')).toBe(true);
    for (const [a, b] of g.edges) {
      expect(a).toBeLessThan(5);
      expect(b).toBeLessThan(5);
    }
  });
});

describe('uniform operators vertex counts', () => {
  it('t{4,3} = 24 (2 per edge)', () => {
    expect(buildGeometry('t{4,3}').vertices.length).toBe(24);
  });
  it('r{4,3} = 12 (cuboctahedron)', () => {
    expect(buildGeometry('r{4,3}').vertices.length).toBe(12);
  });
  it('s{4,3} = 24 (snub)', () => {
    expect(buildGeometry('s{4,3}').vertices.length).toBe(24);
  });
});
