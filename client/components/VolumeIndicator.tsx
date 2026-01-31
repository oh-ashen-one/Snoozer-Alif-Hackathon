import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/theme';

interface VolumeIndicatorProps {
  volumePercent: number;
}

export function VolumeIndicator({ volumePercent }: VolumeIndicatorProps) {
  const bars = 10;
  const filledBars = Math.round((volumePercent / 100) * bars);
  const isMax = volumePercent >= 90;

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 18 }}>🔊</Text>
      <View style={styles.barsContainer}>
        {Array.from({ length: bars }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              i < filledBars ? styles.barFilled : styles.barEmpty,
              i < filledBars && isMax ? styles.barMax : null,
            ]}
          />
        ))}
      </View>
      <ThemedText style={[
        styles.percent,
        isMax ? styles.percentMax : null,
      ]}>
        {volumePercent}%
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 18, 17, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  bar: {
    width: 5,
    height: 16,
    borderRadius: 2,
  },
  barEmpty: {
    backgroundColor: Colors.border,
  },
  barFilled: {
    backgroundColor: Colors.orange,
  },
  barMax: {
    backgroundColor: Colors.red,
  },
  percent: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.orange,
    width: 40,
    textAlign: 'right',
  },
  percentMax: {
    color: Colors.red,
  },
});
