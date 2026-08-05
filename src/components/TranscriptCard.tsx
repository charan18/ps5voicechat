import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { UI_COLORS, UI_SPACING, UI_RADIUS } from '@/constants';

interface TranscriptCardProps {
  transcript: string;
  isListening: boolean;
}

export const TranscriptCard: React.FC<TranscriptCardProps> = ({ transcript, isListening }) => {
  const pulse = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(pulse.value, [0, 1], [UI_COLORS.border, UI_COLORS.primary]),
    backgroundColor: interpolateColor(pulse.value, [0, 1], [UI_COLORS.surface, UI_COLORS.primaryDim]),
  }));

  React.useEffect(() => {
    if (isListening) {
      pulse.value = withTiming(1, { duration: 800 }, () => {
        pulse.value = withTiming(0, { duration: 800 });
      });
    } else {
      pulse.value = 0;
    }
  }, [isListening]);

  const displayText = transcript || (isListening ? 'Listening...' : 'Press and hold to speak');

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={[
        styles.text,
        !transcript && !isListening && { color: UI_COLORS.textMuted },
        isListening && { color: UI_COLORS.primary },
      ]}>
        {displayText}
      </Text>
      {isListening && (
        <Animated.View style={[
          styles.waveContainer,
          { opacity: interpolateColor(pulse.value, [0, 1], [0.3, 1]) },
        ]}>
          <View style={styles.wave} />
          <View style={styles.wave} />
          <View style={styles.wave} />
          <View style={styles.wave} />
          <View style={styles.wave} />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 100,
    padding: UI_SPACING.md,
    borderRadius: UI_RADIUS.md,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surface,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: UI_COLORS.text,
    textAlign: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: UI_SPACING.sm,
  },
  wave: {
    width: 4,
    height: 20,
    backgroundColor: UI_COLORS.primary,
    borderRadius: 2,
  },
});