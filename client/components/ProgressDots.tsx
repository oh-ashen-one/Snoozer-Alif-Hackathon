import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface ProgressDotsProps {
  total: number;
  current: number;
  activeColor?: string;
  inactiveColor?: string;
}

export function ProgressDots({
  total,
  current,
  activeColor = Colors.green,
  inactiveColor = Colors.orange,
}: ProgressDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => {
        const isActive = i === current;
        const isPast = i < current;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && styles.activeDot,
              isActive && { backgroundColor: activeColor },
              isPast && { backgroundColor: inactiveColor },
              !isActive && !isPast && styles.futureDot,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  activeDot: {
    width: 24,
    borderRadius: 4,
  },
  futureDot: {
    backgroundColor: Colors.border,
  },
});
