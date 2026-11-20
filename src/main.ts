import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGeometry } from './geometry/builder';
import { projectND, rotateND, toHyperboloid, type ProjMode } from './project/projection';
import { describeError, localizeNote, pageTitle, STRINGS, type GroupKey, type Lang, type UiKey } from './i18n';

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
const params = new URLSearchParams(location.search);
const querySymbol = params.get('s');
if (querySymbol) exprEl.value = querySymbol;
if (params.get('spin') === '0') spinEl.checked = false;
if (params.get('faces') === '0') showFacesEl.checked = false;
if (params.get('edges') === '0') showEdgesEl.checked = false;
if (params.get('proj') === 'stereographic') projEl.value = 'stereographic';
hyperEl.checked = params.get('hyper') === '1';
const rangeParam = params.get('range');
if (rangeParam !== null) {
  const value = Number(rangeParam);
  if (Number.isFinite(value)) rangeEl.value = String(Math.min(4, Math.max(1, Math.round(value))));
}
for (const [el, name] of [[xwEl, 'xw'], [ywEl, 'yw'], [zwEl, 'zw']] as [HTMLInputElement, string][]) {
  const raw = params.get(name);
  if (raw === null) continue;
  const value = Number(raw);
  if (Number.isFinite(value)) el.value = String(Math.min(6.28, Math.max(0, value)));
}
const opacityParam = params.get('opacity');
if (opacityParam !== null) {
  const value = Number(opacityParam);
  if (Number.isFinite(value)) faceOpacityEl.value = String(Math.min(1, Math.max(0, value)));
}
const faceParam = params.get('face');
if (faceParam && /^#[0-9a-f]{6}$/i.test(faceParam)) faceColorEl.value = faceParam;
let initialLang: Lang = 'en';
const queryLang = params.get('lang');
if (queryLang === 'ko' || queryLang === 'en') {
  initialLang = queryLang;
} else {
  try {
    const savedLang = localStorage.getItem('schlaf-lang');
    if (savedLang === 'ko' || savedLang === 'en') initialLang = savedLang;
  } catch {}
}
let currentLang: Lang = 'en';
let copyTimer = 0;
let sharedCam = false;

function uiText(key: UiKey): string {
  return STRINGS[currentLang][key];
}

const infoEl = document.getElementById('info')!;
const errEl = document.getElementById('err')!;
const readingEl = document.getElementById('reading')!;
const plateSymbolEl = document.getElementById('plateSymbol')!;
const presetsEl = document.getElementById('presets')!;
const galleryEl = document.getElementById('gallery')!;
const copyLinkEl = document.getElementById('copyLink') as HTMLButtonElement;
const copyStatusEl = document.getElementById('copyStatus')!;
const resetViewEl = document.getElementById('resetView') as HTMLButtonElement;

const PRESET_GROUPS: [GroupKey, string[]][] = [
  ['polyhedra', ['{4,3}', 't{4,3}', 'r{4,3}', 'tr{4,3}', 'tt{4,3}', 's{4,3}', 's{5,3}', 'sr{5,3}', '{3,5}']],
  ['stars', ['{5/2}', '{5/2,5}', '{5,5/2}', '{5/2,3}', '{3,5/2}']],
  ['tilings', ['{4,4}', '{3,6}', '{6,3}', '{4,5}', '{3,7}']],
  ['spherical', ['{2,5}', '{5,2}', '{2,1}']],
  ['fourD', ['{4,3,3}', '{3,3,4}', '{3,4,3}', '{4,3,4}', '{4,3,5}', '{3,5,3}', '{5,3,3}']],
  ['products', ['{4}x{}', '{3}+{4}', '{4,3}v()', '{}v()', '{}v{}', '{}x{}', '{}+{}', 't{4}x{}']],
  ['special', ['E:{4,3,3}', 'H:{4,3,5}', 'H:{5,3,4}']],
];
for (const [key, items] of PRESET_GROUPS) {
  const group = document.createElement('div');
  group.className = 'preset-group';
  const title = document.createElement('h3');
  title.dataset.group = key;
  title.textContent = STRINGS[currentLang].groups[key];
  const chips = document.createElement('div');
  chips.className = 'chips';
  for (const p of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p;
    b.onclick = () => { exprEl.value = p; rebuild(); syncUrl(); };
    chips.appendChild(b);
  }
  group.append(title, chips);
  presetsEl.appendChild(group);
}

const GALLERY: [string, UiKey][] = [
  ['{4,3}', 'galleryCube'],
  ['{5/2,5}', 'galleryStar'],
  ['{4,5}', 'galleryHyperbolic'],
  ['{4,3,4}', 'galleryHoneycomb'],
  ['{4,3,3}', 'galleryTesseract'],
  ['{4,3}v()', 'galleryPyramid'],
];
for (const [symbol, key] of GALLERY) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gallery-item';
  button.dataset.gallery = key;
  const sym = document.createElement('span');
  sym.className = 'gallery-symbol';
  sym.textContent = symbol;
  const desc = document.createElement('span');
  desc.className = 'gallery-desc';
  desc.textContent = STRINGS[currentLang][key];
  button.append(sym, desc);
  button.onclick = () => { exprEl.value = symbol; rebuild(); syncUrl(); };
  galleryEl.appendChild(button);
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
  const cam = params.get('cam');
  if (cam) {
    const [x, y, z] = cam.split(',').map(Number);
    if ([x, y, z].every(Number.isFinite)) {
      camera.position.set(x, y, z);
      sharedCam = true;
    }
  }
  const target = params.get('target');
  if (target) {
    const [x, y, z] = target.split(',').map(Number);
    if ([x, y, z].every(Number.isFinite)) {
      controls.target.set(x, y, z);
      sharedCam = true;
    }
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
let baseError = '';
let angle = 0;
let fittedExpr = '';

const hyperRow = hyperEl.closest('.check') as HTMLElement | null;

function setHyperAvailable(available: boolean) {
  hyperEl.disabled = !available;
  if (!available) hyperEl.checked = false;
  hyperRow?.classList.toggle('is-disabled', !available);
  if (hyperRow) {
    hyperRow.title = available ? uiText('hyperNoteOn') : uiText('hyperNoteOff');
  }
}

function rebuild() {
  errEl.textContent = '';
  errEl.removeAttribute('title');
  baseError = '';
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
    baseError = e instanceof Error ? e.message : String(e);
    errEl.textContent = describeError(baseError, currentLang);
    errEl.title = baseError;
    baseVerts = [];
    baseEdges = [];
    baseFaces = [];
    baseNote = '';
    baseDim = 0;
    sharedCam = false;
  }
  setHyperAvailable(hyperAvailable);
  readingEl.textContent = localizeNote(baseNote, currentLang);
  plateSymbolEl.textContent = exprEl.value || '—';
  document.title = pageTitle(exprEl.value, baseNote, errEl.textContent ?? '', currentLang);
  if (baseVerts.length && exprEl.value !== fittedExpr) {
    fittedExpr = exprEl.value;
    if (!sharedCam) fitView();
    sharedCam = false;
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
  const modeLabel = projEl.selectedOptions[0]?.textContent ?? mode;
  const info = `${uiText('dim')} ${baseDim} · V ${baseVerts.length} · E ${baseEdges.length} · T ${baseFaces.length} · ${lifted ? uiText('hyperboloid') : modeLabel}`;
  if (infoEl.textContent !== info) infoEl.textContent = info;
  resize();
  controls.update();
  renderer.render(scene, camera);
}

function applyLanguage(lang: Lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n as UiKey | undefined;
    if (key) el.textContent = STRINGS[lang][key];
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-group]')) {
    const key = el.dataset.group as GroupKey | undefined;
    if (key) el.textContent = STRINGS[lang].groups[key];
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-gallery]')) {
    const key = el.dataset.gallery as UiKey | undefined;
    const desc = el.querySelector<HTMLElement>('.gallery-desc');
    if (key && desc) desc.textContent = STRINGS[lang][key];
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('.lang-switch button')) {
    const active = button.dataset.lang === lang;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  window.clearTimeout(copyTimer);
  copyLinkEl.textContent = STRINGS[lang].copyLink;
  copyStatusEl.textContent = '';
  if (baseError) {
    errEl.textContent = describeError(baseError, lang);
    errEl.title = baseError;
  }
  readingEl.textContent = localizeNote(baseNote, lang);
  document.title = pageTitle(exprEl.value, baseNote, errEl.textContent ?? '', lang);
  setHyperAvailable(!hyperEl.disabled);
  try {
    localStorage.setItem('schlaf-lang', lang);
  } catch {}
  syncUrl();
}

function stateParams(): URLSearchParams {
  const result = new URLSearchParams();
  result.set('s', exprEl.value);
  result.set('lang', currentLang);
  if (projEl.value === 'stereographic') result.set('proj', 'stereographic');
  if (hyperEl.checked) result.set('hyper', '1');
  if (!spinEl.checked) result.set('spin', '0');
  if (!showFacesEl.checked) result.set('faces', '0');
  if (!showEdgesEl.checked) result.set('edges', '0');
  if (rangeEl.value !== '3') result.set('range', rangeEl.value);
  for (const [el, name] of [[xwEl, 'xw'], [ywEl, 'yw'], [zwEl, 'zw']] as [HTMLInputElement, string][]) {
    const value = Number(el.value);
    if (Math.abs(value) > 1e-6) result.set(name, value.toFixed(2));
  }
  if (faceColorEl.value.toLowerCase() !== '#1d5fbf') result.set('face', faceColorEl.value);
  if (Math.abs(Number(faceOpacityEl.value) - 0.55) > 1e-6) {
    result.set('opacity', Number(faceOpacityEl.value).toFixed(2));
  }
  result.set('cam', [camera.position.x, camera.position.y, camera.position.z].map((value) => value.toFixed(2)).join(','));
  if (controls.target.lengthSq() > 1e-6) {
    result.set('target', [controls.target.x, controls.target.y, controls.target.z].map((value) => value.toFixed(2)).join(','));
  }
  return result;
}

function shareUrl(): string {
  const url = new URL(location.href);
  url.search = stateParams().toString();
  url.hash = '';
  return url.toString();
}

function syncUrl() {
  try {
    history.replaceState(null, '', shareUrl());
  } catch {}
}

async function copyShareLink() {
  const url = shareUrl();
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch {
    const area = document.createElement('textarea');
    area.value = url;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      copied = document.execCommand('copy');
    } catch {}
    area.remove();
  }
  const label = copied ? uiText('copied') : uiText('copyFailed');
  copyLinkEl.textContent = label;
  copyStatusEl.textContent = label;
  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    copyLinkEl.textContent = uiText('copyLink');
    copyStatusEl.textContent = '';
  }, 1600);
  if (copied) {
    try {
      history.replaceState(null, '', url);
    } catch {}
  }
}

function resetView() {
  controls.target.set(0, 0, 0);
  camera.position.set(0, 0.8, 6);
  controls.update();
  fitView();
  syncUrl();
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

exprEl.oninput = () => { rebuild(); syncUrl(); };
projEl.onchange = () => { fitView(); syncUrl(); };
rangeEl.oninput = rebuild;
rangeEl.addEventListener('change', syncUrl);
for (const el of [xwEl, ywEl, zwEl]) {
  el.oninput = () => {};
  el.addEventListener('change', syncUrl);
}
spinEl.addEventListener('change', syncUrl);
showFacesEl.addEventListener('change', syncUrl);
showEdgesEl.addEventListener('change', syncUrl);
hyperEl.addEventListener('change', syncUrl);
faceColorEl.addEventListener('change', syncUrl);
faceOpacityEl.addEventListener('change', syncUrl);
copyLinkEl.addEventListener('click', copyShareLink);
resetViewEl.addEventListener('click', resetView);
for (const button of document.querySelectorAll<HTMLButtonElement>('.lang-switch button')) {
  button.addEventListener('click', () => {
    const lang = button.dataset.lang;
    if (lang === 'en' || lang === 'ko') applyLanguage(lang);
  });
}
(function loop() {
  if (spinEl.checked) angle += 0.01;
  frame();
  requestAnimationFrame(loop);
})();
applyLanguage(initialLang);
rebuild();
syncUrl();
