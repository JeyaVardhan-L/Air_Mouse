// Air Mouse — a glove that is a Bluetooth mouse.
//
//   hold the palm button  -> the cursor follows your hand
//   index-finger buttons  -> left / middle / right click (work any time)
//   hold middle and tilt  -> scroll; a short tap is a middle click
//
// Settings: config.h. Build guide: see the project website / README.

#include <Arduino.h>

#include "ble_mouse.h"
#include "buttons.h"
#include "config.h"
#include "imu.h"
#include "motion.h"
#include "power.h"

namespace {

Button palm, leftBtn, middleBtn, rightBtn;
Motion motion;

uint32_t lastActivityMs = 0;
uint32_t freezeUntilMs = 0;     // cursor held still until this time (click landing)
uint32_t middleDownMs = 0;
uint32_t middlePulseUntilMs = 0;  // middle button reported as down until this time
bool middleScrolled = false;
uint8_t lastButtons = 0;
uint8_t lowBatteryCount = 0;

// Fatal wiring problem: blink fast forever so it is obvious on the bench.
[[noreturn]] void failBlink() {
  for (;;) {
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    delay(100);
  }
}

void updateLed(uint32_t nowMs) {
  // Connected: off (saves power). Waiting for a host: slow blink.
  const bool on = !ble_mouse::connected() && (nowMs % 1000) < 120;
  digitalWrite(PIN_LED, on ? HIGH : LOW);
}

void checkBattery() {
#if HAS_BATTERY_SENSE
  const uint16_t mv = power::batteryMillivolts();
  ble_mouse::setBatteryPercent(power::percentFrom(mv));
  // Three low readings in a row (90 s) before giving up, so a brief sag
  // during a radio burst does not switch the mouse off.
  lowBatteryCount = (mv < BATTERY_EMPTY_MV) ? lowBatteryCount + 1 : 0;
  if (lowBatteryCount >= 3) {
    motion.saveBias();
    power::deepSleep();
  }
#endif
}

}  // namespace

void setup() {
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, HIGH);
#if DEBUG_SERIAL
  Serial.begin(115200);
#endif

  palm.begin(PIN_PALM);
  leftBtn.begin(PIN_LEFT);
  middleBtn.begin(PIN_MIDDLE);
  rightBtn.begin(PIN_RIGHT);

  power::begin();
  if (!imu::begin()) failBlink();  // MPU6050 not found: check SDA/SCL/VCC/GND
  motion.begin();
  ble_mouse::begin();

  lastActivityMs = millis();
  digitalWrite(PIN_LED, LOW);
}

void loop() {
  static TickType_t wake = xTaskGetTickCount();
  static uint32_t lastMicros = micros();
  static uint8_t sampleCount = 0;
  static uint32_t lastBatteryMs = 0;

  vTaskDelayUntil(&wake, pdMS_TO_TICKS(SAMPLE_PERIOD_MS));

  const uint32_t nowMicros = micros();
  const float dt = (nowMicros - lastMicros) * 1e-6f;
  lastMicros = nowMicros;
  const uint32_t now = millis();

  // ---- buttons
  palm.update(now);
  leftBtn.update(now);
  middleBtn.update(now);
  rightBtn.update(now);

  if (palm.down() || leftBtn.down() || middleBtn.down() || rightBtn.down()) lastActivityMs = now;

  if (leftBtn.pressed() || rightBtn.pressed()) {
    // Pressing a button nudges the hand; hold the cursor still while it lands.
    freezeUntilMs = now + CLICK_FREEZE_MS;
    motion.clearPending();
  }
  if (palm.pressed()) motion.clearPending();

  if (middleBtn.pressed()) {
    middleDownMs = now;
    middleScrolled = false;
    motion.clearPending();
  }
  if (middleBtn.released() && !middleScrolled && now - middleDownMs < MIDDLE_TAP_MS) {
    middlePulseUntilMs = now + 40;  // a tap: report a short middle click
  }

  // ---- motion
  MotionMode mode = MotionMode::Idle;
  if (middleBtn.down()) {
    mode = MotionMode::Scrolling;
  } else if (palm.down() && (int32_t)(now - freezeUntilMs) >= 0) {
    mode = MotionMode::Pointing;
  }

  Vec3 accel, gyro;
  if (imu::read(accel, gyro)) {
    motion.update(accel, gyro, dt, mode);
#if DEBUG_SERIAL
    if (sampleCount == 0 && (now % 100) < SAMPLE_PERIOD_MS * REPORT_EVERY) {
      Serial.printf("a %.2f %.2f %.2f  g %.1f %.1f %.1f  ready %d\n", accel.x, accel.y, accel.z,
                    gyro.x, gyro.y, gyro.z, motion.ready());
    }
#endif
  }

  // ---- HID report
  if (++sampleCount >= REPORT_EVERY) {
    sampleCount = 0;

    int8_t dx, dy, wheel;
    motion.take(dx, dy, wheel);
    if (wheel != 0) middleScrolled = true;

    uint8_t buttons = 0;
    if (leftBtn.down()) buttons |= ble_mouse::BTN_LEFT;
    if (rightBtn.down()) buttons |= ble_mouse::BTN_RIGHT;
    if ((int32_t)(middlePulseUntilMs - now) > 0) buttons |= ble_mouse::BTN_MIDDLE;

    if (dx != 0 || dy != 0 || wheel != 0 || buttons != lastButtons) {
      ble_mouse::send(buttons, dx, dy, wheel);
      lastButtons = buttons;
    }
  }

  // ---- housekeeping
  updateLed(now);

  if (now - lastBatteryMs >= 30000) {
    lastBatteryMs = now;
    checkBattery();
  }

  if (now - lastActivityMs >= SLEEP_AFTER_MS) {
    motion.saveBias();
    power::deepSleep();
  }
}
