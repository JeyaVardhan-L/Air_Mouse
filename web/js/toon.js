// Shared three.js helpers: a flat "sticker" look (cel shading + ink outline)
// and a stage that handles sizing and pauses when off screen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const INK = {
  cream: 0xfdfbf9,
  dew: 0xf7efe9,
  charcoal: 0x171717,
  cocoa: 0x2b1a07,
  orange: 0xff6f1e,
  sienna: 0xce500a,
  sky: 0x3b82f6,
  pink: 0xff66cf,
  green: 0x22c55e,
  mist: 0xbebcbb,
};

let gradient;
function gradientMap() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([150, 215, 255]), 3, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}

// Ink outline: the same shape drawn inside-out, pushed outward along its normals.
function outlineMaterial(thickness) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { thickness: { value: thickness }, ink: { value: new THREE.Color(INK.charcoal) } },
    vertexShader: `
      uniform float thickness;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 ink;
      void main() { gl_FragColor = vec4(ink, 1.0); }`,
  });
}

// A filled, outlined mesh. `fill` is remembered so line-art mode can swap it out.
export function solid(geometry, color, outline = 0.055) {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() }),
  );
  mesh.userData.fill = color;
  if (outline > 0) {
    const edge = new THREE.Mesh(geometry, outlineMaterial(outline));
    edge.raycast = () => {};
    mesh.add(edge);
  }
  return mesh;
}

export function box(w, h, d, color, radius = 0.1, outline) {
  const r = Math.min(radius, w / 2, h / 2, d / 2) * 0.98;
  return solid(new RoundedBoxGeometry(w, h, d, 3, r), color, outline);
}

// Cylinder along Y by default; axis 'x' or 'z' lays it down.
export function cylinder(radius, height, color, axis = 'y', outline) {
  const g = new THREE.CylinderGeometry(radius, radius, height, 24);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return solid(g, color, outline);
}

// Text that always faces the camera.
export function label(text, { size = 0.5, color = '#171717', weight = 600 } = {}) {
  const pad = 12;
  const px = 64;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${weight} ${px}px Fraunces, Georgia, serif`;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
  canvas.height = px + pad * 2;
  ctx.font = font;
  ctx.textBaseline = 'middle';
  // paper-coloured halo so the text stays readable over wires
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#f7efe9';
  ctx.strokeText(text, pad, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, pad, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set((size * canvas.width) / canvas.height, size, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// Renderer + scene + camera bound to a <canvas> that is sized by CSS.
export function makeStage(canvas, { fov = 32, onResize } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 300);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9dccf, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-6, 14, 8);
  scene.add(sun);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (onResize) onResize(camera, w / h);
    renderer.render(scene, camera);  // resizing clears the canvas; repaint at once
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }).observe(canvas);

  function run(frame) {
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      if (!visible) return;
      frame(clock.getElapsedTime());
      renderer.render(scene, camera);
    });
  }

  return { renderer, scene, camera, run };
}
