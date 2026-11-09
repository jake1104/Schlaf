// Testable orbit state for mouse 3D rotation.
// main.ts binds this to THREE.OrbitControls (real mouse control);
// these pure functions are the testable core + fallback drag math.
export interface OrbitState { yaw: number; pitch: number; dist: number; }
export function createOrbit(dist = 6): OrbitState {
  return { yaw: 0, pitch: 0.3, dist };
}
export function applyDrag(s: OrbitState, dx: number, dy: number): OrbitState {
  return {
    yaw: s.yaw + dx * 0.005,
    pitch: Math.max(-1.4, Math.min(1.4, s.pitch + dy * 0.005)),
    dist: s.dist,
  };
}
export function applyZoom(s: OrbitState, delta: number): OrbitState {
  return { ...s, dist: Math.max(2, Math.min(30, s.dist * (1 + delta * 0.001))) };
}
