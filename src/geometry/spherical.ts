import type { SchlafliNum } from '../schlafli/parser';

export interface SphericalPatch {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
  kind: 'dihedron' | 'hosohedron';
}

const MERIDIAN_SEGMENTS = 12;
const LOOP_SEGMENTS = 24;
const CAP_RINGS = 4;

export function validateExists(base: SchlafliNum[], key: string): void {
  const fail = (): never => {
    throw new Error(`존재하지 않는 도형입니다: {${key}}`);
  };
  const nums: number[] = [];
  for (const b of base) {
    if (typeof b === 'number') {
      if (!(b > 0)) fail();
      nums.push(b);
    } else {
      if (!(b.n > 0) || !(b.d > 0)) fail();
    }
  }
  if (base.length === 2 && nums.length === 2) {
    const [p, q] = nums;
    if ((p === 1 || q === 1) && !((p === 2 && q === 1) || (p === 1 && q === 2))) fail();
  }
}

function orientOutward(verts: number[][], faces: number[][]): void {
  for (const f of faces) {
    if (f.length < 3) continue;
    const [a, b, c] = f.map((i) => verts[i]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) f.reverse();
  }
}

function sphereCap(verts: number[][], nLon: number, sign: number, equator: number[]): number[][] {
  const faces: number[][] = [];
  let inner = equator;
  const pole = verts.length;
  verts.push([0, 0, sign]);
  for (let j = 1; j < CAP_RINGS; j++) {
    const lat = sign * (Math.PI / 2) * (1 - j / CAP_RINGS);
    const ring: number[] = [];
    for (let k = 0; k < nLon; k++) {
      const lon = (k * 2 * Math.PI) / nLon;
      verts.push([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]);
      ring.push(verts.length - 1);
    }
    for (let k = 0; k < nLon; k++) {
      const k2 = (k + 1) % nLon;
      faces.push([inner[k], ring[k], ring[k2]]);
      faces.push([inner[k], ring[k2], inner[k2]]);
    }
    inner = ring;
  }
  for (let k = 0; k < nLon; k++) {
    const k2 = (k + 1) % nLon;
    faces.push([inner[k], pole, inner[k2]]);
  }
  return faces;
}

function dihedron(p: number): SphericalPatch {
  if (p < 2) {
    const n = LOOP_SEGMENTS;
    const verts: number[][] = [];
    for (let k = 0; k < n; k++) {
      const lon = (k * 2 * Math.PI) / n;
      verts.push([Math.cos(lon), Math.sin(lon), 0]);
    }
    const edges: [number, number][] = [];
    for (let k = 0; k < n; k++) edges.push([k, (k + 1) % n]);
    const faces: number[][] = [];
    for (let k = 1; k < n - 1; k++) {
      faces.push([0, k, k + 1]);
      faces.push([0, k + 1, k]);
    }
    orientOutward(verts, faces);
    return { verts, edges, faces, kind: 'dihedron' };
  }
  const n = Math.round(p);
  const verts: number[][] = [];
  for (let k = 0; k < n; k++) {
    const lon = (k * 2 * Math.PI) / n;
    verts.push([Math.cos(lon), Math.sin(lon), 0]);
  }
  const equator = Array.from({ length: n }, (_, k) => k);
  const edges: [number, number][] = [];
  for (let k = 0; k < n; k++) edges.push([k, (k + 1) % n]);
  const faces: number[][] = [...sphereCap(verts, n, 1, equator), ...sphereCap(verts, n, -1, equator)];
  orientOutward(verts, faces);
  return { verts, edges, faces, kind: 'dihedron' };
}

function arcChain(lon: number, m: number, top: number, bottom: number, verts: number[][]): number[] {
  const chain = [top];
  for (let i = 1; i < m; i++) {
    const lat = (i * Math.PI) / m;
    verts.push([Math.sin(lat) * Math.cos(lon), Math.sin(lat) * Math.sin(lon), Math.cos(lat)]);
    chain.push(verts.length - 1);
  }
  chain.push(bottom);
  return chain;
}

function luneStrip(a: number[], b: number[]): number[][] {
  const faces: number[][] = [];
  for (let i = 0; i < a.length - 1; i++) {
    const a0 = a[i];
    const a1 = a[i + 1];
    const b0 = b[i];
    const b1 = b[i + 1];
    if (a0 === b0) {
      faces.push([a0, a1, b1]);
    } else if (a1 === b1) {
      faces.push([a0, b0, b1]);
    } else {
      faces.push([a0, b0, b1]);
      faces.push([a0, b1, a1]);
    }
  }
  return faces;
}

function sphereGrid(nLat: number, nLon: number): { verts: number[][]; faces: number[][] } {
  const verts: number[][] = [[0, 0, 1], [0, 0, -1]];
  const grid: number[][] = [];
  for (let j = 1; j < nLat; j++) {
    const row: number[] = [];
    const lat = (j * Math.PI) / nLat;
    for (let k = 0; k < nLon; k++) {
      const lon = (k * 2 * Math.PI) / nLon;
      verts.push([Math.sin(lat) * Math.cos(lon), Math.sin(lat) * Math.sin(lon), Math.cos(lat)]);
      row.push(verts.length - 1);
    }
    grid.push(row);
  }
  const faces: number[][] = [];
  for (let k = 0; k < nLon; k++) {
    faces.push([0, grid[0][k], grid[0][(k + 1) % nLon]]);
    const last = grid.length - 1;
    faces.push([1, grid[last][(k + 1) % nLon], grid[last][k]]);
  }
  for (let j = 0; j < grid.length - 1; j++) {
    for (let k = 0; k < nLon; k++) {
      const k2 = (k + 1) % nLon;
      faces.push([grid[j][k], grid[j + 1][k], grid[j + 1][k2]]);
      faces.push([grid[j][k], grid[j + 1][k2], grid[j][k2]]);
    }
  }
  orientOutward(verts, faces);
  return { verts, faces };
}

function hosohedron(q: number): SphericalPatch {
  const m = MERIDIAN_SEGMENTS;
  const qq = Math.max(1, Math.round(q));
  if (qq === 1) {
    const verts: number[][] = [[0, 0, 1], [0, 0, -1]];
    const chain = arcChain(0, m, 0, 1, verts);
    const edges: [number, number][] = [];
    for (let i = 0; i < chain.length - 1; i++) edges.push([chain[i], chain[i + 1]]);
    const grid = sphereGrid(8, 16);
    const off = verts.length;
    for (const v of grid.verts.slice(2)) verts.push(v);
    const faces: number[][] = grid.faces.map((f) => f.map((id) => (id < 2 ? id : id - 2 + off)));
    orientOutward(verts, faces);
    return { verts, edges, faces, kind: 'hosohedron' };
  }
  const verts: number[][] = [[0, 0, 1], [0, 0, -1]];
  const top = 0;
  const bottom = 1;
  const chains: number[][] = [];
  for (let j = 0; j < qq; j++) chains.push(arcChain((j * 2 * Math.PI) / qq, m, top, bottom, verts));
  const edges: [number, number][] = [];
  for (const chain of chains) for (let i = 0; i < chain.length - 1; i++) edges.push([chain[i], chain[i + 1]]);
  const faces: number[][] = [];
  const pairs: Array<[number[], number[]]> = chains.map((c, j) => [c, chains[(j + 1) % chains.length]] as [number[], number[]]);
  for (const [a, b] of pairs) {
    for (const f of luneStrip(a, b)) faces.push(f);
  }
  orientOutward(verts, faces);
  return { verts, edges, faces, kind: 'hosohedron' };
}

export function sphericalPatch(base: SchlafliNum[]): SphericalPatch | null {
  if (base.length !== 2) return null;
  const [pb, qb] = base;
  if (typeof pb !== 'number' || typeof qb !== 'number') return null;
  if (!Number.isInteger(pb) || !Number.isInteger(qb)) return null;
  if (pb === 2 && qb >= 1) return hosohedron(qb);
  if (qb === 2 && pb >= 1) return dihedron(pb);
  return null;
}
