/**
 * SINGLE PULSE BACKGROUND
 * 
 * Just the pulse effect - drop behind any screen
 * 
 * Usage:
 * <View style={{ flex: 1, backgroundColor: '#0C0A09' }}>
 *   <PulseBackground />
 *   <YourContent />
 * </View>
 */

// ════════════════════════════════════════════════════════════════
// REACT NATIVE VERSION
// ════════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export default function PulseBackground() {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const ring4Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main pulse animation
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

    // Ring animations (staggered)
    const startRing = (anim, delay) => {
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

  const getRingStyle = (anim) => ({
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
      {/* Main glow orb */}
      <Animated.View
        style={[
          styles.orb,
          {
            transform: [
              { translateX: -250 },
              { translateY: -250 },
              { scale: pulseScale },
            ],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* Rings */}
      <Animated.View style={[styles.ring, getRingStyle(ring1Anim)]} />
      <Animated.View style={[styles.ring, getRingStyle(ring2Anim)]} />
      <Animated.View style={[styles.ring, getRingStyle(ring3Anim)]} />
      <Animated.View style={[styles.ring, getRingStyle(ring4Anim)]} />
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
    backgroundColor: 'rgba(251, 146, 60, 0.5)',
    shadowColor: '#FB923C',
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
    borderColor: 'rgba(251, 146, 60, 0.3)',
    backgroundColor: 'transparent',
  },
});
