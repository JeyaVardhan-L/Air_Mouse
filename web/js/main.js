import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildAssembly, PART_INFO } from './models.js';
import { initWiring } from './wiring.js';
import { makeStage, makeTags } from './kit.js';
import {
  ASSEMBLY_PARTS, BUILD_STEPS, PARTS, PIN_TABLE, REPO_URL, TUNING, WIRE_COLORS, WIRING_STEPS,
} from './data.js';

const $ = (selector, root = document) => root.querySelector(selector);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

// ------------------------------------------------------------ shopping list
function renderParts() {
  $('#parts-grid').append(...PARTS.map((p) =>
    el('div', { class: 'part' },
      el('span', { class: 'part-name' }, p.name),
      el('span', { class: 'part-qty' }, p.qty === '—' ? '' : `× ${p.qty}`),
      el('span', { class: 'part-spec' }, p.spec),
      el('span', { class: 'part-why' }, p.why))));
}

// ------------------------------------------------------------ build phases
function renderBuild() {
  $('#build-list').append(...BUILD_STEPS.map((s, i) =>
    el('li', { class: 'phase' },
      el('span', { class: 'phase-num' }, String(i + 1).padStart(2, '0')),
      el('span', { class: 'phase-body' },
        el('span', { class: 'phase-title' }, s.title),
        el('span', { class: 'phase-text' }, s.text)))));
}

function renderTable(selector, rows) {
  $(selector).append(...rows.map((cells) =>
    el('tr', {}, ...cells.map((c, i) => el(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : {}, c)))));
}

// ------------------------------------------------------------ hero model
const HIDDEN_LABELS = new Set(['plate']);

function initHero() {
  const canvas = $('#hero-canvas');
  const target = new THREE.Vector3(0, 3.2, 0);
  const stage = makeStage(canvas, {
    fov: 28,
    onResize(camera, aspect) {
      const d = 22 * Math.max(1, 2.2 / aspect);
      camera.position.set(0.62 * d, 0.5 * d, 0.78 * d).add(target);
      camera.lookAt(target);
    },
  });
  const device = buildAssembly('light');
  stage.scene.add(device.root);

  const controls = new OrbitControls(stage.camera, canvas);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  canvas.style.touchAction = 'pan-y';

  const tags = makeTags($('#hero-tags'), stage.camera, canvas);
  for (const id of device.ids) {
    if (HIDDEN_LABELS.has(id)) continue;
    tags.add({ text: PART_INFO[id].name, anchor: device.parts[id].anchor, side: id === 'palm' || id === 'esp32' || id === 'battery' ? 'l' : 'r', length: id === 'power' ? 90 : 34, id });
  }
  stage.attachTags(tags);

  stage.run((t) => {
    controls.update();
    device.setExplode(0.62 + Math.sin(t * 0.5) * 0.22);
    device.setPress(t % 6 > 3.8);
  });
}

// ------------------------------------------------------------ explorer
function initExplorer() {
  const canvas = $('#explore-canvas');
  const target = new THREE.Vector3(0, 3.2, 0);
  const stage = makeStage(canvas, {
    fov: 28,
    onResize(camera, aspect) {
      const d = 20 * Math.max(1, 2.2 / aspect);
      camera.position.set(0.62 * d, 0.5 * d, 0.78 * d).add(target);
      camera.lookAt(target);
    },
  });
  const device = buildAssembly('dark');
  stage.scene.add(device.root);

  const controls = new OrbitControls(stage.camera, canvas);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  canvas.style.touchAction = 'pan-y';

  const title = $('#part-name');
  const text = $('#part-text');
  const size = $('#part-size');
  const chips = $('#part-chips');
  const tags = makeTags($('#explore-tags'), stage.camera, canvas);

  function select(id) {
    device.paint(id);
    tags.select(id);
    title.textContent = ASSEMBLY_PARTS[id].name;
    text.textContent = ASSEMBLY_PARTS[id].text;
    size.textContent = PART_INFO[id].mm;
    for (const chip of chips.children) chip.setAttribute('aria-pressed', String(chip.dataset.part === id));
  }

  for (const id of device.ids) {
    chips.append(el('button', { class: 'chip', type: 'button', 'data-part': id, 'aria-pressed': 'false', onclick: () => select(id) }, ASSEMBLY_PARTS[id].name));
    if (id === 'plate') continue;
    tags.add({ text: PART_INFO[id].name, anchor: device.parts[id].anchor, side: id === 'palm' || id === 'esp32' || id === 'battery' ? 'l' : 'r', length: id === 'power' ? 90 : 34, id, onClick: () => select(id) });
  }
  stage.attachTags(tags);

  // Click (not drag) on the model picks the part under the pointer.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, stage.camera);
    const hit = raycaster.intersectObject(device.root, true)[0];
    if (hit && hit.object.userData.part) select(hit.object.userData.part);
  });

  $('#explode').addEventListener('input', (e) => device.setExplode(Number(e.target.value) / 100));
  $('#explode').value = '50';

  select('esp32');
  stage.run(() => controls.update());
}

// ------------------------------------------------------------ wiring
function initWiringSection() {
  const tabs = $('#wire-tabs');
  const title = $('#wire-title');
  const text = $('#wire-text');
  const legend = $('#wire-legend');
  const card = $('#wire-card');
  let scene = null;

  const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
  const padName = (id) => id.split('.')[1].replace(/^GND[LR]$/, 'GND');

  function show(index) {
    for (const tab of tabs.children) tab.setAttribute('aria-pressed', String(tab.dataset.step === String(index)));
    legend.replaceChildren();
    if (index === null) {
      title.textContent = 'the whole circuit';
      const count = WIRING_STEPS.reduce((n, s) => n + s.wires.length, 0);
      text.textContent = `${WIRING_STEPS.length} steps, ${count} wires. pick a step to see only its wires, or tap a wire in the model. white is power, black is ground, tints are signals.`;
      card.classList.remove('warn');
    } else {
      const step = WIRING_STEPS[index];
      title.textContent = `${index + 1}. ${step.title}`;
      text.textContent = step.text;
      card.classList.toggle('warn', Boolean(step.warn));
      legend.append(...step.wires.map((w) =>
        el('li', {},
          el('span', { class: 'swatch', style: `background:${hex(WIRE_COLORS[w.color])}` }),
          `${padName(w.from)} → ${padName(w.to)}`)));
    }
    if (scene) scene.setStep(index);
  }

  tabs.append(
    el('button', { class: 'chip', type: 'button', 'data-step': 'null', onclick: () => show(null) }, 'all'),
    ...WIRING_STEPS.map((s, i) =>
      el('button', { class: 'chip', type: 'button', 'data-step': String(i), title: s.title, onclick: () => show(i) }, String(i + 1))),
  );

  scene = initWiring($('#wire-diagram'), { onPick: show });
  show(null);
}

// ------------------------------------------------------------ boot
function noWebgl(canvas, error) {
  console.warn('3D view unavailable:', error);
  canvas.closest('.stage').classList.add('no-webgl');
}

function guarded(init, canvasSelector) {
  try { init(); } catch (error) { noWebgl($(canvasSelector), error); }
}

const menu = $('.btn.menu');
const nav = $('#nav');
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
});

for (const link of document.querySelectorAll('[data-repo]')) {
  link.href = REPO_URL + (link.dataset.repo || '');
}

renderParts();
renderBuild();
renderTable('#pin-rows', PIN_TABLE);
renderTable('#tuning-rows', TUNING);

// Labels in the 3D scenes are page text; wait briefly for the font.
const fontsReady = document.fonts ? document.fonts.load('400 16px "JetBrains Mono"').catch(() => {}) : Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  guarded(initHero, '#hero-canvas');
  guarded(initExplorer, '#explore-canvas');
  initWiringSection();
});
