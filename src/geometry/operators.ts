export function edgeList(verts: number[][]): [number, number][] {
  if (verts.length < 2) return [];
  let min = Infinity;
  const d: number[][] = verts.map(() => []);
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) {
      const dd = Math.hypot(...verts[i].map((x, k) => x - verts[j][k]));
      d[i][j] = dd; if (dd > 1e-9 && dd < min) min = dd;
    }
  const pairs: [number, number][] = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      if (Math.abs(d[i][j] - min) < 1e-9) pairs.push([i, j]);
  return pairs;
}
export interface Truncated {
  verts: number[][];
  edges: [number, number][];
}
export function orderCycle(pts: number[][], ids: number[], origin: number[], axis: number[]): number[] {
  if (ids.length <= 3 || pts[0]?.length !== 3) return ids;
  const aLen = Math.hypot(...axis) || 1;
  const an = axis.map((x) => x / aLen);
  const ref = Math.abs(an[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const dot = (p: number[], q: number[]) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const u0 = [ref[0] - an[0] * dot(ref, an), ref[1] - an[1] * dot(ref, an), ref[2] - an[2] * dot(ref, an)];
  const ul = Math.hypot(...u0) || 1;
  const u = u0.map((x) => x / ul);
  const w = [an[1] * u[2] - an[2] * u[1], an[2] * u[0] - an[0] * u[2], an[0] * u[1] - an[1] * u[0]];
  return [...ids].sort((p, q) => {
    const pv = [pts[p][0] - origin[0], pts[p][1] - origin[1], pts[p][2] - origin[2]];
    const qv = [pts[q][0] - origin[0], pts[q][1] - origin[1], pts[q][2] - origin[2]];
    return Math.atan2(dot(pv, w), dot(pv, u)) - Math.atan2(dot(qv, w), dot(qv, u));
  });
}
export function linkFigure(out: number[][], ids: number[], origin: number[], axis: number[], link: (a: number, b: number) => void): void {
  if (ids.length < 2) return;
  if (out[0]?.length === 3) {
    if (ids.length === 2) { link(ids[0], ids[1]); return; }
    const ordered = orderCycle(out, ids, origin, axis);
    for (let k = 0; k < ordered.length; k++) link(ordered[k], ordered[(k + 1) % ordered.length]);
    return;
  }
  let min = Infinity;
  const dd: number[][] = ids.map(() => []);
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++) {
      const d = Math.hypot(...out[ids[a]].map((x, k) => x - out[ids[b]][k]));
      dd[a][b] = d;
      if (d > 1e-9 && d < min) min = d;
    }
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++)
      if (Math.abs(dd[a][b] - min) < 1e-6) link(ids[a], ids[b]);
}
export interface Rectified {
  verts: number[][];
  edges: [number, number][];
}
export function applyRectify(verts: number[][], knownEdges?: [number, number][]): Rectified {
  const pairs = knownEdges && knownEdges.length ? knownEdges : edgeList(verts);
  const out = pairs.map(([i, j]) => verts[i].map((x, k) => (x + verts[j][k]) / 2));
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const link = (a: number, b: number) => {
    if (a === b) return;
    const k = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!seen.has(k)) { seen.add(k); edges.push([Math.min(a, b), Math.max(a, b)]); }
  };
  const near: Map<number, number[]> = new Map();
  pairs.forEach(([i, j], e) => {
    if (!near.has(i)) near.set(i, []);
    if (!near.has(j)) near.set(j, []);
    near.get(i)!.push(e);
    near.get(j)!.push(e);
  });
  const centroid = verts[0].map((_, d) => verts.reduce((s, p) => s + p[d], 0) / verts.length);
  for (const [v, ids] of near) {
    const axis = verts[v].map((x, d) => x - centroid[d]);
    linkFigure(out, ids, verts[v], axis, link);
  }
  return { verts: out, edges };
}
export function applyTruncate(verts: number[][], knownEdges?: [number, number][]): Truncated {
  const pairs = knownEdges && knownEdges.length ? knownEdges : edgeList(verts);
  const adj: Map<number, number[]> = new Map();
  pairs.forEach(([i, j]) => {
    if (!adj.has(i)) adj.set(i, []);
    if (!adj.has(j)) adj.set(j, []);
    adj.get(i)!.push(j);
    adj.get(j)!.push(i);
  });
  let theta = Infinity;
  for (const [v, ns] of adj) {
    for (let a = 0; a < ns.length; a++)
      for (let b = a + 1; b < ns.length; b++) {
        const d1 = verts[ns[a]].map((x, k) => x - verts[v][k]);
        const d2 = verts[ns[b]].map((x, k) => x - verts[v][k]);
        const n1 = Math.hypot(...d1) || 1;
        const n2 = Math.hypot(...d2) || 1;
        const cos = Math.max(-1, Math.min(1, d1.reduce((s, x, k) => s + (x * d2[k]) / (n1 * n2), 0)));
        const ang = Math.acos(cos);
        if (ang > 1e-9 && ang < theta) theta = ang;
      }
  }
  let frac = 1 / 3;
  if (isFinite(theta)) frac = 1 / (2 + 2 * Math.sin(theta / 2));
  const out: number[][] = [];
  for (const [i, j] of pairs) {
    out.push(lerp(verts[i], verts[j], frac), lerp(verts[i], verts[j], 1 - frac));
  }
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const link = (a: number, b: number) => {
    if (a === b) return;
    const k = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (!seen.has(k)) { seen.add(k); edges.push([Math.min(a, b), Math.max(a, b)]); }
  };
  pairs.forEach(([i, j], e) => link(2 * e, 2 * e + 1));
  const near: Map<number, number[]> = new Map();
  pairs.forEach(([i, j], e) => {
    if (!near.has(i)) near.set(i, []);
    if (!near.has(j)) near.set(j, []);
    near.get(i)!.push(2 * e);
    near.get(j)!.push(2 * e + 1);
  });
  const centroid = verts[0].map((_, d) => verts.reduce((s, p) => s + p[d], 0) / verts.length);
  for (const [v, ids] of near) {
    const axis = verts[v].map((x, d) => x - centroid[d]);
    linkFigure(out, ids, verts[v], axis, link);
  }
  return { verts: out, edges };
}
function lerp(a: number[], b: number[], t: number): number[] {
  return a.map((x, k) => x + (b[k] - x) * t);
}
