import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGeometry } from './geometry/builder';
import { projectND, rotateND, toHyperboloid, type ProjMode } from './project/projection';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const exprEl = document.getElementById('expr') as HTMLInputElement;
const projEl = document.getElementById('proj') as HTMLSelectElement;
const spinEl = document.getElementById('spin') as HTMLInputElement;
const xwEl = document.getElementById('xw') as HTMLInputElement;
const ywEl = document.getElementById('yw') as HTMLInputElement;
const zwEl = document.getElementById('zw') as HTMLInputElement;
const showFacesEl = document.getElementById('showFaces') as HTMLInputElement;
const faceColorEl = document.getElementById('faceColor') as HTMLInputElement;
const faceOpacityEl = document.getElementById('faceOpacity') as HTMLInputElement;
const showEdgesEl = document.getElementById('showEdges') as HTMLInputElement;
const hyperEl = document.getElementById('hyper') as HTMLInputElement;
const rangeEl = document.getElementById('range') as HTMLInputElement;
const querySymbol = new URLSearchParams(location.search).get('s');
if (querySymbol) exprEl.value = querySymbol;
if (new URLSearchParams(location.search).get('spin') === '0') spinEl.checked = false;
if (new URLSearchParams(location.search).get('faces') === '0') showFacesEl.checked = false;
const infoEl = document.getElementById('info')!;
const errEl = document.getElementById('err')!;
const readingEl = document.getElementById('reading')!;
const plateSymbolEl = document.getElementById('plateSymbol')!;
const presetsEl = document.getElementById('presets')!;

const PRESET_GROUPS: [string, string[]][] = [
  ['Polyhedra', ['{4,3}', 't{4,3}', 'r{4,3}', 'tr{4,3}', 'tt{4,3}', 's{4,3}', 's{5,3}', 'sr{5,3}', '{3,5}']],
  ['Stars', ['{5/2}', '{5/2,5}', '{5,5/2}', '{5/2,3}', '{3,5/2}']],
  ['Tilings', ['{4,4}', '{3,6}', '{6,3}', '{4,5}', '{3,7}']],
  ['Spherical', ['{2,5}', '{5,2}', '{2,1}']],
  ['Four-dimensional', ['{4,3,3}', '{3,3,4}', '{3,4,3}', '{4,3,4}', '{4,3,5}', '{3,5,3}', '{5,3,3}']],
  ['Products & joins', ['{4}x{}', '{3}+{4}', '{4,3}v()', '{}v()', '{}v{}', '{}x{}', '{}+{}', 't{4}x{}']],
  ['Special', ['E:{4,3,3}', 'H:{4,3,5}', 'H:{5,3,4}']],
];
for (const [name, items] of PRESET_GROUPS) {
  const group = document.createElement('div');
  group.className = 'preset-group';
  const title = document.createElement('h3');
  title.textContent = name;
  const chips = document.createElement('div');
  chips.className = 'chips';
  for (const p of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p;
    b.onclick = () => { exprEl.value = p; rebuild(); };
    chips.appendChild(b);
  }
  group.append(title, chips);
  presetsEl.appendChild(group);
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xfbfbfc, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0.8, 6);

// Mouse 3D rotation / zoom / pan for post-projection 3D view
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 30;

{
  const cam = new URLSearchParams(location.search).get('cam');
  if (cam) {
    const [x, y, z] = cam.split(',').map(Number);
    if ([x, y, z].every(Number.isFinite)) camera.position.set(x, y, z);
  }
}

let group = new THREE.Group();
scene.add(group);
scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const dir = new THREE.DirectionalLight(0xffffff, 1.1);
dir.position.set(4, 6, 8);
scene.add(dir);

function resize() {
  const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function fitView() {
  if (!baseVerts.length) return;
  resize();
  const p = projectND(baseVerts, projEl.value as ProjMode);
  let cx = 0, cy = 0, cz = 0;
  for (const q of p) {
    cx += q[0];
    cy += q[1];
    cz += q[2];
  }
  cx /= p.length;
  cy /= p.length;
  cz /= p.length;
  let r = 0;
  for (const q of p) r = Math.max(r, Math.hypot(q[0] - cx, q[1] - cy, q[2] - cz));
  if (!Number.isFinite(r) || r <= 0) return;
  const dir = camera.position.clone().sub(controls.target);
  if (dir.lengthSq() < 1e-9) dir.set(0, 0.13, 1);
  dir.normalize();
  const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
  const margin = camera.aspect < 1 ? 1.12 : 1.28;
  const d = (r / Math.sin(Math.min(vHalf, hHalf))) * margin;
  controls.target.set(cx, cy, cz);
  camera.position.copy(controls.target).addScaledVector(dir, Math.min(30, Math.max(2, d)));
  controls.update();
}

let baseVerts: number[][] = [];
let baseEdges: [number, number][] = [];
let baseFaces: number[][] = [];
let baseNote = '';
let baseDim = 0;
let angle = 0;
let fittedExpr = '';

const hyperRow = hyperEl.closest('.check') as HTMLElement | null;

function setHyperAvailable(available: boolean) {
  hyperEl.disabled = !available;
  if (!available) hyperEl.checked = false;
  hyperRow?.classList.toggle('is-disabled', !available);
  if (hyperRow) {
    hyperRow.title = available
      ? '쌍곡 테셀레이션을 쌍곡면 위로 들어올립니다'
      : '쌍곡 테셀레이션에서만 사용할 수 있습니다';
  }
}

function describeNote(note: string): string {
  if (note.startsWith('S ')) return `Spherical ${note.slice(2)}`;
  if (note.startsWith('E ')) return `Euclidean ${note.slice(2)}`;
  if (note.startsWith('H ')) return `Hyperbolic ${note.slice(2)}`;
  return note;
}

function pageTitle(symbol: string, note: string, error: string): string {
  if (error) return symbol ? `${symbol} · Invalid symbol — Schlaf` : 'Schlaf — Invalid symbol';
  const summary = describeNote(note).split(' · ')[0].replace(/\s+\{?[\d/.,]+\}?\s*$/, '').trim();
  if (!summary) return `${symbol} — Schlaf`;
  return `${symbol} · ${summary.charAt(0).toUpperCase()}${summary.slice(1)} — Schlaf`;
}

function rebuild() {
  errEl.textContent = '';
  let hyperAvailable = false;
  try {
    const g = buildGeometry(exprEl.value, { range: parseInt(rangeEl.value, 10) });
    baseVerts = g.vertices;
    baseEdges = g.edges;
    baseFaces = g.faces ?? [];
    baseNote = g.note;
    baseDim = g.dim;
    hyperAvailable = g.space === 'H' && toHyperboloid(g.vertices) !== null;
  } catch (e: unknown) {
    errEl.textContent = e instanceof Error ? e.message : String(e);
    baseVerts = [];
    baseEdges = [];
    baseFaces = [];
    baseNote = '';
    baseDim = 0;
  }
  setHyperAvailable(hyperAvailable);
  readingEl.textContent = describeNote(baseNote);
  plateSymbolEl.textContent = exprEl.value || '—';
  document.title = pageTitle(exprEl.value, baseNote, errEl.textContent ?? '');
  if (baseVerts.length && exprEl.value !== fittedExpr) {
    fittedExpr = exprEl.value;
    fitView();
  }
}

function frame() {
  const mode = projEl.value as ProjMode;
  let v = baseVerts.map((p) => [...p]);
  const t = angle + parseFloat(xwEl.value);
  const yw = parseFloat(ywEl.value), zw = parseFloat(zwEl.value);
  if (v[0]?.length >= 5) {
    v = rotateND(v, [0, 4], t * 0.5);
    v = rotateND(v, [1, 3], yw);
  }
  if (v[0]?.length >= 4) v = rotateND(rotateND(v, [0, 3], t * 0.4), [1, 2], zw + t * 0.2);
  else if (v[0]?.length >= 3) v = rotateND(v, [0, 1], t * 0.2);
  let lifted = false;
  if (hyperEl.checked) {
    const up = toHyperboloid(v);
    if (up) {
      let m = 0;
      for (const p of up) for (const x of p) m = Math.max(m, Math.abs(x));
      v = Number.isFinite(m) && m > 6 ? up.map((p) => p.map((x) => (x * 6) / m)) : up;
      lifted = true;
    }
  }
  const p3 = projectND(v, mode);
  scene.remove(group);
  group = new THREE.Group();
  if (p3.length && (baseEdges.length || baseFaces.length)) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const p of p3) {
      cx += p[0];
      cy += p[1];
      cz += p[2];
    }
    const nn = p3.length || 1;
    cx /= nn;
    cy /= nn;
    cz /= nn;
    const k = 1.002;
    const lift = (v: number[]): number[] => [cx + (v[0] - cx) * k, cy + (v[1] - cy) * k, cz + (v[2] - cz) * k];
    if (showFacesEl.checked && baseFaces.length) {
      const idx: number[] = [];
      for (const f of baseFaces) {
        if (f.every((v) => v < p3.length)) idx.push(f[0], f[1], f[2]);
      }
      if (idx.length) {
        const fg = new THREE.BufferGeometry();
        fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p3.flat()), 3));
        fg.setIndex(idx);
        fg.computeVertexNormals();
        const op = parseFloat(faceOpacityEl.value);
        group.add(new THREE.Mesh(
          fg,
          new THREE.MeshStandardMaterial({
            color: faceColorEl.value, transparent: op < 1, opacity: op,
            side: THREE.DoubleSide, roughness: 0.55, metalness: 0.05,
            polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2,
          }),
        ));
      }
    }
    if (showEdgesEl.checked && baseEdges.length) {
      const pos = new Float32Array(baseEdges.length * 6);
      baseEdges.forEach(([a, b], i) => {
        if (a < p3.length && b < p3.length) {
          const pa = lift(p3[a]);
          const pb = lift(p3[b]);
          pos.set([pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]], i * 6);
        }
      });
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const lines = new THREE.LineSegments(
        lg,
        new THREE.LineBasicMaterial({ color: 0x1b1e24, depthWrite: false }),
      );
      lines.renderOrder = 999;
      group.add(lines);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(p3.map(lift).flat()), 3));
    const points = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x16181c, size: 0.045 }));
    points.renderOrder = 1000;
    group.add(points);
  }
  scene.add(group);
  const info = `dim ${baseDim} · V ${baseVerts.length} · E ${baseEdges.length} · T ${baseFaces.length} · ${lifted ? 'hyperboloid' : mode}`;
  if (infoEl.textContent !== info) infoEl.textContent = info;
  resize();
  controls.update();
  renderer.render(scene, camera);
}

const OUTPUTS: [HTMLInputElement, string, (value: string) => string][] = [
  [rangeEl, 'rangeOut', (v) => v],
  [faceOpacityEl, 'faceOpacityOut', (v) => v],
  [xwEl, 'xwOut', (v) => Number(v).toFixed(2)],
  [ywEl, 'ywOut', (v) => Number(v).toFixed(2)],
  [zwEl, 'zwOut', (v) => Number(v).toFixed(2)],
];
for (const [el, id, format] of OUTPUTS) {
  const out = document.getElementById(id);
  if (!out) continue;
  const sync = () => { out.textContent = format(el.value); };
  el.addEventListener('input', sync);
  sync();
}

exprEl.oninput = rebuild;
projEl.onchange = () => { fitView(); };
rangeEl.oninput = rebuild;
for (const el of [xwEl, ywEl, zwEl]) el.oninput = () => {};
(function loop() {
  if (spinEl.checked) angle += 0.01;
  frame();
  requestAnimationFrame(loop);
})();
rebuild();
