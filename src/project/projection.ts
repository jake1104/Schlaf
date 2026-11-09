export type ProjMode = 'perspective' | 'stereographic';
export function toHyperboloid(pts: number[][]): number[][] | null {
  for (const p of pts) {
    if (p.length !== 2) return null;
    if (!(p[0] * p[0] + p[1] * p[1] < 1 - 1e-9)) return null;
  }
  return pts.map(([x, y]) => {
    const r2 = x * x + y * y;
    const d = 1 - r2;
    return [(2 * x) / d, (2 * y) / d, (1 + r2) / d];
  });
}
function stepDown(pts: number[][], mode: ProjMode, dist = 2.2): number[][] {
  return pts.map((p) => {
    const n = p.length;
    if (n <= 3) return [...p];
    const w = p[n - 1];
    const rest = p.slice(0, n - 1);
    if (mode === 'perspective') {
      const k = dist / Math.max(0.2, dist - w);
      return rest.map((x) => x * k);
    }
    // stereographic from pole at +1 (normalize w to [-1,1] guard)
    const denom = Math.max(1e-3, 1.2 - w / 2);
    return rest.map((x) => x / denom);
  });
}
export function projectND(pts: number[][], mode: ProjMode): number[][] {
  let cur = pts.map((p) => [...p]);
  let guard = 0;
  while (cur.length && cur[0].length > 3 && guard++ < 12) cur = stepDown(cur, mode);
  // pad to 3d
  return cur.map((p) => [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0]);
}
export function rotateND(pts: number[][], plane: [number, number], angle: number): number[][] {
  const [a, b] = plane;
  const c = Math.cos(angle), s = Math.sin(angle);
  return pts.map((p) => {
    const q = [...p];
    if (a < q.length && b < q.length) {
      const x = q[a], y = q[b];
      q[a] = x * c - y * s; q[b] = x * s + y * c;
    }
    return q;
  });
}
