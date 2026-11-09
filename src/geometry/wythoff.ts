export interface WythoffResult {
  verts: number[][];
  edges: [number, number][];
  klein: number[][];
  capped: boolean;
}

export interface WythoffOptions {
  maxVerts?: number;
  maxDepth?: number;
  ringed?: boolean[];
  snub?: boolean;
}

export interface HyperbolicTiling {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
  cells: number;
  capped: boolean;
}

export interface SphWythoff {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
}

function chol3(g: number[][]): number[][] | null {
  const l: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j <= i; j++) {
      let s = g[i][j];
      for (let k = 0; k < j; k++) s -= l[i][k] * l[j][k];
      if (i === j) {
        if (s <= 1e-12) return null;
        l[i][j] = Math.sqrt(s);
      } else {
        if (Math.abs(l[j][j]) < 1e-12) return null;
        l[i][j] = s / l[j][j];
      }
    }
  }
  return l;
}

function invert3(m: number[][]): number[][] | null {
  const a = m.map((r) => [...r]);
  const inv = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
    if (Math.abs(a[piv][c]) < 1e-12) return null;
    [a[c], a[piv]] = [a[piv], a[c]];
    [inv[c], inv[piv]] = [inv[piv], inv[c]];
    const d = a[c][c];
    for (let k = 0; k < 3; k++) { a[c][k] /= d; inv[c][k] /= d; }
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let k = 0; k < 3; k++) { a[r][k] -= f * a[c][k]; inv[r][k] -= f * inv[c][k]; }
    }
  }
  return inv;
}

const vdot3 = (a: number[], b: number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vsub3 = (a: number[], b: number[]): number[] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vcross3 = (a: number[], b: number[]): number[] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vnorm3 = (a: number[]): number[] => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

const sphCache = new Map<string, SphWythoff>();

export function wythoffSpherical(p: number, q: number, ringed: [boolean, boolean, boolean], snub = false): SphWythoff {
  if (!Number.isInteger(p) || !Number.isInteger(q) || p < 3 || q < 3) {
    throw new Error(`not a spherical triangle group: [${p},${q}]`);
  }
  if (1 / p + 1 / q <= 1 / 2 + 1e-12) throw new Error(`not a spherical triangle group: [${p},${q}]`);
  const g = [
    [1, -Math.cos(Math.PI / p), 0],
    [-Math.cos(Math.PI / p), 1, -Math.cos(Math.PI / q)],
    [0, -Math.cos(Math.PI / q), 1],
  ];
  const L = chol3(g);
  if (!L) throw new Error(`not a spherical triangle group: [${p},${q}]`);
  const roots = [L[0], L[1], L[2]];
  const Lt: number[][] = [[L[0][0], L[1][0], L[2][0]], [L[0][1], L[1][1], L[2][1]], [L[0][2], L[1][2], L[2][2]]];
  const dual = invert3(Lt);
  if (!dual) throw new Error(`not a spherical triangle group: [${p},${q}]`);
  const corners = [dual[0], dual[1], dual[2]].map(vnorm3);
  const refl = (v: number[], i: number): number[] => {
    const d = 2 * vdot3(v, roots[i]);
    return [v[0] - d * roots[i][0], v[1] - d * roots[i][1], v[2] - d * roots[i][2]];
  };
  const matApply = (M: number[][], v: number[]): number[] => [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
  const matMul = (A: number[][], B: number[][]): number[][] => [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0], A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1], A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0], A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1], A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2]],
    [A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0], A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1], A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2]],
  ];
  const matKey = (M: number[][]): string => M.flat().map((x) => Math.round(x * 1e9)).join(',');
  const matDist = (A: number[][], B: number[][]): number => {
    let s = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s += (A[i][j] - B[i][j]) * (A[i][j] - B[i][j]);
    return Math.sqrt(s);
  };
  const eye: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const mirMat = [0, 1, 2].map((i) => {
    const a = roots[i];
    return [
      [1 - 2 * a[0] * a[0], -2 * a[0] * a[1], -2 * a[0] * a[2]],
      [-2 * a[1] * a[0], 1 - 2 * a[1] * a[1], -2 * a[1] * a[2]],
      [-2 * a[2] * a[0], -2 * a[2] * a[1], 1 - 2 * a[2] * a[2]],
    ];
  });
  const groupMats = (): number[][][] => {
    const seen = new Set<string>([matKey(eye)]);
    const out: number[][][] = [eye];
    const queue: number[][][] = [eye];
    let head = 0;
    let guard = 0;
    while (head < queue.length && guard++ < 4000) {
      const M = queue[head++];
      for (let i = 0; i < 3; i++) {
        const W = matMul(mirMat[i], M);
        const kk = matKey(W);
        if (seen.has(kk)) continue;
        let dup = false;
        for (const U of out) if (matDist(U, W) < 1e-9) { dup = true; break; }
        if (dup) continue;
        seen.add(kk);
        out.push(W);
        queue.push(W);
      }
    }
    return out;
  };
  const key = (v: number[]): string => v.map((x) => Math.round(x * 1e9)).join(',');
  const cacheKey = `${p},${q},${ringed.map((b) => (b ? 1 : 0)).join('')},${snub ? 1 : 0}`;
  const hit = sphCache.get(cacheKey);
  if (hit) return hit;
  const groupOrder = 4 / (1 / p + 1 / q - 1 / 2);
  const edgeObj = (verts: number[][], eExp: number): number => {
    const ds: number[] = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const dx = verts[i][0] - verts[j][0];
        const dy = verts[i][1] - verts[j][1];
        const dz = verts[i][2] - verts[j][2];
        ds.push(dx * dx + dy * dy + dz * dz);
      }
    }
    ds.sort((a, b) => a - b);
    if (ds.length <= eExp || ds[0] < 1e-18) return Infinity;
    const s = (ds[eExp - 1] - ds[0]) / ds[0];
    const margin = (ds[eExp] - ds[eExp - 1]) / ds[0];
    return s + (margin < 1e-12 ? 1 : 0);
  };
  const ringIdx = [0, 1, 2].filter((i) => ringed[i]);
  const orbit = (start: number[], evenOnly: boolean): number[][] => {
    const seen = new Set<string>();
    const out: number[][] = [];
    const queue: Array<{ v: number[]; par: number }> = [{ v: start, par: 0 }];
    seen.add(key(start) + ':0');
    let head = 0;
    let guard = 0;
    const sq = (a: number[], b: number[]): number => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const dz = a[2] - b[2];
      return dx * dx + dy * dy + dz * dz;
    };
    while (head < queue.length && guard++ < 4000) {
      const { v, par } = queue[head++];
      if (!evenOnly || par === 0) {
        let dup = false;
        for (const w of out) {
          if (sq(w, v) < 1e-18) { dup = true; break; }
        }
        if (!dup) out.push([...v]);
      }
      for (let i = 0; i < 3; i++) {
        const w = refl(v, i);
        const kk = key(w) + ':' + ((par + 1) % 2);
        if (seen.has(kk)) continue;
        seen.add(kk);
        queue.push({ v: w, par: (par + 1) % 2 });
      }
    }
    return out;
  };
  const minDistEdges = (verts: number[][]): [number, number][] => {
    if (verts.length > 400 || verts.length < 2) return [];
    let minSq = Infinity;
    const d: number[][] = verts.map(() => []);
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const dx = verts[i][0] - verts[j][0];
        const dy = verts[i][1] - verts[j][1];
        const dz = verts[i][2] - verts[j][2];
        const dd = dx * dx + dy * dy + dz * dz;
        d[i][j] = dd;
        if (dd > 1e-18 && dd < minSq) minSq = dd;
      }
    }
    const min = Math.sqrt(minSq);
    const edges: [number, number][] = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        if (Math.abs(Math.sqrt(d[i][j]) - min) < 1e-6) edges.push([i, j]);
      }
    }
    return edges;
  };
  let start: number[];
  if (snub) {
    const Vexp = Math.round(groupOrder / 2);
    const Eexp = (5 * Vexp) / 2;
    const at2 = (u: number, v: number): number[] => {
      const s = Math.exp(u);
      const t = Math.exp(v);
      return vnorm3([
        corners[0][0] + s * corners[1][0] + t * corners[2][0],
        corners[0][1] + s * corners[1][1] + t * corners[2][1],
        corners[0][2] + s * corners[1][2] + t * corners[2][2],
      ]);
    };
    const obj2 = (u: number, v: number): number => {
      const o = orbit(at2(u, v), true);
      return o.length === Vexp ? edgeObj(o, Eexp) : Infinity;
    };
    let bu = 0;
    let bv = 0;
    let bs = Infinity;
    const coarse: Array<{ u: number; v: number; s: number }> = [];
    for (let a = 0; a <= 24 && bs > 1e-9; a++) {
      const u = -4 + (8 * a) / 24;
      for (let b = 0; b <= 24; b++) {
        const v = -4 + (8 * b) / 24;
        const s = obj2(u, v);
        coarse.push({ u, v, s });
        if (s < bs) { bs = s; bu = u; bv = v; }
      }
    }
    coarse.sort((x, y) => x.s - y.s);
    const seeds: Array<[number, number]> = [[bu, bv]];
    for (const c of coarse) {
      if (seeds.length >= 8) break;
      if (seeds.every(([t, p]) => Math.hypot(t - c.u, p - c.v) > 0.5)) seeds.push([c.u, c.v]);
    }
    for (const [ct, cp] of seeds) {
      let t = ct;
      let p0 = cp;
      let s = obj2(t, p0);
      let step = 0.5;
      for (let it = 0; it < 60; it++) {
        if (bs < 1e-9) break;
        let improved = false;
        for (const [du, dv] of [[step, 0], [-step, 0], [0, step], [0, -step]] as Array<[number, number]>) {
          const ns = obj2(t + du, p0 + dv);
          if (ns < s) { s = ns; t += du; p0 += dv; improved = true; }
        }
        if (!improved) step /= 1.5;
      }
      if (s < bs) { bs = s; bu = t; bv = p0; }
    }
    start = at2(bu, bv);
    const got = orbit(start, true);
    if (got.length !== Vexp || edgeObj(got, Eexp) > 1e-6) throw new Error(`no uniform snub for [${p},${q}]`);
  } else if (ringIdx.length === 1) {
    start = [...corners[ringIdx[0]]];
  } else if (ringIdx.length === 3) {
    const Vexp = Math.round(groupOrder);
    const Eexp = (3 * Vexp) / 2;
    const at = (u: number, v: number): number[] => {
      const s = Math.exp(u);
      const t = Math.exp(v);
      return vnorm3([
        corners[0][0] + s * corners[1][0] + t * corners[2][0],
        corners[0][1] + s * corners[1][1] + t * corners[2][1],
        corners[0][2] + s * corners[1][2] + t * corners[2][2],
      ]);
    };
    const obj = (u: number, v: number): number => edgeObj(orbit(at(u, v), false), Eexp);
    let bu = 0;
    let bv = 0;
    let bs = Infinity;
    for (let a = 0; a <= 16 && bs > 1e-9; a++) {
      const u = -4 + (8 * a) / 16;
      for (let b = 0; b <= 16; b++) {
        const v = -4 + (8 * b) / 16;
        const s = obj(u, v);
        if (s < bs) { bs = s; bu = u; bv = v; }
      }
    }
    let su = bu;
    let sv = bv;
    let step = 0.5;
    for (let it = 0; it < 60; it++) {
      if (bs < 1e-9) break;
      let improved = false;
      for (const [du, dv] of [[step, 0], [-step, 0], [0, step], [0, -step]] as Array<[number, number]>) {
        const ns = obj(su + du, sv + dv);
        if (ns < bs) { bs = ns; su += du; sv += dv; improved = true; }
      }
      if (!improved) step /= 1.5;
    }
    start = at(su, sv);
    if (edgeObj(orbit(start, false), Eexp) > 1e-6) throw new Error(`no uniform position for [${p},${q}] ringed ${ringIdx}`);
  } else if (ringIdx.length === 2) {
    const [a, b] = ringIdx;
    const deg = ringIdx[0] === 0 && ringIdx[1] === 2 ? 4 : 3;
    const Vexp = Math.round(groupOrder / 2);
    const Eexp = (Vexp * deg) / 2;
    const obj = (u: number): number => edgeObj(orbit(at(u), false), Eexp);
    const at = (u: number): number[] => {
      const t = Math.exp(u);
      return vnorm3([corners[a][0] + t * corners[b][0], corners[a][1] + t * corners[b][1], corners[a][2] + t * corners[b][2]]);
    };
    let bu = 0;
    let bs = Infinity;
    for (let k = 0; k <= 160; k++) {
      const u = -9 + (18 * k) / 160;
      const s = obj(u);
      if (s < bs) { bs = s; bu = u; }
    }
    let lo = bu - 18 / 160;
    let hi = bu + 18 / 160;
    for (let it = 0; it < 60; it++) {
      const m1 = lo + (hi - lo) * 0.381966;
      const m2 = lo + (hi - lo) * 0.618034;
      if (obj(m1) < obj(m2)) hi = m2;
      else lo = m1;
    }
    start = at((lo + hi) / 2);
    if (edgeObj(orbit(start, false), Eexp) > 1e-6) throw new Error(`no uniform position for [${p},${q}] ringed ${ringIdx}`);
  } else {
    throw new Error(`not a Wythoff position: ringed ${ringIdx} of [${p},${q}]`);
  }
  const verts = orbit(start, snub);
  const edges = minDistEdges(verts);
  const faces: number[][] = [];
  if (!snub) {
    const pairs: Array<[number, number]> = [[0, 1], [1, 2], [0, 2]];
    const seenF = new Set<string>();
    const templateOf = (i: number, j: number): number[][] => {
      const hSeen = new Set<string>([key(start)]);
      const hPts: number[][] = [];
      const hQueue: number[][] = [start];
      let hHead = 0;
      let hGuard = 0;
      while (hHead < hQueue.length && hGuard++ < 200) {
        const v = hQueue[hHead++];
        hPts.push(v);
        for (const m of [i, j]) {
          const w = refl(v, m);
          const kk = key(w);
          if (hSeen.has(kk)) continue;
          let dup = false;
          for (const u of hPts) {
            if (Math.hypot(u[0] - w[0], u[1] - w[1], u[2] - w[2]) < 1e-9) { dup = true; break; }
          }
          for (const u of hQueue) {
            if (Math.hypot(u[0] - w[0], u[1] - w[1], u[2] - w[2]) < 1e-9) { dup = true; break; }
          }
          if (dup) continue;
          hSeen.add(kk);
          hQueue.push(w);
        }
      }
      return hPts;
    };
    const toIdx = (pts: number[][]): number[] | null => {
      const idx = pts.map((pt) => {
        let best = -1;
        let bd = Infinity;
        for (let vi = 0; vi < verts.length; vi++) {
          const d = Math.hypot(verts[vi][0] - pt[0], verts[vi][1] - pt[1], verts[vi][2] - pt[2]);
          if (d < bd) { bd = d; best = vi; }
        }
        return bd < 1e-6 ? best : -1;
      });
      return idx.some((v) => v < 0) ? null : (idx as number[]);
    };
    const solidCenter = [0, 1, 2].map((d) => verts.reduce((s, v) => s + v[d], 0) / verts.length);
    const emit = (idx: number[]): void => {
      if (idx.length < 3) return;
      const c = [0, 1, 2].map((d) => idx.reduce((s, vi) => s + verts[vi][d], 0) / idx.length);
      const e1 = vsub3(verts[idx[1]], verts[idx[0]]);
      const e2 = vsub3(verts[idx[2]], verts[idx[0]]);
      const n = vnorm3(vcross3(e1, e2));
      const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const u0 = vsub3(ref, n.map((x) => x * vdot3(ref, n)));
      const u = vnorm3(u0);
      const w = vcross3(n, u);
      const angs = idx.map((vi) => {
        const d = vsub3(verts[vi], c);
        return Math.atan2(vdot3(d, w), vdot3(d, u));
      });
      const order = idx.map((_, k) => k).sort((x, y) => angs[x] - angs[y]).map((k) => idx[k]);
      const o1 = vsub3(verts[order[1]], verts[order[0]]);
      const o2 = vsub3(verts[order[2]], verts[order[0]]);
      const on = vcross3(o1, o2);
      if (vdot3(on, vsub3(c, solidCenter)) < 0) order.reverse();
      const fk = [...order].sort((a, b) => a - b).join(',');
      if (seenF.has(fk)) return;
      seenF.add(fk);
      for (let k = 1; k < order.length - 1; k++) faces.push([order[0], order[k], order[k + 1]]);
    };
    const mats = groupMats();
    for (const [i, j] of pairs) {
      const tpl = templateOf(i, j);
      if (tpl.length < 3) continue;
      for (const M of mats) {
        const moved = tpl.map((pt) => matApply(M, pt));
        const idx = toIdx(moved);
        if (idx) emit(idx);
      }
    }
  }
  const out = { verts, edges, faces };
  sphCache.set(cacheKey, out);
  return out;
}

export interface SphNResult {
  verts: number[][];
  edges: [number, number][];
}

const sphNCache = new Map<string, SphNResult>();

export function wythoffSphericalN(orders: number[], ringed: boolean[], snub = false): SphNResult {
  const n = orders.length + 1;
  if (n < 2 || ringed.length !== n) throw new Error(`bad spherical rank ${n}`);
  const cacheKey = `${orders.map((o) => o.toFixed(9)).join(',')}|${ringed.map((b) => (b ? 1 : 0)).join('')}|${snub ? 1 : 0}`;
  const hit = sphNCache.get(cacheKey);
  if (hit) return hit;
  if (snub) throw new Error(`no uniform snub construction for rank ${n}`);
  const g: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      if (Math.abs(i - j) === 1) return -Math.cos(Math.PI / orders[Math.min(i, j)]);
      return 0;
    }),
  );
  const L: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const D: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let d = g[i][i];
    for (let s = 0; s < i; s++) d -= L[i][s] * L[i][s] * D[s];
    if (!(d > 1e-12)) throw new Error(`not a finite reflection group: [${orders.join(',')}]`);
    D[i] = d;
    for (let j = i + 1; j < n; j++) {
      let v = g[j][i];
      for (let s = 0; s < i; s++) v -= L[j][s] * L[i][s] * D[s];
      L[j][i] = v / d;
    }
  }
  const A = L.map((row) => row.map((x, j) => x * Math.sqrt(D[j])));
  const dot = (u: number[], v: number[]): number => u.reduce((s, x, k) => s + x * v[k], 0);
  const refl = (x: number[], i: number): number[] => {
    const b = dot(A[i], x);
    return x.map((v, j) => v - 2 * b * A[i][j]);
  };
  const active = ringed.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  if (!active.length) throw new Error(`not a Wythoff position: ringed ${ringed}`);
  const bv = new Array(n).fill(0);
  for (const i of active) bv[i] = 1;
  const raw = solveLinear(A, bv);
  if (!raw) throw new Error(`no Wythoff point for [${orders.join(',')}]`);
  const nr = Math.hypot(...raw);
  const start = raw.map((x) => x / nr);
  const key = (v: number[]): string => v.map((x) => Math.round(x * 1e9) + 0).join(',');
  const seen = new Set<string>([key(start)]);
  const verts: number[][] = [start];
  const queue: number[][] = [start];
  for (let head = 0; head < queue.length && verts.length < 20000; head++) {
    const v = queue[head];
    for (let i = 0; i < n; i++) {
      const w = refl(v, i);
      const kk = key(w);
      if (seen.has(kk)) continue;
      seen.add(kk);
      verts.push(w);
      queue.push(w);
    }
  }
  if (verts.length >= 20000) throw new Error(`not a finite reflection group: [${orders.join(',')}]`);
  const sqdist = (a: number[], b: number[]): number => a.reduce((s, x, k) => s + (x - b[k]) * (x - b[k]), 0);
  let minSq = Infinity;
  for (let j = 1; j < verts.length; j++) {
    const dd = sqdist(verts[0], verts[j]);
    if (dd > 1e-18 && dd < minSq) minSq = dd;
  }
  const edges: [number, number][] = [];
  const tolSq = minSq * 1e-9;
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const dd = sqdist(verts[i], verts[j]);
      if (Math.abs(dd - minSq) <= tolSq) edges.push([i, j]);
    }
  }
  const out = { verts, edges };
  sphNCache.set(cacheKey, out);
  return out;
}

export interface EuclOptions {
  maxVerts?: number;
  maxDepth?: number;
  radius?: number;
}

export interface EuclResult {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
  capped: boolean;
}

type Mirror2 = { n: [number, number]; d: number };

function refl2(m: Mirror2, v: number[]): number[] {
  const s = (v[0] * m.n[0] + v[1] * m.n[1]) - m.d;
  return [v[0] - 2 * s * m.n[0], v[1] - 2 * s * m.n[1]];
}

const euclGenCache = new Map<string, number[]>();

export function wythoffEuclidean(p: number, q: number, ringed: [boolean, boolean, boolean], snub = false, opts?: EuclOptions): EuclResult {
  let P = p;
  let Q = q;
  let rg = ringed;
  if (P === 3 && Q === 6) {
    P = 6;
    Q = 3;
    rg = [ringed[2], ringed[1], ringed[0]];
  }
  if (!((P === 4 && Q === 4) || (P === 6 && Q === 3))) {
    throw new Error(`not a euclidean triangle group: [${p},${q}]`);
  }
  const maxVerts = opts?.maxVerts ?? 1500;
  const maxDepth = Math.max(4, opts?.maxDepth ?? 6);
  const radius = opts?.radius ?? 8;
  const h = Math.tan(Math.PI / Q);
  const n1len = Math.hypot(1, 1 / h);
  const mirrors: Mirror2[] = [
    { n: [1, 0], d: 0 },
    { n: [1 / n1len, (1 / h) / n1len], d: 1 / n1len },
    { n: [0, 1], d: 0 },
  ];
  const corners = [[1, 0], [0, 0], [0, h]];
  const key = (v: number[]): string => v.map((x) => Math.round(x * 1e9)).join(',');
  const orbit = (start: number[], evenOnly: boolean, rad: number, mv: number): { pts: number[][]; dep: number[] } => {
    const seen = new Set<string>();
    const out: number[][] = [];
    const dep: number[] = [];
    const queue: Array<{ v: number[]; par: number; d: number }> = [{ v: start, par: 0, d: 0 }];
    seen.add(key(start) + ':0');
    let head = 0;
    while (head < queue.length) {
      if (out.length >= mv) break;
      const { v, par, d } = queue[head++];
      const rr = Math.hypot(v[0], v[1]);
      if (d > 64 || rr > rad) continue;
      if (!evenOnly || par === 0) {
        let dup = false;
        for (const w of out) {
          const dx = w[0] - v[0];
          const dy = w[1] - v[1];
          if (dx * dx + dy * dy < 1e-18) { dup = true; break; }
        }
        if (!dup) { out.push([...v]); dep.push(d); }
      }
      if (rr > rad + 4 || d >= 64) continue;
      for (let i = 0; i < 3; i++) {
        const w = refl2(mirrors[i], v);
        const kk = key(w) + ':' + ((par + 1) % 2);
        if (seen.has(kk)) continue;
        seen.add(kk);
        queue.push({ v: w, par: (par + 1) % 2, d: d + 1 });
      }
    }
    return { pts: out, dep: out.map((_, i) => dep[i]) };
  };
  const minDistEdges = (verts: number[][]): [number, number][] => {
    if (verts.length < 2) return [];
    let minSq = Infinity;
    const d: number[][] = verts.map(() => []);
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        const dx = verts[i][0] - verts[j][0];
        const dy = verts[i][1] - verts[j][1];
        const dd = dx * dx + dy * dy;
        d[i][j] = dd;
        if (dd > 1e-18 && dd < minSq) minSq = dd;
      }
    }
    const min = Math.sqrt(minSq);
    const edges: [number, number][] = [];
    for (let i = 0; i < verts.length; i++) {
      for (let j = i + 1; j < verts.length; j++) {
        if (Math.abs(Math.sqrt(d[i][j]) - min) < 1e-6) edges.push([i, j]);
      }
    }
    return edges;
  };
  const ringIdx = [0, 1, 2].filter((i) => rg[i]);
  const mid: number[] = [0, 0];
  for (const c of corners) {
    mid[0] += c[0] / 3;
    mid[1] += c[1] / 3;
  }
  const sideSgn = (i: number): number => {
    const raw = mirrors[i].n[0] * mid[0] + mirrors[i].n[1] * mid[1] - mirrors[i].d;
    return raw >= 0 ? 1 : -1;
  };
  const sideVal = (i: number, p: number[]): number => sideSgn(i) * (mirrors[i].n[0] * p[0] + mirrors[i].n[1] * p[1] - mirrors[i].d);
  const solve3 = (): number[] => {
    const s0 = sideSgn(0);
    const s1 = sideSgn(1);
    const s2 = sideSgn(2);
    const a11 = s0 * mirrors[0].n[0] - s1 * mirrors[1].n[0];
    const a12 = s0 * mirrors[0].n[1] - s1 * mirrors[1].n[1];
    const a21 = s0 * mirrors[0].n[0] - s2 * mirrors[2].n[0];
    const a22 = s0 * mirrors[0].n[1] - s2 * mirrors[2].n[1];
    const b1 = s0 * mirrors[0].d - s1 * mirrors[1].d;
    const b2 = s0 * mirrors[0].d - s2 * mirrors[2].d;
    const det = a11 * a22 - a12 * a21;
    return Math.abs(det) < 1e-12
      ? [...mid]
      : [(b1 * a22 - a12 * b2) / det, (a11 * b2 - b1 * a21) / det];
  };
  const snubStart = (): number[] => {
    const sp = Math.sin(Math.PI / P);
    const sq = Math.sin(Math.PI / Q);
    const ax = 0.5;
    const bx = (1 - 1 / (sq * sq)) / 2;
    const ay = h / 2;
    const by = (1 - 1 / (sp * sp)) / (2 * h);
    const A = bx * bx + by * by;
    const B = 2 * (ax * bx + ay * by) - 1;
    const C = ax * ax + ay * ay;
    const disc = B * B - 4 * A * C;
    if (!(disc > 0) || A < 1e-15) throw new Error(`no uniform snub for [${p},${q}]`);
    const cands = [(-B + Math.sqrt(disc)) / (2 * A), (-B - Math.sqrt(disc)) / (2 * A)]
      .filter((u) => u > 0)
      .map((u) => [ax + bx * u, ay + by * u])
      .filter(([x, y]) => x > 0 && y > 0 && x + y / h < 1);
    if (cands.length === 0) throw new Error(`no uniform snub for [${p},${q}]`);
    return cands[0];
  };
  let start: number[];
  if (snub) {
    start = snubStart();
  } else if (ringIdx.length === 1) {
    start = [...corners[ringIdx[0]]];
  } else if (ringIdx.length === 2) {
    const a = ringIdx[0];
    const b = ringIdx[1];
    const ca = corners[a];
    const cb = corners[b];
    const dx = cb[0] - ca[0];
    const dy = cb[1] - ca[1];
    const fa = sideVal(a, ca);
    const fb = sideVal(b, ca);
    const ga = mirrors[a].n[0] * dx + mirrors[a].n[1] * dy;
    const gb = mirrors[b].n[0] * dx + mirrors[b].n[1] * dy;
    const den = sideSgn(a) * ga - sideSgn(b) * gb;
    const t = Math.abs(den) < 1e-12 ? 0.5 : Math.min(0.999, Math.max(0.001, (fb - fa) / den));
    start = [ca[0] + t * dx, ca[1] + t * dy];
  } else if (ringIdx.length === 3) {
    start = solve3();
  } else {
    throw new Error(`not a Wythoff position: ringed ${ringIdx} of [${p},${q}]`);
  }
  const full = orbit(start, snub, radius, maxVerts);
  const capped = full.pts.length >= maxVerts;
  const verts = full.pts.map(([x, y]) => [x, y]);
  const edges = minDistEdges(verts);
  return { verts, edges, faces: [], capped };
}

export function geodesicPoints(a: number[], b: number[], segments: number): number[][] {
  const pts: number[][] = [];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const colinear = Math.abs(a[0] * b[1] - a[1] * b[0]);
  const scale = Math.max(1e-12, (Math.hypot(a[0], a[1]) + Math.hypot(b[0], b[1])) * Math.hypot(dx, dy));
  if (colinear < 1e-9 * scale) {
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push([a[0] + dx * t, a[1] + dy * t]);
    }
    pts[0] = [...a];
    pts[segments] = [...b];
    return pts;
  }
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  let nx = -dy;
  let ny = dx;
  const nl = Math.hypot(nx, ny) || 1;
  nx /= nl;
  ny /= nl;
  const mSq = mx * mx + my * my;
  const maSq = (mx - a[0]) * (mx - a[0]) + (my - a[1]) * (my - a[1]);
  const na = nx * a[0] + ny * a[1];
  const t = Math.abs(na) > 1e-12 ? (1 - mSq + maSq) / (2 * na) : 0;
  const cx = mx + t * nx;
  const cy = my + t * ny;
  const r = Math.hypot(a[0] - cx, a[1] - cy);
  const angA = Math.atan2(a[1] - cy, a[0] - cx);
  let angB = Math.atan2(b[1] - cy, b[0] - cx);
  let delta = angB - angA;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  const midX = cx + r * Math.cos(angA + delta / 2);
  const midY = cy + r * Math.sin(angA + delta / 2);
  if (midX * midX + midY * midY >= 1) {
    if (delta > 0) delta -= 2 * Math.PI;
    else delta += 2 * Math.PI;
  }
  for (let i = 0; i <= segments; i++) {
    const an = angA + (delta * i) / segments;
    pts.push([cx + r * Math.cos(an), cy + r * Math.sin(an)]);
  }
  pts[0] = [...a];
  pts[segments] = [...b];
  return pts;
}

function solveLinear(a: number[][], b: number[]): number[] | null {
  const n = a.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    if (Math.abs(m[piv][c]) < 1e-12) return null;
    const tmp = m[piv];
    m[piv] = m[c];
    m[c] = tmp;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / m[i][i]);
}

export function wythoffHyperbolic(p: number[], opts?: WythoffOptions): WythoffResult | null {
  const k = p.length;
  if (k < 1) return null;
  for (const v of p) if (!Number.isFinite(v) || v < 2) return null;
  const n = k + 1;
  const g: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      if (Math.abs(i - j) === 1) return -Math.cos(Math.PI / p[Math.min(i, j)]);
      return 0;
    }),
  );
  const tol = 1e-9;
  const L: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const D: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let d = g[i][i];
    for (let s = 0; s < i; s++) d -= L[i][s] * L[i][s] * D[s];
    D[i] = d;
    if (i < n - 1 && d <= tol) return null;
    if (i === n - 1 && d >= -tol) return null;
    for (let j = i + 1; j < n; j++) {
      let v = g[j][i];
      for (let s = 0; s < i; s++) v -= L[j][s] * L[i][s] * D[s];
      L[j][i] = v / d;
    }
  }
  const A: number[][] = L.map((row) => row.map((x, j) => x * Math.sqrt(Math.abs(D[j]))));
  const mink = (u: number[], v: number[]): number => {
    let s = -u[n - 1] * v[n - 1];
    for (let j = 0; j < n - 1; j++) s += u[j] * v[j];
    return s;
  };
  const M = A.map((row) => row.map((x, j) => (j === n - 1 ? -x : x)));
  const ringed = opts?.ringed ?? p.map((_, i) => i === 0);
  const active = ringed.map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
  if (active.length === 0) return null;
  const refl = (x: number[], i: number): number[] => {
    const b = mink(x, A[i]);
    return x.map((v, j) => v - 2 * b * A[i][j]);
  };
  const normH = (x: number[]): number[] | null => {
    const q = mink(x, x);
    if (q >= -tol) return null;
    const nv = x.map((v) => v / Math.sqrt(-q));
    if (nv[n - 1] < 0) for (let i = 0; i < n; i++) nv[i] = -nv[i];
    return nv;
  };
  const snub = opts?.snub === true;
  const snubImages = (x: number[]): number[][] => [
    refl(refl(x, 1), 2),
    refl(refl(x, 2), 1),
    refl(refl(x, 0), 1),
    refl(refl(x, 1), 0),
    refl(refl(x, 0), 2),
  ];
  let x0 = new Array(n).fill(0);
  let snubEdge = 0;
  if (snub) {
    if (n !== 3) return null;
    const score = (s: number, t: number): number => {
      const raw = solveLinear(M, [1, Math.exp(s), Math.exp(t)]);
      if (!raw) return Infinity;
      const x = normH(raw);
      if (!x) return Infinity;
      const ds = snubImages(x).map((y) => -mink(x, y));
      const mean = ds.reduce((acc, d) => acc + d, 0) / ds.length;
      let acc = 0;
      for (const d of ds) acc += (d - mean) * (d - mean);
      return acc;
    };
    let bs = Infinity;
    let bu = 0;
    let bv = 0;
    for (let a = 0; a <= 24; a++) {
      const s = -5 + (10 * a) / 24;
      for (let b = 0; b <= 24; b++) {
        const t = -5 + (10 * b) / 24;
        const sc = score(s, t);
        if (sc < bs) { bs = sc; bu = s; bv = t; }
      }
    }
    let step = 0.25;
    for (let it = 0; it < 240 && bs > 1e-20; it++) {
      let improved = false;
      for (const [du, dv] of [[step, 0], [-step, 0], [0, step], [0, -step]] as Array<[number, number]>) {
        const sc = score(bu + du, bv + dv);
        if (sc < bs) { bs = sc; bu += du; bv += dv; improved = true; }
      }
      if (!improved) step *= 0.6;
    }
    const raw = solveLinear(M, [1, Math.exp(bu), Math.exp(bv)]);
    if (!raw) return null;
    const nx = normH(raw);
    if (!nx) return null;
    x0 = nx;
    snubEdge = -mink(x0, snubImages(x0)[0]);
  } else {
    const bvec = new Array(n).fill(0);
    for (const i of active) bvec[i] = 1;
    const raw = solveLinear(M, bvec);
    if (!raw) return null;
    const nx = normH(raw);
    if (!nx) return null;
    x0 = nx;
  }
  const key = (v: number[]): string => v.map((x) => Math.round(x * 1e9) + 0).join(',');
  const toBall = (v: number[]): number[] => {
    const t = 1 + v[n - 1];
    return v.slice(0, n - 1).map((x) => x / t);
  };
  const toKlein = (v: number[]): number[] => v.slice(0, n - 1).map((x) => x / v[n - 1]);
  const maxVerts = opts?.maxVerts ?? 4000;
  const maxDepth = opts?.maxDepth ?? 8;
  const seen = new Set<string>();
  const ball: number[][] = [];
  const kleinArr: number[][] = [];
  const queue: Array<{ v: number[]; d: number; par: number }> = [{ v: x0, d: 0, par: 0 }];
  seen.add(key(toBall(x0)));
  ball.push(toBall(x0));
  kleinArr.push(toKlein(x0));
  let capped = false;
  let head = 0;
  while (head < queue.length) {
    const { v, d, par } = queue[head++];
    if (ball.length >= maxVerts) {
      capped = d < maxDepth || head < queue.length;
      break;
    }
    if (d >= maxDepth) continue;
    for (let i = 0; i < n; i++) {
      const w = refl(v, i);
      const nb = mink(w, w);
      if (nb >= -tol) continue;
      const wn = w.map((x) => x / Math.sqrt(-nb));
      const bw = toBall(wn);
      const kk = key(bw);
      if (seen.has(kk)) continue;
      seen.add(kk);
      const np = (par + 1) % 2;
      if (!snub || np === 0) {
        ball.push(bw);
        kleinArr.push(toKlein(wn));
      }
      queue.push({ v: wn, d: d + 1, par: np });
    }
  }
  if (head < queue.length) capped = true;
  if (ball.length < 2) return { verts: ball, edges: [], klein: kleinArr, capped };
  const sq = (v: number[]): number => v.reduce((s, x) => s + x * x, 0);
  const sqd = (a: number[], b: number[]): number => a.reduce((s, x, j) => s + (x - b[j]) * (x - b[j]), 0);
  const coshDist = (a: number[], b: number[]): number => {
    const ua = 1 - sq(a);
    const ub = 1 - sq(b);
    if (ua <= 0 || ub <= 0) return Infinity;
    return 1 + (2 * sqd(a, b)) / (ua * ub);
  };
  let coshEdge = snubEdge;
  if (!snub) {
    coshEdge = Infinity;
    const localSeen = new Set<string>([key(toBall(x0))]);
    const localQueue: Array<{ v: number[]; d: number }> = [{ v: x0, d: 0 }];
    for (let h = 0; h < localQueue.length; h++) {
      const { v, d } = localQueue[h];
      if (d >= 6) continue;
      for (let i = 0; i < n; i++) {
        const w = refl(v, i);
        const nb = mink(w, w);
        if (nb >= -tol) continue;
        const wn = w.map((x) => x / Math.sqrt(-nb));
        const c = -mink(x0, wn);
        if (c > 1 + 1e-9 && c < coshEdge) coshEdge = c;
        const bw = toBall(wn);
        const kk = key(bw);
        if (localSeen.has(kk)) continue;
        localSeen.add(kk);
        localQueue.push({ v: wn, d: d + 1 });
      }
    }
    if (!Number.isFinite(coshEdge)) return { verts: ball, edges: [], klein: kleinArr, capped };
  }
  const seenE = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < ball.length; i++) {
    for (let j = i + 1; j < ball.length; j++) {
      if (Math.abs(coshDist(ball[i], ball[j]) - coshEdge) > 1e-6 * coshEdge) continue;
      const key = `${i}-${j}`;
      if (seenE.has(key)) continue;
      seenE.add(key);
      edges.push([i, j]);
    }
  }
  return { verts: ball, edges, klein: kleinArr, capped };
}

export function extractFaces(verts: number[][], edges: [number, number][], sides: number): number[][] {
  const adj: number[][] = verts.map(() => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const order: number[][] = adj.map((ns, v) => {
    const angs = ns.map((w) => Math.atan2(verts[w][1] - verts[v][1], verts[w][0] - verts[v][0]));
    return ns.map((_, i) => i).sort((x, y) => angs[x] - angs[y]).map((i) => ns[i]);
  });
  const pos: Map<number, number>[] = order.map((o) => {
    const m = new Map<number, number>();
    o.forEach((w, i) => m.set(w, i));
    return m;
  });
  const loops: number[][] = [];
  const seen = new Set<string>();
  const started = new Set<string>();
  for (const [su, sv] of edges) {
    for (const [u0, v0] of [[su, sv], [sv, su]] as [number, number][]) {
      const startKey = `${u0}-${v0}`;
      if (started.has(startKey)) continue;
      started.add(startKey);
      const loop = [u0, v0];
      let prev = u0;
      let cur = v0;
      let ok = false;
      for (let step = 0; step < 4 * sides + 8; step++) {
        const cyc = order[cur];
        if (cyc.length < 2) break;
        const idx = pos[cur].get(prev);
        if (idx === undefined) break;
        const best = cyc[(idx - 1 + cyc.length) % cyc.length];
        if (best === u0 && loop.length === sides) {
          ok = true;
          break;
        }
        if (loop.includes(best)) break;
        loop.push(best);
        prev = cur;
        cur = best;
      }
      if (!ok || loop.length !== sides) continue;
      const rotations: string[] = [];
      for (let k = 0; k < loop.length; k++) rotations.push(loop.slice(k).concat(loop.slice(0, k)).join(','));
      const key = rotations.sort()[0];
      if (seen.has(key)) continue;
      seen.add(key);
      loops.push(loop);
    }
  }
  return loops;
}

export interface HyperbolicTiling {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
  cells: number;
  capped: boolean;
}

export function buildHyperbolicTiling(
  p: number[],
  opts?: WythoffOptions & { subdiv?: number },
): HyperbolicTiling | null {
  if (p.length !== 2) return null;
  const orb = wythoffHyperbolic(p, opts);
  if (!orb) return null;
  const loops = extractFaces(orb.verts, orb.edges, p[0]);
  const k = opts?.subdiv ?? 4;
  const verts = orb.verts.map((v) => [...v]);
  const edges: [number, number][] = [];
  const chainOf = new Map<string, number[]>();
  for (const [a, b] of orb.edges) {
    const pts = geodesicPoints(orb.verts[a], orb.verts[b], k);
    const ids = [a];
    for (let i = 1; i < pts.length - 1; i++) {
      ids.push(verts.length);
      verts.push(pts[i]);
    }
    ids.push(b);
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    chainOf.set(key, a < b ? ids : [...ids].reverse());
    for (let i = 0; i < ids.length - 1; i++) edges.push([ids[i], ids[i + 1]]);
  }
  const faces: number[][] = [];
  for (const loop of loops) {
    let cx = 0;
    let cy = 0;
    for (const i of loop) {
      cx += orb.verts[i][0];
      cy += orb.verts[i][1];
    }
    cx /= loop.length;
    cy /= loop.length;
    const center = verts.length;
    verts.push([cx, cy]);
    const seq: number[] = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const chain = chainOf.get(key)!;
      const ordered = chain[0] === a ? chain : [...chain].reverse();
      for (let j = 0; j < ordered.length - 1; j++) seq.push(ordered[j]);
    }
    for (let i = 0; i < seq.length; i++) {
      faces.push([center, seq[i], seq[(i + 1) % seq.length]]);
    }
  }
  return { verts, edges, faces, cells: loops.length, capped: orb.capped };
}
