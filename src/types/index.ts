export type BleState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface BleConnectionState {
  state: BleState;
  device: BleDevice | null;
  error: string | null;
}

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

export interface Transcript {
  text: string;
  timestamp: number;
}