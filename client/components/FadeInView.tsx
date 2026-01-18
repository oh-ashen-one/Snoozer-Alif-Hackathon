import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
}

export function FadeInView({
  children,
  style,
  delay = 0,
  duration = 400,
  direction = 'up',
  distance = 16,
}: FadeInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0, 1]);

    let translateX = 0;
    let translateY = 0;

    switch (direction) {
      case 'up':
        translateY = interpolate(progress.value, [0, 1], [distance, 0]);
        break;
      case 'down':
        translateY = interpolate(progress.value, [0, 1], [-distance, 0]);
        break;
      case 'left':
        translateX = interpolate(progress.value, [0, 1], [distance, 0]);
        break;
      case 'right':
        translateX = interpolate(progress.value, [0, 1], [-distance, 0]);
        break;
      case 'none':
        break;
    }

    return {
      opacity,
      transform: [{ translateX }, { translateY }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
