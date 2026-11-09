import { parseSchlafli, type SchlafliNode, type Op, type SchlafliNum } from '../schlafli/parser';
import { regularVertices, starPolygon } from './regular';
import { prismProduct, tegumProduct, joinProduct } from './products';
import { applyTruncate, applyRectify } from './operators';
import { kepler } from './kepler';
import { detectSpace, toPoincareBall, toSphere, classify, type GeoKind } from '../space/curvature';
import { euclidPatch } from './euclid';
import { wythoffHyperbolic, buildHyperbolicTiling, wythoffSpherical, wythoffSphericalN, wythoffEuclidean } from './wythoff';
import { validateExists, sphericalPatch } from './spherical';
import { fillFaces2D, extractPlanarFaces } from './faces';

export interface BuiltGeometry {
  vertices: number[][];
  edges: [number, number][];
  faces: number[][];
  dim: number;
  space: 'E' | 'S' | 'H';
  note: string;
}

interface Cloud {
  verts: number[][];
  edges: [number, number][];
  dim: number;
  faces?: number[][];
  approx?: string;
  space?: 'S' | 'H';
}

function keyOf(node: SchlafliNode): string {
  return node.base.map((b) => (typeof b === 'number' ? `${b}` : `${b.n}/${b.d}`)).join(',');
}

function wythoffPosition(ops: Op[]): { ringed: [boolean, boolean, boolean]; snub: boolean } {
  const code = ops.join('');
  if (code === '') return { ringed: [true, false, false], snub: false };
  if (code === 'r') return { ringed: [false, true, false], snub: false };
  if (code === 't') return { ringed: [true, true, false], snub: false };
  if (code === 'rr') return { ringed: [true, false, true], snub: false };
  if (code === 'tr') return { ringed: [true, true, true], snub: false };
  if (code === 's' || code === 'sr') return { ringed: [true, true, true], snub: true };
  throw new Error(`not a Wythoff position: ${code} (uniform: '', t, r, rr, tr, s, sr)`);
}

function wythoffPositionN(ops: Op[], n: number): { ringed: boolean[]; snub: boolean } {
  const code = ops.join('');
  const mk = (idx: number[]): boolean[] => Array.from({ length: n }, (_, i) => idx.includes(i));
  const all = Array.from({ length: n }, (_, i) => i);
  if (code === '') return { ringed: mk([0]), snub: false };
  if (code === 'r') return { ringed: mk([1]), snub: false };
  if (code === 't') return { ringed: mk([0, 1]), snub: false };
  if (code === 'rr') return { ringed: mk([0, n - 1]), snub: false };
  if (code === 'tr') return { ringed: mk(all), snub: false };
  if (code === 's' || code === 'sr') return { ringed: mk(all), snub: true };
  throw new Error(`not a Wythoff position: ${code} (uniform: '', t, r, rr, tr, s, sr)`);
}

function baseCloud(node: SchlafliNode): Cloud {
  const key = keyOf(node);
  const depth = node.base.length;
  if (depth === 0) {
    if (node.point) return { verts: [[0]], edges: [], dim: 0 };
    return { verts: [[-1], [1]], edges: [[0, 1]], dim: 1 };
  }
  if (depth === 1) {
    const b = node.base[0];
    const nf = typeof b === 'number' ? b : b.n;
    const df = typeof b === 'number' ? 1 : b.d;
    const n = Math.max(2, Math.round(nf));
    const d = Math.max(1, Math.round(df));
    return { verts: starPolygon(n, d), edges: starStepEdges(n, d), dim: 2 };
  }
  const nums = node.base.map((b) => (typeof b === 'number' ? b : b.n));
  const dim = depth + 1;
  let verts: number[][];
  if (dim === 3) throw new Error(`no finite Wythoff construction in scope for {${key}}: use a uniform code`);
  if (nums.every((x) => x === 3)) verts = regularVertices('simplex', dim);
  else if (nums[0] === 4 && nums.slice(1).every((x) => x === 3)) verts = regularVertices('cube', dim);
  else if (nums[nums.length - 1] === 4 && nums.slice(0, -1).every((x) => x === 3)) verts = regularVertices('orthoplex', dim);
  else if (dim === 4 && key === '3,4,3') verts = [...regularVertices('cube', 4), ...regularVertices('orthoplex', 4)];
  else if (dim === 4 && (key === '5,3,3' || key === '3,3,5')) throw new Error(`unsupported regular 4-polytope {${key}}: no finite Wythoff construction in scope`);
  else if (depth >= 3) verts = baseCloud({ ops: [], base: node.base.slice(0, 2), products: [] }).verts.map((v) => [...v, 0, 0].slice(0, 4));
  else verts = regularVertices('cube', dim);
  return { verts, edges: minDistEdges(verts), dim };
}

function applyOps(cloud: Cloud, ops: Op[]): Cloud {
  let { verts, edges } = cloud;
  for (const o of [...ops].reverse()) {
    if (o === 't') {
      const r = applyTruncate(verts, edges);
      verts = r.verts;
      edges = r.edges;
    } else if (o === 'r') {
      const r = applyRectify(verts, edges);
      verts = r.verts;
      edges = r.edges;
    } else {
      throw new Error(`not a Wythoff position: ${o} outside finite triangle groups (uniform: '', t, r, rr, tr, s, sr)`);
    }
  }
  return { verts, edges, dim: verts[0]?.length ?? cloud.dim };
}

function starCoreFallback(base: SchlafliNum[], ringed: boolean[]): Cloud | null {
  if (base.length !== 3) return null;
  const choices: number[][] = [];
  for (const b of base) {
    if (typeof b === 'number') {
      choices.push([b]);
    } else {
      const raw = b.n / b.d;
      const options = [3, 5].filter((x) => Math.abs(x - raw) > 1e-9);
      if (options.length === 0) return null;
      choices.push(options);
    }
  }
  const total = choices.reduce((s, c) => s * c.length, 1);
  if (total > 16) return null;
  let best: Cloud | null = null;
  for (let idx = 0; idx < total; idx++) {
    let t = idx;
    const core: number[] = [];
    for (const c of choices) {
      core.push(c[t % c.length]);
      t = Math.floor(t / c.length);
    }
    if (classify(core).kind !== 'finite') continue;
    try {
      const w = wythoffSphericalN(core, ringed, false);
      if (!best || w.verts.length > best.verts.length) best = { verts: w.verts, edges: w.edges, dim: 4 };
    } catch {
      continue;
    }
  }
  if (best) best.approx = `star core graph {${best.verts.length} verts} (approximated)`;
  return best;
}

function operatedCloud(node: SchlafliNode, range = 3): Cloud {
  const base = node.base;
  const ints = base.every((b) => typeof b === 'number' && Number.isInteger(b));
  const finiteHigh = ints && base.length >= 3 && classify(base).kind === 'finite';
  const starred = base.some((b) => typeof b !== 'number');
  if (starred && base.length >= 4) {
    const orders = base.map((b) => (typeof b === 'number' ? b : b.n / b.d));
    const pos = wythoffPositionN(node.ops, base.length + 1);
    try {
      const w = wythoffSphericalN(orders, pos.ringed, pos.snub);
      return { verts: w.verts, edges: w.edges, dim: base.length + 1, space: 'S' };
    } catch {
      const h = wythoffHyperbolic(orders, { maxDepth: 8 + 2 * range, maxVerts: 6000, ringed: pos.ringed, snub: pos.snub });
      if (h) {
        return {
          verts: h.verts,
          edges: h.edges,
          dim: base.length + 1,
          faces: extractPlanarFaces(h.verts, h.edges, [3, 4, 5, 6, 8], { confirm: false }),
          space: 'H',
        };
      }
      throw new Error(`no regular star polytope or star honeycomb: {${keyOf(node)}}`);
    }
  }
  if (finiteHigh || (starred && base.length >= 2)) {
    const orders = base.map((b) => (typeof b === 'number' ? b : b.n / b.d));
    const pos = wythoffPositionN(node.ops, base.length + 1);
    try {
      const w = wythoffSphericalN(orders, pos.ringed, pos.snub);
      return { verts: w.verts, edges: w.edges, dim: base.length + 1 };
    } catch (e) {
      if (!starred) throw e;
      const best = starCoreFallback(base, pos.ringed);
      if (best) return best;
      throw e;
    }
  }
  if (base.length === 2 && ints) {
    const [p, q] = base as number[];
    if (p >= 3 && q >= 3 && 1 / p + 1 / q > 1 / 2) {
      const code = node.ops.join('');
      if (/^[tr]*$/.test(code) && !/^(|t|r|rr|tr)$/.test(code)) {
        const reg = wythoffSpherical(p, q, [true, false, false], false);
        return applyOps({ verts: reg.verts, edges: reg.edges, dim: 3 }, node.ops);
      }
      const pos = wythoffPosition(node.ops);
      const w = pos.snub
        ? wythoffSpherical(p, q, [true, true, true], true)
        : wythoffSpherical(p, q, pos.ringed, false);
      return { verts: w.verts, edges: w.edges, dim: 3, faces: w.faces };
    }
    if (node.ops.length > 0) {
      throw new Error(`not a Wythoff position: ${node.ops.join('')} on {${keyOf(node)}} (uniform: '', t, r, rr, tr, s, sr)`);
    }
  } else if (base.length === 2 && node.ops.length > 0) {
    throw new Error(`not a Wythoff position: ${node.ops.join('')} on {${keyOf(node)}} (uniform: '', t, r, rr, tr, s, sr)`);
  }
  return applyOps(baseCloud(node), node.ops);
}

function starStepEdges(n: number, step: number): [number, number][] {
  const e: [number, number][] = [];
  const seen = new Set<string>();
  const s = ((step % n) + n) % n;
  if (s === 0) return e;
  const visited = new Array(n).fill(false);
  for (let start = 0; start < n; start++) {
    if (visited[start]) continue;
    let cur = start;
    for (;;) {
      visited[cur] = true;
      const nxt = (cur + s) % n;
      const a = Math.min(cur, nxt);
      const b = Math.max(cur, nxt);
      const k = `${a}-${b}`;
      if (a !== b && !seen.has(k)) { seen.add(k); e.push([a, b]); }
      cur = nxt;
      if (cur === start) break;
    }
  }
  return e;
}
function minDistEdges(verts: number[][], cap = 4000): [number, number][] {
  if (verts.length > 400) {
    const e: [number, number][] = [];
    for (let i = 0; i < verts.length; i++) e.push([i, (i + 1) % verts.length]);
    return e;
  }
  let min = Infinity;
  const d: number[][] = verts.map(() => []);
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) {
      const dd = Math.hypot(...verts[i].map((x, k) => x - verts[j][k]));
      d[i][j] = dd; if (dd > 1e-9 && dd < min) min = dd;
    }
  const edges: [number, number][] = [];
  for (let i = 0; i < verts.length && edges.length < cap; i++)
    for (let j = i + 1; j < verts.length && edges.length < cap; j++)
      if (Math.abs(d[i][j] - min) < 1e-6) edges.push([i, j]);
  return edges;
}
function hullFaces(verts: number[][]): number[][] {
  if (verts.length < 4 || verts[0]?.length !== 3 || verts.length > 96) return [];
  const tris: number[][] = [];
  const eps = 1e-6;
  const sub = (a: number[], b: number[]) => a.map((x, k) => x - b[k]);
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nv = verts.length;
  for (let i = 0; i < nv; i++)
    for (let j = i + 1; j < nv; j++)
      for (let k = j + 1; k < nv; k++) {
        const nrm = cross(sub(verts[j], verts[i]), sub(verts[k], verts[i]));
        const len = Math.hypot(...nrm);
        if (len < eps) continue;
        let pos = false, neg = false;
        for (let m = 0; m < nv; m++) {
          if (m === i || m === j || m === k) continue;
          const s = dot(nrm, sub(verts[m], verts[i]));
          if (s > eps) pos = true;
          if (s < -eps) neg = true;
          if (pos && neg) break;
        }
        if (pos && neg) continue;
        const c = [0, 1, 2].map((d) => verts.reduce((s, v) => s + v[d], 0) / nv);
        const out = dot(nrm, sub(c, verts[i])) > 0 ? [i, k, j] : [i, j, k];
        if (!tris.some((f) => f[0] === out[0] && f[1] === out[1] && f[2] === out[2]))
          tris.push(out);
      }
  return mergeCoplanarFaces(verts, tris);
}

function mergeCoplanarFaces(verts: number[][], tris: number[][]): number[][] {
  if (tris.length === 0) return [];
  const sub = (a: number[], b: number[]) => a.map((x, k) => x - b[k]);
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const groups = new Map<string, { ids: Set<number>; n: number[] }>();
  for (const [i, j, k] of tris) {
    const nrm = cross(sub(verts[j], verts[i]), sub(verts[k], verts[i]));
    const len = Math.hypot(...nrm) || 1;
    const n = nrm.map((x) => x / len);
    const d = dot(n, verts[i]);
    const key = [...n.map((x) => Math.round(x * 1e6)), Math.round(d * 1e6)].join(',');
    const g = groups.get(key);
    if (g) {
      g.ids.add(i); g.ids.add(j); g.ids.add(k);
    } else {
      groups.set(key, { ids: new Set([i, j, k]), n });
    }
  }
  const faces: number[][] = [];
  for (const { ids, n } of groups.values()) {
    const ring = [...ids];
    if (ring.length === 3) {
      faces.push(ring);
      continue;
    }
    const center = [0, 1, 2].map((d) => ring.reduce((s, id) => s + verts[id][d], 0) / ring.length);
    const ref = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u0 = sub(ref, n.map((x) => x * dot(ref, n)));
    const ul = Math.hypot(...u0) || 1;
    const u = u0.map((x) => x / ul);
    const w = cross(n, u);
    const ordered = [...ring].sort((p, q) => {
      const pv = sub(verts[p], center);
      const qv = sub(verts[q], center);
      return Math.atan2(dot(pv, w), dot(pv, u)) - Math.atan2(dot(qv, w), dot(qv, u));
    });
    const a = verts[ordered[0]];
    const b = verts[ordered[1]];
    const c = verts[ordered[2]];
    const fn = cross(sub(b, a), sub(c, a));
    const flip = dot(fn, n) < 0;
    const loop = flip ? [...ordered].reverse() : ordered;
    for (let k = 1; k < loop.length - 1; k++) faces.push([loop[0], loop[k], loop[k + 1]]);
  }
  return faces;
}

function asJoinFactor(verts: number[][]): { verts: number[][]; dim: number } {
  if (verts.length === 0) return { verts: [[]], dim: 0 };
  if (verts.length === 1 && verts[0].length <= 1) return { verts: [[]], dim: 0 };
  return { verts, dim: verts[0].length };
}

export interface BuildOptions {
  range?: number;
}

function tilingGeometry(node: SchlafliNode, key: string, kind: GeoKind, range: number): BuiltGeometry | null {
  const p = node.base as number[];
  if (kind === 'euclidean') {
    if (node.ops.length > 0) {
      const code = node.ops.join('');
      const wopts = { maxDepth: 3 + range, maxVerts: 1500, radius: 2 + 2 * range };
      let verts: number[][];
      let edges: [number, number][];
      let capped = false;
      if (/^[tr]*$/.test(code) && !/^(|t|r|rr|tr)$/.test(code)) {
        const base = wythoffEuclidean(p[0], p[1], [true, false, false], false, wopts);
        capped = base.capped;
        const ap = applyOps({ verts: base.verts, edges: base.edges, dim: 2 }, node.ops);
        verts = ap.verts;
        edges = ap.edges;
      } else {
        const pos = wythoffPosition(node.ops);
        const w = wythoffEuclidean(p[0], p[1], pos.ringed, pos.snub, wopts);
        verts = w.verts;
        edges = w.edges;
        capped = w.capped;
      }
      const fill = fillFaces2D(verts, edges);
      const all = [...verts, ...fill.extra];
      const dim = all[0]?.length ?? 2;
      return {
        vertices: all,
        edges,
        faces: fill.faces,
        dim,
        space: 'E',
        note: `euclidean tiling ${key} · operator ${code} · range cutoff${capped ? ' (capped)' : ''}`,
      };
    }
    const e = euclidPatch(key, range);
    if (!e) return null;
    return {
      vertices: e.verts,
      edges: e.edges,
      faces: e.faces,
      dim: e.verts[0]?.length ?? 3,
      space: 'E',
      note: `euclidean tiling ${key} · ${e.verts.length} verts · range cutoff`,
    };
  }
  if (kind === 'hyperbolic') {
    const flat = p.length === 2;
    if (flat && node.ops.length > 0) {
      const pos = wythoffPosition(node.ops);
      const w = wythoffHyperbolic(p, { maxDepth: 8 + 2 * range, maxVerts: 6000, ringed: pos.ringed, snub: pos.snub });
      if (!w) return null;
      const fill = fillFaces2D(w.klein, w.edges);
      return {
        vertices: w.verts,
        edges: w.edges,
        faces: fill.faces,
        dim: 2,
        space: 'H',
        note: `hyperbolic tiling ${key} · Poincare disk · operator ${node.ops.join('')} · range cutoff${w.capped ? ' (capped)' : ''}`,
      };
    }
    if (flat) {
      const t = buildHyperbolicTiling(p, { maxDepth: 8 + 2 * range, maxVerts: 6000, subdiv: 4 });
      if (!t) return null;
      return {
        vertices: t.verts,
        edges: t.edges,
        faces: t.faces,
        dim: 2,
        space: 'H',
        note: `hyperbolic tiling ${key} · Poincare disk · ${t.cells} cells · range cutoff${t.capped ? ' (capped)' : ''}`,
      };
    }
    const pos = wythoffPositionN(node.ops, p.length + 1);
    const w = wythoffHyperbolic(p, { maxDepth: 8 + 2 * range, maxVerts: 6000, ringed: pos.ringed, snub: pos.snub });
    if (!w) return null;
    const b0 = node.base[0];
    const pure = node.ops.length === 0;
    const sides = pure && typeof b0 === 'number' && Number.isInteger(b0) && b0 >= 3 ? [b0] : [3, 4, 5, 6, 8];
    return {
      vertices: w.verts,
      edges: w.edges,
      faces: extractPlanarFaces(w.verts, w.edges, sides, { confirm: false }),
      dim: w.verts[0]?.length ?? 3,
      space: 'H',
      note: `hyperbolic honeycomb ${key} · Poincare ball · ${w.verts.length} verts${pure ? '' : ' · operator ' + node.ops.join('')} · cutoff${w.capped ? ' (capped)' : ''}`,
    };
  }
  return null;
}

export function buildGeometry(input: string, opts?: BuildOptions): BuiltGeometry {
  const node = parseSchlafli(input);
  const key = keyOf(node);
  validateExists(node.base, key);
  const range = opts?.range ?? 3;
  if (node.products.length === 0) {
    const sp = node.ops.length === 0 ? sphericalPatch(node.base) : null;
    if (sp) {
      return {
        vertices: sp.verts,
        edges: sp.edges,
        faces: sp.faces,
        dim: 3,
        space: 'S',
        note: `spherical ${sp.kind} {${key}} · ${sp.verts.length} verts`,
      };
    }
    const cls = classify(node.base);
    const tilings = tilingGeometry(node, key, cls.kind, range);
    if (tilings) return tilings;
  }
  let cur: Cloud;
  const kepEarly = node.products.length === 0 ? kepler(keyOf(node)) : null;
  if (kepEarly && node.ops.length === 0) cur = { verts: kepEarly.verts, edges: kepEarly.edges, dim: 3 };
  else if (kepEarly) cur = applyOps({ verts: kepEarly.verts, edges: kepEarly.edges, dim: 3 }, node.ops);
  else cur = operatedCloud(node, range);
  let maxDim = cur.dim;
  for (const p of node.products) {
    const other = operatedCloud(p.node, range);
    if (p.kind === 'prism') {
      const a = cur;
      const b = other;
      const bv = b.verts.length ? b.verts : [[0]];
      const be: [number, number][] = b.verts.length ? b.edges : [];
      const nv = bv.length;
      const at = (i: number, j: number) => i * nv + j;
      const verts: number[][] = [];
      for (const x of a.verts) for (const y of bv) verts.push([...x, ...y]);
      const edges: [number, number][] = [];
      for (const [i1, i2] of a.edges) for (let j = 0; j < nv; j++) edges.push([at(i1, j), at(i2, j)]);
      for (let i = 0; i < a.verts.length; i++) for (const [j1, j2] of be) edges.push([at(i, j1), at(i, j2)]);
      cur = { verts, edges, dim: verts[0]?.length ?? a.dim };
      maxDim = cur.dim;
    }
    if (p.kind === 'tegum') {
      const a = cur;
      const b = other;
      const bv = b.verts.length ? b.verts : [[0]];
      const off = a.verts.length;
      const verts = tegumProduct(a.verts, bv);
      const ea = a.verts.length > 2 ? a.edges : [];
      const be: [number, number][] = b.verts.length && b.verts.length > 2 ? b.edges : [];
      const edges: [number, number][] = [...ea];
      for (const [j1, j2] of be) edges.push([j1 + off, j2 + off]);
      for (let i = 0; i < a.verts.length; i++) for (let j = 0; j < bv.length; j++) edges.push([i, j + off]);
      cur = { verts, edges, dim: verts[0]?.length ?? a.dim };
      maxDim = Math.max(maxDim, cur.dim);
    }
    if (p.kind === 'join') {
      const a = asJoinFactor(cur.verts);
      const b = asJoinFactor(other.verts);
      const verts = joinProduct(a.verts, a.dim, b.verts, b.dim);
      const edges: [number, number][] = [...cur.edges];
      if (a.verts.length === 1 && a.dim === 0) edges.length = 0;
      const off = a.verts.length;
      for (const [j1, j2] of other.edges) edges.push([j1 + off, j2 + off]);
      for (let i = 0; i < a.verts.length; i++) for (let j = 0; j < b.verts.length; j++) edges.push([i, j + off]);
      cur = { verts, edges, dim: verts[0].length };
      maxDim = cur.dim;
    }
  }
  const det = detectSpace(keyOf(node), node.space);
  let space = cur.space ?? det.space;
  let infinite = cur.space === 'H' ? true : cur.space === 'S' ? false : det.infinite;
  if (!cur.space && node.products.length === 0 && classify(node.base).kind === 'finite') {
    space = 'S';
    infinite = false;
  }
  const kep = kepEarly && node.ops.length === 0 ? kepEarly : null;
  let note = infinite ? `${space === 'H' ? 'hyperbolic' : space === 'S' ? 'spherical' : 'euclidean'} honeycomb cutoff: central cells only` : `${space === 'E' ? 'euclidean' : space} polytope`;
  if (node.base.some((b) => typeof b !== 'number')) note += ' · concave star';
  if (cur.approx) note += ` · ${cur.approx}`;
  if (node.ops.length) note += ` · operator ${node.ops.join('')}`;
  let verts = kep ? kep.verts : cur.verts;
  if (space === 'H') verts = toPoincareBall(verts);
  if (space === 'S' && infinite) verts = toSphere(verts);
  let edges = kep ? kep.edges : cur.edges;
  if (!kep && node.base.length === 1 && node.products.length === 0 && !node.ops.length) {
    const b = node.base[0];
    if (typeof b !== 'number' && b.d > 1) edges = starStepEdges(Math.round(b.n), Math.round(b.d));
    else edges = minDistEdges(verts);
  }
  let faces: number[][] = [];
  if (kep) faces = kep.faces;
  else if (cur.faces && cur.faces.length && node.products.length === 0) faces = cur.faces;
  else if (verts[0]?.length === 2) {
    const fill = fillFaces2D(verts, edges);
    if (fill.extra.length) verts = [...verts, ...fill.extra];
    faces = fill.faces;
  } else if (verts[0]?.length === 3) {
    faces = hullFaces(verts);
    if (!faces.length) {
      let flat = true;
      for (const v of verts) if (Math.abs(v[2]) > 1e-9) { flat = false; break; }
      if (flat) {
        const fill = fillFaces2D(verts.map(([x, y]) => [x, y]), edges);
        if (fill.extra.length) verts = [...verts, ...fill.extra.map(([x, y]) => [x, y, 0])];
        faces = fill.faces;
      }
    }
  } else if ((verts[0]?.length ?? 0) > 3) {
    const pure = node.ops.length === 0 && node.products.length === 0;
    const starred = node.base.some((b) => typeof b !== 'number');
    const b0 = pure ? node.base[0] : null;
    const p0 = typeof b0 === 'number' ? b0 : b0 ? b0.n : null;
    const faceSides = new Set<number>([3, 4]);
    if (p0 && Number.isFinite(p0)) {
      for (const c of [p0, 2 * p0]) {
        const k = Math.round(c);
        if (k >= 3 && k <= 12) faceSides.add(k);
      }
    }
    const sides = pure && p0 && p0 >= 3 ? [Math.round(p0)] : [...faceSides].sort((a, b) => a - b);
    faces = edges.length <= (pure ? 6000 : 1200) ? extractPlanarFaces(verts, edges, sides, { confirm: !starred }) : [];
    if (!faces.length && edges.length > (pure ? 6000 : 1200)) note += ' · wireframe (face search capped)';
    else if (!faces.length) note += ' · wireframe (no supporting faces)';
  }
  if (node.ops.length && edges.length) {
    let mn = Infinity;
    let mx = 0;
    for (const [a, b] of edges) {
      if (a >= verts.length || b >= verts.length) continue;
      const l = Math.hypot(...verts[a].map((x, k) => x - verts[b][k]));
      if (l < mn) mn = l;
      if (l > mx) mx = l;
    }
    if (mn > 0 && (mx - mn) / mn > 1e-6) note += ' · best-effort non-uniform';
  }
  return { vertices: verts, edges, faces, dim: verts[0]?.length ?? maxDim, space, note };
}
