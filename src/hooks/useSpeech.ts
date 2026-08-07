import { useCallback, useRef, useEffect } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useSpeechStore } from '@/store';
import { normalizeTranscript } from '@/utils/dictionary';

interface UseSpeechOptions {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
}

const RESTART_DELAY_MS = 700;
const SETTLE_DELAY_MS = 1500;
const CONTEXTUAL_STRINGS = [
  'need heals',
  'ult ready',
  'reloading',
  'push',
  'fall back',
  'group up',
  'behind you',
  'behind us',
  'on my way',
  'left flank',
  'right flank',
  'mid',
  'one shot',
  'need help',
  'support down',
  'healer down',
  'tank down',
  'spread out',
  'contest',
  'back up',
  'over there',
  'on your left',
  'on your right',
  "let's go",
  'good game',
];

export function useSpeech({ onResult, onError }: UseSpeechOptions) {
  const { state, transcript, setState, setTranscript, setLastSentMessage, addToHistory } = useSpeechStore();
  const handsFreeActive = useSpeechStore((s) => s.handsFreeActive);
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const currentUtteranceRef = useRef('');
  const handsFreeBaselineRef = useRef('');
  const handsFreeRef = useRef(false);
  const sessionModeRef = useRef<'hold' | 'handsFree'>('hold');
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    handsFreeRef.current = handsFreeActive;
  }, [handsFreeActive]);

  const startSession = useCallback(async (continuous: boolean) => {
    await ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous,
      contextualStrings: CONTEXTUAL_STRINGS,
    });
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const sendFinal = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const normalized = normalizeTranscript(text);
    onResult(normalized);
    setLastSentMessage(normalized);
    addToHistory(normalized);
    setTranscript('');
  }, [onResult, setLastSentMessage, addToHistory, setTranscript]);

  // In a continuous session the transcript accumulates ("a b", then "a b c"),
  // so only send the part that wasn't already sent, tracked via baseline.
  const flushHandsFree = useCallback(() => {
    clearSettleTimer();
    settleTimerRef.current = null;
    if (!handsFreeRef.current) return;

    const full = currentUtteranceRef.current;
    const baseline = handsFreeBaselineRef.current;
    const delta = full.startsWith(baseline)
      ? full.slice(baseline.length)
      : full;
    const text = delta.trim();
    if (!text) return;

    sendFinal(text);
    handsFreeBaselineRef.current = full;
  }, [clearSettleTimer, sendFinal]);

  const onResultEvent = useCallback((event: { isFinal: boolean; results: Array<{ transcript: string; confidence: number }> }) => {
    const transcriptText = event.results[0]?.transcript ?? '';
    finalTranscriptRef.current = transcriptText;
    currentUtteranceRef.current = transcriptText;

    if (!handsFreeRef.current) {
      setTranscript(transcriptText);
      return;
    }

    // Show only the part not yet sent, so already-sent text vanishes from the card.
    const baseline = handsFreeBaselineRef.current;
    const display = transcriptText.startsWith(baseline)
      ? transcriptText.slice(baseline.length).trimStart()
      : transcriptText;
    setTranscript(display);

    // Send whatever was heard once speech settles (pause in talking).
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      flushHandsFree();
    }, SETTLE_DELAY_MS);
  }, [clearSettleTimer, flushHandsFree, setTranscript]);

  const onErrorEvent = useCallback((event: { error: string; message: string }) => {
    isListeningRef.current = false;
    if (handsFreeRef.current) {
      // Silent periods can produce no-speech errors; keep listening.
      return;
    }
    setState('error');
    onError?.(event.message);
  }, [setState, onError]);

  const onStartEvent = useCallback(() => {
    setState('listening');
    isListeningRef.current = true;
    finalTranscriptRef.current = '';
    currentUtteranceRef.current = '';
    handsFreeBaselineRef.current = '';
    sessionModeRef.current = handsFreeRef.current ? 'handsFree' : 'hold';
  }, [setState]);

  const onEndEvent = useCallback(() => {
    clearRestartTimer();
    isListeningRef.current = false;
    setState('idle');

    if (sessionModeRef.current === 'hold') {
      clearSettleTimer();
      sendFinal(finalTranscriptRef.current);
      return;
    }

    // Hands-free: flush anything heard, then restart only if still active.
    flushHandsFree();

    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (handsFreeRef.current) {
        startSession(true).catch(() => {});
      }
    }, RESTART_DELAY_MS);
  }, [clearRestartTimer, setState, flushHandsFree, startSession]);

  useSpeechRecognitionEvent('result', onResultEvent);
  useSpeechRecognitionEvent('error', onErrorEvent);
  useSpeechRecognitionEvent('start', onStartEvent);
  useSpeechRecognitionEvent('end', onEndEvent);

  const start = useCallback(async (continuous = false) => {
    if (isListeningRef.current) return;
    clearRestartTimer();
    clearSettleTimer();

    try {
      const isAvailable = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!isAvailable) {
        onErrorRef.current?.('Speech recognition not available on this device');
        return;
      }
      await startSession(continuous);
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to start speech recognition');
    }
  }, [clearRestartTimer, clearSettleTimer, startSession]);

  const stop = useCallback(async () => {
    clearRestartTimer();
    clearSettleTimer();
    if (!isListeningRef.current) return;
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      onErrorRef.current?.(error instanceof Error ? error.message : 'Failed to stop speech recognition');
    }
  }, [clearRestartTimer, clearSettleTimer]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    currentUtteranceRef.current = '';
    handsFreeBaselineRef.current = '';
  }, [setTranscript]);

  useEffect(() => {
    return () => {
      clearRestartTimer();
      clearSettleTimer();
      ExpoSpeechRecognitionModule.abort();
    };
  }, [clearRestartTimer, clearSettleTimer]);

  return {
    state,
    transcript,
    start,
    stop,
    clearTranscript,
    isListening: isListeningRef.current,
  };
}
