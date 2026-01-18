import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface BackgroundGlowProps {
  color?: 'orange' | 'green' | 'red' | 'purple';
  animated?: boolean;
}

export function BackgroundGlow({ color = 'orange', animated = true }: BackgroundGlowProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const ring4Anim = useRef(new Animated.Value(0)).current;
  const ring5Anim = useRef(new Animated.Value(0)).current;

  const colors = {
    orange: { bg: 'rgba(251, 146, 60, 0.35)', shadow: '#FB923C', ring: 'rgba(251, 146, 60, 0.45)' },
    green: { bg: 'rgba(34, 197, 94, 0.35)', shadow: '#22C55E', ring: 'rgba(34, 197, 94, 0.45)' },
    red: { bg: 'rgba(239, 68, 68, 0.35)', shadow: '#EF4444', ring: 'rgba(239, 68, 68, 0.45)' },
    purple: { bg: 'rgba(124, 58, 237, 0.35)', shadow: '#7C3AED', ring: 'rgba(124, 58, 237, 0.45)' },
  };

  const activeColor = colors[color];

  useEffect(() => {
    // Skip animations if animated prop is false
    if (!animated) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const startRing = (anim: Animated.Value, delay: number) => {
      setTimeout(() => {
        Animated.loop(
          Animated.timing(anim, {
            toValue: 1,
            duration: 3500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        ).start();
      }, delay);
    };

    startRing(ring1Anim, 0);
    startRing(ring2Anim, 700);
    startRing(ring3Anim, 1400);
    startRing(ring4Anim, 2100);
    startRing(ring5Anim, 2800);
  }, [animated]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.25],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const getRingStyle = (anim: Animated.Value) => ({
    transform: [
      { translateX: -60 },
      { translateY: -60 },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.2, 4],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.3, 0.6, 1],
      outputRange: [0.7, 0.5, 0.25, 0],
    }),
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.orb,
          {
            backgroundColor: activeColor.bg,
            shadowColor: activeColor.shadow,
            transform: [
              { translateX: -150 },
              { translateY: -150 },
              { scale: animated ? pulseScale : 1 },
            ],
            opacity: animated ? pulseOpacity : 0.4,
          },
        ]}
      />

      {animated && (
        <>
          <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring1Anim)]} />
          <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring2Anim)]} />
          <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring3Anim)]} />
          <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring4Anim)]} />
          <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring5Anim)]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    width: 300,
    height: 300,
    borderRadius: 150,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
  },
  ring: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
});
