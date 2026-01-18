import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useEffect } from 'react';

type GlowColor = 'orange' | 'green' | 'red' | 'purple';

interface BackgroundGlowProps {
  color?: GlowColor;
  intensity?: number;
  animated?: boolean;
}

const COLORS = {
  orange: 'rgba(251, 146, 60,',
  green: 'rgba(34, 197, 94,',
  red: 'rgba(239, 68, 68,',
  purple: 'rgba(124, 58, 237,',
};

export function BackgroundGlow({ 
  color = 'orange', 
  intensity = 0.08,
  animated = false,
}: BackgroundGlowProps) {
  const breatheValue = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      breatheValue.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) {
      return { opacity: intensity };
    }
    const opacity = interpolate(breatheValue.value, [0, 1], [0.06, 0.14]);
    return { opacity };
  });

  const baseColor = COLORS[color];

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View 
        style={[
          styles.glow, 
          { backgroundColor: `${baseColor} 1)` },
          animatedStyle,
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '70%',
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    transform: [{ scaleX: 1.5 }],
  },
});
