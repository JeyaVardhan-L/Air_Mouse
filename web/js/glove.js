// The glove as a stylised 3D model: a right hand seen from the back,
// fingers pointing away from you (-Z), thumb on the left (-X). Units are roughly cm.
import * as THREE from 'three';
import { INK, box, cylinder, solid } from './toon.js';

const REST = {
  index:  [-0.10, -0.18, -0.12],
  middle: [-0.22, -0.40, -0.25],
  ring:   [-0.28, -0.45, -0.28],
  pinky:  [-0.30, -0.45, -0.28],
};
// Middle and ring fingers curl under to reach the palm button.
const PRESS = {
  index:  [-0.12, -0.22, -0.15],
  middle: [-1.25, -1.45, -0.55],
  ring:   [-1.25, -1.45, -0.55],
  pinky:  [-0.75, -0.95, -0.45],
};

function segment(radius, length, color) {
  const g = new THREE.CapsuleGeometry(radius, length, 6, 20);
  g.rotateX(-Math.PI / 2);          // lie along -Z
  g.translate(0, 0, -length / 2);   // start at the joint
  return solid(g, color);
}

// A chain of three segments; the first wears the glove, the rest are bare.
function finger(radius, lengths) {
  const joints = [];
  let parent = null;
  let root = null;
  lengths.forEach((len, i) => {
    const joint = new THREE.Group();
    joint.add(segment(radius * (1 - i * 0.07), len, i === 0 ? INK.orange : INK.dew));
    if (parent) {
      joint.position.z = -lengths[i - 1];
      parent.add(joint);
    } else {
      root = joint;
    }
    joints.push(joint);
    parent = joint;
  });
  return { root, joints };
}

export function buildGlove() {
  const root = new THREE.Group();
  const parts = {};

  function part(id, object, explode, parent = root) {
    object.traverse((o) => { o.userData.part = id; });
    parts[id] = { object, base: object.position.clone(), explode: new THREE.Vector3(...explode) };
    parent.add(object);
    return object;
  }

  // ---- hand
  const hand = new THREE.Group();
  hand.add(box(8.6, 2.2, 9.0, INK.orange, 0.9));
  const cuff = box(7.8, 2.5, 3.2, INK.sienna, 0.8);
  cuff.position.set(0, 0, 5.7);
  hand.add(cuff);

  const fingers = {
    index:  finger(0.95, [3.0, 2.2, 1.8]),
    middle: finger(0.98, [3.3, 2.5, 1.9]),
    ring:   finger(0.92, [3.0, 2.3, 1.8]),
    pinky:  finger(0.80, [2.4, 1.7, 1.5]),
  };
  const fingerX = { index: -3.15, middle: -1.05, ring: 1.05, pinky: 3.15 };
  for (const [name, f] of Object.entries(fingers)) {
    f.root.position.set(fingerX[name], 0, -4.2);
    hand.add(f.root);
  }

  const thumb = finger(1.0, [3.0, 2.4]);
  thumb.root.position.set(-4.0, -0.25, 1.6);
  thumb.root.rotation.y = 0.85;
  thumb.joints[1].rotation.y = -0.25;
  hand.add(thumb.root);
  part('hand', hand, [0, 0, 0]);

  // ---- back-of-hand plate and modules
  const TOP = 1.1;  // top surface of the palm
  const plate = box(7.0, 0.25, 7.2, INK.dew, 0.12);
  plate.position.set(0, TOP + 0.2, 0.2);
  part('plate', plate, [0, 1.6, 0]);
  const DECK = TOP + 0.33;  // top of the plate

  const esp = new THREE.Group();
  esp.add(box(2.8, 0.3, 5.4, INK.charcoal, 0.1));
  const shield = box(1.8, 0.34, 2.0, INK.mist, 0.08);
  shield.position.set(0, 0.3, -1.4);
  const usb = box(0.9, 0.3, 0.7, INK.mist, 0.06);
  usb.position.set(0, 0.28, 2.5);
  esp.add(shield, usb);
  esp.position.set(1.75, DECK + 0.15, 0.2);
  part('esp32', esp, [1.2, 4.2, 0]);

  const mpu = new THREE.Group();
  mpu.add(box(1.8, 0.3, 2.2, INK.sky, 0.1));
  const chip = box(0.55, 0.16, 0.55, INK.charcoal, 0.04);
  chip.position.y = 0.22;
  mpu.add(chip);
  mpu.position.set(-2.1, DECK + 0.15, -2.1);
  part('mpu', mpu, [-2.2, 4.8, -2.2]);

  const charger = new THREE.Group();
  charger.add(box(2.5, 0.3, 1.6, INK.pink, 0.1));
  const port = box(0.7, 0.28, 0.8, INK.mist, 0.06);
  port.position.set(-0.95, 0.27, 0);
  charger.add(port);
  charger.position.set(-2.0, DECK + 0.15, 0.3);
  part('charger', charger, [-4.2, 3.6, 0.4]);

  const boost = new THREE.Group();
  boost.add(box(2.5, 0.3, 1.5, INK.green, 0.1));
  const coil = box(0.75, 0.4, 0.75, INK.charcoal, 0.08);
  coil.position.set(0.4, 0.33, 0);
  const trim = cylinder(0.22, 0.3, INK.orange);
  trim.position.set(-0.7, 0.3, 0);
  boost.add(coil, trim);
  boost.position.set(-2.0, DECK + 0.15, 2.4);
  part('boost', boost, [-3.6, 2.8, 3.2]);

  const battery = new THREE.Group();
  battery.add(box(5.4, 0.9, 2.5, INK.mist, 0.25));
  const band = box(1.1, 0.94, 2.54, INK.orange, 0.25, 0);
  band.position.x = -1.6;
  battery.add(band);
  battery.position.set(0, 1.25 + 0.5, 5.7);
  part('battery', battery, [0, 3.6, 3.4]);

  const power = new THREE.Group();
  power.add(box(0.45, 0.7, 1.3, INK.charcoal, 0.08));
  const nub = box(0.35, 0.3, 0.4, INK.cream, 0.05);
  nub.position.set(0.3, 0, -0.25);
  power.add(nub);
  power.position.set(4.1, 0.2, 5.7);
  part('power', power, [3.2, 0.6, 1.2]);

  // ---- index-finger buttons, on the thumb side of the first segment
  const strip = new THREE.Group();
  strip.add(box(0.3, 1.2, 2.7, INK.charcoal, 0.08));
  [[INK.green, -0.55], [INK.pink, -1.35], [INK.sky, -2.15]].forEach(([color, z]) => {
    const cap = cylinder(0.33, 0.3, color, 'x');
    cap.position.set(-0.28, 0, z + 1.35);
    strip.add(cap);
  });
  strip.position.set(-1.12, 0, -1.6);
  part('index', strip, [-3.0, 0.4, 0], fingers.index.joints[0]);

  // ---- palm button, underneath
  const palm = new THREE.Group();
  palm.add(box(1.7, 0.25, 1.7, INK.charcoal, 0.08));
  const cap = cylinder(0.62, 0.4, INK.sky);
  cap.position.y = -0.3;
  palm.add(cap);
  palm.position.set(0.1, -1.2, -1.9);
  part('palm', palm, [0, -3.6, 0]);

  // ---- behaviour
  let explode = 0;
  let press = 0;
  let pressTarget = 0;
  let selected = null;

  function applyCurl() {
    for (const name of Object.keys(fingers)) {
      fingers[name].joints.forEach((joint, i) => {
        joint.rotation.x = THREE.MathUtils.lerp(REST[name][i], PRESS[name][i], press);
      });
    }
    palm.children[1].position.y = -0.3 + 0.14 * press;  // the cap sinks in
  }
  applyCurl();

  return {
    root,
    partIds: Object.keys(parts),

    setExplode(t) {
      explode = t;
      for (const p of Object.values(parts)) {
        p.object.position.copy(p.base).addScaledVector(p.explode, explode);
      }
    },

    setPress(on) { pressTarget = on ? 1 : 0; },

    select(id) {
      selected = id;
      root.traverse((o) => {
        if (o.isMesh && o.material.emissive) {
          o.material.emissive.setHex(o.userData.part === id ? 0x3a1600 : 0x000000);
        }
      });
    },
    get selected() { return selected; },

    // Line-art mode: everything paper-coloured, only the ink outlines remain.
    setLineArt(on) {
      root.traverse((o) => {
        if (o.isMesh && o.userData.fill !== undefined) {
          o.material.color.setHex(on ? INK.cream : o.userData.fill);
        }
      });
    },

    update(dt) {
      if (press !== pressTarget) {
        const step = dt * 5;
        press = pressTarget > press ? Math.min(pressTarget, press + step) : Math.max(pressTarget, press - step);
        applyCurl();
      }
    },
  };
}
