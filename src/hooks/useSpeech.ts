import { useCallback, useRef, useEffect } from 'react';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useSpeechStore } from '@/store';

interface UseSpeechOptions {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
}

export function useSpeech({ onResult, onError }: UseSpeechOptions) {
  const { state, transcript, setState, setTranscript, setLastSentMessage } = useSpeechStore();
  const isListeningRef = useRef(false);
  const finalTranscriptRef = useRef('');

  const onResultEvent = useCallback((event: { isFinal: boolean; results: Array<{ transcript: string; confidence: number }> }) => {
    const transcriptText = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      finalTranscriptRef.current = transcriptText;
    }
    setTranscript(transcriptText);
  }, [setTranscript]);

  const onErrorEvent = useCallback((event: { error: string; message: string }) => {
    setState('error');
    isListeningRef.current = false;
    onError?.(event.message);
  }, [setState, onError]);

  const onStartEvent = useCallback(() => {
    setState('listening');
    isListeningRef.current = true;
    finalTranscriptRef.current = '';
  }, [setState]);

  const onEndEvent = useCallback(() => {
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setState('idle');
      if (finalTranscriptRef.current.trim()) {
        onResult(finalTranscriptRef.current.trim());
        setLastSentMessage(finalTranscriptRef.current.trim());
      }
    }
  }, [setState, onResult, setLastSentMessage]);

  useSpeechRecognitionEvent('result', onResultEvent);
  useSpeechRecognitionEvent('error', onErrorEvent);
  useSpeechRecognitionEvent('start', onStartEvent);
  useSpeechRecognitionEvent('end', onEndEvent);

  const start = useCallback(async () => {
    if (isListeningRef.current) return;
    
    try {
      const isAvailable = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!isAvailable) {
        onError?.('Speech recognition not available on this device');
        return;
      }
      
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to start speech recognition');
    }
  }, [onError]);

  const stop = useCallback(async () => {
    if (!isListeningRef.current) return;
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to stop speech recognition');
    }
  }, [onError]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
  }, [setTranscript]);

  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  return {
    state,
    transcript,
    start,
    stop,
    clearTranscript,
    isListening: isListeningRef.current,
  };
}