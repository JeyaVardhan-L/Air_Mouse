# airmouse

A wearable that works as a Bluetooth mouse. Curl two fingers, point at the screen,
and the cursor follows your hand. Let go and it stays put, so you can type
without taking it off.

**Build guide (interactive, 3D): https://jeyavardhan-l.github.io/Air_Mouse/**

[![firmware](https://github.com/JeyaVardhan-L/Air_Mouse/actions/workflows/firmware.yml/badge.svg)](https://github.com/JeyaVardhan-L/Air_Mouse/actions/workflows/firmware.yml)

## How it is used

| Action | How |
|--------|-----|
| Move the pointer | Hold the palm button and move your hand |
| Left / middle / right click | Three buttons on the side of the index finger, pressed by the thumb |
| Drag | Hold the palm button and left click, then move |
| Scroll | Hold the middle button and tilt your hand; a quick tap is a middle click |
| Type | Let go of the palm button; nothing moves |

It pairs like any Bluetooth mouse. No dongle, no driver.

## What it is made of

- ESP32 DevKit (classic WROOM-32)
- MPU6050 gyro + accelerometer (GY-521)
- Single-cell Li-Po, TP4056 charger with protection, MT3608 boost to 5 V
- Four tactile buttons, a fingerless glove, a piece of perfboard

Full list: [hardware/BOM.csv](hardware/BOM.csv). Wiring: [hardware/wiring.md](hardware/wiring.md).

## Quick start

Wire the MPU6050 to the ESP32 on a breadboard (VCC→3V3, GND→GND, SDA→D21,
SCL→D22), plug the ESP32 into USB, then with
[PlatformIO](https://platformio.org/install/cli) installed:

```bash
git clone https://github.com/JeyaVardhan-L/Air_Mouse.git
cd Air_Mouse/firmware
pio run -t upload
```

Pair **Air Mouse** from your computer's Bluetooth settings. Jumper D33 to GND
to stand in for the palm button and move the board: the cursor should follow.
Everything adjustable is in [`firmware/src/config.h`](firmware/src/config.h).

The website walks through the rest: parts, wiring step by step, and putting it
on a glove.

## How it works

```
gyro (500 Hz) → remove drift → level with gravity → speed curve → Bluetooth HID report (125 Hz)
```

- **Rate, not angle.** The cursor moves by how fast the hand turns, so nothing
  accumulates and nothing jumps when the palm button is pressed.
- **Drift learning.** Whenever the hand rests, the gyro's zero offset is
  re-measured and saved.
- **Roll compensation.** Gravity gives the "up" direction, so a tilted wrist
  still moves the cursor straight.
- **Click freeze.** The cursor holds still for a moment when a button goes
  down, so clicks land where you aimed.

## Repository layout

```
firmware/   PlatformIO project for the ESP32
hardware/   bill of materials and wiring reference
web/        the build-guide website (plain HTML/CSS/JS + three.js, no build step)
```

To work on the site, serve the `web/` folder with any static server:

```bash
python -m http.server 8000 --directory web
```

## Status

Early. The firmware and guide were written ahead of the first finished build,
so the numbers on the site are design targets, not measurements. Measured
latency, battery life and tuning values will be added once it is built.

Issues and pull requests are welcome.

## Licence

[MIT](LICENSE)
