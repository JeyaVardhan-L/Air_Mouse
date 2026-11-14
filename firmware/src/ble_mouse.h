// Bluetooth LE HID mouse: 3 buttons, relative X/Y, vertical wheel.
#pragma once
#include <Arduino.h>

namespace ble_mouse {

constexpr uint8_t BTN_LEFT = 0x01;
constexpr uint8_t BTN_RIGHT = 0x02;
constexpr uint8_t BTN_MIDDLE = 0x04;

void begin();
bool connected();
void send(uint8_t buttons, int8_t dx, int8_t dy, int8_t wheel);
void setBatteryPercent(uint8_t percent);

}  // namespace ble_mouse
