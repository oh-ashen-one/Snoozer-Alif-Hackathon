import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DayPillsProps {
  selectedDays: number[];
}

export function DayPills({ selectedDays }: DayPillsProps) {
  return (
    <View style={styles.container}>
      {DAYS.map((day, index) => {
        const isSelected = selectedDays.includes(index);
        return (
          <View
            key={index}
            style={[
              styles.pill,
              isSelected ? styles.pillSelected : styles.pillUnselected,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                isSelected ? styles.pillTextSelected : styles.pillTextUnselected,
              ]}
            >
              {day}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillUnselected: {
    backgroundColor: Colors.bgCard,
  },
  pillSelected: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextUnselected: {
    color: '#57534E',
  },
  pillTextSelected: {
    color: Colors.orange,
  },
});
