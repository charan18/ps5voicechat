import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { UI_COLORS, UI_SPACING, UI_RADIUS } from '@/constants';

interface LastSentMessageProps {
  message: string;
}

export const LastSentMessage: React.FC<LastSentMessageProps> = ({ message }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  React.useEffect(() => {
    if (message) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(10, { duration: 300 });
    }
  }, [message]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.header}>
        <Text style={styles.label}>Last Sent</Text>
      </View>
      <Text style={styles.message} numberOfLines={3}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: UI_SPACING.md,
    borderRadius: UI_RADIUS.md,
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  header: {
    marginBottom: UI_SPACING.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: UI_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: {
    fontSize: 14,
    color: UI_COLORS.text,
    lineHeight: 20,
  },
});