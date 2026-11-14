#include "motion.h"

#include <Preferences.h>

#include "config.h"

namespace {

constexpr float UP_FILTER = 0.02f;  // how quickly the gravity estimate follows the accelerometer

float deadzone(float v) {
  if (v > DEADZONE_DPS) return v - DEADZONE_DPS;
  if (v < -DEADZONE_DPS) return v + DEADZONE_DPS;
  return 0;
}

int8_t takeWhole(float& acc) {
  float whole = truncf(acc);
  if (whole > 127) whole = 127;
  if (whole < -127) whole = -127;
  acc -= whole;
  return (int8_t)whole;
}

}  // namespace

void Motion::begin() {
  const float sign = FORWARD_NEGATIVE ? -1.0f : 1.0f;
  switch (FORWARD_AXIS) {
    case 'X': forward_ = {sign, 0, 0}; break;
    case 'Z': forward_ = {0, 0, sign}; break;
    default:  forward_ = {0, sign, 0}; break;
  }

  Preferences prefs;
  if (prefs.begin("airmouse", true)) {
    if (prefs.isKey("bx")) {
      bias_ = {prefs.getFloat("bx"), prefs.getFloat("by"), prefs.getFloat("bz")};
      biasValid_ = true;
    }
    prefs.end();
  }
}

void Motion::saveBias() {
  if (!biasValid_) return;
  Preferences prefs;
  if (prefs.begin("airmouse", false)) {
    prefs.putFloat("bx", bias_.x);
    prefs.putFloat("by", bias_.y);
    prefs.putFloat("bz", bias_.z);
    prefs.end();
  }
}

// Whenever the hand rests for a full window, the average gyro reading in that
// window *is* the bias. Only done while not pointing, so a slow steady sweep
// is never mistaken for drift.
void Motion::trackStillness(const Vec3& g, bool allowUpdate) {
  if (winCount_ == 0) {
    winMin_ = winMax_ = g;
    winSum_ = {};
  }
  winMin_ = {fminf(winMin_.x, g.x), fminf(winMin_.y, g.y), fminf(winMin_.z, g.z)};
  winMax_ = {fmaxf(winMax_.x, g.x), fmaxf(winMax_.y, g.y), fmaxf(winMax_.z, g.z)};
  winSum_ = winSum_ + g;

  if (++winCount_ < STILL_WINDOW) return;

  const Vec3 range = winMax_ - winMin_;
  const bool still =
      range.x < STILL_RANGE_DPS && range.y < STILL_RANGE_DPS && range.z < STILL_RANGE_DPS;
  if (still && allowUpdate) {
    const Vec3 mean = winSum_ * (1.0f / STILL_WINDOW);
    bias_ = biasValid_ ? bias_ + (mean - bias_) * 0.25f : mean;
    biasValid_ = true;
  }
  winCount_ = 0;
}

void Motion::update(const Vec3& accelG, const Vec3& gyroDps, float dt, MotionMode mode) {
  trackStillness(gyroDps, mode == MotionMode::Idle);
  if (!biasValid_) return;

  const Vec3 w = gyroDps - bias_;

  // At rest the accelerometer reads +1 g along "up". Only trust it when the
  // total is close to 1 g, i.e. the hand is not being shaken.
  const float aLen = length(accelG);
  if (aLen > 0.8f && aLen < 1.2f) {
    up_ = up_ + (accelG * (1.0f / aLen) - up_) * UP_FILTER;
    const float upLen = length(up_);
    if (upLen > 0.01f) up_ = up_ * (1.0f / upLen);
  }

  // Horizontal axis across the hand. Undefined when pointing straight up or
  // down, so keep the previous one in that case.
  const Vec3 lat = cross(up_, forward_);
  const float latLen = length(lat);
  if (latLen > 0.3f) lateral_ = lat * (1.0f / latLen);

  const float turn = deadzone(dot(w, up_));      // + = turning left
  const float nod = deadzone(dot(w, lateral_));  // + = pointing further down

  if (mode == MotionMode::Pointing) {
    float speed = sqrtf(turn * turn + nod * nod);
    if (speed > CURVE_KNEE_DPS) speed = CURVE_KNEE_DPS;
    const float gain =
        SENSITIVITY * (GAIN_SLOW + (GAIN_FAST - GAIN_SLOW) * speed / CURVE_KNEE_DPS);
    accX_ += (INVERT_X ? turn : -turn) * dt * gain;
    accY_ += (INVERT_Y ? -nod : nod) * dt * gain;
  } else if (mode == MotionMode::Scrolling) {
    accWheel_ += (INVERT_SCROLL ? nod : -nod) * dt / SCROLL_DEG_PER_NOTCH;
  }
}

void Motion::take(int8_t& dx, int8_t& dy, int8_t& wheel) {
  dx = takeWhole(accX_);
  dy = takeWhole(accY_);
  wheel = takeWhole(accWheel_);
}

void Motion::clearPending() { accX_ = accY_ = accWheel_ = 0; }
