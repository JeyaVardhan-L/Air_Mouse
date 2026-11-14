// Turns raw gyro + accelerometer samples into cursor and scroll counts.
//
//   gyro -> remove bias -> project onto "turn" and "nod" axes (found from
//   gravity, so a rolled wrist still moves the cursor straight) -> deadzone
//   -> speed-dependent gain -> sub-count accumulator -> int8 deltas
#pragma once
#include "imu.h"

enum class MotionMode { Idle, Pointing, Scrolling };

class Motion {
 public:
  void begin();

  // Call once per IMU sample. dt in seconds.
  void update(const Vec3& accelG, const Vec3& gyroDps, float dt, MotionMode mode);

  // Whole counts accumulated since the last call; the fraction is kept.
  void take(int8_t& dx, int8_t& dy, int8_t& wheel);

  // Drop any pending movement (used when a click lands).
  void clearPending();

  // False until a gyro bias is known; the cursor stays still until then.
  bool ready() const { return biasValid_; }

  // Store the current bias so the next boot is ready immediately.
  void saveBias();

 private:
  void trackStillness(const Vec3& gyroDps, bool allowUpdate);

  Vec3 bias_;
  bool biasValid_ = false;

  Vec3 up_{0, 0, 1};       // gravity "up" in the sensor frame
  Vec3 lateral_{1, 0, 0};  // horizontal axis across the hand
  Vec3 forward_{0, 1, 0};  // along the fingers, from config

  Vec3 winMin_, winMax_, winSum_;
  uint16_t winCount_ = 0;

  float accX_ = 0, accY_ = 0, accWheel_ = 0;
};
