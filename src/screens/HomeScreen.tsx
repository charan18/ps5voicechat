import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, Platform, PermissionsAndroid, TextInput } from 'react-native';
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
  const { lastSentMessage, messageHistory } = useSpeechStore();
  const isConnected = bleState === 'connected';
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [typeDelay, setTypeDelay] = useState('50');
  const [preDelay, setPreDelay] = useState('300');
  const [configSaving, setConfigSaving] = useState(false);

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

  const handleApplyConfig = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Connect to the adapter first.');
      return;
    }
    const t = parseInt(typeDelay, 10);
    const p = parseInt(preDelay, 10);
    if (isNaN(t) || t < 0 || t > 2000) {
      Alert.alert('Invalid Value', 'Char delay must be 0-2000 ms.');
      return;
    }
    if (isNaN(p) || p < 0 || p > 10000) {
      Alert.alert('Invalid Value', 'Pre-delay must be 0-10000 ms.');
      return;
    }
    setConfigSaving(true);
    try {
      await bleService.sendText(`#D${t}`);
      await bleService.sendText(`#P${p}`);
      Alert.alert('Config Saved', `Char delay: ${t}ms, Pre-delay: ${p}ms`);
    } catch (error) {
      Alert.alert('Config Failed', error instanceof Error ? error.message : 'Failed to send config');
    } finally {
      setConfigSaving(false);
    }
  }, [isConnected, typeDelay, preDelay]);

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
          <Text style={styles.historyTitle}>Typing Speed</Text>
          <View style={styles.configRow}>
            <View style={styles.configField}>
              <Text style={styles.configLabel}>Char delay (ms)</Text>
              <TextInput
                style={styles.configInput}
                value={typeDelay}
                onChangeText={setTypeDelay}
                keyboardType="number-pad"
                placeholder="50"
                placeholderTextColor={UI_COLORS.textMuted}
              />
            </View>
            <View style={styles.configField}>
              <Text style={styles.configLabel}>Pre-delay (ms)</Text>
              <TextInput
                style={styles.configInput}
                value={preDelay}
                onChangeText={setPreDelay}
                keyboardType="number-pad"
                placeholder="300"
                placeholderTextColor={UI_COLORS.textMuted}
              />
            </View>
          </View>
          <Button
            variant="secondary"
            onPress={handleApplyConfig}
            disabled={!isConnected || configSaving}
            style={styles.configButton}
          >
            {configSaving ? 'Saving...' : 'Apply'}
          </Button>
          <Text style={styles.configHint}>
            Char delay: time between keystrokes. Pre-delay: wait before typing starts.
          </Text>
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

        {messageHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.historyTitle}>Recent Messages</Text>
            {messageHistory.map((msg, i) => (
              <View key={`${msg}-${i}`} style={styles.historyItem}>
                <Text style={styles.historyText} numberOfLines={1}>{msg}</Text>
              </View>
            ))}
          </View>
        )}
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
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: UI_COLORS.textSecondary,
    marginBottom: UI_SPACING.sm,
  },
  historyItem: {
    paddingVertical: UI_SPACING.xs + 2,
    paddingHorizontal: UI_SPACING.sm,
    backgroundColor: UI_COLORS.surface,
    borderRadius: UI_RADIUS.sm,
    marginBottom: UI_SPACING.xs,
  },
  historyText: {
    fontSize: 14,
    color: UI_COLORS.text,
  },
  configRow: {
    flexDirection: 'row',
    gap: UI_SPACING.md,
    marginBottom: UI_SPACING.md,
  },
  configField: {
    flex: 1,
  },
  configLabel: {
    fontSize: 13,
    color: UI_COLORS.textSecondary,
    marginBottom: UI_SPACING.xs,
  },
  configInput: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: UI_RADIUS.md,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    color: UI_COLORS.text,
    fontSize: 16,
    paddingVertical: UI_SPACING.md,
    paddingHorizontal: UI_SPACING.md,
  },
  configButton: {
    marginBottom: UI_SPACING.xs,
  },
  configHint: {
    fontSize: 12,
    color: UI_COLORS.textMuted,
  },
});