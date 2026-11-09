export interface EuclidPatch {
  verts: number[][];
  edges: [number, number][];
  faces: number[][];
}

function squarePatch(r: number): EuclidPatch {
  const idx = new Map<string, number>();
  const verts: number[][] = [];
  const at = (i: number, j: number): number => {
    const k = `${i},${j}`;
    let id = idx.get(k);
    if (id === undefined) {
      id = verts.length;
      idx.set(k, id);
      verts.push([i, j, 0]);
    }
    return id;
  };
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  const faces: number[][] = [];
  for (let i = -r; i < r; i++) {
    for (let j = -r; j < r; j++) {
      const q = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
      for (let k = 0; k < 4; k++) {
        const a = q[k];
        const b = q[(k + 1) % 4];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([Math.min(a, b), Math.max(a, b)]);
        }
      }
      faces.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
    }
  }
  return { verts, edges, faces };
}

function triangularPatch(r: number): EuclidPatch {
  const idx = new Map<string, number>();
  const verts: number[][] = [];
  const at = (i: number, j: number): number | null => {
    if (Math.max(Math.abs(i), Math.abs(j), Math.abs(i + j)) > r) return null;
    const k = `${i},${j}`;
    let id = idx.get(k);
    if (id === undefined) {
      id = verts.length;
      idx.set(k, id);
      verts.push([i + j / 2, (j * Math.sqrt(3)) / 2, 0]);
    }
    return id;
  };
  const faces: number[][] = [];
  const tris: number[][] = [];
  for (let i = -r - 1; i <= r + 1; i++) {
    for (let j = -r - 1; j <= r + 1; j++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i, j + 1);
      const d = at(i + 1, j + 1);
      if (a !== null && b !== null && c !== null) tris.push([a, b, c]);
      if (b !== null && c !== null && d !== null) tris.push([b, d, c]);
    }
  }
  const seen = new Set<string>();
  for (const t of tris) {
    const key = [...t].sort((x, y) => x - y).join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    faces.push(t);
  }
  const eset = new Set<string>();
  const edges: [number, number][] = [];
  for (const t of faces) {
    for (let k = 0; k < 3; k++) {
      const a = Math.min(t[k], t[(k + 1) % 3]);
      const b = Math.max(t[k], t[(k + 1) % 3]);
      const key = `${a}-${b}`;
      if (!eset.has(key)) {
        eset.add(key);
        edges.push([a, b]);
      }
    }
  }
  return { verts, edges, faces };
}

function hexPatch(rc: number): EuclidPatch {
  const cu: number[] = [1.5, Math.sqrt(3) / 2];
  const cv: number[] = [0, Math.sqrt(3)];
  const centers: number[][] = [];
  for (let i = -rc - 1; i <= rc + 1; i++) {
    for (let j = -rc - 1; j <= rc + 1; j++) {
      if (Math.max(Math.abs(i), Math.abs(j), Math.abs(i + j)) > rc) continue;
      centers.push([i * cu[0] + j * cv[0], i * cu[1] + j * cv[1]]);
    }
  }
  const idx = new Map<string, number>();
  const verts: number[][] = [];
  const at = (p: number[]): number => {
    const k = p.map((x) => Math.round(x * 1e9) + 0).join(',');
    let id = idx.get(k);
    if (id === undefined) {
      id = verts.length;
      idx.set(k, id);
      verts.push([...p, 0]);
    }
    return id;
  };
  const eset = new Set<string>();
  const edges: [number, number][] = [];
  const faces: number[][] = [];
  const link = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!eset.has(key)) {
      eset.add(key);
      edges.push([Math.min(a, b), Math.max(a, b)]);
    }
  };
  for (const c of centers) {
    const ring: number[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      ring.push(at([c[0] + Math.cos(a), c[1] + Math.sin(a)]));
    }
    for (let k = 0; k < 6; k++) link(ring[k], ring[(k + 1) % 6]);
    for (let k = 1; k < 5; k++) faces.push([ring[0], ring[k], ring[k + 1]]);
  }
  return { verts, edges, faces };
}

function cubicHoneycombPatch(r: number): EuclidPatch {
  const idx = new Map<string, number>();
  const verts: number[][] = [];
  const at = (p: number[]): number => {
    const k = p.join(',');
    let id = idx.get(k);
    if (id === undefined) {
      id = verts.length;
      idx.set(k, id);
      verts.push(p);
    }
    return id;
  };
  const quadUse = new Map<string, number[][]>();
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      for (let k = -r; k <= r; k++) {
        const c = [i, j, k];
        const v: number[][] = [];
        for (const a of [-0.5, 0.5])
          for (const b of [-0.5, 0.5])
            for (const d of [-0.5, 0.5]) v.push([c[0] + a, c[1] + b, c[2] + d]);
        const vi = v.map((p) => at(p));
        const quads = [
          [vi[0], vi[1], vi[3], vi[2]],
          [vi[4], vi[6], vi[7], vi[5]],
          [vi[0], vi[2], vi[6], vi[4]],
          [vi[1], vi[5], vi[7], vi[3]],
          [vi[0], vi[4], vi[5], vi[1]],
          [vi[2], vi[3], vi[7], vi[6]],
        ];
        for (const q of quads) {
          const key = [...q].sort((x, y) => x - y).join('-');
          const hit = quadUse.get(key);
          if (hit) hit.push(q);
          else quadUse.set(key, [q]);
        }
      }
    }
  }
  const eset = new Set<string>();
  const edges: [number, number][] = [];
  const faces: number[][] = [];
  const link = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!eset.has(key)) {
      eset.add(key);
      edges.push([Math.min(a, b), Math.max(a, b)]);
    }
  };
  for (const quads of quadUse.values()) {
    if (quads.length !== 1) continue;
    const q = quads[0];
    for (let k = 0; k < 4; k++) link(q[k], q[(k + 1) % 4]);
    faces.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]);
  }
  const used = new Set<number>();
  for (const [a, b] of edges) {
    used.add(a);
    used.add(b);
  }
  for (const f of faces) for (const i of f) used.add(i);
  const remap = new Map<number, number>();
  const nverts: number[][] = [];
  for (const i of used) {
    remap.set(i, nverts.length);
    nverts.push(verts[i]);
  }
  return {
    verts: nverts,
    edges: edges.map(([a, b]) => [remap.get(a)!, remap.get(b)!] as [number, number]),
    faces: faces.map((f) => f.map((i) => remap.get(i)!)),
  };
}

export function euclidPatch(key: string, rings?: number): EuclidPatch | null {
  if (key === '4,4') return squarePatch(rings ?? 3);
  if (key === '3,6') return triangularPatch(rings ?? 3);
  if (key === '6,3') return hexPatch(rings ?? 2);
  if (key === '4,3,4') return cubicHoneycombPatch(1);
  return null;
}
