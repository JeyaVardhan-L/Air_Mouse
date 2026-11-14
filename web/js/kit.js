// Shared three.js helpers for the site's 3D scenes. Every solid is a flat
// fill plus drawn edges, so the models read like architectural plates.
// Replaces the old cel-shaded "sticker" kit. Read by models.js, wiring.js, main.js.
import * as THREE from 'three';

export const C = { indigo: 0x1925aa, deep: 0x0d1355, bone: 0xe8e6e0, ink: 0x000000, paper: 0xffffff };

// Each role is [fill, edge]. "dark" scenes sit on the indigo band, "light" on bone.
export const THEMES = {
  light: {
    pcb: [C.indigo, C.ink], comp: [C.deep, C.ink], metal: [C.paper, C.ink], pin: [C.paper, C.ink],
    hole: [C.bone, C.bone], line: C.paper, cable: C.ink,
    sel: {},
  },
  dark: {
    pcb: [C.deep, C.bone], comp: [0x050733, C.bone], metal: [C.bone, C.deep], pin: [C.paper, C.deep],
    hole: [C.indigo, C.indigo], line: C.bone, cable: C.paper,
    sel: {
      pcb: [C.bone, C.deep], comp: [C.deep, C.deep], metal: [C.indigo, C.deep], pin: [C.indigo, C.deep],
      hole: [C.deep, C.deep], line: C.deep, cable: C.paper,
    },
  },
};

// ------------------------------------------------------------ solids
function finish(mesh, role, edgeAngle) {
  mesh.userData.role = role;
  if (edgeAngle !== null) {
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, edgeAngle),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    );
    edges.raycast = () => {};
    mesh.add(edges);
    mesh.userData.edge = edges.material;
  }
  return mesh;
}

function material() {
  return new THREE.MeshLambertMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
}

export function bx(w, h, d, role, edgeAngle = 30) {
  return finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material()), role, edgeAngle);
}

// Cylinder along Y; axis 'x' or 'z' lays it down.
export function cyl(r, h, role, axis = 'y', segments = 20) {
  const g = new THREE.CylinderGeometry(r, r, h, segments);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return finish(new THREE.Mesh(g, material()), role, 40);
}

export function at(object, x, y, z) {
  object.position.set(x, y, z);
  return object;
}

// A polyline drawn as a thin line (silkscreen, antenna meander, traces).
export function trace(points, y) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, y, z)));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffffff }));
  line.userData.role = 'line';
  line.raycast = () => {};
  return line;
}

export function cable(points, radius = 0.05) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, radius, 6), material());
  mesh.userData.role = 'cable';
  return mesh;
}

// ------------------------------------------------------------ theming
// Tag every mesh under `object` with a part id so clicks can find it.
export function tagPart(object, id) {
  object.traverse((o) => { o.userData.part = id; });
}

// Colour everything by role; the part named `selected` is drawn inverted.
export function paint(root, themeName, selected = null) {
  const theme = THEMES[themeName];
  root.traverse((o) => {
    const role = o.userData.role;
    if (!role) return;
    const chosen = o.userData.part === selected && theme.sel[role] ? theme.sel : theme;
    const entry = chosen[role];
    if (role === 'line' || role === 'cable') {
      o.material.color.setHex(entry);
    } else {
      o.material.color.setHex(entry[0]);
      if (o.userData.edge) o.userData.edge.color.setHex(entry[1]);
    }
  });
}

// X-ray mode: hide the fills and keep only the drawn edges.
export function setLineArt(root, on) {
  root.traverse((o) => {
    if (o.isMesh && o.userData.role && o.userData.role !== 'cable') o.material.visible = !on;
  });
}

// ------------------------------------------------------------ html labels
// Crisp mono labels pinned to points in the scene, each with a leader line.
export function makeTags(container, camera, canvas) {
  const tags = [];
  const v = new THREE.Vector3();

  function add({ text, anchor, side = 'r', length = 28, onClick, id, quiet = false }) {
    const node = document.createElement(onClick ? 'button' : 'span');
    node.className = `tag3d ${side === 'l' ? 'l' : 'r'}${quiet ? ' quiet' : ''}`;
    if (onClick) { node.type = 'button'; node.addEventListener('click', onClick); }
    node.style.setProperty('--len', `${length}px`);
    node.dataset.tag = id || '';
    node.innerHTML = '<b></b><span></span>';
    node.lastChild.textContent = text;
    container.append(node);
    tags.push({ node, anchor, id });
    return node;
  }

  function update() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    for (const t of tags) {
      t.anchor.getWorldPosition(v);
      v.project(camera);
      const hidden = v.z > 1 || v.z < -1;
      t.node.style.display = hidden ? 'none' : '';
      t.node.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }

  function select(id) {
    for (const t of tags) t.node.classList.toggle('on', t.id === id);
  }

  return { add, update, select };
}

// ------------------------------------------------------------ stage
// Renderer + scene + camera bound to a <canvas> sized by CSS. Pauses off screen.
export function makeStage(canvas, { fov = 30, onResize } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 300);

  scene.add(new THREE.AmbientLight(0xffffff, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-6, 14, 8);
  scene.add(key);

  const hooks = { tags: null };

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (onResize) onResize(camera, w / h);
    renderer.render(scene, camera);  // resizing clears the canvas; repaint at once
    if (hooks.tags) hooks.tags.update();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(canvas);

  function run(frame) {
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      if (!visible) return;
      frame(clock.getElapsedTime());
      renderer.render(scene, camera);
      if (hooks.tags) hooks.tags.update();
    });
  }

  return {
    renderer, scene, camera, run,
    attachTags(tags) { hooks.tags = tags; },
  };
}
