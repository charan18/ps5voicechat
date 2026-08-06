import { BleManager, Device, Characteristic, BleError } from 'react-native-ble-plx';
import { encode as base64Encode } from 'base-64';
import { BLE_CONSTANTS, BLE_TIMEOUTS, RECONNECT_DELAY, MAX_RECONNECT_ATTEMPTS } from '@/constants';
import type { BleDevice } from '@/types';
import { useBleStore } from '@/store';

type ConnectionCallback = (device: BleDevice | null, error: string | null) => void;

class BleService {
  private manager: BleManager;
  private connectedDevice: Device | null = null;
  private lastConnectedDeviceId: string | null = null;
  private rxCharacteristic: Characteristic | null = null;
  private txCharacteristic: Characteristic | null = null;
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private isUserDisconnect = false;
  private connectionListeners: Set<ConnectionCallback> = new Set();

  constructor() {
    this.manager = new BleManager();
  }

  private getStore() {
    return useBleStore.getState();
  }

  async scanForDevices(): Promise<BleDevice[]> {
    const store = this.getStore();
    store.setState('scanning');
    store.setError(null);

    return new Promise((resolve, reject) => {
      const foundDevices = new Map<string, BleDevice>();

      this.manager.startDeviceScan(
        [BLE_CONSTANTS.SERVICE_UUID],
        { allowDuplicates: false },
        (error: BleError | null, device: Device | null) => {
          if (error) {
            store.setError(error.message);
            store.setState('error');
            this.cleanupScan();
            reject(new Error(error.message));
            return;
          }

          if (device && device.name === BLE_CONSTANTS.DEVICE_NAME) {
            const bleDevice: BleDevice = {
              id: device.id,
              name: device.name ?? 'Unknown',
              rssi: device.rssi ?? 0,
            };
            foundDevices.set(device.id, bleDevice);
          }
        }
      ).catch((err) => {
        store.setError(err.message);
        store.setState('error');
        reject(err);
      });

      setTimeout(() => {
        this.cleanupScan();
        const devices = Array.from(foundDevices.values());
        store.setState('idle');
        resolve(devices);
      }, BLE_TIMEOUTS.SCAN);
    });
  }

  private cleanupScan(): void {
    this.manager.stopDeviceScan();
  }

  async connect(deviceId: string): Promise<BleDevice> {
    const store = this.getStore();
    store.setState('connecting');
    store.setError(null);
    this.isUserDisconnect = false;

    try {
      const device = await this.manager.connectToDevice(deviceId, { timeout: BLE_TIMEOUTS.CONNECT, requestMTU: 517 });
      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;
      this.lastConnectedDeviceId = device.id;
      this.rxCharacteristic = null;
      this.txCharacteristic = null;

      const characteristics = await this.manager.characteristicsForDevice(device.id, BLE_CONSTANTS.SERVICE_UUID);

      this.rxCharacteristic = characteristics.find(c =>
        c.uuid.toUpperCase() === BLE_CONSTANTS.RX_CHARACTERISTIC_UUID.toUpperCase()
      ) ?? null;
      this.txCharacteristic = characteristics.find(c =>
        c.uuid.toUpperCase() === BLE_CONSTANTS.TX_CHARACTERISTIC_UUID.toUpperCase()
      ) ?? null;

      if (!this.rxCharacteristic) {
        throw new Error('RX characteristic not found');
      }

      if (this.txCharacteristic) {
        await this.manager.monitorCharacteristicForDevice(
          device.id,
          BLE_CONSTANTS.SERVICE_UUID,
          BLE_CONSTANTS.TX_CHARACTERISTIC_UUID,
          (error: BleError | null) => {
            if (error) {
              console.warn('BLE notification error:', error.message);
            }
          }
        );
      }

      const bleDevice: BleDevice = {
        id: device.id,
        name: device.name ?? BLE_CONSTANTS.DEVICE_NAME,
        rssi: device.rssi ?? 0,
      };

      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      store.setDevice(bleDevice);
      store.setState('connected');
      this.notifyConnection(bleDevice, null);

      this.manager.onDeviceDisconnected(device.id, (error: BleError | null) => {
        const reason = error?.message ?? 'Device disconnected';
        this.handleDisconnect(reason);
      });

      return bleDevice;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      store.setError(message);
      store.setState('error');
      this.notifyConnection(null, message);
      throw error;
    }
  }

  private handleDisconnect(reason: string): void {
    const store = this.getStore();
    store.setState('disconnected');
    this.connectedDevice = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.notifyConnection(null, reason);

    if (!this.isUserDisconnect && !this.isReconnecting && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && this.lastConnectedDeviceId) {
      this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (!this.lastConnectedDeviceId || this.isReconnecting) return;

    this.isReconnecting = true;
    this.reconnectAttempts++;

    await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY));

    try {
      await this.connect(this.lastConnectedDeviceId);
    } catch {
      this.isReconnecting = false;
    }
  }

  async sendText(text: string): Promise<void> {
    if (!this.rxCharacteristic || !this.connectedDevice) {
      throw new Error('Not connected to device');
    }

    const CHUNK_SIZE = 20;

    try {
      const base64 = base64Encode(text);

      if (base64.length <= CHUNK_SIZE) {
        await this.manager.writeCharacteristicWithoutResponseForDevice(
          this.connectedDevice.id,
          BLE_CONSTANTS.SERVICE_UUID,
          BLE_CONSTANTS.RX_CHARACTERISTIC_UUID,
          base64
        );
        return;
      }

      for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
        const chunk = base64.slice(i, i + CHUNK_SIZE);
        await this.manager.writeCharacteristicWithoutResponseForDevice(
          this.connectedDevice.id,
          BLE_CONSTANTS.SERVICE_UUID,
          BLE_CONSTANTS.RX_CHARACTERISTIC_UUID,
          chunk
        );
        await new Promise(resolve => setTimeout(resolve, 60));
      }
    } catch (error) {
      throw new Error(`Failed to send text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    this.isUserDisconnect = true;
    this.cleanupScan();
    this.isReconnecting = false;
    this.reconnectAttempts = 0;

    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
      } catch {
        // Ignore cleanup errors
      }
      this.connectedDevice = null;
    }

    this.rxCharacteristic = null;
    this.txCharacteristic = null;

    const store = this.getStore();
    store.setDevice(null);
    store.setState('idle');
    store.setError(null);
    this.notifyConnection(null, null);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  private notifyConnection(device: BleDevice | null, error: string | null): void {
    this.connectionListeners.forEach((listener) => listener(device, error));
  }

  destroy(): void {
    this.isUserDisconnect = true;
    this.disconnect();
    this.connectionListeners.clear();
    this.manager.destroy();
  }

  getManager(): BleManager {
    return this.manager;
  }
}

export const bleService = new BleService();