// The circuit laid out flat on a bench, using the real board models.
// Every connection in data.js becomes a wire between two pads on those boards.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDERS } from './models.js';
import { makeStage, makeTags, paint, tagPart } from './kit.js';
import { WIRE_COLORS, WIRING_STEPS } from './data.js';

// Where each board sits on the bench: [x, z] in 10 mm units, plus a name.
const LAYOUT = {
  bat:  { name: 'li-po cell', pos: [-8.4, 3.2] },
  tp:   { name: 'tp4056', pos: [-4.4, 3.6] },
  sw:   { name: 'switch', pos: [-2.4, 1.6] },
  mt:   { name: 'mt3608', pos: [-0.4, 4.2] },
  div:  { name: 'gauge divider', pos: [-5.0, 0.2] },
  palm: { name: 'palm button', pos: [-7.6, -3.0] },
  idx:  { name: 'index buttons', pos: [-2.6, -3.6] },
  esp:  { name: 'esp32', pos: [4.6, 0.6] },
  mpu:  { name: 'mpu6050', pos: [9.8, -0.6] },
};

const CENTRE = new THREE.Vector3(0.8, 0, 0.6);
const shortName = (pad) => pad.replace(/^GND[LR]$/, 'GND').replace('-', '−');

export function initWiring(canvas, { onPick } = {}) {
  const stage = makeStage(canvas, {
    fov: 30,
    // Pull the camera back on narrow screens so the whole bench stays in view.
    onResize(camera, aspect) {
      const distance = 27 * Math.max(1, 2.0 / aspect);
      camera.position.set(CENTRE.x, distance * 0.86, CENTRE.z + distance * 0.5);
      camera.lookAt(CENTRE);
    },
  });
  const { scene, camera } = stage;
  const bench = new THREE.Group();
  scene.add(bench);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(CENTRE);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.25;
  controls.minAzimuthAngle = -0.9;
  controls.maxAzimuthAngle = 0.9;
  canvas.style.touchAction = 'pan-y';

  const tags = makeTags(canvas.parentElement.querySelector('.tags'), camera, canvas);
  stage.attachTags(tags);

  const used = new Set();
  WIRING_STEPS.forEach((s) => s.wires.forEach((w) => { used.add(w.from); used.add(w.to); }));

  // ---- boards
  const world = {};   // "mod.pad" -> { position, pin, tag }
  for (const [id, spec] of Object.entries(LAYOUT)) {
    const built = BUILDERS[id]();
    built.group.position.set(spec.pos[0], 0, spec.pos[1]);
    tagPart(built.group, id);
    bench.add(built.group);

    const [w, d] = built.size;
    const nameAnchor = new THREE.Object3D();
    nameAnchor.position.set(-w / 2, 0.1, -d / 2 - 0.25);
    built.group.add(nameAnchor);
    tags.add({ text: spec.name, anchor: nameAnchor, side: 'r', length: 0, quiet: true });

    for (const [pad, local] of Object.entries(built.pads)) {
      const key = `${id}.${pad}`;
      const anchor = new THREE.Object3D();
      anchor.position.copy(local);
      built.group.add(anchor);
      let tag = null;
      if (used.has(key)) {
        tag = tags.add({
          text: shortName(pad), anchor, id: key,
          side: local.x < 0 ? 'l' : 'r', length: id === 'esp' ? 14 : 10, quiet: false,
        });
        tag.classList.add('pin');
      }
      world[key] = { position: new THREE.Vector3(spec.pos[0] + local.x, local.y + 0.02, spec.pos[1] + local.z), pin: built.pinMeshes[pad], tag };
    }
  }
  paint(bench, 'dark');

  // ---- wires
  const wires = [];
  WIRING_STEPS.forEach((step, stepIndex) => {
    step.wires.forEach((w, i) => {
      const a = world[w.from].position;
      const b = world[w.to].position;
      const span = a.distanceTo(b);
      const mid = a.clone().lerp(b, 0.5);
      mid.y = 0.9 + span * 0.13 + i * 0.16;  // longer wires arc higher; siblings fan out
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, w.color === 'power' || w.color === 'ground' ? 0.07 : 0.055, 8),
        new THREE.MeshLambertMaterial({ color: WIRE_COLORS[w.color], transparent: true }),
      );
      bench.add(mesh);
      wires.push({ mesh, step: stepIndex, from: w.from, to: w.to });
    });
  });

  // ---- step highlighting
  function setStep(index) {
    const all = index === null || index === undefined;
    const active = new Set();
    for (const w of wires) {
      const on = all || w.step === index;
      w.mesh.material.opacity = on ? 1 : 0.12;
      w.mesh.renderOrder = on ? 2 : 1;
      if (on && !all) { active.add(w.from); active.add(w.to); }
    }
    for (const [key, pad] of Object.entries(world)) {
      if (!pad.tag) continue;
      const on = active.has(key);
      pad.tag.classList.toggle('on', on);
      pad.pin.scale.set(on ? 2.2 : 1, on ? 1.6 : 1, on ? 2.2 : 1);
    }
    paint(bench, 'dark', all ? null : WIRING_STEPS[index].focus ?? null);
  }
  setStep(null);

  // ---- clicking a wire selects its step
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(wires.map((w) => w.mesh))[0];
    if (hit && onPick) onPick(wires.find((w) => w.mesh === hit.object).step);
  });

  stage.run(() => controls.update());
  return { setStep };
}
