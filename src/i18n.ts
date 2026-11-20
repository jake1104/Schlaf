export const STRINGS = {
  en: {
    subtitle: 'Schläfli symbol renderer',
    specimen: 'Specimen',
    field: 'Schläfli symbol',
    view: 'View',
    projection: 'Projection',
    perspective: 'Perspective',
    stereographic: 'Stereographic',
    hyperboloid: 'Hyperboloid',
    autoRotate: 'Auto-rotate',
    appearance: 'Appearance',
    faces: 'Faces',
    faceColor: 'Face color',
    faceOpacity: 'Face opacity',
    edges: 'Edges',
    rotation: 'Rotation',
    tilingRange: 'Tiling range',
    catalogue: 'Catalogue',
    plate: 'Plate',
    hint: 'Drag to rotate · Wheel to zoom · Right-drag to pan',
    copyLink: 'Copy link',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    resetView: 'Reset view',
    highlights: 'Highlights',
    galleryCube: 'Cube · spherical polytope',
    galleryStar: 'Small stellated dodecahedron',
    galleryHyperbolic: 'Hyperbolic tiling in the Poincaré disk',
    galleryHoneycomb: 'Cubic honeycomb',
    galleryTesseract: 'Tesseract · 4D',
    galleryPyramid: 'Square pyramid · join',
    hyperNoteOn: 'Lifts the hyperbolic tessellation onto the hyperboloid sheet',
    hyperNoteOff: 'Available for hyperbolic tessellations only',
    errInvalid: 'That is not a valid Schläfli symbol. Try {4,3}, t{4,3}, or {4,5}.',
    errNotExist: 'This symbol does not exist. Try {4,3} or {4,5}.',
    errOperator: "This operator is not defined for that symbol. Use '', t, r, rr, tr, s, or sr.",
    errUnavailable: 'No construction is available for this symbol. Try a lower dimension or a different operator.',
    errGeneric: 'The renderer could not build this symbol. Check the symbol and operator.',
    dim: 'dim',
    invalid: 'Invalid symbol',
    groups: {
      polyhedra: 'Polyhedra',
      stars: 'Stars',
      tilings: 'Tilings',
      spherical: 'Spherical',
      fourD: 'Four-dimensional',
      products: 'Products & joins',
      special: 'Special',
    },
  },
  ko: {
    subtitle: '슐레플리 기호 렌더러',
    specimen: '표본',
    field: '슐레플리 기호',
    view: '보기',
    projection: '투영',
    perspective: '원근',
    stereographic: '입체투영',
    hyperboloid: '쌍곡면',
    autoRotate: '자동회전',
    appearance: '모양',
    faces: '면 표시',
    faceColor: '면 색상',
    faceOpacity: '면 불투명도',
    edges: '간선 표시',
    rotation: '회전',
    tilingRange: '타일링 범위',
    catalogue: '카탈로그',
    plate: '도판',
    hint: '드래그 회전 · 휠 줌 · 우드래그 이동',
    copyLink: '링크 복사',
    copied: '복사됨',
    copyFailed: '복사 실패',
    resetView: '보기 초기화',
    highlights: '예시',
    galleryCube: '정육면체 · 구면 다포체',
    galleryStar: '작은 별모양 십이면체',
    galleryHyperbolic: '푸앵카레 원반의 쌍곡 테셀레이션',
    galleryHoneycomb: '정육면체 허니컴',
    galleryTesseract: '테서랙트 · 4차원',
    galleryPyramid: '정사각뿔 · 결합',
    hyperNoteOn: '쌍곡 테셀레이션을 쌍곡면 위로 들어올립니다',
    hyperNoteOff: '쌍곡 테셀레이션에서만 사용할 수 있습니다',
    errInvalid: '올바른 슐레플리 기호가 아닙니다. {4,3}, t{4,3}, {4,5} 등을 입력해 보세요.',
    errNotExist: '존재하지 않는 기호입니다. {4,3} 또는 {4,5}를 입력해 보세요.',
    errOperator: "이 기호에는 해당 연산자를 사용할 수 없습니다. '', t, r, rr, tr, s, sr 중에서 선택하세요.",
    errUnavailable: '이 기호로 만들 수 있는 구성이 없습니다. 더 낮은 차원이나 다른 연산자를 시도해 보세요.',
    errGeneric: '이 기호를 렌더링할 수 없습니다. 기호와 연산자를 확인해 보세요.',
    dim: '차원',
    invalid: '잘못된 기호',
    groups: {
      polyhedra: '다면체',
      stars: '별',
      tilings: '테셀레이션',
      spherical: '구면',
      fourD: '4차원',
      products: '곱과 결합',
      special: '특수',
    },
  },
} as const;

export type Lang = keyof typeof STRINGS;
export type UiKey = Exclude<keyof typeof STRINGS.en, 'groups'>;
export type GroupKey = keyof typeof STRINGS.en.groups;

const KO_NOTE: [string, string][] = [
  ['euclidean honeycomb cutoff: central cells only', '유클리드 허니컴 컷오프: 중앙 셀만'],
  ['hyperbolic honeycomb cutoff: central cells only', '쌍곡 허니컴 컷오프: 중앙 셀만'],
  ['spherical honeycomb cutoff: central cells only', '구면 허니컴 컷오프: 중앙 셀만'],
  ['honeycomb cutoff: central cells only', '허니컴 컷오프: 중앙 셀만'],
  ['wireframe (face search capped)', '와이어프레임 (면 탐색 제한)'],
  ['wireframe (no supporting faces)', '와이어프레임 (지지면 없음)'],
  ['best-effort non-uniform', '근사 비균일'],
  ['Spherical polytope', '구면 다포체'],
  ['Euclidean polytope', '유클리드 다포체'],
  ['Hyperbolic polytope', '쌍곡 다포체'],
  ['spherical hosohedron', '구면 호소헤드론'],
  ['spherical dihedron', '구면 디헤드론'],
  ['spherical honeycomb', '구면 허니컴'],
  ['euclidean honeycomb', '유클리드 허니컴'],
  ['euclidean tiling', '유클리드 테셀레이션'],
  ['hyperbolic tiling', '쌍곡 테셀레이션'],
  ['hyperbolic honeycomb', '쌍곡 허니컴'],
  ['Poincare disk', '푸앵카레 원반'],
  ['Poincare ball', '푸앵카레 공'],
  ['range cutoff', '범위 컷오프'],
  ['concave star', '오목 별'],
  ['operator', '연산자'],
  ['verts', '꼭짓점'],
  ['cells', '셀'],
  ['approximated', '근사'],
  ['wireframe', '와이어프레임'],
  ['cutoff', '컷오프'],
  ['capped', '제한됨'],
];

export function describeNote(note: string): string {
  if (note.startsWith('S ')) return `Spherical ${note.slice(2)}`;
  if (note.startsWith('E ')) return `Euclidean ${note.slice(2)}`;
  if (note.startsWith('H ')) return `Hyperbolic ${note.slice(2)}`;
  return note;
}

export function localizeNote(note: string, lang: Lang): string {
  const expanded = describeNote(note);
  if (lang === 'en') return expanded;
  let result = expanded;
  for (const [from, to] of KO_NOTE) result = result.split(from).join(to);
  return result;
}

export function describeError(raw: string, lang: Lang): string {
  const message = raw.toLowerCase();
  if (/does not exist|not exist/.test(message)) return STRINGS[lang].errNotExist;
  if (/invalid schlafli|invalid number|empty schlafli/.test(message)) return STRINGS[lang].errInvalid;
  if (/not a wythoff position|uniform:/.test(message)) return STRINGS[lang].errOperator;
  if (/no uniform|no finite|unsupported|not a finite|not a spherical|not a euclidean|no regular star|bad spherical rank|no wythoff point|no construction/.test(message)) {
    return STRINGS[lang].errUnavailable;
  }
  return STRINGS[lang].errGeneric;
}

export function pageTitle(symbol: string, note: string, error: string, lang: Lang): string {
  if (error) {
    if (lang === 'ko') return symbol ? `${symbol} · 잘못된 기호 — Schlaf` : 'Schlaf — 잘못된 기호';
    return symbol ? `${symbol} · Invalid symbol — Schlaf` : 'Schlaf — Invalid symbol';
  }
  const summary = localizeNote(note, lang).split(' · ')[0].replace(/\s+\{?[\d/.,]+\}?\s*$/, '').trim();
  if (!summary) return `${symbol} — Schlaf`;
  return `${symbol} · ${summary.charAt(0).toUpperCase()}${summary.slice(1)} — Schlaf`;
}
