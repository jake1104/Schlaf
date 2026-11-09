// Cartesian prism (x), tegum/bipyramid sum (+), pyramid join (v)
export function prismProduct(a: number[][], b: number[][]): number[][] {
  // orthogonal concat; b=[[]] means unit segment
  const seg = b.length === 1 && b[0].length === 0 ? [[-1], [1]] : b;
  const out: number[][] = [];
  for (const x of a) for (const y of seg) out.push([...x, ...y]);
  return out;
}
export function tegumProduct(a: number[][], b: number[][]): number[][] {
  // direct sum: embed in orthogonal subspaces + convex hull verts union
  const da = a[0]?.length ?? 1, db = b[0]?.length ?? 1;
  const out: number[][] = [];
  for (const x of a) out.push([...x, ...new Array(db).fill(0)]);
  for (const y of b) out.push([...new Array(da).fill(0), ...y]);
  return out;
}
export function pyramidJoin(base: number[][]): number[][] {
  const d = base[0]?.length ?? 1;
  const apex = new Array(d).fill(0).concat(1);
  const lifted = base.map((v) => [...v, 0]);
  return [...lifted, apex];
}
export function joinProduct(a: number[][], da: number, b: number[][], db: number): number[][] {
  const va = a.length && a[0].length ? a : [[]];
  const vb = b.length && b[0].length ? b : [[]];
  const out: number[][] = [];
  for (const x of va) out.push([...x, ...new Array(db).fill(0), 0]);
  for (const y of vb) out.push([...new Array(da).fill(0), ...y, 1]);
  return out;
}
