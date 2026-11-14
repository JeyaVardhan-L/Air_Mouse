#include "ble_mouse.h"

#include <NimBLEDevice.h>
#include <NimBLEHIDDevice.h>

#include "config.h"

namespace {

constexpr uint8_t REPORT_ID = 1;
constexpr uint16_t APPEARANCE_MOUSE = 0x03C2;

// Standard boot-compatible mouse: 3 buttons + 5 bits padding, then X, Y, wheel as int8.
const uint8_t REPORT_MAP[] = {
    0x05, 0x01,        // Usage Page (Generic Desktop)
    0x09, 0x02,        // Usage (Mouse)
    0xA1, 0x01,        // Collection (Application)
    0x85, REPORT_ID,   //   Report ID
    0x09, 0x01,        //   Usage (Pointer)
    0xA1, 0x00,        //   Collection (Physical)
    0x05, 0x09,        //     Usage Page (Buttons)
    0x19, 0x01,        //     Usage Minimum (1)
    0x29, 0x03,        //     Usage Maximum (3)
    0x15, 0x00,        //     Logical Minimum (0)
    0x25, 0x01,        //     Logical Maximum (1)
    0x95, 0x03,        //     Report Count (3)
    0x75, 0x01,        //     Report Size (1)
    0x81, 0x02,        //     Input (Data, Variable, Absolute)
    0x95, 0x01,        //     Report Count (1)
    0x75, 0x05,        //     Report Size (5)
    0x81, 0x03,        //     Input (Constant) - padding
    0x05, 0x01,        //     Usage Page (Generic Desktop)
    0x09, 0x30,        //     Usage (X)
    0x09, 0x31,        //     Usage (Y)
    0x09, 0x38,        //     Usage (Wheel)
    0x15, 0x81,        //     Logical Minimum (-127)
    0x25, 0x7F,        //     Logical Maximum (127)
    0x75, 0x08,        //     Report Size (8)
    0x95, 0x03,        //     Report Count (3)
    0x81, 0x06,        //     Input (Data, Variable, Relative)
    0xC0,              //   End Collection
    0xC0,              // End Collection
};

NimBLEServer* server = nullptr;
NimBLEHIDDevice* hid = nullptr;
NimBLECharacteristic* input = nullptr;
volatile bool isConnected = false;

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* s, ble_gap_conn_desc* desc) override {
    isConnected = true;
    // Ask for the fastest interval BLE allows (7.5 ms; units are 1.25 ms).
    // The host has the final say, typically granting 7.5-15 ms.
    s->updateConnParams(desc->conn_handle, 6, 9, 0, 300);
  }
  void onDisconnect(NimBLEServer*) override {
    isConnected = false;
    NimBLEDevice::startAdvertising();
  }
};

}  // namespace

namespace ble_mouse {

void begin() {
  NimBLEDevice::init(DEVICE_NAME);
  // Bond so the host reconnects by itself after sleep; "just works" pairing, no PIN.
  NimBLEDevice::setSecurityAuth(true, false, true);
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_NO_INPUT_OUTPUT);

  server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  hid = new NimBLEHIDDevice(server);
  input = hid->inputReport(REPORT_ID);
  hid->manufacturer()->setValue(std::string(DEVICE_MAKER));
  hid->pnp(0x02, 0xE502, 0xA111, 0x0100);
  hid->hidInfo(0x00, 0x01);
  hid->reportMap((uint8_t*)REPORT_MAP, sizeof(REPORT_MAP));
  hid->startServices();
  hid->setBatteryLevel(100);

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->setAppearance(APPEARANCE_MOUSE);
  adv->addServiceUUID(hid->hidService()->getUUID());
  adv->setScanResponse(true);
  adv->start();
}

bool connected() { return isConnected; }

void send(uint8_t buttons, int8_t dx, int8_t dy, int8_t wheel) {
  if (!isConnected || input == nullptr) return;
  uint8_t report[4] = {buttons, (uint8_t)dx, (uint8_t)dy, (uint8_t)wheel};
  input->setValue(report, sizeof(report));
  input->notify();
}

void setBatteryPercent(uint8_t percent) {
  if (hid != nullptr) hid->setBatteryLevel(percent);
}

}  // namespace ble_mouse
