import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface PunishmentPreview {
  emoji: string;
  shortLabel: string;
  fullMessage: string;
}

interface LiveActivityWidgetProps {
  state: 'sleeping' | 'ringing';
  alarmTime?: string;
  timeUntilAlarm?: string;
  punishments: PunishmentPreview[];
  onDismiss?: () => void;
}

export function LiveActivityWidget({
  state,
  alarmTime = '6:00',
  timeUntilAlarm = '6:17:42',
  punishments,
  onDismiss,
}: LiveActivityWidgetProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (state === 'ringing') {
      rotation.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 62 }),
          withTiming(12, { duration: 125 }),
          withTiming(0, { duration: 62 })
        ),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [state, rotation]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (state === 'sleeping') {
    return (
      <View style={styles.container}>
        <View style={styles.topSection}>
          <Text style={styles.countdown}>{timeUntilAlarm}</Text>
          <Text style={styles.label}>until alarm</Text>
        </View>
        <View style={styles.cardsContainer}>
          {punishments.map((p, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.cardEmoji}>{p.emoji}</Text>
              <Text style={styles.cardText}>{p.shortLabel}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.containerRinging]}>
      <View style={styles.alertHeader}>
        <Animated.Text style={[styles.alertIcon, shakeStyle]}>
          {'🔔'}
        </Animated.Text>
        <Text style={styles.alertText}>GET UP OR ELSE:</Text>
      </View>
      <View style={styles.cardsContainer}>
        {punishments.map((p, index) => (
          <View key={index} style={styles.cardRinging}>
            <Text style={styles.cardEmoji}>{p.emoji}</Text>
            <Text style={styles.cardTextRinging}>{p.fullMessage}</Text>
          </View>
        ))}
      </View>
      {onDismiss ? (
        <Pressable style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissButtonText}>I'M UP</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(25, 25, 30, 0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
  },
  containerRinging: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  countdown: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  cardsContainer: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 22,
  },
  alertText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#EF4444',
  },
  cardRinging: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
  },
  cardTextRinging: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
    flex: 1,
  },
  dismissButton: {
    marginTop: 14,
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default LiveActivityWidget;
