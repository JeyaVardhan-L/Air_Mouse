// Everything you are likely to change lives in this file.
#pragma once
#include <Arduino.h>

// ---------------------------------------------------------------- pins
// Classic ESP32 DevKit. All buttons switch to GND (internal pull-ups).
constexpr uint8_t PIN_SDA = 21;
constexpr uint8_t PIN_SCL = 22;
constexpr gpio_num_t PIN_PALM = GPIO_NUM_33;  // hold to move; also wakes from sleep
constexpr uint8_t PIN_LEFT = 25;
constexpr uint8_t PIN_MIDDLE = 26;
constexpr uint8_t PIN_RIGHT = 27;
constexpr uint8_t PIN_BATTERY = 34;  // midpoint of the 220k/220k divider
constexpr uint8_t PIN_LED = 2;       // on-board LED on most DevKits

// ---------------------------------------------------------------- device
constexpr char DEVICE_NAME[] = "Air Mouse";
constexpr char DEVICE_MAKER[] = "Air Mouse Project";

// ---------------------------------------------------------------- mounting
// Which sensor axis points along your fingers when the glove is on.
// Look at the arrows printed on the GY-521 board. One of: 'X', 'Y', 'Z'.
constexpr char FORWARD_AXIS = 'Y';
constexpr bool FORWARD_NEGATIVE = false;  // true if the arrow points at your wrist
constexpr bool INVERT_X = false;          // flip if left/right is reversed
constexpr bool INVERT_Y = false;          // flip if up/down is reversed
constexpr bool INVERT_SCROLL = false;

// ---------------------------------------------------------------- timing
constexpr uint32_t SAMPLE_PERIOD_MS = 2;  // 500 Hz IMU loop
constexpr uint8_t REPORT_EVERY = 4;       // one HID report per 4 samples = 125 Hz

// ---------------------------------------------------------------- feel
constexpr float SENSITIVITY = 22.0f;        // cursor counts per degree at mid speed
constexpr float GAIN_SLOW = 0.45f;          // gain multiplier for tiny movements
constexpr float GAIN_FAST = 2.2f;           // gain multiplier at/above CURVE_KNEE_DPS
constexpr float CURVE_KNEE_DPS = 220.0f;    // hand speed where the gain tops out
constexpr float DEADZONE_DPS = 0.8f;        // ignore rotation slower than this
constexpr float SCROLL_DEG_PER_NOTCH = 3.5f;
constexpr uint32_t CLICK_FREEZE_MS = 90;    // hold the cursor still while a click lands
constexpr uint32_t MIDDLE_TAP_MS = 350;     // shorter than this without tilting = middle click
constexpr uint32_t DEBOUNCE_MS = 6;

// ---------------------------------------------------------------- gyro bias
constexpr uint16_t STILL_WINDOW = 250;      // samples per stillness check (0.5 s)
constexpr float STILL_RANGE_DPS = 2.0f;     // max wobble that still counts as "at rest"

// ---------------------------------------------------------------- power
// Leave at 0 until the battery divider (wiring step 8) is soldered in.
// A floating ADC pin reads garbage and would trigger the low-battery cutoff.
#define HAS_BATTERY_SENSE 0
constexpr uint32_t SLEEP_AFTER_MS = 5UL * 60UL * 1000UL;  // idle time before deep sleep
constexpr uint16_t BATTERY_EMPTY_MV = 3300;
constexpr uint16_t BATTERY_FULL_MV = 4150;

// Print IMU and motion values on the serial port (115200 baud).
#define DEBUG_SERIAL 0
