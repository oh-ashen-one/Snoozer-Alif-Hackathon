import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TimeRange = 'week' | 'month' | 'all';

// Mock data
const MOCK_STATS = {
  currentStreak: 12,
  moneySaved: 48,
  wakeUpRate: 85,
  onTimeCount: 23,
  bestStreak: 15,
  totalDays: 42,
  weeklyData: [
    { day: 'M', success: true, time: 6.1 },
    { day: 'T', success: true, time: 6.0 },
    { day: 'W', success: false, time: 6.5 },
    { day: 'T', success: true, time: 6.2 },
    { day: 'F', success: true, time: 6.0 },
    { day: 'S', success: null, time: null },
    { day: 'S', success: null, time: null },
  ],
  recentActivity: [
    { date: 'Today', time: '6:02 AM', label: 'Wake up', success: true, delta: 'on time' },
    { date: 'Yesterday', time: '6:00 AM', label: 'Wake up', success: true, delta: 'on time' },
    { date: 'Wed', time: '6:32 AM', label: 'Wake up', success: false, delta: '32min late' },
    { date: 'Tue', time: '6:05 AM', label: 'Wake up', success: true, delta: '5min late' },
    { date: 'Mon', time: '6:00 AM', label: 'Wake up', success: true, delta: 'on time' },
  ],
};

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeRange(range);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Stats</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Pills */}
        <View style={styles.timeRangePills}>
          {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
            <Pressable
              key={range}
              style={[styles.pill, timeRange === range && styles.pillActive]}
              onPress={() => handleTimeRangeChange(range)}
            >
              <ThemedText style={[styles.pillText, timeRange === range && styles.pillTextActive]}>
                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All Time'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Hero Stats */}
        <View style={styles.heroRow}>
          <View style={styles.heroCard}>
            <ThemedText style={styles.heroEmoji}>🔥</ThemedText>
            <ThemedText style={styles.heroNumber}>{MOCK_STATS.currentStreak}</ThemedText>
            <ThemedText style={styles.heroLabel}>day streak</ThemedText>
          </View>
          <View style={styles.heroCard}>
            <ThemedText style={styles.heroEmoji}>💰</ThemedText>
            <ThemedText style={styles.heroNumber}>${MOCK_STATS.moneySaved}</ThemedText>
            <ThemedText style={styles.heroLabel}>saved</ThemedText>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <ThemedText style={styles.chartEmoji}>📊</ThemedText>
            <ThemedText style={styles.chartTitle}>This Week</ThemedText>
          </View>
          <View style={styles.chartBars}>
            {MOCK_STATS.weeklyData.map((item, index) => {
              const barHeight = item.success === null ? 8 : item.success ? 60 : 40;
              const barColor = item.success === null
                ? Colors.border
                : item.success
                  ? Colors.green
                  : Colors.red;

              return (
                <View key={index} style={styles.chartBarContainer}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: barHeight, backgroundColor: barColor },
                      item.success === null && styles.chartBarEmpty,
                    ]}
                  />
                  <ThemedText style={styles.chartDayLabel}>{item.day}</ThemedText>
                </View>
              );
            })}
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statEmoji}>✅</ThemedText>
            <ThemedText style={styles.statNumber}>{MOCK_STATS.wakeUpRate}%</ThemedText>
            <ThemedText style={styles.statLabel}>Wake Rate</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statEmoji}>⏰</ThemedText>
            <ThemedText style={styles.statNumber}>{MOCK_STATS.onTimeCount}</ThemedText>
            <ThemedText style={styles.statLabel}>On Time</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statEmoji}>🏆</ThemedText>
            <ThemedText style={styles.statNumber}>{MOCK_STATS.bestStreak}</ThemedText>
            <ThemedText style={styles.statLabel}>Best Streak</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statEmoji}>📅</ThemedText>
            <ThemedText style={styles.statNumber}>{MOCK_STATS.totalDays}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Days</ThemedText>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <ThemedText style={styles.sectionTitle}>Recent Activity</ThemedText>
          <View style={styles.activityList}>
            {MOCK_STATS.recentActivity.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.activityItem,
                  index === MOCK_STATS.recentActivity.length - 1 && styles.activityItemLast,
                ]}
              >
                <View style={styles.activityIcon}>
                  <ThemedText style={styles.activityIconText}>
                    {item.success ? '✅' : '🔴'}
                  </ThemedText>
                </View>
                <View style={styles.activityContent}>
                  <ThemedText style={styles.activityDate}>
                    {item.date}, {item.time}
                  </ThemedText>
                  <ThemedText style={styles.activityLabel}>
                    {item.label} · {item.delta}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },

  // Time Range Pills
  timeRangePills: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  pill: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: Colors.orange,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  pillTextActive: {
    color: Colors.text,
  },

  // Hero Stats
  heroRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroCard: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  heroNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  heroLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Weekly Chart
  chartCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chartEmoji: {
    fontSize: 18,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  chartBarEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartDayLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: Spacing.sm,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Recent Activity
  activitySection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  activityList: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityDate: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
