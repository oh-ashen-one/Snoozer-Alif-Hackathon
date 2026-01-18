/**
 * DYNAMIC ISLAND COMPONENT
 * DynamicIsland.tsx
 *
 * iOS Dynamic Island style component showing alarm status.
 * Two states: sleeping (shows alarm time + stake) and ringing (shake + glow)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

interface DynamicIslandProps {
  state: 'sleeping' | 'ringing';
  alarmTime?: string;
  stakeAmount?: number;
}

export function DynamicIsland({ state, alarmTime = '6:00', stakeAmount = 5 }: DynamicIslandProps) {
  const isRinging = state === 'ringing';

  // Shake animation for bell icon
  const rotation = useSharedValue(0);
  // Glow pulse animation
  const glowOpacity = useSharedValue(0.5);

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

  const displayText = isRinging ? 'WAKE UP' : alarmTime;
  const displayStake = isRinging ? `-$${stakeAmount}` : `$${stakeAmount}`;
  const icon = isRinging ? '🔔' : '⏰';

  return (
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
