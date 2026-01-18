import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getBuddyInfo,
  getBuddyStats,
  getBuddyWakeEvents,
  getBuddyAlarms,
  getUserName,
  BuddyInfo,
  BuddyStats,
  WakeEvent,
  BuddyAlarm,
} from '@/utils/storage';
import { notifyBuddyPoked } from '@/utils/buddyNotifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BuddyDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();

  const [buddy, setBuddy] = useState<BuddyInfo | null>(null);
  const [stats, setStats] = useState<BuddyStats | null>(null);
  const [todayEvents, setTodayEvents] = useState<WakeEvent[]>([]);
  const [upcomingAlarms, setUpcomingAlarms] = useState<BuddyAlarm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('You');

  useEffect(() => {
    loadBuddyData();
  }, []);

  const loadBuddyData = async () => {
    try {
      const [buddyInfo, buddyStats, wakeEvents, alarms, name] = await Promise.all([
        getBuddyInfo(),
        getBuddyStats(),
        getBuddyWakeEvents(),
        getBuddyAlarms(),
        getUserName(),
      ]);

      setBuddy(buddyInfo);
      setStats(buddyStats);
      setTodayEvents(wakeEvents.slice(0, 3));
      setUpcomingAlarms(alarms.slice(0, 3));
      if (name) setUserName(name);
    } catch (error) {
      console.error('[BuddyDashboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (buddy?.phone) {
      const url = Platform.OS === 'ios'
        ? `sms:${buddy.phone}`
        : `sms:${buddy.phone}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error('[BuddyDashboard] Error opening SMS:', error);
      }
    }
  };

  const [pokeLoading, setPokeLoading] = useState(false);
  const [pokeSent, setPokeSent] = useState(false);

  const handlePoke = async () => {
    if (pokeLoading || pokeSent) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPokeLoading(true);
    
    try {
      await notifyBuddyPoked(userName, buddy?.name || 'Buddy');
      setPokeSent(true);
      if (__DEV__) console.log('[BuddyDashboard] Poke sent to buddy');
      
      setTimeout(() => setPokeSent(false), 5000);
    } catch (error) {
      console.error('[BuddyDashboard] Error sending poke:', error);
    } finally {
      setPokeLoading(false);
    }
  };

  const handleViewLeaderboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('BuddyLeaderboard' as any);
  };

  const handleSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('BuddySettings' as any);
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map(d => DAY_LABELS[d]).join(', ');
  };

  const formatEventTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const displayHours = hours % 12 || 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getResultEmoji = (result: string) => {
    switch (result) {
      case 'woke': return { emoji: '✅', color: Colors.green };
      case 'snoozed': return { emoji: '⏰', color: Colors.orange };
      case 'missed': return { emoji: '❌', color: Colors.red };
      default: return { emoji: '⚪', color: Colors.textMuted };
    }
  };

  const getResultText = (event: WakeEvent) => {
    switch (event.result) {
      case 'woke': return 'Woke on time';
      case 'snoozed': return `Snoozed ${event.snoozeCount || 1}x`;
      case 'missed': return 'Missed alarm';
      default: return 'Unknown';
    }
  };

  if (!buddy || buddy.status !== 'linked') {
    return (
      <View style={[styles.container, { paddingTop: headerHeight }]}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={{ fontSize: 48 }}>👥</Text>
          </View>
          <ThemedText style={styles.emptyTitle}>No Buddy Linked</ThemedText>
          <ThemedText style={styles.emptyDescription}>
            Link with a friend to see their wake-up progress and hold each other accountable.
          </ThemedText>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Buddy')}
          >
            <ThemedText style={styles.primaryButtonText}>Find a Buddy</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.buddyInfo}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {buddy.avatar || buddy.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.buddyDetails}>
            <ThemedText style={styles.buddyName}>{buddy.name}</ThemedText>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <ThemedText style={styles.statusText}>Linked</ThemedText>
            </View>
          </View>
        </View>
        <Pressable style={styles.settingsButton} onPress={handleSettings}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </Pressable>
      </View>

      <ThemedText style={styles.sectionTitle}>TODAY</ThemedText>
      {todayEvents.length > 0 ? (
        todayEvents.map((event, index) => {
          const { emoji, color } = getResultEmoji(event.result);
          return (
            <View key={event.id || index} style={styles.eventCard}>
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
              <View style={styles.eventDetails}>
                <ThemedText style={styles.eventTime}>
                  {formatEventTime(event.scheduledTime)}
                </ThemedText>
                <ThemedText style={[styles.eventResult, { color }]}>
                  {getResultText(event)}
                </ThemedText>
                {event.proofType && (
                  <ThemedText style={styles.eventProof}>
                    Proof: {event.proofType}
                  </ThemedText>
                )}
              </View>
              {event.penaltyPaid ? (
                <View style={styles.penaltyBadge}>
                  <ThemedText style={styles.penaltyText}>
                    -${event.penaltyPaid}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <View style={styles.noEventsCard}>
          <Text style={{ fontSize: 24 }}>🌙</Text>
          <ThemedText style={styles.noEventsText}>
            No wake events yet today
          </ThemedText>
        </View>
      )}

      <ThemedText style={styles.sectionTitle}>STATS</ThemedText>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={{ fontSize: 28 }}>⚡</Text>
          <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {stats?.currentStreak || 0}
          </ThemedText>
          <ThemedText style={styles.statLabel}>streak</ThemedText>
        </View>
        <View style={styles.statCard}>
          <Text style={{ fontSize: 28 }}>💵</Text>
          <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            ${stats?.totalReceived || 0}
          </ThemedText>
          <ThemedText style={styles.statLabel}>earned</ThemedText>
        </View>
      </View>

      <Pressable style={styles.leaderboardButton} onPress={handleViewLeaderboard}>
        <View style={styles.leaderboardContent}>
          <Text style={{ fontSize: 20 }}>📊</Text>
          <ThemedText style={styles.leaderboardText}>View Comparison</ThemedText>
        </View>
        <Text style={{ fontSize: 20, color: Colors.textSecondary }}>›</Text>
      </Pressable>

      <ThemedText style={styles.sectionTitle}>UPCOMING ALARMS</ThemedText>
      {upcomingAlarms.length > 0 ? (
        upcomingAlarms.map((alarm, index) => (
          <View key={alarm.id || index} style={styles.alarmCard}>
            <View style={styles.alarmTime}>
              <ThemedText style={styles.alarmTimeText}>{alarm.time}</ThemedText>
            </View>
            <View style={styles.alarmDetails}>
              <ThemedText style={styles.alarmDays}>{formatDays(alarm.days)}</ThemedText>
              {alarm.label ? (
                <ThemedText style={styles.alarmLabel}>{alarm.label}</ThemedText>
              ) : null}
            </View>
            <View style={styles.stakesBadge}>
              <ThemedText style={styles.stakesText}>${alarm.stakes}</ThemedText>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noAlarmsCard}>
          <Text style={{ fontSize: 24 }}>🔕</Text>
          <ThemedText style={styles.noAlarmsText}>
            No upcoming alarms
          </ThemedText>
        </View>
      )}

      <View style={styles.actionButtons}>
        <Pressable style={styles.messageButton} onPress={handleMessage}>
          <Text style={{ fontSize: 20 }}>💬</Text>
          <ThemedText style={styles.messageButtonText}>Message {buddy.name}</ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.pokeButton,
            pokeSent && styles.pokeButtonSent,
            pokeLoading && styles.pokeButtonLoading,
          ]}
          onPress={handlePoke}
          disabled={pokeLoading || pokeSent}
        >
          <Text style={{ fontSize: 20 }}>{pokeSent ? '✓' : '👋'}</Text>
          <ThemedText style={styles.pokeButtonText}>
            {pokeSent ? 'Sent!' : pokeLoading ? 'Sending...' : 'Poke'}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  buddyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    borderColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  buddyDetails: {
    gap: Spacing.xs,
  },
  buddyName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.green,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventDetails: {
    flex: 1,
  },
  eventTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  eventResult: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventProof: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  penaltyBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  penaltyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.red,
  },
  noEventsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noEventsText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  leaderboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  leaderboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  leaderboardText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  alarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alarmTime: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  alarmTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  alarmDetails: {
    flex: 1,
  },
  alarmDays: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  alarmLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  stakesBadge: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stakesText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
  },
  noAlarmsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noAlarmsText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  pokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  pokeButtonSent: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
  },
  pokeButtonLoading: {
    opacity: 0.7,
  },
  pokeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
});
