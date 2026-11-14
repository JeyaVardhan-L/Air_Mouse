// Minimal MPU6050 driver: no library, just the registers we need.
#pragma once
#include <Arduino.h>
#include <math.h>

struct Vec3 {
  float x, y, z;
  Vec3() : x(0), y(0), z(0) {}
  Vec3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}
};

inline Vec3 operator+(const Vec3& a, const Vec3& b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
inline Vec3 operator-(const Vec3& a, const Vec3& b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
inline Vec3 operator*(const Vec3& a, float s) { return {a.x * s, a.y * s, a.z * s}; }
inline float dot(const Vec3& a, const Vec3& b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
inline Vec3 cross(const Vec3& a, const Vec3& b) {
  return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
inline float length(const Vec3& a) { return sqrtf(dot(a, a)); }

namespace imu {

// Returns false if no MPU6050 answers on the I2C bus.
bool begin();

// Acceleration in g, rotation rate in degrees per second.
// Returns false if the read failed (loose wire).
bool read(Vec3& accelG, Vec3& gyroDps);

// Lowest-power state; begin() wakes it again.
void sleep();

}  // namespace imu
