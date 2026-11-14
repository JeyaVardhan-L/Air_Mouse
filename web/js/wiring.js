// The circuit laid out flat on a workbench. Every module is a block with
// solder pads; every connection in data.js becomes a wire between two pads.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { INK, box, cylinder, label, makeStage } from './toon.js';
import { WIRE_COLORS, WIRING_STEPS } from './data.js';

// DOIT-style 30-pin DevKit, USB port at the bottom, pins listed top to bottom.
const ESP_LEFT = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GNDL', 'VIN'];
const ESP_RIGHT = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GNDR', '3V3'];
const PIN_PITCH = 0.36;

function espPads() {
  const pads = {};
  ESP_LEFT.forEach((name, i) => { pads[name] = [-1.2, (i - 7) * PIN_PITCH]; });
  ESP_RIGHT.forEach((name, i) => { pads[name] = [1.2, (i - 7) * PIN_PITCH]; });
  return pads;
}

// pos = centre on the bench [x, z]; size = [width, depth]; pads are relative to the centre.
const MODULES = {
  bat:  { name: 'li-po cell', pos: [-7.9, 3.6], size: [3.0, 2.0], color: INK.mist, height: 0.6,
          pads: { '+': [1.25, -0.45], '-': [1.25, 0.45] } },
  tp:   { name: 'tp4056 charger', pos: [-4.2, 3.6], size: [2.2, 1.7], color: INK.pink,
          pads: { 'B+': [-0.9, -0.45], 'B-': [-0.9, 0.45], 'OUT+': [0.9, -0.45], 'OUT-': [0.9, 0.45] } },
  sw:   { name: 'switch', pos: [-1.9, 2.0], size: [1.1, 0.6], color: INK.charcoal, height: 0.45,
          pads: { A: [-0.4, 0], B: [0.4, 0] } },
  mt:   { name: 'mt3608 boost', pos: [-0.2, 4.0], size: [2.2, 1.5], color: INK.green,
          pads: { 'VIN+': [-0.9, -0.4], 'VIN-': [-0.9, 0.4], 'VOUT+': [0.9, -0.4], 'VOUT-': [0.9, 0.4] } },
  div:  { name: '220k + 220k + 100nF', pos: [-4.8, 0.5], size: [2.2, 0.9], color: INK.dew,
          pads: { IN: [-0.9, 0], MID: [0, 0.2], GND: [0.9, 0] } },
  palm: { name: 'palm button', pos: [-6.4, -3.0], size: [1.5, 1.5], color: INK.charcoal,
          pads: { S: [0.55, -0.4], G: [0.55, 0.4] } },
  idx:  { name: 'index buttons', pos: [-2.2, -3.3], size: [3.4, 1.0], color: INK.charcoal,
          pads: { L: [-1.2, 0.3], M: [-0.2, 0.3], R: [0.8, 0.3], G: [1.45, -0.3] } },
  esp:  { name: 'esp32 devkit', pos: [3.4, 0.3], size: [2.9, 5.7], color: INK.charcoal, pads: espPads() },
  mpu:  { name: 'mpu6050', pos: [8.0, -0.9], size: [1.7, 3.0], color: INK.sky,
          pads: { VCC: [-0.65, -1.26], GND: [-0.65, -0.9], SCL: [-0.65, -0.54], SDA: [-0.65, -0.18],
                  XDA: [-0.65, 0.18], XCL: [-0.65, 0.54], AD0: [-0.65, 0.9], INT: [-0.65, 1.26] } },
};

const BENCH_CENTRE = new THREE.Vector3(0, 0, 0.6);
const PAD_IDLE = INK.mist;

export function initWiring(canvas, { onPick } = {}) {
  const stage = makeStage(canvas, {
    fov: 30,
    // Pull the camera back on narrow screens so the whole bench stays in view.
    onResize(camera, aspect) {
      const distance = 21 * Math.max(1, 1.9 / aspect);
      camera.position.set(BENCH_CENTRE.x, distance * 0.86, BENCH_CENTRE.z + distance * 0.5);
      camera.lookAt(BENCH_CENTRE);
    },
  });
  const { scene, camera } = stage;

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(BENCH_CENTRE);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.25;
  controls.minAzimuthAngle = -0.9;
  controls.maxAzimuthAngle = 0.9;
  canvas.style.touchAction = 'pan-y';

  // ---- modules and pads
  const pads = {};     // "mod.pad" -> { mesh, position }
  const bodies = {};   // module id -> body mesh
  const usedPads = new Set();
  WIRING_STEPS.forEach((s) => s.wires.forEach((w) => { usedPads.add(w.from); usedPads.add(w.to); }));

  for (const [id, m] of Object.entries(MODULES)) {
    const height = m.height ?? 0.25;
    const group = new THREE.Group();
    group.position.set(m.pos[0], 0, m.pos[1]);

    const body = box(m.size[0], height, m.size[1], m.color, 0.1);
    body.position.y = height / 2;
    body.userData.module = id;
    group.add(body);
    bodies[id] = body;

    const title = label(m.name, { size: 0.44 });
    title.position.set(0, 0.2, -m.size[1] / 2 - 0.55);
    group.add(title);

    for (const [padName, [px, pz]] of Object.entries(m.pads)) {
      const key = `${id}.${padName}`;
      const used = usedPads.has(key);
      const pad = cylinder(used ? 0.13 : 0.09, 0.1, used ? INK.cream : PAD_IDLE, 'y', used ? 0.035 : 0);
      pad.position.set(px, height + 0.05, pz);
      group.add(pad);
      pads[key] = {
        mesh: pad,
        position: new THREE.Vector3(m.pos[0] + px, height + 0.1, m.pos[1] + pz),
      };

      if (used) {
        // Pin names sit just outside the board edge they belong to.
        const text = padName.replace(/^GND[LR]$/, 'GND');
        const tag = label(text, { size: 0.3, weight: 500 });
        const outward = Math.sign(px) || 1;
        const onEdge = Math.abs(px) > m.size[0] / 2 - 0.5;
        if (id === 'esp' || onEdge) tag.position.set(px + outward * 0.6, height + 0.25, pz);
        else tag.position.set(px, height + 0.25, pz + (pz >= 0 ? 0.45 : -0.45));
        group.add(tag);
      }
    }
    scene.add(group);
  }

  // A few details so the blocks read as the real parts.
  const can = box(1.9, 0.3, 2.0, INK.mist, 0.08);
  can.position.set(MODULES.esp.pos[0], 0.4, MODULES.esp.pos[1] - 1.6);
  const usb = box(0.9, 0.3, 0.7, INK.mist, 0.06);
  usb.position.set(MODULES.esp.pos[0], 0.4, MODULES.esp.pos[1] + 2.6);
  const trim = cylinder(0.2, 0.3, INK.orange);
  trim.position.set(MODULES.mt.pos[0], 0.4, MODULES.mt.pos[1]);
  const cap = cylinder(0.45, 0.3, INK.sky);
  cap.position.set(MODULES.palm.pos[0] - 0.15, 0.4, MODULES.palm.pos[1]);
  scene.add(can, usb, trim, cap);
  [[-1.2, INK.sky], [-0.2, INK.pink], [0.8, INK.green]].forEach(([dx, color]) => {
    const b = cylinder(0.26, 0.25, color);
    b.position.set(MODULES.idx.pos[0] + dx, 0.38, MODULES.idx.pos[1] - 0.15);
    scene.add(b);
  });

  // ---- wires
  const wires = [];  // { mesh, step }
  WIRING_STEPS.forEach((step, stepIndex) => {
    step.wires.forEach((w, i) => {
      const a = pads[w.from].position;
      const b = pads[w.to].position;
      const span = a.distanceTo(b);
      const mid = a.clone().lerp(b, 0.5);
      mid.y = 0.7 + span * 0.14 + i * 0.18;  // longer wires arc higher; siblings fan out
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.06, 10),
        new THREE.MeshToonMaterial({ color: WIRE_COLORS[w.color], transparent: true }),
      );
      scene.add(mesh);
      wires.push({ mesh, step: stepIndex, from: w.from, to: w.to });
    });
  });

  // ---- step highlighting
  function setStep(index) {
    const all = index === null || index === undefined;
    const active = new Set();
    for (const w of wires) {
      const on = all || w.step === index;
      w.mesh.material.opacity = on ? 1 : 0.1;
      w.mesh.renderOrder = on ? 2 : 1;
      if (on && !all) { active.add(w.from); active.add(w.to); }
    }
    for (const [key, pad] of Object.entries(pads)) {
      if (!usedPads.has(key)) continue;
      const on = active.has(key);
      pad.mesh.material.color.setHex(on ? INK.orange : INK.cream);
      pad.mesh.scale.setScalar(on ? 1.5 : 1);
    }
    const focus = all ? null : WIRING_STEPS[index].focus;
    for (const [id, body] of Object.entries(bodies)) {
      body.material.emissive.setHex(id === focus ? 0x5a2500 : 0x000000);
    }
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
