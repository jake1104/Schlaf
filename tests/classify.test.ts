import { describe, it, expect } from 'vitest';
import { classify } from '../src/space/curvature';

describe('gram classification', () => {
  it('labels platonic solids finite', () => {
    for (const s of [[3, 3], [4, 3], [3, 4], [5, 3], [3, 5]]) {
      expect(classify(s).kind).toBe('finite');
    }
  });
  it('labels euclidean plane tilings', () => {
    for (const s of [[4, 4], [3, 6], [6, 3]]) {
      expect(classify(s).kind).toBe('euclidean');
    }
  });
  it('labels hyperbolic plane tilings', () => {
    for (const s of [[4, 5], [3, 7], [5, 4], [3, 8]]) {
      expect(classify(s).kind).toBe('hyperbolic');
    }
  });
  it('labels rank-4 honeycombs', () => {
    expect(classify([4, 3, 3]).kind).toBe('finite');
    expect(classify([4, 3, 4]).kind).toBe('euclidean');
    expect(classify([4, 3, 5]).kind).toBe('hyperbolic');
    expect(classify([3, 5, 3]).kind).toBe('hyperbolic');
    expect(classify([5, 3, 3]).kind).toBe('finite');
  });
  it('leaves stars and decimals to the legacy path', () => {
    expect(classify([{ n: 5, d: 2 }, 5]).kind).toBe('other');
    expect(classify([4.5]).kind).toBe('other');
  });
  it('explains rank-3 with the (p-2)(q-2) rule', () => {
    expect(classify([4, 5]).detail).toContain('6');
  });
});
