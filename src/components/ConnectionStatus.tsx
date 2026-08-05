import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor, Easing } from 'react-native-reanimated';
import { UI_COLORS, UI_SPACING, UI_RADIUS } from '@/constants';
import type { BleState } from '@/types';

interface ConnectionStatusProps {
  state: BleState;
  deviceName?: string | null;
}

const STATE_CONFIG: Record<BleState, { label: string; color: string; pulse: boolean }> = {
  idle: { label: 'Disconnected', color: UI_COLORS.textMuted, pulse: false },
  scanning: { label: 'Scanning...', color: UI_COLORS.warning, pulse: true },
  connecting: { label: 'Connecting...', color: UI_COLORS.warning, pulse: true },
  connected: { label: 'Connected', color: UI_COLORS.success, pulse: false },
  disconnected: { label: 'Disconnected', color: UI_COLORS.textMuted, pulse: false },
  error: { label: 'Error', color: UI_COLORS.error, pulse: false },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state, deviceName }) => {
  const pulse = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const config = STATE_CONFIG[state];
    return {
      backgroundColor: config.pulse
        ? interpolateColor(pulse.value, [0, 0.5, 1], [config.color + '20', config.color + '40', config.color + '20'])
        : config.color + '20',
      borderColor: config.pulse
        ? interpolateColor(pulse.value, [0, 0.5, 1], [config.color + '40', config.color + '80', config.color + '40'])
        : config.color + '40',
    };
  });

  useEffect(() => {
    const config = STATE_CONFIG[state];
    
    if (config.pulse) {
      const animate = () => {
        pulse.value = withTiming(1, { duration: 1000, easing: Easing.linear }, () => {
          pulse.value = withTiming(0, { duration: 1000, easing: Easing.linear }, () => {
            if (STATE_CONFIG[state].pulse) {
              animate();
            }
          });
        });
      };
      animate();
    } else {
      pulse.value = 0;
    }

    return () => {
      pulse.value = 0;
    };
  }, [state]);

  const config = STATE_CONFIG[state];

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.indicatorWrapper}>
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: config.color },
            config.pulse && {
              transform: [{ scale: interpolateColor(pulse.value, [0, 1], [1, 1.2]) }],
            },
          ]}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
        {deviceName && state === 'connected' && (
          <Text style={styles.deviceName}>{deviceName}</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_SPACING.md,
    paddingVertical: UI_SPACING.sm,
    borderRadius: UI_RADIUS.full,
    borderWidth: 1,
  },
  indicatorWrapper: {
    marginRight: UI_SPACING.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceName: {
    fontSize: 12,
    color: UI_COLORS.textSecondary,
    marginTop: 2,
  },
});