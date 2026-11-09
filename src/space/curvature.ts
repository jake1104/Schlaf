// Curvature handling: finite polytopes are curvature-independent.
// Only infinite honeycombs differ: Euclidean = flat cutoff box,
// spherical = normalized to S^n + stereographic, hyperbolic = Poincare ball.
import type { SchlafliNum } from '../schlafli/parser';
export type Space = 'E' | 'S' | 'H';
export type GeoKind = 'finite' | 'euclidean' | 'hyperbolic' | 'other';
export interface Classification {
  kind: GeoKind;
  detail: string;
}
function detOf(m: number[][]): number {
  const n = m.length;
  const a = m.map((row) => [...row]);
  let det = 1;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    if (Math.abs(a[piv][c]) < 1e-12) return 0;
    if (piv !== c) { const t = a[piv]; a[piv] = a[c]; a[c] = t; det = -det; }
    det *= a[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < n; k++) a[r][k] -= f * a[c][k];
    }
  }
  return det;
}
export function classify(base: SchlafliNum[]): Classification {
  const ps: number[] = [];
  for (const b of base) {
    const v = typeof b === 'number' ? b : NaN;
    if (!Number.isInteger(v) || v < 2) return { kind: 'other', detail: 'non-integer entry' };
    ps.push(v);
  }
  const n = ps.length + 1;
  const g: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      if (Math.abs(i - j) === 1) {
        const p = ps[Math.min(i, j)];
        return -Math.cos(Math.PI / p);
      }
      return 0;
    }),
  );
  const minors: number[] = [];
  for (let k = 1; k <= n; k++) minors.push(detOf(g.slice(0, k).map((row) => row.slice(0, k))));
  const tol = 1e-9;
  let detail: string;
  if (ps.length === 2) {
    const v = (ps[0] - 2) * (ps[1] - 2);
    detail = `(p-2)(q-2)=${v} vs 4`;
  } else {
    detail = `gram-det=${minors[n - 1].toPrecision(4)}`;
  }
  if (minors.every((d) => d > tol)) return { kind: 'finite', detail };
  if (minors.slice(0, n - 1).every((d) => d > tol) && Math.abs(minors[n - 1]) <= tol) {
    return { kind: 'euclidean', detail };
  }
  return { kind: 'hyperbolic', detail };
}
const HYPERBOLIC_HONEYCOMBS = new Set(['4,3,5', '5,3,4', '3,5,3', '5,3,5', '4,3,3,5', '3,4,3,4']);
const SPHERICAL_HONEYCOMBS = new Set(['3,3,2', '4,3,2']);
export function detectSpace(key: string, explicit?: Space): { space: Space; infinite: boolean } {
  const isHoney = key.split(',').length >= 3 && key.split(',').every((x) => /^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.test(x.trim()))
    ? inferInfinite(key)
    : false;
  if (explicit) return { space: explicit, infinite: isHoney };
  const parts = key.split(',');
  if (parts.length === 2) {
    const core = parts.map((x) => Number(x.split('/')[0]));
    if (core.every((n) => n >= 2) && 1 / core[0] + 1 / core[1] > 1 / 2 + 1e-12) return { space: 'S', infinite: false };
  }
  if (FINITE_4D.has(key)) return { space: 'S', infinite: false };
  if (key.includes('/') && key.split(',').length >= 3) return { space: 'S', infinite: false };
  if (HYPERBOLIC_HONEYCOMBS.has(key)) return { space: 'H', infinite: true };
  return { space: isHoney ? 'E' : 'E', infinite: isHoney };
}
const FINITE_4D = new Set(['3,3,3', '4,3,3', '3,3,4', '3,4,3', '5,3,3', '3,3,5']);
function inferInfinite(key: string): boolean {
  // dimension >= 4 schlafli with 3+ entries beyond finite regular list => honeycomb
  const finite4 = new Set(['3,3,3', '4,3,3', '3,3,4', '3,4,3', '5,3,3', '3,3,5']);
  const parts = key.split(',');
  if (parts.length >= 4) return true;
  if (parts.length === 3) return !finite4.has(key) && !key.includes('/');
  return false;
}
export function toPoincareBall(verts: number[][]): number[][] {
  // confine to unit ball
  let m = 0;
  for (const v of verts) m = Math.max(m, Math.hypot(...v));
  if (m === 0) return verts;
  const s = 0.92 / m;
  return verts.map((v) => v.map((x) => x * s));
}
export function toSphere(verts: number[][]): number[][] {
  return verts.map((v) => {
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
  });
}
