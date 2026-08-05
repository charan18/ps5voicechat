import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle, View, PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { UI_COLORS, UI_SPACING, UI_RADIUS } from '@/constants';

interface ButtonProps extends Omit<PressableProps, 'onPress' | 'disabled' | 'style'> {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button = React.forwardRef<View, ButtonProps>(
  ({ children, onPress, variant = 'primary', disabled = false, style, ...rest }, ref) => {
    const pressScale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pressScale.value }],
    }));

    const baseBackgroundColor = variant === 'secondary' ? UI_COLORS.surfaceElevated : variant === 'danger' ? UI_COLORS.error : UI_COLORS.primary;
    const textColor = variant === 'secondary' ? UI_COLORS.primary : UI_COLORS.background;

    return (
      <Animated.View style={[styles.container, animatedStyle, { backgroundColor: baseBackgroundColor }, style]}>
        <Pressable
          ref={ref}
          onPress={onPress}
          disabled={disabled}
          onPressIn={() => { pressScale.value = withTiming(0.95, { duration: 80 }); }}
          onPressOut={() => { pressScale.value = withSpring(1); }}
          style={({ pressed }: { pressed: boolean }) => [
            styles.pressable,
            pressed && { opacity: 0.8 },
            disabled && { opacity: 0.5 },
          ]}
          android_ripple={variant === 'secondary' ? { color: UI_COLORS.primary } : { color: UI_COLORS.background }}
          {...rest}
        >
          <Text style={[{ color: textColor }, styles.text]}>{children}</Text>
        </Pressable>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    borderRadius: UI_RADIUS.md,
    overflow: 'hidden',
    width: '100%',
  },
  pressable: {
    paddingVertical: UI_SPACING.md,
    paddingHorizontal: UI_SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

Button.displayName = 'Button';