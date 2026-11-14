#include "imu.h"

#include <Wire.h>

#include "config.h"

namespace {

constexpr uint8_t ADDR = 0x68;  // AD0 low (GY-521 default)

constexpr uint8_t REG_SMPLRT_DIV = 0x19;
constexpr uint8_t REG_CONFIG = 0x1A;
constexpr uint8_t REG_GYRO_CONFIG = 0x1B;
constexpr uint8_t REG_ACCEL_CONFIG = 0x1C;
constexpr uint8_t REG_ACCEL_XOUT_H = 0x3B;
constexpr uint8_t REG_PWR_MGMT_1 = 0x6B;
constexpr uint8_t REG_WHO_AM_I = 0x75;

constexpr float ACCEL_LSB_PER_G = 16384.0f;  // +-2 g
constexpr float GYRO_LSB_PER_DPS = 32.8f;    // +-1000 dps

bool writeReg(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(ADDR);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

int16_t be16(const uint8_t* p) { return (int16_t)((p[0] << 8) | p[1]); }

}  // namespace

namespace imu {

bool begin() {
  // The casts matter: with uint8_t arguments the core picks its I2C *slave* overload.
  Wire.begin((int)PIN_SDA, (int)PIN_SCL, (uint32_t)400000);
  Wire.setTimeOut(20);

  Wire.beginTransmission(ADDR);
  Wire.write(REG_WHO_AM_I);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(ADDR, (uint8_t)1) != 1) return false;
  Wire.read();  // genuine parts answer 0x68; clones vary, so the value is not checked

  bool ok = writeReg(REG_PWR_MGMT_1, 0x01);     // wake, clock from gyro X PLL
  delay(50);
  ok &= writeReg(REG_SMPLRT_DIV, 0x00);         // 1 kHz output
  ok &= writeReg(REG_CONFIG, 0x02);             // ~98 Hz low-pass, ~3 ms delay
  ok &= writeReg(REG_GYRO_CONFIG, 0x10);        // +-1000 dps
  ok &= writeReg(REG_ACCEL_CONFIG, 0x00);       // +-2 g
  return ok;
}

bool read(Vec3& accelG, Vec3& gyroDps) {
  Wire.beginTransmission(ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(ADDR, (uint8_t)14) != 14) return false;

  uint8_t raw[14];
  for (uint8_t& b : raw) b = Wire.read();

  accelG = {be16(raw + 0) / ACCEL_LSB_PER_G, be16(raw + 2) / ACCEL_LSB_PER_G,
            be16(raw + 4) / ACCEL_LSB_PER_G};
  // raw[6..7] is temperature, unused
  gyroDps = {be16(raw + 8) / GYRO_LSB_PER_DPS, be16(raw + 10) / GYRO_LSB_PER_DPS,
             be16(raw + 12) / GYRO_LSB_PER_DPS};
  return true;
}

void sleep() { writeReg(REG_PWR_MGMT_1, 0x40); }

}  // namespace imu
