import React, { useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Toggle } from '@/components/Toggle';
import { Button } from '@/components/Button';
import { ActiveBadge } from '@/components/ActiveBadge';
import { DayPills } from '@/components/DayPills';
import { Colors, Spacing } from '@/constants/theme';
import { useAlarms } from '@/hooks/useAlarms';
import { Alarm } from '@/utils/storage';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function getTimeUntilAlarm(alarmTime: string): string {
  const [hours, minutes] = alarmTime.split(':').map(Number);
  const now = new Date();
  const alarm = new Date();
  alarm.setHours(hours, minutes, 0, 0);

  if (alarm <= now) {
    alarm.setDate(alarm.getDate() + 1);
  }

  const diff = alarm.getTime() - now.getTime();
  const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
  const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `in ${hoursUntil}h ${minutesUntil}m`;
}

function formatTime(time: string): { time: string; period: string } {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return { time: `${displayHours}:${minutes.toString().padStart(2, '0')}`, period };
}

function Header({ onSettingsPress }: { onSettingsPress: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <ThemedText style={styles.greeting}>{getGreeting()}</ThemedText>
        <ThemedText style={styles.userName}>Alex 👋</ThemedText>
      </View>
      <Pressable
        style={styles.settingsButton}
        onPress={onSettingsPress}
        hitSlop={8}
      >
        <Feather name="settings" size={20} color={Colors.text} />
      </Pressable>
    </View>
  );
}

function NextAlarmCard({ alarm }: { alarm: Alarm | null }) {
  if (!alarm) return null;

  const { time, period } = formatTime(alarm.time);
  const timeUntil = getTimeUntilAlarm(alarm.time);

  return (
    <View style={styles.nextAlarmCard}>
      <View style={styles.nextAlarmHeader}>
        <ThemedText style={styles.nextAlarmLabel}>NEXT ALARM</ThemedText>
        <ActiveBadge />
      </View>
      <View style={styles.nextAlarmTimeRow}>
        <ThemedText style={styles.nextAlarmTime}>{time}</ThemedText>
        <ThemedText style={styles.nextAlarmPeriod}>{period}</ThemedText>
      </View>
      <ThemedText style={styles.nextAlarmCountdown}>{timeUntil}</ThemedText>
    </View>
  );
}

function StatsRow() {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <ThemedText style={styles.statEmoji}>🔥</ThemedText>
        <ThemedText style={styles.statValue}>12 days</ThemedText>
        <ThemedText style={styles.statLabel}>Streak</ThemedText>
      </View>
      <View style={styles.statCard}>
        <ThemedText style={styles.statEmoji}>💰</ThemedText>
        <ThemedText style={styles.statValue}>$48</ThemedText>
        <ThemedText style={styles.statLabel}>Saved</ThemedText>
      </View>
      <View style={styles.statCard}>
        <ThemedText style={styles.statEmoji}>👥</ThemedText>
        <ThemedText style={styles.statValue}>1</ThemedText>
        <ThemedText style={styles.statLabel}>Buddy</ThemedText>
      </View>
    </View>
  );
}

function AlarmListItem({ alarm, onToggle }: { alarm: Alarm; onToggle: () => void }) {
  const { time, period } = formatTime(alarm.time);
  // Default to weekdays if no days specified
  const selectedDays = [1, 2, 3, 4, 5];

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
        <View style={styles.dayPillsContainer}>
          <DayPills selectedDays={selectedDays} />
        </View>
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
  const navigation = useNavigation<NavigationProp>();
  const { alarms, loading, toggleAlarm, loadAlarms } = useAlarms();

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [loadAlarms])
  );

  const nextAlarm = useMemo(() => {
    const enabledAlarms = alarms.filter(a => a.enabled);
    if (enabledAlarms.length === 0) return null;
    return enabledAlarms[0];
  }, [alarms]);

  const handleAddAlarm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddAlarm', { isOnboarding: false });
  }, [navigation]);

  const handleSettingsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Settings');
  }, [navigation]);

  const handleToggleAlarm = useCallback((id: string) => {
    return () => toggleAlarm(id);
  }, [toggleAlarm]);

  const renderAlarmItem = useCallback(({ item }: { item: Alarm }) => (
    <AlarmListItem
      alarm={item}
      onToggle={handleToggleAlarm(item.id)}
    />
  ), [handleToggleAlarm]);

  const keyExtractor = useCallback((item: Alarm) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const ListHeader = (
    <>
      <Header onSettingsPress={handleSettingsPress} />
      {nextAlarm && <NextAlarmCard alarm={nextAlarm} />}
      <StatsRow />
      {alarms.length > 0 && (
        <ThemedText style={styles.sectionTitle}>Your Alarms</ThemedText>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={alarms}
        keyExtractor={keyExtractor}
        renderItem={renderAlarmItem}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + 100,
          },
          alarms.length === 0 && styles.emptyList,
        ]}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<EmptyState onAddAlarm={handleAddAlarm} />}
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
    paddingHorizontal: Spacing['2xl'],
  },
  emptyList: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  greeting: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Next Alarm Card
  nextAlarmCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  nextAlarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nextAlarmLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  nextAlarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  nextAlarmTime: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
  },
  nextAlarmPeriod: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextAlarmCountdown: {
    fontSize: 16,
    color: Colors.orange,
    marginTop: Spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },

  // Alarm Card
  alarmCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  alarmCardPressed: {
    opacity: 0.8,
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
  dayPillsContainer: {
    marginTop: Spacing.md,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.bgElevated,
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
  },
});
