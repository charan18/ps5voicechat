import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Mic } from 'lucide-react-native';
import { UI_COLORS, UI_SPACING } from '@/constants';

interface HoldToTalkButtonProps {
  onStart: () => void;
  onEnd: () => void;
  isListening: boolean;
  disabled?: boolean;
}

export const HoldToTalkButton: React.FC<HoldToTalkButtonProps> = ({
  onStart,
  onEnd,
  isListening,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const iconScale = useSharedValue(1);
  const backgroundScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backgroundScale.value }],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
    borderColor: UI_COLORS.primary,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.92, { damping: 15, stiffness: 150 });
    backgroundScale.value = withSpring(1.15, { damping: 12, stiffness: 100 });
    ringScale.value = withSpring(1.3, { damping: 10, stiffness: 80 });
    ringOpacity.value = withTiming(0.6, { duration: 200 });
    iconScale.value = withSpring(1.2, { damping: 15, stiffness: 150 });
    onStart();
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    backgroundScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    ringScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    ringOpacity.value = withTiming(0, { duration: 300 });
    iconScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    onEnd();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.ring, animatedRingStyle]} pointerEvents="none" />
      <Animated.View style={[styles.background, animatedBackgroundStyle, { backgroundColor: UI_COLORS.primary }]} pointerEvents="none" />
      <Animated.View style={[styles.button, animatedButtonStyle]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }: { pressed: boolean }) => [
            styles.pressable,
            pressed && !disabled && { opacity: 0.9 },
            disabled && { opacity: 0.5 },
          ]}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Hold to talk"
          accessibilityState={{ selected: isListening }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
            <Mic
              size={32}
              color={UI_COLORS.background}
              strokeWidth={2.5}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
      <Text style={styles.hint}>Hold to talk</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: UI_COLORS.primary,
  },
  background: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: UI_COLORS.primary,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    overflow: 'hidden',
  },
  pressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: UI_SPACING.md,
    fontSize: 13,
    color: UI_COLORS.textMuted,
    fontWeight: '500',
  },
});