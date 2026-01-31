import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  index?: number;
  delayBase?: number;
  delayIncrement?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
}

export function AnimatedCard({
  children,
  style,
  index = 0,
  delayBase = 0,
  delayIncrement = 50,
  direction = 'up',
  distance = 20,
}: AnimatedCardProps) {
  const progress = useSharedValue(0);
  const delay = delayBase + index * delayIncrement;

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(1, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      })
    );
  }, [delay, progress]);

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
