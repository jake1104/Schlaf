import { describe, it, expect } from 'vitest';
import { regularVertices, starPolygon } from '../src/geometry/regular';
import { prismProduct, tegumProduct, pyramidJoin } from '../src/geometry/products';
import { buildGeometry } from '../src/geometry/builder';
import { projectND } from '../src/project/projection';

describe('regular', () => {
  it('cube 3d has 8 verts', () => { expect(regularVertices('cube', 3).length).toBe(8); });
  it('simplex 3d has 4 verts', () => { expect(regularVertices('simplex', 3).length).toBe(4); });
  it('star {5/2} has 5 verts', () => { expect(starPolygon(5, 2).length).toBe(5); });
});
describe('products', () => {
  it('square x point = cube (8 verts)', () => {
    const sq = regularVertices('cube', 2);
    expect(prismProduct(sq, [[]]).length).toBe(8);
  });
  it('tegum doubles + apexes', () => {
    expect(tegumProduct([[1], [-1]], [[1], [-1]]).length).toBe(4);
  });
  it('pyramid adds apex and lifts dim', () => {
    expect(pyramidJoin([[0], [1]])[0].length).toBe(2);
  });
});
describe('operators', () => {
  it('t{4,3} grows verts over the cube', () => {
    expect(buildGeometry('t{4,3}').vertices.length).toBeGreaterThan(buildGeometry('{4,3}').vertices.length);
  });
});
describe('projection', () => {
  it('perspective enlarges closer w', () => {
    const a = projectND([[2, 0, 0, 2]], 'perspective');
    const b = projectND([[2, 0, 0, 0]], 'perspective');
    expect(Math.abs(a[0][0])).toBeGreaterThan(Math.abs(b[0][0]));
  });
  it('stereographic projects without div0', () => {
    expect(projectND([[0, 0, 0, 0]], 'stereographic').length).toBe(1);
  });
});
