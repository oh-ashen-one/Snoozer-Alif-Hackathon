import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

import type { DimensionValue } from 'react-native';

interface PulseOrbProps {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  color: string;
  blur: number;
  duration: number;
  delay?: number;
  ringCount?: number;
}

interface PulseRingProps {
  top: DimensionValue;
  left: DimensionValue;
  color: string;
  duration: number;
  delay: number;
}

export default function PulseBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <PulseOrb
        top="40%"
        left="50%"
        size={550}
        color="251, 146, 60"
        blur={90}
        duration={5000}
        ringCount={4}
      />

      <PulseOrb
        top="8%"
        left="75%"
        size={400}
        color="239, 68, 68"
        blur={70}
        duration={6000}
        delay={500}
        ringCount={2}
      />

      <PulseOrb
        top="80%"
        left="20%"
        size={380}
        color="34, 197, 94"
        blur={65}
        duration={5500}
        delay={1200}
        ringCount={2}
      />
    </View>
  );
}

function PulseOrb({ top, left, size, color, blur, duration, delay = 0, ringCount = 2 }: PulseOrbProps) {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.7],
  });

  return (
    <>
      <Animated.View
        style={[
          styles.orb,
          {
            top,
            left,
            width: size,
            height: size,
            transform: [{ translateX: -size / 2 }, { translateY: -size / 2 }, { scale }],
            opacity,
          },
        ]}
      >
        <View
          style={[
            styles.orbInner,
            {
              backgroundColor: `rgba(${color}, 0.55)`,
              shadowColor: `rgb(${color})`,
              shadowRadius: blur,
            },
          ]}
        />
      </Animated.View>

      {Array.from({ length: ringCount }).map((_, i) => (
        <PulseRing
          key={i}
          top={top}
          left={left}
          color={color}
          duration={duration}
          delay={delay + i * (duration / ringCount / 1.5)}
        />
      ))}
    </>
  );
}

function PulseRing({ top, left, color, duration, delay }: PulseRingProps) {
  const ringAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(ringAnim, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
        delay,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const scale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 2.5],
  });

  const opacity = ringAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.5, 0.2, 0],
  });

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          top,
          left,
          borderColor: `rgba(${color}, 0.35)`,
          transform: [{ translateX: -100 }, { translateY: -100 }, { scale }],
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbInner: {
    flex: 1,
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
});
