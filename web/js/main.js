import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildGlove } from './glove.js';
import { initWiring } from './wiring.js';
import { makeStage } from './toon.js';
import {
  BUILD_STEPS, GLOVE_PARTS, PARTS, PIN_TABLE, REPO_URL, TUNING, WIRE_COLORS, WIRING_STEPS,
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

// Ticked checklist items, remembered in this browser only.
function ticks(key) {
  let set = new Set();
  try {
    set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch { /* private window or blocked storage: start empty */ }
  return {
    has: (id) => set.has(id),
    get size() { return set.size; },
    toggle(id, on) {
      if (on) set.add(id); else set.delete(id);
      try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* not saved */ }
    },
  };
}

// ------------------------------------------------------------ shopping list
function renderParts() {
  const have = ticks('airmouse:parts');
  const count = $('#parts-count');
  const update = () => { count.textContent = `${have.size} of ${PARTS.length} in hand`; };

  $('#parts-grid').append(...PARTS.map((p) => {
    const input = el('input', { type: 'checkbox' });
    input.checked = have.has(p.id);
    input.addEventListener('change', () => { have.toggle(p.id, input.checked); update(); });
    return el('label', { class: 'part' },
      input,
      el('span', { class: 'part-qty' }, p.qty === '—' ? '' : `× ${p.qty}`),
      el('span', { class: 'part-name' }, p.name),
      el('span', { class: 'part-spec' }, p.spec),
      el('span', { class: 'part-why' }, p.why),
    );
  }));
  update();
}

// ------------------------------------------------------------ build phases
function renderBuild() {
  const done = ticks('airmouse:build');
  $('#build-list').append(...BUILD_STEPS.map((s, i) => {
    const input = el('input', { type: 'checkbox' });
    input.checked = done.has(s.id);
    input.addEventListener('change', () => done.toggle(s.id, input.checked));
    return el('li', {},
      el('label', { class: 'phase' },
        input,
        el('span', { class: 'phase-num' }, String(i + 1)),
        el('span', { class: 'phase-body' },
          el('span', { class: 'phase-title' }, s.title),
          el('span', { class: 'phase-text' }, s.text)),
      ));
  }));
}

function renderTable(selector, rows) {
  $(selector).append(...rows.map((cells) =>
    el('tr', {}, ...cells.map((c, i) => el(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : {}, c)))));
}

// ------------------------------------------------------------ hero model
function initHero() {
  const canvas = $('#hero-canvas');
  const stage = makeStage(canvas, {
    fov: 30,
    onResize(camera, aspect) {
      const d = 38 * Math.max(1, 1.05 / aspect);
      camera.position.set(-0.42 * d, 0.62 * d, 0.66 * d - 2.5);
      camera.lookAt(-0.5, 0, -2.5);
    },
  });
  const glove = buildGlove();
  stage.scene.add(glove.root);

  let last = 0;
  stage.run((t) => {
    glove.root.rotation.y = -0.25 + Math.sin(t * 0.45) * 0.4;
    glove.root.rotation.z = Math.sin(t * 0.6) * 0.06;
    glove.root.position.y = Math.sin(t * 0.9) * 0.3;
    glove.setPress(t % 7 > 4.2);  // every few seconds: curl, hold, let go
    glove.update(t - last);
    last = t;
  });
}

// ------------------------------------------------------------ explorer
function initExplorer() {
  const canvas = $('#explore-canvas');
  const target = new THREE.Vector3(-0.5, 0.5, -2.2);
  const stage = makeStage(canvas, {
    fov: 30,
    onResize(camera, aspect) {
      const d = 35 * Math.max(1, 1.15 / aspect);
      camera.position.set(-0.42 * d, 0.62 * d, 0.66 * d).add(target);
      camera.lookAt(target);
    },
  });
  const glove = buildGlove();
  stage.scene.add(glove.root);

  const controls = new OrbitControls(stage.camera, canvas);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  canvas.style.touchAction = 'pan-y';

  const title = $('#part-name');
  const text = $('#part-text');
  const chips = $('#part-chips');

  function select(id) {
    glove.select(id);
    title.textContent = GLOVE_PARTS[id].name;
    text.textContent = GLOVE_PARTS[id].text;
    for (const chip of chips.children) chip.setAttribute('aria-pressed', String(chip.dataset.part === id));
  }

  chips.append(...Object.entries(GLOVE_PARTS).map(([id, p]) =>
    el('button', { class: 'chip', type: 'button', 'data-part': id, 'aria-pressed': 'false', onclick: () => select(id) }, p.name)));

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
    const hit = raycaster.intersectObject(glove.root, true)[0];
    if (hit && hit.object.userData.part) select(hit.object.userData.part);
  });

  $('#explode').addEventListener('input', (e) => glove.setExplode(Number(e.target.value) / 100));

  const toggle = (selector, apply) => {
    const button = $(selector);
    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      apply(on);
    });
  };
  toggle('#toggle-press', (on) => glove.setPress(on));
  toggle('#toggle-lines', (on) => glove.setLineArt(on));

  select('palm');

  let last = 0;
  stage.run((t) => {
    controls.update();
    glove.update(t - last);
    last = t;
  });
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
      text.textContent = `${WIRING_STEPS.length} steps, ${count} wires. pick a step to see only its wires, or tap a wire in the model. orange is power, charcoal is ground, colours are signals.`;
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

  try {
    scene = initWiring($('#wire-canvas'), { onPick: show });
  } catch (error) {
    noWebgl($('#wire-canvas'), error);
  }
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

for (const link of document.querySelectorAll('[data-repo]')) {
  link.href = REPO_URL + (link.dataset.repo || '');
}

renderParts();
renderBuild();
renderTable('#pin-rows', PIN_TABLE);
renderTable('#tuning-rows', TUNING);

// Labels in the 3D scenes are drawn with the page font, so wait for it.
const fontsReady = document.fonts ? document.fonts.load('600 64px Fraunces').catch(() => {}) : Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
  guarded(initHero, '#hero-canvas');
  guarded(initExplorer, '#explore-canvas');
  initWiringSection();
});
