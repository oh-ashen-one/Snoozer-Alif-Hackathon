import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
  haptic?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy';
  glowColor?: string;
  children: React.ReactNode;
}

export function AnimatedPressable({
  style,
  scaleValue = 0.97,
  haptic = true,
  hapticStyle = 'light',
  glowColor,
  onPressIn,
  onPressOut,
  onPress,
  children,
  ...props
}: AnimatedPressableProps) {
  const pressed = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, scaleValue]);
    
    return {
      transform: [{ scale }],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    if (!glowColor) return {};
    
    return {
      shadowOpacity: interpolate(pressed.value, [0, 1], [0.3, 0.5]),
    };
  });

  const handlePressIn = useCallback(
    (e: any) => {
      pressed.value = withSpring(1, { damping: 15, stiffness: 400 });
      if (haptic) {
        const style =
          hapticStyle === 'heavy'
            ? Haptics.ImpactFeedbackStyle.Heavy
            : hapticStyle === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(style);
      }
      onPressIn?.(e);
    },
    [haptic, hapticStyle, onPressIn, pressed]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      pressed.value = withSpring(0, { damping: 15, stiffness: 400 });
      onPressOut?.(e);
    },
    [onPressOut, pressed]
  );

  return (
    <AnimatedPressableComponent
      style={[style, animatedStyle, glowStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
