// All guide content in one place: parts, wiring steps, build phases.
// The page and the 3D scenes both read from here, so they cannot disagree.

export const REPO_URL = 'https://github.com/JeyaVardhan-L/Air_Mouse';

// ------------------------------------------------------------ shopping list
export const PARTS = [
  { id: 'esp32', name: 'esp32 devkit', qty: '1', spec: 'classic WROOM-32, 30 or 38 pin',
    why: 'the brain and the bluetooth radio.' },
  { id: 'mpu6050', name: 'mpu6050', qty: '1', spec: 'GY-521 breakout',
    why: 'gyro + accelerometer. feels how your hand turns.' },
  { id: 'lipo', name: 'li-po cell', qty: '1', spec: '3.7 V, 500–1000 mAh, single cell',
    why: 'an old earbud-case cell works if it is big enough.' },
  { id: 'tp4056', name: 'tp4056 charger', qty: '1', spec: 'USB-C, the version with OUT+ / OUT− pads',
    why: 'charges the cell and protects it from over-discharge and shorts.' },
  { id: 'mt3608', name: 'mt3608 boost', qty: '1', spec: 'adjustable step-up module',
    why: 'lifts the battery to a steady 5 V for the devkit.' },
  { id: 'switch', name: 'slide switch', qty: '1', spec: 'small SPDT',
    why: 'a real off. a devkit sips power even when asleep.' },
  { id: 'tact', name: 'tactile buttons', qty: '3', spec: '6 × 6 mm, low profile',
    why: 'left, middle and right, under your thumb.' },
  { id: 'palm', name: 'palm button', qty: '1', spec: '12 × 12 mm tactile with a cap',
    why: 'big and soft, so curled fingers find it every time.' },
  { id: 'res', name: 'resistors', qty: '2', spec: '220 kΩ',
    why: 'halve the battery voltage so the esp32 can measure it.' },
  { id: 'cap', name: 'capacitors', qty: '2', spec: '100 nF ceramic, 470 µF electrolytic',
    why: 'steady the battery reading; soak up radio bursts.' },
  { id: 'wire', name: 'silicone wire', qty: '2 m', spec: '30 AWG, stranded',
    why: 'finger wires bend all day. stiff wire snaps.' },
  { id: 'mount', name: 'something to wear it on', qty: '1', spec: 'fingerless glove, or a velcro strap',
    why: 'the chassis. a thin snug glove is the easiest start.' },
  { id: 'perf', name: 'perfboard', qty: '1', spec: '7 × 7 cm, cut to fit',
    why: 'one rigid plate for the esp32 and the sensor.' },
  { id: 'misc', name: 'bits and bobs', qty: '—', spec: 'heat shrink, kapton tape, velcro, flexible glue',
    why: 'strain relief is what keeps it alive.' },
];

// ------------------------------------------------------------ 3D explorer
// Ids match buildAssembly() in models.js.
export const ASSEMBLY_PARTS = {
  esp32:   { name: 'esp32 devkit', text: 'runs the firmware and talks bluetooth. it sits on the plate with the usb port at the wrist end and the antenna end clear of everything else.' },
  mpu6050: { name: 'mpu6050', text: 'fixed flat to the same plate as the esp32. if it can wobble, the cursor wobbles, so glue it down.' },
  charger: { name: 'tp4056 charger', text: 'plug usb-c in here to charge. it also cuts the battery off before it runs too low or if something shorts.' },
  boost:   { name: 'mt3608 boost', text: 'turns 3.0 to 4.2 V of battery into a steady 5.0 V. set it with a multimeter before connecting anything.' },
  battery: { name: 'li-po cell', text: 'the heaviest part. keep it flat and padded, with no solder joints pressing into the pouch.' },
  power:   { name: 'slide switch', text: 'a hard off, between the charger and the boost module.' },
  index:   { name: 'index buttons', text: 'three buttons on the thumb side of the index finger: left at the tip end, then middle, then right.' },
  palm:    { name: 'palm button', text: 'where your middle and ring fingertips land when you curl them. hold it and the cursor follows your hand.' },
  plate:   { name: 'perfboard plate', text: 'one rigid plate for the esp32 and the sensor, so they stay square to each other. mount it on the back of the hand.' },
};

// ------------------------------------------------------------ wiring
// Pad ids are "<module>.<pad>" and match web/js/wiring.js.
export const WIRE_COLORS = {
  power: 0xd92d20,
  ground: 0x111111,
  blue: 0x2563eb,
  pink: 0xdb2777,
  green: 0x16a34a,
};

export const WIRING_STEPS = [
  {
    title: 'battery to charger',
    text: 'battery + to B+, battery − to B−. from now on the charger module is the only thing that touches the cell.',
    wires: [
      { from: 'bat.+', to: 'tp.B+', color: 'power' },
      { from: 'bat.-', to: 'tp.B-', color: 'ground' },
    ],
  },
  {
    title: 'charger to switch to boost',
    text: 'OUT+ goes through the slide switch to VIN+. OUT− goes straight to VIN−.',
    wires: [
      { from: 'tp.OUT+', to: 'sw.A', color: 'power' },
      { from: 'sw.B', to: 'mt.VIN+', color: 'power' },
      { from: 'tp.OUT-', to: 'mt.VIN-', color: 'ground' },
    ],
  },
  {
    title: 'set the boost to 5.0 V',
    warn: true,
    text: 'before the esp32 is connected: switch on, put a multimeter on VOUT+ and VOUT−, and turn the little brass screw until it reads 5.0 V. these modules ship set to anything, often above 12 V.',
    focus: 'mt',
    wires: [],
  },
  {
    title: 'boost to esp32',
    text: 'VOUT+ to the pin marked VIN (or 5V). VOUT− to GND. add the 470 µF capacitor across these two pins if the board resets when bluetooth starts.',
    wires: [
      { from: 'mt.VOUT+', to: 'esp.VIN', color: 'power' },
      { from: 'mt.VOUT-', to: 'esp.GNDL', color: 'ground' },
    ],
  },
  {
    title: 'the motion sensor',
    text: 'VCC to 3V3 (never 5 V), GND to GND, SDA to D21, SCL to D22. keep these four wires short.',
    wires: [
      { from: 'mpu.VCC', to: 'esp.3V3', color: 'power' },
      { from: 'mpu.GND', to: 'esp.GNDR', color: 'ground' },
      { from: 'mpu.SCL', to: 'esp.D22', color: 'green' },
      { from: 'mpu.SDA', to: 'esp.D21', color: 'blue' },
    ],
  },
  {
    title: 'index-finger buttons',
    text: 'one leg of each button to D25 (left), D26 (middle), D27 (right). the other legs are joined together and go to GND. no resistors needed.',
    wires: [
      { from: 'idx.L', to: 'esp.D25', color: 'blue' },
      { from: 'idx.M', to: 'esp.D26', color: 'pink' },
      { from: 'idx.R', to: 'esp.D27', color: 'green' },
      { from: 'idx.G', to: 'esp.GNDL', color: 'ground' },
    ],
  },
  {
    title: 'palm button',
    text: 'one leg to D33, the other to the same ground as the finger buttons. D33 is also the pin that wakes the mouse from sleep.',
    wires: [
      { from: 'palm.S', to: 'esp.D33', color: 'blue' },
      { from: 'palm.G', to: 'idx.G', color: 'ground' },
    ],
  },
  {
    title: 'battery gauge',
    text: 'battery + through 220 kΩ to D34, then 220 kΩ on to GND, with the 100 nF capacitor from D34 to GND. then set HAS_BATTERY_SENSE to 1 in config.h.',
    wires: [
      { from: 'bat.+', to: 'div.IN', color: 'power' },
      { from: 'div.MID', to: 'esp.D34', color: 'blue' },
      { from: 'div.GND', to: 'esp.GNDL', color: 'ground' },
    ],
  },
];

export const PIN_TABLE = [
  ['mpu6050 SDA', 'D21', 'i2c data'],
  ['mpu6050 SCL', 'D22', 'i2c clock'],
  ['mpu6050 VCC', '3V3', 'never 5 V'],
  ['left click', 'D25', 'button to GND'],
  ['middle click / scroll', 'D26', 'button to GND'],
  ['right click', 'D27', 'button to GND'],
  ['palm button', 'D33', 'button to GND; wakes from sleep'],
  ['battery gauge', 'D34', 'midpoint of 220 kΩ + 220 kΩ'],
  ['boost VOUT+', 'VIN / 5V', '5.0 V in'],
  ['status led', 'D2', 'on-board'],
];

// ------------------------------------------------------------ build phases
export const BUILD_STEPS = [
  { id: 'bench', title: 'breadboard first',
    text: 'esp32 on usb, the sensor on four jumper wires (wiring step 5). no battery yet.' },
  { id: 'flash', title: 'flash and pair',
    text: 'upload the firmware, then pair “Air Mouse” from your bluetooth settings. the led stops blinking once it connects.' },
  { id: 'point', title: 'make it point',
    text: 'jumper D33 to GND to stand in for the palm button and wave the breadboard about. set FORWARD_AXIS and the INVERT flags in config.h until the cursor goes where you expect.' },
  { id: 'buttons', title: 'add the buttons',
    text: 'wiring steps 6 and 7, still on the breadboard. check clicks, drag and tilt-to-scroll.' },
  { id: 'power', title: 'go cordless',
    text: 'wiring steps 1 to 4. set the boost to 5.0 V before it ever meets the esp32. then add the gauge, step 8.' },
  { id: 'plate', title: 'build the plate',
    text: 'move the esp32 and the sensor onto perfboard, rigid and square to each other. keep the antenna end clear.' },
  { id: 'mount', title: 'put it on your hand',
    text: 'stitch or velcro the plate onto a glove or strap. run the finger wires with a small loop of slack at each knuckle, and glue both ends of every solder joint.' },
  { id: 'tune', title: 'tune the feel',
    text: 'SENSITIVITY, the gain curve and CLICK_FREEZE_MS in config.h. small changes, one at a time.' },
];

export const TUNING = [
  ['SENSITIVITY', '22', 'overall cursor speed'],
  ['GAIN_SLOW / GAIN_FAST', '0.45 / 2.2', 'precision when slow, reach when fast'],
  ['DEADZONE_DPS', '0.8', 'raise it if the cursor trembles while you hold still'],
  ['CLICK_FREEZE_MS', '90', 'raise it if clicks land off target'],
  ['SCROLL_DEG_PER_NOTCH', '3.5', 'tilt needed per scroll step'],
  ['SLEEP_AFTER_MS', '5 min', 'idle time before deep sleep'],
];
