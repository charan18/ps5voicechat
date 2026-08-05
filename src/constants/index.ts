export const BLE_CONSTANTS = {
  DEVICE_NAME: 'PS5VoiceChat',
  SERVICE_UUID: '6E400001-B5B3-F393-E0A9-E50E24DCCA9E',
  RX_CHARACTERISTIC_UUID: '6E400002-B5B3-F393-E0A9-E50E24DCCA9E',
  TX_CHARACTERISTIC_UUID: '6E400003-B5B3-F393-E0A9-E50E24DCCA9E',
} as const;

export const BLE_TIMEOUTS = {
  SCAN: 10000,
  CONNECT: 15000,
  WRITE: 5000,
} as const;

export const RECONNECT_DELAY = 3000;
export const MAX_RECONNECT_ATTEMPTS = 5;

export const UI_COLORS = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1C1C1C',
  primary: '#00D4AA',
  primaryDim: '#00D4AA40',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#606060',
  border: '#2A2A2A',
  error: '#FF4444',
  success: '#00D4AA',
  warning: '#FFAA00',
} as const;

export const UI_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const UI_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;