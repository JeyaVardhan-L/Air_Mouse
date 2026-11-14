// Debounced, active-low push buttons.
#pragma once
#include <Arduino.h>

class Button {
 public:
  void begin(uint8_t pin);
  void update(uint32_t nowMs);

  bool down() const { return down_; }
  bool pressed() const { return down_ && changed_; }    // true for one update after press
  bool released() const { return !down_ && changed_; }  // true for one update after release

 private:
  uint8_t pin_ = 0;
  bool down_ = false;
  bool changed_ = false;
  bool lastRaw_ = false;
  uint32_t lastFlipMs_ = 0;
};
