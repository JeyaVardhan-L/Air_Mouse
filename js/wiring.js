// A Tinkercad-style wiring diagram: real boards drawn top-down on a work
// plane, wires routed with right angles and rounded corners so every
// connection can be followed by eye. Every wire comes from WIRING_STEPS in
// data.js; this file only knows where the boards and pads sit.
import { ESP_LEFT, ESP_RIGHT, MPU_PINS } from './models.js';
import { WIRE_COLORS, WIRING_STEPS } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1040;
const H = 750;
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

function svg(tag, attrs = {}, ...kids) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...kids);
  return node;
}

const BOARD = '#1925aa';
const DARK = '#0d1355';
const SILVER = '#d9d7d0';
const LABEL = '#ffffff';
const shortPad = (name) => name.replace(/^GND[LR]$/, 'GND').replace('-', '−');

// ------------------------------------------------------------ pads
// key "module.pad" -> { x, y, side } where side is the board edge the pad is on.
const pads = {};
function pad(key, x, y, side) { pads[key] = { x, y, side }; }

// esp32: 15 pins down each side, 28 px apart
const ESP = { x: 475, y: 60, w: 150, h: 480 };
ESP_LEFT.forEach((n, i) => pad(`esp.${n}`, ESP.x, 100 + i * 28, 'l'));
ESP_RIGHT.forEach((n, i) => pad(`esp.${n}`, ESP.x + ESP.w, 100 + i * 28, 'r'));

// mpu6050, flipped so SDA / SCL sit above GND / VCC
const MPU = { x: 860, y: 150, w: 140, h: 240 };
[...MPU_PINS].reverse().forEach((n, i) => pad(`mpu.${n}`, MPU.x, 170 + i * 28, 'l'));

pad('bat.+', 180, 630, 'r'); pad('bat.-', 180, 690, 'r');
pad('tp.B+', 260, 630, 'l'); pad('tp.B-', 260, 690, 'l');
pad('tp.OUT+', 340, 630, 'r'); pad('tp.OUT-', 340, 690, 'r');
pad('sw.A', 395, 630, 'l'); pad('sw.B', 445, 630, 'r');
pad('mt.VOUT-', 420, 464, 'r'); pad('mt.VOUT+', 420, 492, 'r');
pad('mt.VIN+', 300, 510, 'b'); pad('mt.VIN-', 330, 510, 'b');
pad('div.IN', 180, 455, 'r'); pad('div.GND', 180, 478, 'r'); pad('div.MID', 120, 440, 't');
pad('palm.S', 300, 268, 'r'); pad('palm.G', 230, 244, 'l');
pad('idx.L', 300, 296, 'r'); pad('idx.M', 300, 324, 'r'); pad('idx.R', 300, 352, 'r'); pad('idx.G', 230, 326, 'l');

// Corner points between a wire's two pads, in from -> to order. Anything not
// listed here is a straight line.
const ROUTES = {
  'sw.B>mt.VIN+': [[445, 570], [300, 570]],
  'tp.OUT->mt.VIN-': [[480, 690], [480, 540], [330, 540]],
  'mpu.VCC>esp.3V3': [[790, 366], [790, 492]],
  'mpu.GND>esp.GNDR': [[760, 338], [760, 464]],
  'mpu.SCL>esp.D22': [[720, 310], [720, 128]],
  'mpu.SDA>esp.D21': [[680, 282], [680, 212]],
  'idx.G>esp.GNDL': [[200, 326], [200, 400], [445, 400], [445, 464]],
  'palm.G>idx.G': [[200, 244], [200, 326]],
  'bat.+>div.IN': [[215, 630], [215, 455]],
  'div.MID>esp.D34': [[120, 184]],
  'div.GND>esp.GNDL': [[235, 478], [235, 425], [445, 425], [445, 464]],
};

function roundedPath(points, r = 9) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    const before = Math.hypot(x - px, y - py);
    const after = Math.hypot(nx - x, ny - y);
    const k = Math.min(r, before / 2, after / 2);
    const ax = x - ((x - px) / before) * k; const ay = y - ((y - py) / before) * k;
    const bx = x + ((nx - x) / after) * k; const by = y + ((ny - y) / after) * k;
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

// ------------------------------------------------------------ boards
function text(x, y, str, { size = 9, anchor = 'start', fill = LABEL, rotate = 0, weight = 400, opacity = 1 } = {}) {
  const t = svg('text', {
    x, y, 'text-anchor': anchor, fill, 'font-size': size, 'font-weight': weight, opacity,
    'font-family': 'JetBrains Mono, ui-monospace, monospace',
    transform: rotate ? `rotate(${rotate} ${x} ${y})` : '',
  });
  t.textContent = str;
  return t;
}

function board(g, { x, y, w, h, fill = BOARD }) {
  g.append(svg('rect', { x, y, width: w, height: h, rx: 3, fill }));
}

function padLabels(g, keys, { fill = LABEL, size = 9 } = {}) {
  for (const key of keys) {
    const p = pads[key];
    const name = shortPad(key.split('.')[1]);
    if (p.side === 'l') g.append(text(p.x + 9, p.y + 3.2, name, { size, fill }));
    else if (p.side === 'r') g.append(text(p.x - 9, p.y + 3.2, name, { size, fill, anchor: 'end' }));
    else if (p.side === 't') g.append(text(p.x, p.y + 17, name, { size, fill, anchor: 'middle' }));
    else g.append(text(p.x, p.y - 8, name, { size, fill, anchor: 'middle' }));
  }
}

function drawBoards(g, used) {
  // esp32 devkit
  board(g, { ...ESP, fill: DARK });
  g.append(svg('rect', { x: 523, y: 70, width: 54, height: 100, rx: 2, fill: SILVER }));
  g.append(text(550, 124, 'ESP-WROOM-32', { size: 7, anchor: 'middle', fill: '#555', rotate: -90 }));
  g.append(svg('rect', { x: 533, y: 436, width: 34, height: 34, rx: 2, fill: '#1a1f6b' }));
  g.append(svg('rect', { x: 535, y: 528, width: 30, height: 22, rx: 2, fill: SILVER }));
  g.append(text(550, 330, 'ESP32 DEVKIT', { size: 13, anchor: 'middle', rotate: -90, weight: 500 }));
  padLabels(g, ESP_LEFT.map((n) => `esp.${n}`).concat(ESP_RIGHT.map((n) => `esp.${n}`)), { size: 8.5 });
  for (const n of ESP_LEFT.concat(ESP_RIGHT)) {
    const key = `esp.${n}`;
    if (!used.has(key)) { /* unused pins stay dim, like the unlabelled ones on the real board */ }
  }

  // mpu6050
  board(g, { ...MPU });
  g.append(svg('rect', { x: 915, y: 250, width: 44, height: 44, rx: 2, fill: DARK }));
  g.append(text(937, 276, 'MPU', { size: 8, anchor: 'middle' }));
  g.append(text(940, 215, 'MPU6050', { size: 13, anchor: 'middle', weight: 500 }));
  padLabels(g, MPU_PINS.map((n) => `mpu.${n}`));

  // battery
  board(g, { x: 30, y: 600, w: 150, h: 120, fill: '#d8d6cf' });
  g.append(text(105, 656, 'Li-Po 3.7 V', { size: 13, anchor: 'middle', fill: '#222', weight: 500 }));
  g.append(text(105, 674, '500–1000 mAh', { size: 9, anchor: 'middle', fill: '#555' }));
  padLabels(g, ['bat.+', 'bat.-'], { fill: '#222', size: 11 });

  // tp4056
  board(g, { x: 260, y: 600, w: 80, h: 120 });
  g.append(svg('rect', { x: 275, y: 592, width: 50, height: 18, rx: 2, fill: SILVER }));
  g.append(svg('rect', { x: 290, y: 664, width: 20, height: 16, rx: 2, fill: DARK }));
  g.append(text(300, 654, 'TP4056', { size: 10, anchor: 'middle', weight: 500 }));
  padLabels(g, ['tp.B+', 'tp.B-', 'tp.OUT+', 'tp.OUT-'], { size: 8.5 });

  // switch
  g.append(svg('rect', { x: 395, y: 620, width: 50, height: 20, rx: 2, fill: '#222' }));
  g.append(svg('rect', { x: 405, y: 624, width: 20, height: 12, rx: 1, fill: SILVER }));
  g.append(text(420, 660, 'SLIDE SWITCH', { size: 9.5, anchor: 'middle', fill: '#111' }));

  // mt3608
  board(g, { x: 250, y: 440, w: 170, h: 70 });
  g.append(text(258, 456, 'MT3608', { size: 11, weight: 500 }));
  g.append(svg('circle', { cx: 330, cy: 478, r: 12, fill: SILVER }));
  g.append(svg('path', { d: 'M324 478h12', stroke: '#444', 'stroke-width': 2 }));
  g.append(svg('rect', { x: 352, y: 458, width: 28, height: 30, rx: 2, fill: DARK }));
  padLabels(g, ['mt.VOUT-', 'mt.VOUT+', 'mt.VIN+', 'mt.VIN-'], { size: 8.5 });

  // gauge divider
  board(g, { x: 60, y: 440, w: 120, h: 50 });
  g.append(svg('rect', { x: 72, y: 456, width: 24, height: 9, rx: 2, fill: SILVER }));
  g.append(svg('rect', { x: 72, y: 470, width: 24, height: 9, rx: 2, fill: SILVER }));
  g.append(text(60, 506, 'GAUGE DIVIDER', { size: 9.5, fill: '#111' }));
  g.append(text(60, 519, '220k + 220k + 100 nF', { size: 8, fill: '#555' }));
  padLabels(g, ['div.IN', 'div.GND', 'div.MID'], { size: 8.5 });

  // palm button
  board(g, { x: 230, y: 232, w: 70, h: 46, fill: '#222' });
  g.append(svg('circle', { cx: 262, cy: 255, r: 14, fill: SILVER }));
  g.append(text(230, 224, 'PALM BUTTON', { size: 9.5, fill: '#111' }));
  padLabels(g, ['palm.S', 'palm.G'], { size: 8.5 });

  // index buttons
  board(g, { x: 230, y: 286, w: 70, h: 80, fill: '#222' });
  for (const y of [296, 324, 352]) g.append(svg('circle', { cx: 264, cy: y, r: 11, fill: SILVER }));
  g.append(text(230, 382, 'INDEX BUTTONS', { size: 9.5, fill: '#111' }));
  padLabels(g, ['idx.L', 'idx.M', 'idx.R', 'idx.G'], { size: 8.5 });
}

// ------------------------------------------------------------ the diagram
export function initWiring(container, { onPick } = {}) {
  const used = new Set();
  WIRING_STEPS.forEach((s) => s.wires.forEach((w) => { used.add(w.from); used.add(w.to); }));

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'wire-svg' });
  root.append(
    svg('defs', {},
      svg('pattern', { id: 'grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' },
        svg('circle', { cx: 1, cy: 1, r: 0.9, fill: '#d6d4cd' }))),
    svg('rect', { width: W, height: H, fill: '#fff' }),
    svg('rect', { width: W, height: H, fill: 'url(#grid)' }),
  );

  const boards = svg('g');
  drawBoards(boards, used);
  root.append(boards);

  // pads: every pad is drawn; the ones a step uses get a ring when that step is active
  const dots = {};
  for (const [key, p] of Object.entries(pads)) {
    const ring = svg('circle', { cx: p.x, cy: p.y, r: 9, fill: 'none', stroke: '#1925aa', 'stroke-width': 2, opacity: 0 });
    const dot = svg('circle', { cx: p.x, cy: p.y, r: used.has(key) ? 4.6 : 3.2, fill: '#e8e6e0', stroke: '#555', 'stroke-width': 1 });
    root.append(ring, dot);
    dots[key] = { ring, dot };
  }

  // wires
  const wires = [];
  WIRING_STEPS.forEach((step, stepIndex) => {
    step.wires.forEach((w) => {
      const a = pads[w.from];
      const b = pads[w.to];
      const via = ROUTES[`${w.from}>${w.to}`] || [];
      const d = roundedPath([[a.x, a.y], ...via, [b.x, b.y]]);
      const group = svg('g', { style: 'cursor:pointer' });
      const color = hex(WIRE_COLORS[w.color]);
      group.append(
        svg('path', { d, fill: 'none', stroke: '#fff', 'stroke-width': 6.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        svg('path', { d, fill: 'none', stroke: color, 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'wire' }),
        svg('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 14 }),
      );
      group.addEventListener('click', () => { if (onPick) onPick(stepIndex); });
      wires.push({ group, step: stepIndex, from: w.from, to: w.to });
    });
  });
  // later steps are drawn first so earlier, shorter wires stay on top at crossings
  for (const w of [...wires].reverse()) root.append(w.group);

  const focusRing = svg('rect', { fill: 'none', stroke: '#1925aa', 'stroke-width': 2.5, 'stroke-dasharray': '6 5', rx: 6, opacity: 0 });
  root.append(focusRing);
  const FOCUS = { mt: [244, 434, 182, 82] };

  container.replaceChildren(root);

  function setStep(index) {
    const all = index === null || index === undefined;
    const active = new Set();
    for (const w of wires) {
      const on = all || w.step === index;
      w.group.style.opacity = on ? 1 : 0.12;
      w.group.querySelector('.wire').setAttribute('stroke-width', on && !all ? 4.4 : 3.4);
      if (on && !all) { active.add(w.from); active.add(w.to); }
    }
    for (const [key, d] of Object.entries(dots)) d.ring.setAttribute('opacity', active.has(key) ? 1 : 0);

    const focus = all ? null : WIRING_STEPS[index].focus;
    if (focus && FOCUS[focus]) {
      const [x, y, w, h] = FOCUS[focus];
      for (const [k, v] of Object.entries({ x, y, width: w, height: h, opacity: 1 })) focusRing.setAttribute(k, v);
    } else {
      focusRing.setAttribute('opacity', 0);
    }
  }
  setStep(null);
  return { setStep };
}
