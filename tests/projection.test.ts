import { describe, it, expect } from 'vitest';
import { toHyperboloid } from '../src/project/projection';

describe('hyperboloid lift', () => {
  it('maps the origin to the hyperboloid vertex', () => {
    const out = toHyperboloid([[0, 0]])!;
    expect(out[0][0]).toBeCloseTo(0, 12);
    expect(out[0][1]).toBeCloseTo(0, 12);
    expect(out[0][2]).toBeCloseTo(1, 12);
  });
  it('lands on the hyperboloid sheet', () => {
    const out = toHyperboloid([[0.5, 0], [-0.2, 0.3], [0.1, -0.4]])!;
    for (const [x, y, z] of out) expect(x * x + y * y - z * z).toBeCloseTo(-1, 9);
  });
  it('rejects non-disk input', () => {
    expect(toHyperboloid([[2, 0]])).toBeNull();
    expect(toHyperboloid([[0, 0, 0]])).toBeNull();
    expect(toHyperboloid([[1, 0]])).toBeNull();
  });
});
