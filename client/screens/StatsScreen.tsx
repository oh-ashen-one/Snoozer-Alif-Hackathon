import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { BottomNav } from '@/components/BottomNav';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getCurrentStreak,
  getBestStreak,
  getMonthStats,
  getWeekData,
  getWakeUpHistory,
  seedMockData,
  type MonthStats,
  type DayStatus as TrackingDayStatus,
  type WakeLogEntry,
} from '@/utils/tracking';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type DayStatus = 'success' | 'failed' | 'today' | 'future';
type ActivityType = 'success' | 'failed' | 'streak';

interface WeekDay {
  day: string;
  status: DayStatus;
}

interface ActivityItem {
  icon: string;
  iconColor: string;
  text: string;
  time: string;
  type: ActivityType;
}

interface Stats {
  currentStreak: number;
  bestStreak: number;
  moneySaved: number;
  moneyLost: number;
  wakeUpRate: number;
  wakeUpDays: number;
  totalDays: number;
  weeklyData: WeekDay[];
  recentActivity: ActivityItem[];
}

// Day circle component
function DayCircle({ day, status }: WeekDay) {
  const getCircleStyle = () => {
    switch (status) {
      case 'success':
        return styles.circleSuccess;
      case 'failed':
        return styles.circleFailed;
      case 'today':
        return styles.circleToday;
      case 'future':
      default:
        return styles.circleFuture;
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'success':
        return <Feather name="check" size={18} color="#FFFFFF" />;
      case 'failed':
        return <Feather name="x" size={18} color="#FFFFFF" />;
      case 'today':
        return <View style={styles.todayDot} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.dayContainer}>
      <ThemedText style={styles.dayLabel}>{day}</ThemedText>
      <View style={[styles.dayCircle, getCircleStyle()]}>
        {renderContent()}
      </View>
    </View>
  );
}

// Activity item component
function ActivityRow({ item }: { item: ActivityItem }) {
  const getBorderColor = () => {
    switch (item.type) {
      case 'success':
        return 'rgba(34, 197, 94, 0.5)';
      case 'failed':
        return 'rgba(239, 68, 68, 0.5)';
      case 'streak':
        return 'rgba(251, 146, 60, 0.5)';
      default:
        return 'transparent';
    }
  };

  const getIconBg = () => {
    switch (item.type) {
      case 'success':
        return 'rgba(34, 197, 94, 0.15)';
      case 'failed':
        return 'rgba(239, 68, 68, 0.15)';
      case 'streak':
        return 'rgba(251, 146, 60, 0.15)';
      default:
        return 'rgba(120, 113, 108, 0.15)';
    }
  };

  return (
    <View style={[styles.activityItem, { borderLeftColor: getBorderColor() }]}>
      <View style={styles.activityLeft}>
        <View style={[styles.activityIconCircle, { backgroundColor: getIconBg() }]}>
          <Feather name={item.icon as any} size={14} color={item.iconColor} />
        </View>
        <ThemedText style={styles.activityText}>{item.text}</ThemedText>
      </View>
      <ThemedText style={styles.activityTime}>{item.time}</ThemedText>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    currentStreak: 0,
    bestStreak: 0,
    moneySaved: 0,
    moneyLost: 0,
    wakeUpRate: 0,
    wakeUpDays: 0,
    totalDays: 30,
    weeklyData: [],
    recentActivity: [],
  });

  const loadStats = useCallback(async () => {
    try {
      const [currentStreak, bestStreak, monthStats, weekData, history] = await Promise.all([
        getCurrentStreak(),
        getBestStreak(),
        getMonthStats(),
        getWeekData(),
        getWakeUpHistory(7),
      ]);

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const weeklyData: WeekDay[] = weekData.map(day => {
        let status: DayStatus = 'future';
        if (day.date < todayStr) {
          status = day.status === 'success' ? 'success' : day.status === 'fail' ? 'failed' : 'future';
        } else if (day.date === todayStr) {
          status = day.status === 'success' ? 'success' : day.status === 'fail' ? 'failed' : 'today';
        }
        return { day: day.dayOfWeek.charAt(0), status };
      });

      const recentActivity: ActivityItem[] = history.slice(0, 5).map(entry => {
        if (entry.snoozed) {
          return {
            icon: 'moon',
            iconColor: '#EF4444',
            text: `Snoozed${entry.snoozeCount && entry.snoozeCount > 1 ? ` ${entry.snoozeCount}x` : ''}`,
            time: entry.wokeAt,
            type: 'failed' as ActivityType,
          };
        }
        return {
          icon: 'check-circle',
          iconColor: '#22C55E',
          text: 'Woke up on time',
          time: entry.wokeAt,
          type: 'success' as ActivityType,
        };
      });

      const totalDays = monthStats.wakeUps + monthStats.snoozes;
      const wakeUpRate = totalDays > 0 ? Math.round((monthStats.wakeUps / totalDays) * 100) : 0;

      setStats({
        currentStreak,
        bestStreak,
        moneySaved: monthStats.savedMoney,
        moneyLost: monthStats.lostMoney,
        wakeUpRate,
        wakeUpDays: monthStats.wakeUps,
        totalDays: totalDays || 30,
        weeklyData,
        recentActivity,
      });
    } catch (error) {
      if (__DEV__) console.log('[Stats] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const handleSeedMockData = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await seedMockData();
    await loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FB923C" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Stats</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Feather name="zap" size={32} color="#FB923C" />
          </View>
          <ThemedText style={styles.heroLabel}>Current Streak</ThemedText>
          <ThemedText style={styles.heroValue}>{stats.currentStreak} days</ThemedText>
          <ThemedText style={styles.heroBest}>Best: {stats.bestStreak} days</ThemedText>
        </View>

        <View style={styles.twoColumnRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Feather name="dollar-sign" size={18} color="#22C55E" />
            </View>
            <ThemedText style={styles.statLabel}>Money Saved</ThemedText>
            <ThemedText style={styles.statValueGreen}>${stats.moneySaved}</ThemedText>
            <ThemedText style={styles.statSubtext}>this month</ThemedText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Feather name="trending-down" size={18} color="#EF4444" />
            </View>
            <ThemedText style={styles.statLabel}>Money Lost</ThemedText>
            <ThemedText style={styles.statValueRed}>${stats.moneyLost}</ThemedText>
            <ThemedText style={styles.statSubtext}>to snoozing</ThemedText>
          </View>
        </View>

        <View style={styles.wakeUpCard}>
          <View style={styles.wakeUpHeader}>
            <View style={styles.wakeUpTitleRow}>
              <View style={[styles.wakeUpIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Feather name="clock" size={14} color="#22C55E" />
              </View>
              <ThemedText style={styles.wakeUpTitle}>Wake Up Rate</ThemedText>
            </View>
            <ThemedText style={styles.wakeUpPercent}>{stats.wakeUpRate}%</ThemedText>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.wakeUpRate}%` }]} />
          </View>
          <ThemedText style={styles.wakeUpSubtext}>
            {stats.wakeUpDays} of {stats.totalDays} days this month
          </ThemedText>
        </View>

        <ThemedText style={styles.sectionTitle}>This Week</ThemedText>
        {stats.weeklyData.length > 0 ? (
          <View style={styles.weekGrid}>
            {stats.weeklyData.map((item, index) => (
              <DayCircle key={index} day={item.day} status={item.status} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyWeek}>
            <ThemedText style={styles.emptyText}>No data yet</ThemedText>
          </View>
        )}

        <ThemedText style={styles.activityTitle}>Recent Activity</ThemedText>
        {stats.recentActivity.length > 0 ? (
          <View style={styles.activityList}>
            {stats.recentActivity.map((item, index) => (
              <ActivityRow key={index} item={item} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyActivity}>
            <Feather name="inbox" size={32} color="#57534E" />
            <ThemedText style={styles.emptyText}>No activity yet</ThemedText>
            <Pressable style={styles.seedButton} onPress={handleSeedMockData}>
              <ThemedText style={styles.seedButtonText}>Load sample data</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <BottomNav activeTab="stats" />
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
    paddingHorizontal: 24,
    paddingVertical: 16,
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
    paddingHorizontal: 24,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.orange,
  },
  heroBest: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
  },

  // Two Column Stats
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValueGreen: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.green,
  },
  statValueRed: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.red,
  },
  statSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Wake Up Rate Card
  wakeUpCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginTop: 24,
  },
  wakeUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wakeUpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wakeUpIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeUpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  wakeUpPercent: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.green,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 100,
  },
  wakeUpSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 12,
  },

  // This Week Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 24,
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  dayContainer: {
    width: 40,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSuccess: {
    backgroundColor: Colors.green,
  },
  circleFailed: {
    backgroundColor: Colors.red,
  },
  circleToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  circleFuture: {
    backgroundColor: Colors.border,
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },

  // Recent Activity
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  activityList: {
    gap: 8,
  },
  activityItem: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 14,
    color: Colors.text,
  },
  activityTime: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWeek: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivity: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  seedButton: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  seedButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FB923C',
  },
});
