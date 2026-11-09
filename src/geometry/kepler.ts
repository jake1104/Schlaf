import { wythoffSpherical } from './wythoff';

export interface KeplerResult {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
}

type Vec = number[];

function sub(a: Vec, b: Vec): Vec {
  return a.map((x, k) => x - b[k]);
}
function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: Vec, b: Vec): Vec {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function centroid(pts: Vec[]): Vec {
  return [0, 1, 2].map((d) => pts.reduce((s, p) => s + p[d], 0) / pts.length);
}
function planeBasis(n: Vec): [Vec, Vec] {
  const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u0 = sub(ref, n.map((x) => x * dot(ref, n)));
  const ul = Math.hypot(...u0) || 1;
  const u = u0.map((x) => x / ul);
  return [u, cross(n, u)];
}
function sortCyclic(pts: Vec[], idx: number[], center: Vec, normal: Vec): number[] {
  const [u, w] = planeBasis(normal);
  return [...idx].sort((p, q) => {
    const pv = sub(pts[p], center);
    const qv = sub(pts[q], center);
    return Math.atan2(dot(pv, w), dot(pv, u)) - Math.atan2(dot(qv, w), dot(qv, u));
  });
}
function planeOf(pts: Vec[]): { n: Vec; d: number } | null {
  const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
  const l = Math.hypot(...n);
  if (l < 1e-9) return null;
  const nn = n.map((x) => x / l);
  return { n: nn, d: dot(nn, pts[0]) };
}

interface Ring {
  idx: number[];
  center: Vec;
  normal: Vec;
  offset: number;
  order: number[];
}

function ringPattern(pts: Vec[]): boolean {
  const ds: number[] = [];
  for (let a = 0; a < pts.length; a++)
    for (let b = a + 1; b < pts.length; b++) ds.push(Math.hypot(...sub(pts[a], pts[b]).map(Math.abs)));
  ds.sort((x, y) => x - y);
  const groups: number[] = [];
  for (const d of ds) {
    if (!groups.length || Math.abs(d - groups[groups.length - 1]) > 1e-6) groups.push(d);
  }
  if (groups.length !== 2) return false;
  const counts = groups.map((g) => ds.filter((d) => Math.abs(d - g) < 1e-6).length).sort((a, b) => a - b);
  return counts[0] === 5 && counts[1] === 5;
}

function findRings(verts: Vec[]): Ring[] {
  const n = verts.length;
  const rings: Ring[] = [];
  const idx = [0, 0, 0, 0, 0];
  const rec = (start: number, depth: number): void => {
    if (depth === 5) {
      const pts = idx.map((i) => verts[i]);
      const pl = planeOf(pts);
      if (!pl || Math.abs(pl.d) < 1e-6) return;
      if (pts.some((p) => Math.abs(dot(pl.n, p) - pl.d) > 1e-6)) return;
      if (!ringPattern(pts)) return;
      const center = centroid(pts);
      rings.push({ idx: [...idx], center, normal: pl.n, offset: pl.d, order: sortCyclic(pts, [0, 1, 2, 3, 4], centroid(pts), pl.n) });
      return;
    }
    for (let i = start; i < n; i++) { idx[depth] = i; rec(i + 1, depth + 1); }
  };
  rec(0, 0);
  return rings.map((r) => ({ ...r, order: r.order.map((k) => r.idx[k]) }));
}

function stepLoop(order: number[], step: 1 | 2): number[] {
  if (step === 1) return order;
  return [order[0], order[2], order[4], order[1], order[3]];
}

function checkTopology(loops: number[][], vCount: number, degree: number, edgeCount: number): [number, number][] | null {
  const seen = new Map<string, { e: [number, number]; n: number }>();
  for (const loop of loops) {
    for (let k = 0; k < loop.length; k++) {
      const a = Math.min(loop[k], loop[(k + 1) % loop.length]);
      const b = Math.max(loop[k], loop[(k + 1) % loop.length]);
      const key = `${a}-${b}`;
      const cur = seen.get(key);
      if (cur) cur.n++;
      else seen.set(key, { e: [a, b], n: 1 });
    }
  }
  if (seen.size !== edgeCount) return null;
  const deg = new Array(vCount).fill(0);
  for (const { e, n } of seen.values()) {
    if (n !== 2) return null;
    deg[e[0]]++;
    deg[e[1]]++;
  }
  if (!deg.every((d) => d === degree)) return null;
  return [...seen.values()].map((v) => v.e);
}

function orientTri(verts: Vec[], a: number, b: number, c: number, solidCenter: Vec): [number, number, number] {
  const n = cross(sub(verts[b], verts[a]), sub(verts[c], verts[a]));
  const fc = centroid([verts[a], verts[b], verts[c]]);
  return dot(n, sub(fc, solidCenter)) >= 0 ? [a, b, c] : [a, c, b];
}

function segCross(p1: Vec, p2: Vec, p3: Vec, p4: Vec, normal: Vec): Vec | null {
  const drop = Math.abs(normal[0]) >= Math.abs(normal[1]) && Math.abs(normal[0]) >= Math.abs(normal[2]) ? 0 : Math.abs(normal[1]) >= Math.abs(normal[2]) ? 1 : 2;
  const c = [0, 1, 2].filter((d) => d !== drop);
  const r = [p2[c[0]] - p1[c[0]], p2[c[1]] - p1[c[1]]];
  const s = [p4[c[0]] - p3[c[0]], p4[c[1]] - p3[c[1]]];
  const denom = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(denom) < 1e-12) return null;
  const q = [p3[c[0]] - p1[c[0]], p3[c[1]] - p1[c[1]]];
  const t = (q[0] * s[1] - q[1] * s[0]) / denom;
  const u = (q[0] * r[1] - q[1] * r[0]) / denom;
  if (t < 1e-9 || t > 1 - 1e-9 || u < 1e-9 || u > 1 - 1e-9) return null;
  return [0, 1, 2].map((d) => p1[d] + t * (p2[d] - p1[d]));
}

function pentagramFaces(verts: Vec[], loops: number[][], solidCenter: Vec): { faces: number[][]; extra: Vec[] } {
  const faces: number[][] = [];
  const extra: Vec[] = [];
  const extraKey = new Map<string, number>();
  const base = verts.length;
  const getExtra = (p: Vec): number => {
    const k = p.map((x) => (Math.round(x * 1e9) / 1e9 + 0).toString()).join(',');
    const hit = extraKey.get(k);
    if (hit !== undefined) return hit;
    extra.push(p);
    const id = base + extra.length - 1;
    extraKey.set(k, id);
    return id;
  };
  for (const loop of loops) {
    const faceCenter = centroid(loop.map((i) => verts[i]));
    const n = cross(sub(verts[loop[1]], verts[loop[0]]), sub(verts[loop[2]], verts[loop[0]]));
    const nn = n.map((x) => x / (Math.hypot(...n) || 1));
    const segs = loop.map((v, k) => [v, loop[(k + 1) % loop.length]] as [number, number]);
    const edgeX: Vec[][] = segs.map(() => []);
    for (let a = 0; a < segs.length; a++) {
      for (let b = a + 1; b < segs.length; b++) {
        const [a1, a2] = segs[a];
        const [b1, b2] = segs[b];
        if (a1 === b1 || a1 === b2 || a2 === b1 || a2 === b2) continue;
        const x = segCross(verts[a1], verts[a2], verts[b1], verts[b2], nn);
        if (x) { edgeX[a].push(x); edgeX[b].push(x); }
      }
    }
    if (!edgeX.every((l) => l.length === 2)) return { faces: [], extra: [] };
    const crosses: Vec[] = [];
    for (const l of edgeX) for (const p of l) {
      if (!crosses.some((q) => Math.hypot(...sub(p, q)) < 1e-9)) crosses.push(p);
    }
    if (crosses.length !== 5) return { faces: [], extra: [] };
    const [u, w] = planeBasis(nn);
    const mid = crosses.map((p) => getExtra(p));
    const inner = [...mid].sort((p, q) => {
      const pv = sub(extra[p - base], faceCenter);
      const qv = sub(extra[q - base], faceCenter);
      return Math.atan2(dot(pv, w), dot(pv, u)) - Math.atan2(dot(qv, w), dot(qv, u));
    });
    for (let k = 1; k < inner.length - 1; k++) faces.push(orientTri([...verts, ...extra], inner[0], inner[k], inner[k + 1], solidCenter));
    for (let k = 0; k < loop.length; k++) {
      const outer = loop[k];
      const pick = (e: number): number => {
        const sorted = [...edgeX[e]].sort((p, q) => Math.hypot(...sub(p, verts[outer])) - Math.hypot(...sub(q, verts[outer])));
        return getExtra(sorted[0]);
      };
      faces.push(orientTri([...verts, ...extra], outer, pick((k + loop.length - 1) % loop.length), pick(k), solidCenter));
    }
  }
  return { faces, extra };
}

function pentagonFaces(verts: Vec[], loops: number[][], solidCenter: Vec): number[][] {
  const faces: number[][] = [];
  for (const loop of loops) {
    for (let k = 1; k < loop.length - 1; k++) faces.push(orientTri(verts, loop[0], loop[k], loop[k + 1], solidCenter));
  }
  return faces;
}

function buildStar(verts: Vec[], step: 1 | 2, degree: number, edgeCount: number): KeplerResult | null {
  const rings = findRings(verts);
  if (!rings.length) return null;
  const byOff = new Map<string, Ring[]>();
  for (const r of rings) {
    const k = Math.abs(r.offset).toFixed(4);
    if (!byOff.has(k)) byOff.set(k, []);
    byOff.get(k)!.push(r);
  }
  for (const tier of byOff.values()) {
    const loops = tier.map((r) => stepLoop(r.order, step));
    const edges = checkTopology(loops, verts.length, degree, edgeCount);
    if (!edges) continue;
    const solidCenter = centroid(verts);
    const faces = step === 1 ? pentagonFaces(verts, loops, solidCenter) : pentagramFaces(verts, loops, solidCenter).faces;
    if (step === 2) {
      const pf = pentagramFaces(verts, loops, solidCenter);
      if (!pf.faces.length) continue;
      return { verts: [...verts, ...pf.extra], edges, faces: pf.faces };
    }
    return { verts, edges, faces };
  }
  return null;
}

function greatIcosa(): KeplerResult | null {
  const verts = wythoffSpherical(5, 3, [false, false, true], false).verts;
  const tiers = new Map<string, number[][]>();
  for (let a = 0; a < verts.length; a++)
    for (let b = a + 1; b < verts.length; b++)
      for (let c = b + 1; c < verts.length; c++) {
        const p = [verts[a], verts[b], verts[c]];
        const d = [Math.hypot(...sub(p[0], p[1])), Math.hypot(...sub(p[1], p[2])), Math.hypot(...sub(p[0], p[2]))];
        if (Math.max(...d) - Math.min(...d) > 1e-6) continue;
        const k = d[0].toFixed(4);
        if (!tiers.has(k)) tiers.set(k, []);
        tiers.get(k)!.push([a, b, c]);
      }
  const keys = [...tiers.keys()].sort();
  const faces = tiers.get(keys[keys.length - 1]) ?? [];
  if (faces.length !== 20) return null;
  const solidCenter = centroid(verts);
  const seen = new Map<string, number>();
  const edges: [number, number][] = [];
  for (const f of faces) {
    for (let k = 0; k < 3; k++) {
      const a = Math.min(f[k], f[(k + 1) % 3]);
      const b = Math.max(f[k], f[(k + 1) % 3]);
      const key = `${a}-${b}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if (seen.get(key) === 1) edges.push([a, b]);
    }
  }
  if (edges.length !== 30 || ![...seen.values()].every((n) => n === 2)) return null;
  return { verts, edges, faces: faces.map(([a, b, c]) => orientTri(verts, a, b, c, solidCenter)) };
}

export function kepler(key: string): KeplerResult | null {
  if (key === '5/2,5') {
    const r = buildStar(wythoffSpherical(5, 3, [false, false, true], false).verts, 2, 5, 30);
    if (r && r.faces.length === 96) return r;
    return null;
  }
  if (key === '5,5/2') {
    const r = buildStar(wythoffSpherical(5, 3, [false, false, true], false).verts, 1, 5, 30);
    if (r && r.faces.length === 36) return r;
    return null;
  }
  if (key === '5/2,3') {
    const r = buildStar(wythoffSpherical(5, 3, [true, false, false], false).verts, 2, 3, 30);
    if (r && r.faces.length === 96) return r;
    return null;
  }
  if (key === '3,5/2') return greatIcosa();
  return null;
}
