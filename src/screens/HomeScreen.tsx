import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, Platform, PermissionsAndroid } from 'react-native';
import { useBleStore, useSpeechStore } from '@/store';
import { bleService } from '@/services/ble';
import { useSpeech } from '@/hooks/useSpeech';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { TranscriptCard } from '@/components/TranscriptCard';
import { LastSentMessage } from '@/components/LastSentMessage';
import { HoldToTalkButton } from '@/components/HoldToTalkButton';
import { Button } from '@/components/Button';
import { UI_COLORS, UI_SPACING, UI_RADIUS } from '@/constants';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const apiLevel = Number(Platform.Version);
  if (apiLevel >= 31) {
    // Android 12+ (API 31+)
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
    return (
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    // Android 11 and below
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
}

async function requestSpeechPermissions(): Promise<boolean> {
  try {
    const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export const HomeScreen: React.FC = () => {
  const { state: bleState, device, error: bleError, setError } = useBleStore();
  const { lastSentMessage } = useSpeechStore();
  const isConnected = bleState === 'connected';
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const { transcript, start, stop, isListening } = useSpeech({
    onResult: async (text) => {
      if (!isConnected) {
        Alert.alert('Not Connected', 'Please connect to your PS5 adapter first.');
        return;
      }
      try {
        await bleService.sendText(text);
      } catch (error) {
        Alert.alert('Send Failed', error instanceof Error ? error.message : 'Failed to send message');
      }
    },
    onError: (error) => {
      console.error('Speech error:', error);
    },
  });

  const handleConnect = useCallback(async () => {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      Alert.alert('Permission Required', 'Bluetooth permissions are required to connect to the adapter.');
      return;
    }

    try {
      const devices = await bleService.scanForDevices();
      if (devices.length === 0) {
        Alert.alert('No Device Found', 'Make sure your PS5VoiceChat adapter is powered on and in range.');
        return;
      }
      await bleService.connect(devices[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      setError(message);
      Alert.alert('Connection Failed', message);
    }
  }, [setError]);

  const handleDisconnect = useCallback(async () => {
    await bleService.disconnect();
  }, []);

  const handleRetry = useCallback(async () => {
    setError(null);
    await handleConnect();
  }, [handleConnect, setError]);

  useEffect(() => {
    const initPermissions = async () => {
      const bleOk = await requestBluetoothPermissions();
      const speechOk = await requestSpeechPermissions();

      if (!bleOk || !speechOk) {
        setPermissionsError('Required permissions not granted. Please enable them in settings.');
      } else {
        setPermissionsReady(true);
      }
    };

    initPermissions();

    return () => {
      bleService.destroy();
    };
  }, []);

  if (!permissionsReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionsContainer}>
          {permissionsError ? (
            <>
              <Text style={styles.permissionsError}>{permissionsError}</Text>
              <Button onPress={handleRetry} style={styles.retryButton}>
                Retry
              </Button>
            </>
          ) : (
            <Text style={styles.permissionsText}>Requesting permissions...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>PS5 Voice Chat</Text>
          <Text style={styles.subtitle}>Speak naturally. Type instantly.</Text>
        </View>

        <View style={styles.section}>
          <ConnectionStatus state={bleState} deviceName={device?.name ?? null} />
          {bleError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{bleError}</Text>
              <Button variant="secondary" onPress={handleRetry} style={styles.retryButton}>
                Retry
              </Button>
            </View>
          )}
        </View>

        <View style={styles.section}>
          {!isConnected ? (
            <Button onPress={handleConnect} disabled={bleState === 'scanning' || bleState === 'connecting'}>
              {bleState === 'scanning' ? 'Scanning...' : bleState === 'connecting' ? 'Connecting...' : 'Connect to Adapter'}
            </Button>
          ) : (
            <Button variant="secondary" onPress={handleDisconnect}>
              Disconnect
            </Button>
          )}
        </View>

        <View style={styles.section}>
          <TranscriptCard transcript={transcript} isListening={isListening} />
        </View>

        <View style={styles.section}>
          <HoldToTalkButton
            onStart={start}
            onEnd={stop}
            isListening={isListening}
            disabled={!isConnected}
          />
        </View>

        <LastSentMessage message={lastSentMessage} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: UI_SPACING.lg,
    paddingBottom: UI_SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: UI_SPACING.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: UI_COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: UI_COLORS.textSecondary,
    marginTop: UI_SPACING.xs,
  },
  section: {
    marginBottom: UI_SPACING.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: UI_SPACING.md,
    padding: UI_SPACING.md,
    backgroundColor: UI_COLORS.error + '20',
    borderRadius: UI_RADIUS.md,
    borderWidth: 1,
    borderColor: UI_COLORS.error + '40',
  },
  errorText: {
    color: UI_COLORS.error,
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    marginLeft: UI_SPACING.md,
    paddingHorizontal: UI_SPACING.md,
    paddingVertical: UI_SPACING.xs,
  },
  permissionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: UI_SPACING.lg,
  },
  permissionsText: {
    fontSize: 16,
    color: UI_COLORS.textSecondary,
  },
  permissionsError: {
    fontSize: 16,
    color: UI_COLORS.error,
    textAlign: 'center',
    marginBottom: UI_SPACING.md,
  },
});