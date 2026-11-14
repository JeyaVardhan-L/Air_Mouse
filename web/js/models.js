// Board-accurate 3D models of every part in the build, drawn as flat fills
// with edge lines. 1 unit = 10 mm. Each builder returns
//   { group, pads: { name: Vector3 }, pinMeshes: { name: Mesh } }
// where pads are the points a wire attaches to, in the group's local space.
// Read by wiring.js (laid out on a bench) and by buildAssembly() below.
import * as THREE from 'three';
import { at, bx, cable, cyl, paint, tagPart, THEMES, trace } from './kit.js';

const P = 0.254;  // 2.54 mm header pitch

function fresh() {
  return { group: new THREE.Group(), pads: {}, pinMeshes: {} };
}

// A row of header pins. Returns nothing; registers pads and meshes on `m`.
function pinRow(m, names, { x, z, y, along, bodyTop }) {
  names.forEach((name, i) => {
    const o = (i - (names.length - 1) / 2) * P;
    const px = along === 'z' ? x : x + o;
    const pz = along === 'z' ? z + o : z;
    const pin = at(bx(0.07, 0.2, 0.07, 'pin', null), px, bodyTop + 0.08, pz);
    m.group.add(pin);
    m.pinMeshes[name] = pin;
    m.pads[name] = new THREE.Vector3(px, bodyTop + 0.2, pz);
  });
  const length = names.length * P;
  const strip = along === 'z' ? bx(P, bodyTop - y, length, 'comp') : bx(length, bodyTop - y, P, 'comp');
  m.group.add(at(strip, x, y + (bodyTop - y) / 2, z));
}

// A round solder pad lying on a board's top face.
function solderPad(m, name, x, z, top) {
  const pad = at(cyl(0.12, 0.04, 'pin', 'y', 16), x, top + 0.02, z);
  m.group.add(pad);
  m.pinMeshes[name] = pad;
  m.pads[name] = new THREE.Vector3(x, top + 0.07, z);
}

// ------------------------------------------------------------ esp32 devkit
export const ESP_LEFT = ['EN', 'VP', 'VN', 'D34', 'D35', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13', 'GNDL', 'VIN'];
export const ESP_RIGHT = ['D23', 'D22', 'TX0', 'RX0', 'D21', 'D19', 'D18', 'D5', 'TX2', 'RX2', 'D4', 'D2', 'D15', 'GNDR', '3V3'];

export function esp32() {
  const m = fresh();
  const W = 2.83, D = 5.15, T = 0.16;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));

  // wifi / bluetooth module with its pcb antenna overhanging the top edge
  m.group.add(at(bx(1.8, 0.3, 1.75, 'metal'), 0, T + 0.15, -D / 2 + 0.7 + 0.875));
  const zig = [];
  for (let i = 0; i < 9; i += 1) { zig.push([-0.7 + (i % 2) * 1.4, -D / 2 + 0.1 + i * 0.07]); zig.push([-0.7 + ((i + 1) % 2) * 1.4, -D / 2 + 0.1 + i * 0.07]); }
  m.group.add(trace(zig, T + 0.005));
  m.group.add(trace([[-0.9, -D / 2 + 0.72], [0.9, -D / 2 + 0.72]], T + 0.005));

  // usb, bridge chip, regulator, EN / BOOT buttons, status leds
  m.group.add(at(bx(0.78, 0.28, 0.6, 'metal'), 0, T + 0.14, D / 2 - 0.1));
  m.group.add(at(bx(0.5, 0.08, 0.5, 'comp'), -0.55, T + 0.04, 1.35));
  m.group.add(at(bx(0.6, 0.12, 0.38, 'comp'), 0.6, T + 0.06, 1.45));
  for (const x of [-0.95, 0.95]) {
    m.group.add(at(bx(0.4, 0.12, 0.4, 'comp'), x, T + 0.06, 2.05));
    m.group.add(at(cyl(0.09, 0.08, 'metal'), x, T + 0.16, 2.05));
  }
  m.group.add(at(bx(0.12, 0.05, 0.22, 'metal', null), 0.2, T + 0.025, 1.0));
  m.group.add(at(bx(0.12, 0.05, 0.22, 'metal', null), -0.1, T + 0.025, 1.0));
  m.group.add(trace([[-1.15, 0.55], [-1.15, 1.9], [-0.9, 1.9]], T + 0.005));
  m.group.add(trace([[1.15, 0.55], [1.15, 1.9], [0.9, 1.9]], T + 0.005));

  const z0 = 0, top = T + 0.25;
  pinRow(m, ESP_LEFT, { x: -1.27, z: z0, y: T, along: 'z', bodyTop: top });
  pinRow(m, ESP_RIGHT, { x: 1.27, z: z0, y: T, along: 'z', bodyTop: top });
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ mpu6050 (GY-521)
export const MPU_PINS = ['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT'];

export function mpu6050() {
  const m = fresh();
  const W = 1.6, D = 2.1, T = 0.16;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));
  m.group.add(at(bx(0.4, 0.1, 0.4, 'comp'), 0.15, T + 0.05, -0.1));   // the sensor itself
  m.group.add(at(bx(0.3, 0.1, 0.25, 'comp'), 0.35, T + 0.05, 0.7));   // 3.3 V regulator
  m.group.add(at(bx(0.16, 0.08, 0.1, 'metal', null), 0.1, T + 0.04, 0.45));
  m.group.add(at(bx(0.16, 0.08, 0.1, 'metal', null), 0.5, T + 0.04, 0.35));
  m.group.add(trace([[-0.35, -0.9], [0.5, -0.9], [0.5, -0.5]], T + 0.005));
  m.group.add(trace([[0.1, 0.1], [0.1, 0.5]], T + 0.005));
  for (const [x, z] of [[0.55, -0.9], [0.55, 0.9]]) {
    const hole = at(cyl(0.1, T + 0.02, 'hole', 'y', 14), x, T / 2, z);
    m.group.add(hole);
  }
  pinRow(m, MPU_PINS, { x: -0.65, z: 0, y: T, along: 'z', bodyTop: T + 0.2 });
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ tp4056 charger
export function tp4056() {
  const m = fresh();
  const W = 1.7, D = 2.6, T = 0.14;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));
  m.group.add(at(bx(0.9, 0.32, 0.7, 'metal'), 0, T + 0.16, -D / 2 + 0.12));  // usb-c
  m.group.add(at(bx(0.5, 0.1, 0.36, 'comp'), -0.3, T + 0.05, -0.2));         // tp4056
  m.group.add(at(bx(0.4, 0.08, 0.22, 'comp'), 0.4, T + 0.04, 0.2));          // dw01
  m.group.add(at(bx(0.4, 0.08, 0.28, 'comp'), 0.4, T + 0.04, 0.6));          // fs8205
  m.group.add(at(bx(0.12, 0.05, 0.2, 'metal', null), -0.55, T + 0.025, 0.3));
  m.group.add(at(bx(0.12, 0.05, 0.2, 'metal', null), -0.35, T + 0.025, 0.3));
  m.group.add(trace([[-0.6, 0.55], [-0.6, -0.5], [-0.3, -0.5]], T + 0.005));
  solderPad(m, 'B+', -0.62, 0.85, T);
  solderPad(m, 'B-', -0.62, 1.15, T);
  solderPad(m, 'OUT+', 0.62, 0.85, T);
  solderPad(m, 'OUT-', 0.62, 1.15, T);
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ mt3608 boost
export function mt3608() {
  const m = fresh();
  const W = 3.6, D = 1.7, T = 0.14;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));
  m.group.add(at(bx(0.8, 0.42, 0.8, 'comp'), 0.2, T + 0.21, 0.1));            // inductor
  m.group.add(at(bx(0.5, 0.3, 0.5, 'metal'), -0.9, T + 0.15, -0.35));         // trimmer
  m.group.add(at(cyl(0.12, 0.06, 'comp'), -0.9, T + 0.33, -0.35));            // its screw
  m.group.add(at(bx(0.32, 0.08, 0.3, 'comp'), -0.65, T + 0.04, 0.4));         // mt3608 chip
  m.group.add(at(bx(0.36, 0.1, 0.2, 'comp'), 0.95, T + 0.05, -0.4));          // diode
  m.group.add(at(cyl(0.22, 0.46, 'metal'), 1.1, T + 0.23, 0.35));
  m.group.add(at(cyl(0.22, 0.46, 'metal'), -1.3, T + 0.23, 0.3));
  m.group.add(trace([[-1.6, -0.4], [-1.2, -0.4], [-1.2, 0.3]], T + 0.005));
  m.group.add(trace([[1.6, -0.4], [1.2, -0.4], [1.1, 0.35]], T + 0.005));
  solderPad(m, 'VIN+', -1.55, -0.4, T);
  solderPad(m, 'VIN-', -1.55, 0.4, T);
  solderPad(m, 'VOUT+', 1.55, -0.4, T);
  solderPad(m, 'VOUT-', 1.55, 0.4, T);
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ li-po cell
export function lipo() {
  const m = fresh();
  const W = 3.2, D = 4.4, T = 0.42;
  m.group.add(at(bx(W, T, D, 'metal'), 0, T / 2, 0));
  m.group.add(trace([[-1.3, -1.8], [1.0, -1.8]], T + 0.005));
  m.group.add(trace([[-1.3, -1.5], [0.4, -1.5]], T + 0.005));
  m.group.add(trace([[-1.3, 1.6], [1.3, 1.6], [1.3, 0.7], [-1.3, 0.7], [-1.3, 1.6]], T + 0.005));
  // the + / - tabs
  for (const [name, z] of [['+', -0.55], ['-', 0.55]]) {
    const tab = at(bx(0.6, 0.04, 0.3, 'pin', null), W / 2 + 0.3, 0.22, z);
    m.group.add(tab);
    m.pinMeshes[name] = tab;
    m.pads[name] = new THREE.Vector3(W / 2 + 0.55, 0.3, z);
  }
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ slide switch
export function slideSwitch() {
  const m = fresh();
  m.group.add(at(bx(1.0, 0.36, 0.45, 'comp'), 0, 0.18, 0));
  m.group.add(at(bx(0.4, 0.22, 0.32, 'metal'), -0.15, 0.47, 0));
  for (const [name, x] of [['A', -0.38], ['B', 0.38]]) {
    const lug = at(bx(0.1, 0.04, 0.3, 'pin', null), x, 0.38, 0);
    m.group.add(lug);
    m.pinMeshes[name] = lug;
    m.pads[name] = new THREE.Vector3(x, 0.44, 0);
  }
  m.size = [1.0, 0.45];
  return m;
}

// ------------------------------------------------------------ 220k + 220k + 100 nF divider
export function divider() {
  const m = fresh();
  const W = 2.2, D = 0.9, T = 0.12;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));
  m.group.add(at(cyl(0.09, 0.62, 'metal', 'x'), -0.45, T + 0.1, -0.18));
  m.group.add(at(cyl(0.09, 0.62, 'metal', 'x'), 0.45, T + 0.1, -0.18));
  m.group.add(at(cyl(0.14, 0.12, 'metal'), 0.0, T + 0.06, 0.2));
  solderPad(m, 'IN', -0.9, 0.05, T);
  solderPad(m, 'MID', 0, -0.18, T);
  solderPad(m, 'GND', 0.9, 0.05, T);
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ palm button
export function palmButton() {
  const m = fresh();
  const W = 1.4, T = 0.1;
  m.group.add(at(bx(W, T, W, 'pcb'), 0, T / 2, 0));
  m.group.add(at(bx(1.2, 0.3, 1.2, 'comp'), 0, T + 0.15, 0));
  const cap = at(cyl(0.45, 0.24, 'metal', 'y', 28), 0, T + 0.42, 0);
  m.group.add(cap);
  m.cap = cap;
  m.capRest = cap.position.y;
  solderPad(m, 'S', 0.58, -0.4, T);
  solderPad(m, 'G', 0.58, 0.4, T);
  m.size = [W, W];
  return m;
}

// ------------------------------------------------------------ index-finger strip
export function indexStrip() {
  const m = fresh();
  const W = 3.4, D = 1.0, T = 0.12;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));
  m.caps = [];
  [['L', -1.2], ['M', -0.2], ['R', 0.8]].forEach(([name, x]) => {
    m.group.add(at(bx(0.62, 0.26, 0.62, 'comp'), x, T + 0.13, -0.08));
    const cap = at(cyl(0.2, 0.2, 'metal'), x, T + 0.36, -0.08);
    m.group.add(cap);
    m.caps.push(cap);
    solderPad(m, name, x, 0.4, T);
  });
  m.capRest = m.caps[0].position.y;
  solderPad(m, 'G', 1.45, -0.3, T);
  m.size = [W, D];
  return m;
}

// ------------------------------------------------------------ perfboard plate
export function plate(W = 5.4, D = 5.8) {
  const m = fresh();
  const T = 0.1;
  m.group.add(at(bx(W, T, D, 'pcb'), 0, T / 2, 0));
  const nx = Math.floor(W / P) - 1;
  const nz = Math.floor(D / P) - 1;
  const holes = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.02, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    nx * nz,
  );
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < nz; j += 1) {
      m4.makeTranslation((i - (nx - 1) / 2) * P, T + 0.005, (j - (nz - 1) / 2) * P);
      holes.setMatrixAt(k, m4);
      k += 1;
    }
  }
  holes.userData.role = 'hole';
  holes.raycast = () => {};
  m.group.add(holes);
  m.size = [W, D];
  return m;
}

// Builders by id, used by the wiring bench.
export const BUILDERS = { bat: lipo, tp: tp4056, sw: slideSwitch, mt: mt3608, div: divider, palm: palmButton, idx: indexStrip, esp: esp32, mpu: mpu6050 };

// ------------------------------------------------------------ the whole device
// Core stack (battery, charger, boost, switch, plate with esp32 + sensor)
// plus the two control pieces, joined by ribbon cables. setExplode(0..1)
// lifts the layers apart.
export const PART_INFO = {
  esp32:   { name: 'esp32 devkit', mm: '28 × 52 mm' },
  mpu6050: { name: 'mpu6050', mm: '16 × 21 mm' },
  charger: { name: 'tp4056 charger', mm: '17 × 26 mm' },
  boost:   { name: 'mt3608 boost', mm: '36 × 17 mm' },
  battery: { name: 'li-po cell', mm: '32 × 44 × 4 mm' },
  power:   { name: 'slide switch', mm: '10 × 4.5 mm' },
  index:   { name: 'index buttons', mm: '34 × 10 mm' },
  palm:    { name: 'palm button', mm: '14 × 14 mm' },
  plate:   { name: 'perfboard plate', mm: '54 × 58 mm' },
};

export function buildAssembly(themeName = 'dark') {
  const root = new THREE.Group();
  let selectedId = null;
  const parts = {};   // id -> { built, base, lift, anchor }

  function place(id, built, base, lift, anchorAt, rotY = 0) {
    built.group.rotation.y = rotY;
    tagPart(built.group, id);
    const anchor = new THREE.Object3D();
    anchor.position.set(...anchorAt);
    built.group.add(anchor);
    root.add(built.group);
    parts[id] = { built, base: new THREE.Vector3(...base), lift: new THREE.Vector3(...lift), anchor };
  }

  place('battery', lipo(), [0, 0, 0], [0, 0, 0], [-1.6, 0.2, 1.4]);
  place('charger', tp4056(), [-1.4, 0.55, 0], [0, 1.6, 0], [-0.85, 0.1, 0.4]);
  place('boost', mt3608(), [1.0, 0.55, 0], [0, 1.6, 0], [0.4, 0.3, 0.7], Math.PI / 2);
  place('power', slideSwitch(), [0.1, 0.55, 2.5], [0, 1.6, 1.0], [0.5, 0.2, 0.2]);
  place('plate', plate(), [0, 1.25, 0], [0, 3.4, 0], [-2.7, 0.05, 2.2]);
  place('esp32', esp32(), [-1.25, 1.35, 0], [0, 5.2, 0], [-1.3, 0.3, -2.3]);
  place('mpu6050', mpu6050(), [1.75, 1.35, -0.4], [0, 5.2, 0], [0.7, 0.2, -0.9]);
  place('index', indexStrip(), [5.6, 0.4, 0], [1.8, 2.6, 0], [0, 0.4, -0.5], Math.PI / 2);
  place('palm', palmButton(), [-5.2, 0.4, 0], [-1.8, 2.6, 0], [0, 0.6, 0.7]);

  // ribbon cables from the plate edge out to the two control pieces
  const cables = new THREE.Group();
  root.add(cables);
  let t = 0;

  function rebuildCables() {
    cables.clear();
    const plateTop = parts.plate.base.y + parts.plate.lift.y * t + 0.15;
    const reach = (id, side, strands) => {
      const p = parts[id].base.clone().addScaledVector(parts[id].lift, t);
      strands.forEach((z) => {
        const a = new THREE.Vector3(side * 2.45, plateTop, z);
        const b = new THREE.Vector3(p.x - side * 0.05, p.y + 0.2, z * 0.6);
        const c1 = a.clone().add(new THREE.Vector3(side * 0.7, 0.35, 0));
        const c2 = b.clone().add(new THREE.Vector3(-side * 0.7, 0.35, 0));
        const strand = cable([a, c1, c2, b], 0.04);
        strand.material.color.setHex(THEMES[themeName].cable);
        cables.add(strand);
      });
    };
    reach('index', 1, [-0.5, -0.25, 0, 0.25]);
    reach('palm', -1, [-0.15, 0.15]);
  }

  const api = {
    root,
    parts,
    ids: Object.keys(parts),
    setExplode(value) {
      t = value;
      for (const p of Object.values(parts)) {
        p.built.group.position.copy(p.base).addScaledVector(p.lift, t);
      }
      rebuildCables();
    },
    // Visual only: the palm cap and the finger caps sink when pressed.
    setPress(on) {
      parts.palm.built.cap.position.y = parts.palm.built.capRest - (on ? 0.12 : 0);
    },
    tap(index, on) {
      const s = parts.index.built;
      s.caps[index].position.y = s.capRest - (on ? 0.1 : 0);
    },
    // Colour the whole device; `selected` is drawn inverted.
    paint(selected = selectedId) {
      selectedId = selected;
      paint(root, themeName, selected);
    },
  };
  api.setExplode(0.5);
  api.paint();
  return api;
}
