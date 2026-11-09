export type RegularKind = 'simplex' | 'cube' | 'orthoplex';
export function regularVertices(kind: RegularKind, dim: number): number[][] {
  if (kind === 'cube') {
    const n = 2 ** dim;
    const out: number[][] = [];
    for (let i = 0; i < n; i++) {
      const v: number[] = [];
      for (let d = 0; d < dim; d++) v.push((i >> d) & 1 ? 1 : -1);
      out.push(v);
    }
    return out;
  }
  if (kind === 'orthoplex') {
    const out: number[][] = [];
    for (let d = 0; d < dim; d++) {
      const a = new Array(dim).fill(0); a[d] = 1; out.push(a);
      const b = new Array(dim).fill(0); b[d] = -1; out.push(b);
    }
    return out;
  }
  // simplex: n+1 verts in nD, regular via centered R^{d+1} embedding + Helmert basis
  const n = dim + 1;
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const v: number[] = [];
    for (let k = 0; k < dim; k++) {
      const norm = Math.sqrt((k + 1) * (k + 2));
      // q_i[j] = delta(i,j) - 1/n
      let dot = 0;
      for (let j = 0; j <= k + 1 && j < n; j++) {
        const q = (i === j ? 1 : 0) - 1 / n;
        const b = j <= k ? 1 / norm : -(k + 1) / norm;
        dot += q * b;
      }
      v.push(dot * Math.sqrt(n));
    }
    out.push(v);
  }
  return out;
}
export function starPolygon(n: number, d: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    out.push([Math.cos(a), Math.sin(a)]);
  }
  return out;
}
