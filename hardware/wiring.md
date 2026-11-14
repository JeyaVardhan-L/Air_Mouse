# Wiring

The same information as the interactive diagram on the website, as plain text.

Board: classic ESP32 DevKit (WROOM-32). Pin positions differ between boards,
so go by the labels printed next to the pins, not by position.

## Pin map

| What                  | ESP32 pin | Note                                   |
|-----------------------|-----------|----------------------------------------|
| MPU6050 SDA           | D21       | I2C data                               |
| MPU6050 SCL           | D22       | I2C clock                              |
| MPU6050 VCC           | 3V3       | never 5 V                              |
| MPU6050 GND           | GND       |                                        |
| Left click            | D25       | button to GND                          |
| Middle click / scroll | D26       | button to GND                          |
| Right click           | D27       | button to GND                          |
| Palm button           | D33       | button to GND; also wakes from sleep   |
| Battery gauge         | D34       | midpoint of the 220 kΩ + 220 kΩ divider |
| Boost VOUT+           | VIN / 5V  | 5.0 V in                               |
| Boost VOUT−           | GND       |                                        |
| Status LED            | D2        | on-board                               |

Buttons need no resistors: the firmware turns on the ESP32's internal pull-ups.

## Power chain

```
Li-Po cell ── TP4056 (B+ / B−) ── OUT+ ── slide switch ── MT3608 VIN+ ── VOUT+ ── ESP32 VIN
                                  OUT− ───────────────── MT3608 VIN− ── VOUT− ── ESP32 GND
```

## Battery gauge

```
battery + ── 220 kΩ ──┬── 220 kΩ ── GND
                      ├── 100 nF ── GND
                      └── D34
```

After soldering it, set `HAS_BATTERY_SENSE` to `1` in `firmware/src/config.h`.

## Steps

1. Battery + to TP4056 B+, battery − to B−.
2. TP4056 OUT+ through the slide switch to MT3608 VIN+. OUT− to VIN−.
3. **Set the MT3608 to 5.0 V** with a multimeter on VOUT+ / VOUT−, before the
   ESP32 is connected. These modules ship set to anything, often above 12 V.
4. MT3608 VOUT+ to ESP32 VIN, VOUT− to GND. Add a 470 µF capacitor across VIN
   and GND if the board resets when Bluetooth starts.
5. MPU6050: VCC to 3V3, GND to GND, SDA to D21, SCL to D22. Keep these short.
6. Index-finger buttons: one leg each to D25 (left), D26 (middle), D27 (right);
   the other legs joined together and taken to GND.
7. Palm button: one leg to D33, the other to the same ground.
8. Battery gauge, as drawn above.

For the first test on a breadboard you only need steps 5 to 7, with the ESP32
powered over USB.

## Do not

- Connect the battery straight to the 3V3 pin. A full cell is 4.2 V.
- Connect the MT3608 to the ESP32 before setting it to 5.0 V.
- Plug USB into the ESP32 while the slide switch is on.
- Use D0, D2, D5, D12 or D15 for buttons (they decide how the board boots), or
  D6 to D11 (used by the flash chip).
