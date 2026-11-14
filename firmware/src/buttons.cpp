#include "buttons.h"

#include "config.h"

void Button::begin(uint8_t pin) {
  pin_ = pin;
  pinMode(pin_, INPUT_PULLUP);
  lastRaw_ = down_ = digitalRead(pin_) == LOW;
}

// The state only changes after the raw level has been stable for DEBOUNCE_MS.
void Button::update(uint32_t nowMs) {
  changed_ = false;
  const bool raw = digitalRead(pin_) == LOW;
  if (raw != lastRaw_) {
    lastRaw_ = raw;
    lastFlipMs_ = nowMs;
  }
  if (raw != down_ && nowMs - lastFlipMs_ >= DEBOUNCE_MS) {
    down_ = raw;
    changed_ = true;
  }
}
