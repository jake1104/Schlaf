import { ShapeUtils, Vector2 } from 'three';

type Vec = number[];

const vsub = (a: Vec, b: Vec): Vec => a.map((x, k) => x - b[k]);
const vdot = (a: Vec, b: Vec): number => a.reduce((s, x, k) => s + x * b[k], 0);
const vlen = (a: Vec): number => Math.hypot(...a);
const vscale = (a: Vec, s: number): Vec => a.map((x) => x * s);

function planeBasis(a: Vec, b: Vec, c: Vec): { u: Vec; w: Vec } | null {
  const ab = vsub(b, a);
  const lb = vlen(ab);
  if (lb < 1e-12) return null;
  const u = vscale(ab, 1 / lb);
  const ac = vsub(c, a);
  const t = vsub(ac, vscale(u, vdot(ac, u)));
  const lt = vlen(t);
  if (lt < 1e-12 * Math.max(1, vlen(ac))) return null;
  return { u, w: vscale(t, 1 / lt) };
}

function distToPlane(p: Vec, a: Vec, u: Vec, w: Vec): number {
  const d = vsub(p, a);
  return vlen(vsub(vsub(d, vscale(u, vdot(d, u))), vscale(w, vdot(d, w))));
}

interface Seg2 {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface Fill2D {
  extra: number[][];
  faces: number[][];
}

export function fillFaces2D(pts: number[][], edges: [number, number][]): Fill2D {
  const segs: Seg2[] = [];
  for (const [i, j] of edges) {
    if (i === j || i < 0 || j < 0 || i >= pts.length || j >= pts.length) continue;
    const [ax, ay] = pts[i];
    const [bx, by] = pts[j];
    if (Math.hypot(bx - ax, by - ay) < 1e-12) continue;
    segs.push({ ax, ay, bx, by });
  }
  if (segs.length === 0) return { extra: [], faces: [] };
  const params: number[][] = segs.map(() => [0, 1]);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s = segs[i];
      const t = segs[j];
      const dx = s.bx - s.ax;
      const dy = s.by - s.ay;
      const ex = t.bx - t.ax;
      const ey = t.by - t.ay;
      const denom = dx * ey - dy * ex;
      if (Math.abs(denom) > 1e-12 * Math.max(1, Math.hypot(dx, dy) * Math.hypot(ex, ey))) {
        const qx = t.ax - s.ax;
        const qy = t.ay - s.ay;
        const ti = (qx * ey - qy * ex) / denom;
        const uj = (qx * dy - qy * dx) / denom;
        if (ti > 1e-9 && ti < 1 - 1e-9 && uj > 1e-9 && uj < 1 - 1e-9) {
          params[i].push(ti);
          params[j].push(uj);
        }
        continue;
      }
      if (Math.abs((t.ax - s.ax) * dy - (t.ay - s.ay) * dx) > 1e-9 * Math.max(1, Math.hypot(dx, dy))) continue;
      const l2 = dx * dx + dy * dy;
      if (l2 > 1e-24) {
        for (const [px, py] of [[t.ax, t.ay], [t.bx, t.by]] as const) {
          const ti = ((px - s.ax) * dx + (py - s.ay) * dy) / l2;
          if (ti > 1e-9 && ti < 1 - 1e-9) params[i].push(ti);
        }
      }
      const f2 = ex * ex + ey * ey;
      if (f2 > 1e-24) {
        for (const [px, py] of [[s.ax, s.ay], [s.bx, s.by]] as const) {
          const uj = ((px - t.ax) * ex + (py - t.ay) * ey) / f2;
          if (uj > 1e-9 && uj < 1 - 1e-9) params[j].push(uj);
        }
      }
    }
  }
  const key2 = (x: number, y: number): string => `${Math.round(x * 1e9)},${Math.round(y * 1e9)}`;
  const idOf = new Map<string, number>();
  const coords: number[][] = pts.map((p) => [p[0], p[1]]);
  pts.forEach((p, i) => idOf.set(key2(p[0], p[1]), i));
  const gid = (x: number, y: number): number => {
    const k = key2(x, y);
    const hit = idOf.get(k);
    if (hit !== undefined) return hit;
    idOf.set(k, coords.length);
    coords.push([x, y]);
    return coords.length - 1;
  };
  const pairs = new Set<string>();
  const sub: Array<[number, number]> = [];
  segs.forEach((s, i) => {
    const ts = [...params[i]].sort((a, b) => a - b);
    for (let k = 0; k < ts.length - 1; k++) {
      if (ts[k + 1] - ts[k] < 1e-12) continue;
      const a = gid(s.ax + (s.bx - s.ax) * ts[k], s.ay + (s.by - s.ay) * ts[k]);
      const b = gid(s.ax + (s.bx - s.ax) * ts[k + 1], s.ay + (s.by - s.ay) * ts[k + 1]);
      if (a === b) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      sub.push([a, b]);
    }
  });
  if (sub.length === 0) return { extra: [], faces: [] };
  const adj = new Map<number, Array<{ to: number; ang: number }>>();
  for (const [a, b] of sub) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, ang: Math.atan2(coords[b][1] - coords[a][1], coords[b][0] - coords[a][0]) });
    adj.get(b)!.push({ to: a, ang: Math.atan2(coords[a][1] - coords[b][1], coords[a][0] - coords[b][0]) });
  }
  for (const list of adj.values()) list.sort((p, q) => p.ang - q.ang);
  const used = new Set<string>();
  const polys: number[][] = [];
  const maxSteps = 4 * (sub.length + 1) + 8;
  for (const [a0, b0] of sub) {
    for (const [u0, v0] of [[a0, b0], [b0, a0]] as const) {
      if (used.has(`${u0}>${v0}`)) continue;
      const poly = [u0];
      let cu = u0;
      let cv = v0;
      let closed = false;
      for (let step = 0; step < maxSteps; step++) {
        used.add(`${cu}>${cv}`);
        poly.push(cv);
        if (cv === u0) {
          closed = poly.length >= 4;
          break;
        }
        const list = adj.get(cv);
        if (!list || list.length === 0) break;
        const rev = list.findIndex((e) => e.to === cu);
        if (rev < 0) break;
        const nxt = list[(rev - 1 + list.length) % list.length].to;
        cu = cv;
        cv = nxt;
      }
      if (!closed) continue;
      poly.pop();
      let area = 0;
      for (let k = 0; k < poly.length; k++) {
        const [x1, y1] = coords[poly[k]];
        const [x2, y2] = coords[poly[(k + 1) % poly.length]];
        area += x1 * y2 - x2 * y1;
      }
      if (area > 1e-12) polys.push(poly);
    }
  }
  if (polys.length === 0) return { extra: [], faces: [] };
  const windingInPoly = (poly: number[], px: number, py: number): number => {
    let w = 0;
    for (let k = 0; k < poly.length; k++) {
      const a = coords[poly[k]];
      const b = coords[poly[(k + 1) % poly.length]];
      const ux = a[0] - px;
      const uy = a[1] - py;
      const vx = b[0] - px;
      const vy = b[1] - py;
      w += Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    }
    return Math.round(w / (2 * Math.PI));
  };
  const faces: number[][] = [];
  const usedIds = new Set<number>();
  for (const poly of polys) {
    const contour = poly.map((id) => new Vector2(coords[id][0], coords[id][1]));
    const tris = ShapeUtils.triangulateShape(contour, []) as number[][];
    for (const [ia, ib, ic] of tris) {
      const f = [poly[ia], poly[ib], poly[ic]];
      const cx = (coords[f[0]][0] + coords[f[1]][0] + coords[f[2]][0]) / 3;
      const cy = (coords[f[0]][1] + coords[f[1]][1] + coords[f[2]][1]) / 3;
      if (windingInPoly(poly, cx, cy) === 0) continue;
      const [x1, y1] = coords[f[0]];
      const [x2, y2] = coords[f[1]];
      const [x3, y3] = coords[f[2]];
      if (Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) < 1e-12) continue;
      faces.push(f);
      for (const id of f) usedIds.add(id);
    }
  }
  const old2new = new Map<number, number>();
  const extra: number[][] = [];
  for (const id of usedIds) {
    if (id < pts.length) continue;
    old2new.set(id, pts.length + extra.length);
    extra.push(coords[id]);
  }
  return { extra, faces: faces.map((f) => f.map((id) => (id < pts.length ? id : old2new.get(id)!))) };
}

export interface PlanarOptions {
  confirm: boolean;
}

export function extractPlanarFaces(
  verts: number[][],
  edges: [number, number][],
  sides: number[],
  opts: PlanarOptions,
): number[][] {
  const n = verts.length;
  if (n < 3 || edges.length === 0 || sides.length === 0) return [];
  const maxSide = Math.max(...sides);
  if (!(maxSide >= 3)) return [];
  const adj: number[][] = verts.map(() => []);
  const eset = new Set<string>();
  for (const [a, b] of edges) {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) continue;
    adj[a].push(b);
    adj[b].push(a);
    eset.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  }
  let scale = 0;
  let m = 0;
  for (const [a, b] of edges) {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) continue;
    scale += vlen(vsub(verts[a], verts[b]));
    m++;
  }
  if (!m) return [];
  scale /= m;
  const tol = 1e-7 * Math.max(scale, 1e-12);
  const chordless = (cyc: number[]): boolean => {
    const L = cyc.length;
    for (let i = 0; i < L; i++) {
      for (let j = i + 1; j < L; j++) {
        if (j === i + 1 || (i === 0 && j === L - 1)) continue;
        const a = Math.min(cyc[i], cyc[j]);
        const b = Math.max(cyc[i], cyc[j]);
        if (eset.has(`${a}-${b}`)) return false;
      }
    }
    return true;
  };
  const canon = (cyc: number[]): string => {
    const rots: string[] = [];
    for (let k = 0; k < cyc.length; k++) rots.push(cyc.slice(k).concat(cyc.slice(0, k)).join(','));
    const rev = [...cyc].reverse();
    for (let k = 0; k < rev.length; k++) rots.push(rev.slice(k).concat(rev.slice(0, k)).join(','));
    return rots.sort()[0];
  };
  const found = new Map<string, number[]>();
  let explored = 0;
  const EXPLORE_CAP = 400000;
  const dfs = (path: number[], inPath: Set<number>, pl: { u: Vec; w: Vec }, base: Vec): void => {
    const cur = path[path.length - 1];
    const prev = path[path.length - 2];
    for (const w of adj[cur]) {
      if (explored > EXPLORE_CAP) return;
      if (w === prev) continue;
      if (w === path[0]) {
        explored++;
        if (sides.includes(path.length) && chordless(path)) {
          const key = canon(path);
          if (!found.has(key)) found.set(key, [...path]);
        }
        continue;
      }
      if (inPath.has(w) || path.length >= maxSide) continue;
      if (distToPlane(verts[w], base, pl.u, pl.w) > tol) continue;
      explored++;
      inPath.add(w);
      path.push(w);
      dfs(path, inPath, pl, base);
      path.pop();
      inPath.delete(w);
      if (explored > EXPLORE_CAP) return;
    }
  };
  outer: for (let a = 0; a < n; a++) {
    for (const b of adj[a]) {
      for (const c of adj[b]) {
        if (c === a) continue;
        const pl = planeBasis(verts[a], verts[b], verts[c]);
        if (!pl) continue;
        const inPath = new Set([a, b, c]);
        dfs([a, b, c], inPath, pl, verts[a]);
        if (explored > EXPLORE_CAP) break outer;
      }
    }
  }
  const cycs = [...found.values()];
  const kept = opts.confirm ? cycs.filter((c) => hasSupportingNormal(verts, c, tol)) : cycs;
  const faces: number[][] = [];
  for (const cyc of kept) {
    const pl = planeBasis(verts[cyc[0]], verts[cyc[1]], verts[cyc[2]]);
    if (!pl) continue;
    const pts2 = cyc.map((id) => {
      const d = vsub(verts[id], verts[cyc[0]]);
      return { id, x: vdot(d, pl.u), y: vdot(d, pl.w) };
    });
    let signed = 0;
    for (let k = 0; k < pts2.length; k++) {
      const p = pts2[k];
      const q = pts2[(k + 1) % pts2.length];
      signed += p.x * q.y - q.x * p.y;
    }
    const loop = signed < 0 ? [...cyc].reverse() : cyc;
    const at = new Map<number, { x: number; y: number }>();
    for (const p of pts2) at.set(p.id, p);
    for (let k = 1; k < loop.length - 1; k++) {
      const A = at.get(loop[0])!;
      const B = at.get(loop[k])!;
      const C = at.get(loop[k + 1])!;
      const ar = Math.abs((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x));
      if (ar < 1e-12 * Math.max(scale * scale, 1e-24)) continue;
      faces.push([loop[0], loop[k], loop[k + 1]]);
    }
  }
  return faces;
}

function hasSupportingNormal(verts: number[][], cyc: number[], tol: number): boolean {
  const D = verts[0].length;
  const pl = planeBasis(verts[cyc[0]], verts[cyc[1]], verts[cyc[2]]);
  if (!pl) return false;
  const basis: Vec[] = [pl.u, pl.w];
  for (let k = 0; k < D && basis.length < D; k++) {
    let e = new Array(D).fill(0);
    e[k] = 1;
    for (const b of basis) e = vsub(e, vscale(b, vdot(e, b)));
    if (vlen(e) > 0.5) basis.push(vscale(e, 1 / vlen(e)));
  }
  const normals = basis.slice(2);
  if (normals.length === 0) return true;
  const c = new Array(D).fill(0);
  for (const id of cyc) for (let k = 0; k < D; k++) c[k] += verts[id][k] / cyc.length;
  const dots = verts.map((v) => vsub(v, c));
  if (normals.length === 1) {
    let mx = -Infinity;
    let mn = Infinity;
    for (const d of dots) {
      const s = vdot(normals[0], d);
      if (s > mx) mx = s;
      if (s < mn) mn = s;
    }
    return mx <= tol || mn >= -tol;
  }
  if (normals.length === 2) {
    for (let k = 0; k < 720; k++) {
      const t = (k * 2 * Math.PI) / 720;
      const dir = normals[0].map((x, i) => x * Math.cos(t) + normals[1][i] * Math.sin(t));
      let mx = -Infinity;
      for (const d of dots) {
        const s = vdot(dir, d);
        if (s > mx) mx = s;
        if (mx > tol) break;
      }
      if (mx <= tol) return true;
    }
    return false;
  }
  const cand: Vec[] = [];
  for (const nn of normals) {
    cand.push(nn);
    cand.push(vscale(nn, -1));
  }
  for (let i = 0; i < normals.length; i++) {
    for (let j = i + 1; j < normals.length; j++) {
      for (const s1 of [1, -1]) {
        for (const s2 of [1, -1]) {
          const v = vscale(normals[i], s1).map((x, k) => x + normals[j][k] * s2);
          const l = vlen(v);
          if (l > 1e-12) cand.push(vscale(v, 1 / l));
        }
      }
    }
  }
  for (const cd of cand) {
    let mx = -Infinity;
    for (const d of dots) {
      const s = vdot(cd, d);
      if (s > mx) mx = s;
      if (mx > tol) break;
    }
    if (mx <= tol) return true;
  }
  return false;
}
