export type SchlafliNum = number | { n: number; d: number };
export type Op = 't' | 'r' | 's';
export type ProductKind = 'prism' | 'tegum' | 'join';
export interface SchlafliNode {
  ops: Op[];
  base: SchlafliNum[];
  point?: boolean;
  products: { kind: ProductKind; node: SchlafliNode }[];
  space?: 'E' | 'S' | 'H';
}

function parseSingle(s: string): SchlafliNode {
  s = s.trim();
  let space: 'E' | 'S' | 'H' | undefined;
  const sp = s.match(/^([ESH])\s*:\s*(.*)$/);
  if (sp) {
    space = sp[1] as 'E' | 'S' | 'H';
    s = sp[2];
  }
  let ops: Op[] = [];
  const om = s.match(/^([trs]+)\s*(\{.*)$/);
  if (om) {
    ops = om[1].split('') as Op[];
    s = om[2];
  }
  if (s === '()') return { ops, base: [], products: [], point: true, ...(space ? { space } : {}) };
  const bm = s.match(/^\{\s*([^}]*)\s*\}$/);
  if (!bm) throw new Error(`invalid schlafli: ${s}`);
  const inner = bm[1].trim();
  const base: SchlafliNum[] = [];
  if (inner.length > 0) {
    for (const part of inner.split(',')) {
      const p = part.trim();
      if (!p) throw new Error(`invalid schlafli: ${s}`);
      const fm = p.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
      if (fm) base.push({ n: parseFloat(fm[1]), d: parseFloat(fm[2]) });
      else if (/^\d+(?:\.\d+)?$/.test(p)) base.push(parseFloat(p));
      else throw new Error(`invalid number: ${p}`);
    }
  }
  return { ops, base, products: [], ...(space ? { space } : {}) };
}

export function parseSchlafli(input: string): SchlafliNode {
  const s = input.trim();
  if (!s) throw new Error('empty schlafli');
  // split top-level products: x|× -> prism, + -> tegum, v|∨ -> join (outside braces)
  const parts: string[] = [];
  const ops: ProductKind[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{') depth++;
    if (c === '}') depth--;
    if (depth === 0 && (c === 'x' || c === '×' || c === '+' || c === 'v' || c === '∨')) {
      parts.push(cur);
      cur = '';
      ops.push(c === 'x' || c === '×' ? 'prism' : c === '+' ? 'tegum' : 'join');
    } else cur += c;
  }
  parts.push(cur);
  if (parts.some((p) => !p.trim())) throw new Error(`invalid schlafli: ${input}`);
  const head = parseSingle(parts[0]);
  for (let i = 0; i < ops.length; i++) {
    head.products.push({ kind: ops[i], node: parseSingle(parts[i + 1]) });
  }
  // normalize: chained products of same structure stay flat
  return head;
}
