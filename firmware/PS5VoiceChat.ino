#include "USB.h"
#include "USBHIDKeyboard.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <esp_event.h>

#define SERVICE_UUID        "6E400001-B5B3-F393-E0A9-E50E24DCCA9E"
#define CHAR_UUID_RX        "6E400002-B5B3-F393-E0A9-E50E24DCCA9E"
#define CHAR_UUID_TX        "6E400003-B5B3-F393-E0A9-E50E24DCCA9E"

USBHIDKeyboard Keyboard;
BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic;
bool deviceConnected = false;
String receivedText = "";
bool newTextAvailable = false;

Preferences prefs;
int typeDelay = 50;   // ms between characters
int preDelay = 300;   // ms to wait before starting to type

uint8_t prevLeds = 0xFF;  // force first report to count as a change
bool chatActive = false;  // alternates on each LED change

void onLedChange(void *handler_arg, esp_event_base_t base, int32_t id, void *event_data) {
  if (id != ARDUINO_USB_HID_KEYBOARD_LED_EVENT || event_data == NULL) return;
  arduino_usb_hid_keyboard_event_data_t *data = (arduino_usb_hid_keyboard_event_data_t *)event_data;
  if (data->leds == prevLeds) return;  // only react to actual changes
  prevLeds = data->leds;
  chatActive = !chatActive;

  if (deviceConnected) {
    if (chatActive) {
      pTxCharacteristic->setValue("#LISTEN");
      Serial.println("CHAT OPEN -> #LISTEN");
    } else {
      pTxCharacteristic->setValue("#STOP");
      Serial.println("CHAT CLOSED -> #STOP");
    }
    pTxCharacteristic->notify();
  } else {
    Serial.println(chatActive ? "CHAT OPEN (no phone connected)" : "CHAT CLOSED (no phone connected)");
  }
}

void sendConfig() {
  String cfg = "#D" + String(typeDelay) + "#P" + String(preDelay);
  pTxCharacteristic->setValue(cfg.c_str());
  pTxCharacteristic->notify();
  Serial.print("CONFIG SENT: ");
  Serial.println(cfg);
}

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("BLE CONNECTED");
    delay(200);
    sendConfig();
  }
  void onDisconnect(BLEServer *pServer) {
    deviceConnected = false;
    Serial.println("BLE DISCONNECTED");
    pServer->startAdvertising();
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rxValue = pCharacteristic->getValue().c_str();
    Serial.print("BLE RECEIVED: ");
    Serial.println(rxValue);

    if (rxValue == "#G") {
      sendConfig();
      return;
    }
    if (rxValue.startsWith("#D")) {
      int v = rxValue.substring(2).toInt();
      if (v > 0) {
        typeDelay = v;
        prefs.putInt("typeDelay", typeDelay);
        Serial.print("TYPE DELAY SET: ");
        Serial.println(typeDelay);
      }
      return;
    }
    if (rxValue.startsWith("#P")) {
      int v = rxValue.substring(2).toInt();
      if (v >= 0) {
        preDelay = v;
        prefs.putInt("preDelay", preDelay);
        Serial.print("PRE DELAY SET: ");
        Serial.println(preDelay);
      }
      return;
    }

    if (rxValue.length() > 0) {
      receivedText = rxValue;
      newTextAvailable = true;
    }
  }
};

void setup() {
  delay(1000);

  USB.begin();
  Keyboard.begin();
  Keyboard.onEvent(ARDUINO_USB_HID_KEYBOARD_LED_EVENT, onLedChange);

  Serial.begin(115200);
  Serial.println("BOOT OK");

  prefs.begin("ps5vc", false);
  typeDelay = prefs.getInt("typeDelay", 50);
  preDelay = prefs.getInt("preDelay", 300);
  Serial.print("TYPE DELAY: ");
  Serial.println(typeDelay);
  Serial.print("PRE DELAY: ");
  Serial.println(preDelay);

  BLEDevice::init("PS5VoiceChat");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHAR_UUID_TX,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    CHAR_UUID_RX,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pRxCharacteristic->setCallbacks(new RxCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("BLE ADVERTISING AS PS5VoiceChat");
}

void loop() {
  if (newTextAvailable) {
    newTextAvailable = false;

    Serial.print("TYPING: ");
    Serial.println(receivedText);

    delay(preDelay);

    for (unsigned int i = 0; i < receivedText.length(); i++) {
      char c = receivedText[i];
      Keyboard.press(c);
      delay(5);
      Keyboard.release(c);
      delay(typeDelay);
    }
    // Give the PS5 a clean, deliberate Enter press so the chat submits.
    delay(150);
    Keyboard.press(KEY_RETURN);
    delay(100);
    Keyboard.release(KEY_RETURN);

    Serial.println("DONE TYPING");
  }
}
