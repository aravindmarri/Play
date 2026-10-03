import * as THREE from 'three';
// Renderer creation is isolated from levels for a future WebGPU backend.
export function createRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!context) throw new Error('This room needs WebGL2. Please enable hardware acceleration or try another browser.');
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  return renderer;
}
