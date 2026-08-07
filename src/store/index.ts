import { create } from 'zustand';
import type { BleState, BleDevice, SpeechState } from '@/types';

interface BleStore {
  state: BleState;
  device: BleDevice | null;
  error: string | null;
  setState: (state: BleState) => void;
  setDevice: (device: BleDevice | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialBleState = {
  state: 'idle' as BleState,
  device: null as BleDevice | null,
  error: null as string | null,
};

export const useBleStore = create<BleStore>((set) => ({
  ...initialBleState,
  setState: (state) => set({ state }),
  setDevice: (device) => set({ device }),
  setError: (error) => set({ error }),
  reset: () => set(initialBleState),
}));

interface SpeechStore {
  state: SpeechState;
  transcript: string;
  lastSentMessage: string;
  messageHistory: string[];
  handsFreeActive: boolean;
  setState: (state: SpeechState) => void;
  setTranscript: (text: string) => void;
  setLastSentMessage: (message: string) => void;
  addToHistory: (message: string) => void;
  setHandsFreeActive: (active: boolean) => void;
  reset: () => void;
}

const initialSpeechState = {
  state: 'idle' as SpeechState,
  transcript: '',
  lastSentMessage: '',
  messageHistory: [] as string[],
  handsFreeActive: false,
};

export const useSpeechStore = create<SpeechStore>((set) => ({
  ...initialSpeechState,
  setState: (state) => set({ state }),
  setTranscript: (transcript) => set({ transcript }),
  setLastSentMessage: (lastSentMessage) => set({ lastSentMessage }),
  addToHistory: (message) => set((s) => ({
    messageHistory: [message, ...s.messageHistory].slice(0, 10),
  })),
  setHandsFreeActive: (handsFreeActive) => set({ handsFreeActive }),
  reset: () => set(initialSpeechState),
}));

interface ConfigStore {
  typeDelay: number;
  preDelay: number;
  setTypeDelay: (value: number) => void;
  setPreDelay: (value: number) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  typeDelay: 50,
  preDelay: 300,
  setTypeDelay: (typeDelay) => set({ typeDelay }),
  setPreDelay: (preDelay) => set({ preDelay }),
}));