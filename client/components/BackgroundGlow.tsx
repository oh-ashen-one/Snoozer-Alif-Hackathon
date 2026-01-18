import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface BackgroundGlowProps {
  color?: 'orange' | 'green' | 'red' | 'purple';
}

export function BackgroundGlow({ color = 'orange' }: BackgroundGlowProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const ring4Anim = useRef(new Animated.Value(0)).current;

  const colors = {
    orange: { bg: 'rgba(251, 146, 60, 0.5)', shadow: '#FB923C', ring: 'rgba(251, 146, 60, 0.3)' },
    green: { bg: 'rgba(34, 197, 94, 0.5)', shadow: '#22C55E', ring: 'rgba(34, 197, 94, 0.3)' },
    red: { bg: 'rgba(239, 68, 68, 0.5)', shadow: '#EF4444', ring: 'rgba(239, 68, 68, 0.3)' },
    purple: { bg: 'rgba(124, 58, 237, 0.5)', shadow: '#7C3AED', ring: 'rgba(124, 58, 237, 0.3)' },
  };

  const activeColor = colors[color];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2500,
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
            duration: 5000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ).start();
      }, delay);
    };

    startRing(ring1Anim, 0);
    startRing(ring2Anim, 1250);
    startRing(ring3Anim, 2500);
    startRing(ring4Anim, 3750);
  }, []);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.75],
  });

  const getRingStyle = (anim: Animated.Value) => ({
    transform: [
      { translateX: -90 },
      { translateY: -90 },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 2.5],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.5, 0.15, 0],
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
              { translateX: -250 },
              { translateY: -250 },
              { scale: pulseScale },
            ],
            opacity: pulseOpacity,
          },
        ]}
      />

      <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring1Anim)]} />
      <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring2Anim)]} />
      <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring3Anim)]} />
      <Animated.View style={[styles.ring, { borderColor: activeColor.ring }, getRingStyle(ring4Anim)]} />
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
    top: '12%',
    left: '50%',
    width: 500,
    height: 500,
    borderRadius: 250,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 80,
  },
  ring: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
});
