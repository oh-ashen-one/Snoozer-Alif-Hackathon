import React, { useEffect, useCallback } from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';

interface AnimatedToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
  activeColor?: string;
  inactiveColor?: string;
}

export function AnimatedToggle({
  value,
  onValueChange,
  disabled = false,
  style,
  activeColor = Colors.green,
  inactiveColor = Colors.border,
}: AnimatedToggleProps) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 15,
      stiffness: 300,
      mass: 0.8,
    });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    );

    return {
      backgroundColor,
    };
  });

  const knobStyle = useAnimatedStyle(() => {
    const translateX = interpolate(progress.value, [0, 1], [2, 22]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [1, 1.1, 1]);

    return {
      transform: [{ translateX }, { scale }],
    };
  });

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange(!value);
  }, [disabled, value, onValueChange]);

  return (
    <Pressable onPress={handlePress} disabled={disabled} style={style}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
