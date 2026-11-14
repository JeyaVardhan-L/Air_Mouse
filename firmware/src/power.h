// Battery measurement and deep sleep.
#pragma once
#include <Arduino.h>

namespace power {

void begin();

// Battery voltage in millivolts, or 0 when HAS_BATTERY_SENSE is off.
uint16_t batteryMillivolts();

// 0-100, from a simple LiPo discharge curve.
uint8_t percentFrom(uint16_t millivolts);

// Never returns. The palm button wakes the board, which then reboots.
[[noreturn]] void deepSleep();

}  // namespace power
