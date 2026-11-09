import { describe, it, expect } from 'vitest';
import { parseSchlafli } from '../src/schlafli/parser';

describe('schlafli parser', () => {
  it('parses cube {4,3}', () => {
    expect(parseSchlafli('{4,3}')).toEqual({ ops: [], base: [4, 3], products: [] });
  });
  it('parses truncated t{4,3}', () => {
    expect(parseSchlafli('t{4,3}').ops).toEqual(['t']);
  });
  it('parses star {5/2}', () => {
    const r = parseSchlafli('{5/2}');
    expect(r.base[0]).toEqual({ n: 5, d: 2 });
  });
  it('parses prism product {4}x{}', () => {
    expect(parseSchlafli('{4}x{}').products[0].kind).toBe('prism');
  });
  it('parses tegum sum {3}+{4}', () => {
    expect(parseSchlafli('{3}+{4}').products[0].kind).toBe('tegum');
  });
  it('parses pyramid join {4,3}v()', () => {
    expect(parseSchlafli('{4,3}v()').products[0].kind).toBe('join');
  });
  it('parses point ()', () => {
    expect(parseSchlafli('()')).toEqual({ ops: [], base: [], products: [], point: true });
  });
  it('rejects invalid', () => {
    expect(() => parseSchlafli('{,3}')).toThrow();
  });
});
