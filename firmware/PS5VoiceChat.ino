#include "USB.h"
#include "USBHIDKeyboard.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "6E400001-B5B3-F393-E0A9-E50E24DCCA9E"
#define CHAR_UUID_RX        "6E400002-B5B3-F393-E0A9-E50E24DCCA9E"
#define CHAR_UUID_TX        "6E400003-B5B3-F393-E0A9-E50E24DCCA9E"

USBHIDKeyboard Keyboard;
BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic;
bool deviceConnected = false;
String receivedText = "";
bool newTextAvailable = false;

int typeDelay = 50;   // ms between characters
int preDelay = 300;   // ms to wait before starting to type

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    deviceConnected = true;
    Serial.println("BLE CONNECTED");
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

    if (rxValue.startsWith("#D")) {
      int v = rxValue.substring(2).toInt();
      if (v > 0) {
        typeDelay = v;
        Serial.print("TYPE DELAY SET: ");
        Serial.println(typeDelay);
      }
      return;
    }
    if (rxValue.startsWith("#P")) {
      int v = rxValue.substring(2).toInt();
      if (v >= 0) {
        preDelay = v;
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

  Serial.begin(115200);
  Serial.println("BOOT OK");

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
    Keyboard.press(KEY_RETURN);
    delay(20);
    Keyboard.release(KEY_RETURN);

    Serial.println("DONE TYPING");
  }
}
