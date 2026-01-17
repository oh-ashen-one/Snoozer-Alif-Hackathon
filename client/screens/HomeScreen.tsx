import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Toggle } from '@/components/Toggle';
import { Button } from '@/components/Button';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAlarms } from '@/hooks/useAlarms';
import { Alarm } from '@/utils/storage';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function AlarmCard({ alarm, onToggle }: { alarm: Alarm; onToggle: () => void }) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return { time: `${displayHours}:${minutes.toString().padStart(2, '0')}`, period };
  };

  const { time, period } = formatTime(alarm.time);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.alarmCard,
        pressed && styles.alarmCardPressed,
      ]}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    >
      <View style={styles.alarmInfo}>
        <View style={styles.timeRow}>
          <ThemedText style={styles.alarmTime}>{time}</ThemedText>
          <ThemedText style={styles.alarmPeriod}>{period}</ThemedText>
        </View>
        <ThemedText style={styles.alarmLabel}>{alarm.label || 'Alarm'}</ThemedText>
      </View>
      <Toggle value={alarm.enabled} onValueChange={onToggle} />
    </Pressable>
  );
}

function EmptyState({ onAddAlarm }: { onAddAlarm: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="bell-off" size={64} color={Colors.textMuted} />
      </View>
      <ThemedText style={styles.emptyTitle}>No alarms set</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Create your first alarm to get started
      </ThemedText>
      <Button onPress={onAddAlarm} style={styles.emptyButton}>
        Create Your First Alarm
      </Button>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const { alarms, loading, toggleAlarm, loadAlarms } = useAlarms();

  useFocusEffect(
    React.useCallback(() => {
      loadAlarms();
    }, [loadAlarms])
  );

  const handleAddAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddAlarm', { isOnboarding: false });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlarmCard
            alarm={item}
            onToggle={() => toggleAlarm(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          alarms.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={<EmptyState onAddAlarm={handleAddAlarm} />}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  alarmCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alarmCardPressed: {
    backgroundColor: Colors.bgElevated,
  },
  alarmInfo: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  alarmTime: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  alarmPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  alarmLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  emptyButton: {
    width: '100%',
    backgroundColor: Colors.orange,
  },
});
