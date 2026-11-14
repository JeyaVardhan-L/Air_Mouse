#include "power.h"

#include <driver/rtc_io.h>
#include <esp_sleep.h>

#include "config.h"
#include "imu.h"

namespace power {

void begin() {
#if HAS_BATTERY_SENSE
  analogSetPinAttenuation(PIN_BATTERY, ADC_11db);
#endif
}

uint16_t batteryMillivolts() {
#if HAS_BATTERY_SENSE
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) sum += analogReadMilliVolts(PIN_BATTERY);
  return (uint16_t)(sum / 16 * 2);  // the divider halves the battery voltage
#else
  return 0;
#endif
}

uint8_t percentFrom(uint16_t mv) {
  // Resting-voltage points for a single LiPo cell, linearly interpolated.
  static const struct { uint16_t mv; uint8_t pct; } curve[] = {
      {BATTERY_FULL_MV, 100}, {3950, 75}, {3800, 50}, {3700, 25}, {3550, 8}, {BATTERY_EMPTY_MV, 0}};
  if (mv >= curve[0].mv) return 100;
  for (size_t i = 1; i < sizeof(curve) / sizeof(curve[0]); i++) {
    if (mv >= curve[i].mv) {
      const uint32_t span = curve[i - 1].mv - curve[i].mv;
      const uint32_t above = mv - curve[i].mv;
      return curve[i].pct + (uint8_t)((curve[i - 1].pct - curve[i].pct) * above / span);
    }
  }
  return 0;
}

void deepSleep() {
  imu::sleep();
  digitalWrite(PIN_LED, LOW);

  // Wake when the palm button pulls its pin low. The RTC pull-up keeps the
  // pin high while asleep, since the normal pull-up is powered down.
  rtc_gpio_pullup_en(PIN_PALM);
  rtc_gpio_pulldown_dis(PIN_PALM);
  esp_sleep_enable_ext0_wakeup(PIN_PALM, 0);
  esp_deep_sleep_start();
  for (;;) {}
}

}  // namespace power
