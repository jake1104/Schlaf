import { describe, expect, it } from 'vitest';
import { describeError, localizeNote, pageTitle } from '../src/i18n';

describe('i18n', () => {
  it('expands space abbreviations for English', () => {
    expect(localizeNote('S polytope', 'en')).toBe('Spherical polytope');
    expect(localizeNote('E polytope', 'en')).toBe('Euclidean polytope');
    expect(localizeNote('H polytope', 'en')).toBe('Hyperbolic polytope');
  });

  it('translates common geometry notes for Korean', () => {
    expect(localizeNote('S polytope', 'ko')).toBe('구면 다포체');
    expect(localizeNote('spherical hosohedron {2,5} · 57 verts', 'ko')).toBe('구면 호소헤드론 {2,5} · 57 꼭짓점');
    expect(localizeNote('euclidean honeycomb cutoff: central cells only', 'ko')).toBe('유클리드 허니컴 컷오프: 중앙 셀만');
  });

  it('translates hyperbolic tiling notes for Korean', () => {
    const note = 'hyperbolic tiling 4,5 · Poincare disk · operator t · range cutoff (capped)';
    expect(localizeNote(note, 'ko')).toBe('쌍곡 테셀레이션 4,5 · 푸앵카레 원반 · 연산자 t · 범위 컷오프 (제한됨)');
  });

  it('builds a localized page title', () => {
    expect(pageTitle('{4,3}', 'S polytope', '', 'en')).toBe('{4,3} · Spherical polytope — Schlaf');
    expect(pageTitle('{4,3}', 'S polytope', '', 'ko')).toBe('{4,3} · 구면 다포체 — Schlaf');
    expect(pageTitle('{4,5}', 'hyperbolic tiling 4,5 · Poincare disk', '', 'ko')).toBe('{4,5} · 쌍곡 테셀레이션 — Schlaf');
  });

  it('localizes the invalid-symbol title', () => {
    expect(pageTitle('{1,3}', '', 'does not exist', 'en')).toBe('{1,3} · Invalid symbol — Schlaf');
    expect(pageTitle('{1,3}', '', 'does not exist', 'ko')).toBe('{1,3} · 잘못된 기호 — Schlaf');
  });

  it('maps parser errors to friendly messages', () => {
    expect(describeError('shape does not exist: {1,3}', 'en')).toContain('does not exist');
    expect(describeError('shape does not exist: {1,3}', 'ko')).toContain('존재하지');
    expect(describeError('invalid schlafli: {', 'ko')).toContain('올바른');
    expect(describeError('not a Wythoff position: x', 'en')).toContain('operator');
  });
});
