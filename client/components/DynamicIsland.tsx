/**
 * DYNAMIC ISLAND COMPONENT
 * DynamicIsland.tsx
 *
 * iOS Dynamic Island style component showing alarm status.
 * Two states: sleeping (shows alarm time + stake) and ringing (shake + glow)
 *
 * Features notification-style entry/exit animations:
 * - Animates in from top with scale + translate
 * - Fades out with scale down
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

interface DynamicIslandProps {
  state: 'sleeping' | 'ringing';
  alarmTime?: string;
  stakeAmount?: number;
  visible?: boolean;
  onPress?: () => void;
}

export function DynamicIsland({
  state,
  alarmTime = '6:00',
  stakeAmount = 5,
  visible = true,
  onPress,
}: DynamicIslandProps) {
  const isRinging = state === 'ringing';

  // Entry/exit animation values
  const animationProgress = useSharedValue(visible ? 1 : 0);

  // Shake animation for bell icon
  const rotation = useSharedValue(0);
  // Glow pulse animation
  const glowOpacity = useSharedValue(0.5);

  // Handle visibility changes with animation
  useEffect(() => {
    if (visible) {
      // Animate in with spring for natural feel
      animationProgress.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      // Animate out quickly
      animationProgress.value = withTiming(0, { duration: 250 });
    }
  }, [visible, animationProgress]);

  useEffect(() => {
    if (isRinging) {
      // Shake animation: rotate -12 to 12 degrees
      rotation.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 62.5, easing: Easing.inOut(Easing.ease) }),
          withTiming(12, { duration: 125, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 62.5, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      // Glow pulse animation
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      rotation.value = 0;
      glowOpacity.value = 0.5;
    }
  }, [isRinging, rotation, glowOpacity]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  // Entry/exit animation style
  const entryExitStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationProgress.value,
      [0, 1],
      [0.3, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [-20, 0],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.5, 1],
      [0, 0.8, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const displayText = isRinging ? 'WAKE UP' : alarmTime;
  const displayStake = isRinging ? `-$${stakeAmount}` : `$${stakeAmount}`;
  const icon = isRinging ? '🔔' : '⏰';

  return (
    <Animated.View style={entryExitStyle}>
      <Pressable onPress={onPress}>
        <Animated.View
          style={[
            styles.island,
            isRinging && styles.islandRinging,
            isRinging && glowStyle,
          ]}
        >
          <Animated.Text style={[styles.icon, isRinging && shakeStyle]}>
            {icon}
          </Animated.Text>
          <Text style={[styles.time, isRinging && styles.textRed]}>
            {displayText}
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.stake, isRinging ? styles.textRed : styles.textGreen]}>
            {displayStake}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    height: 36,
    minWidth: 150,
    backgroundColor: '#000',
    borderRadius: 20,
    paddingHorizontal: 6,
    gap: 8,
  },
  islandRinging: {
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  icon: {
    fontSize: 15,
    marginLeft: 4,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stake: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  textGreen: {
    color: Colors.green,
  },
  textRed: {
    color: Colors.red,
  },
});

export default DynamicIsland;
