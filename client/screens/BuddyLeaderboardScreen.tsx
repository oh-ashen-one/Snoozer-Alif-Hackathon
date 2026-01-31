import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import {
  getBuddyInfo,
  getBuddyStats,
  getUserName,
  BuddyInfo,
  BuddyStats,
} from '@/utils/storage';
import { getCurrentStreak } from '@/utils/tracking';

interface UserStats {
  name: string;
  weeklyWakes: number;
  currentStreak: number;
  longestStreak: number;
  totalPaid: number;
  totalReceived: number;
}

export default function BuddyLeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [buddy, setBuddy] = useState<BuddyInfo | null>(null);
  const [buddyStats, setBuddyStats] = useState<BuddyStats | null>(null);
  const [myStreak, setMyStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('You');

  const myStats: UserStats = {
    name: userName,
    weeklyWakes: 5,
    currentStreak: myStreak,
    longestStreak: 34,
    totalPaid: 20,
    totalReceived: buddyStats?.totalPaid || 45,
  };

  const buddyStatsData: UserStats = {
    name: buddy?.name || 'Buddy',
    weeklyWakes: buddyStats?.totalWakes || 4,
    currentStreak: buddyStats?.currentStreak || 8,
    longestStreak: buddyStats?.longestStreak || 21,
    totalPaid: buddyStats?.totalPaid || 45,
    totalReceived: myStats.totalPaid,
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [buddyInfo, stats, streak, name] = await Promise.all([
        getBuddyInfo(),
        getBuddyStats(),
        getCurrentStreak(),
        getUserName(),
      ]);

      setBuddy(buddyInfo);
      setBuddyStats(stats);
      setMyStreak(streak);
      if (name) setUserName(name);
    } catch (error) {
      console.error('[BuddyLeaderboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const netAmount = myStats.totalReceived - myStats.totalPaid;

  const ComparisonBar = ({ 
    label, 
    myValue, 
    buddyValue, 
    isHigherBetter = true 
  }: { 
    label: string; 
    myValue: number; 
    buddyValue: number;
    isHigherBetter?: boolean;
  }) => {
    const total = myValue + buddyValue || 1;
    const myPercent = (myValue / total) * 100;
    const buddyPercent = (buddyValue / total) * 100;
    const iWin = isHigherBetter ? myValue > buddyValue : myValue < buddyValue;
    const buddyWins = isHigherBetter ? buddyValue > myValue : buddyValue < myValue;

    return (
      <View style={styles.barContainer}>
        <ThemedText style={styles.barLabel}>{label}</ThemedText>
        <View style={styles.barWrapper}>
          <View style={styles.barRow}>
            <ThemedText style={styles.barName}>You</ThemedText>
            <View style={styles.barTrack}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${myPercent}%`,
                    backgroundColor: iWin ? Colors.green : Colors.textMuted,
                  }
                ]} 
              />
            </View>
            <ThemedText style={[styles.barValue, iWin && styles.winnerValue]}>
              {myValue}
            </ThemedText>
            {iWin && <Text style={{ fontSize: 14 }}>←</Text>}
          </View>
          <View style={styles.barRow}>
            <ThemedText style={styles.barName}>{buddy?.name || 'Buddy'}</ThemedText>
            <View style={styles.barTrack}>
              <View 
                style={[
                  styles.barFill, 
                  { 
                    width: `${buddyPercent}%`,
                    backgroundColor: buddyWins ? Colors.green : Colors.textMuted,
                  }
                ]} 
              />
            </View>
            <ThemedText style={[styles.barValue, buddyWins && styles.winnerValue]}>
              {buddyValue}
            </ThemedText>
            {buddyWins && <Text style={{ fontSize: 14 }}>←</Text>}
          </View>
        </View>
      </View>
    );
  };

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
        <ThemedText style={styles.title}>YOU vs {(buddy?.name || 'BUDDY').toUpperCase()}</ThemedText>
      </View>

      <ThemedText style={styles.sectionTitle}>THIS WEEK</ThemedText>
      <View style={styles.sectionCard}>
        <ComparisonBar 
          label="Successful Wakes" 
          myValue={myStats.weeklyWakes} 
          buddyValue={buddyStatsData.weeklyWakes} 
        />
      </View>

      <ThemedText style={styles.sectionTitle}>CURRENT STREAK</ThemedText>
      <View style={styles.streakCard}>
        <View style={styles.streakRow}>
          <Text style={{ fontSize: 24 }}>⚡</Text>
          <ThemedText style={styles.streakLabel}>You:</ThemedText>
          <ThemedText style={styles.streakValue}>{myStats.currentStreak} days</ThemedText>
          {myStats.currentStreak > buddyStatsData.currentStreak && (
            <View style={styles.winBadge}>
              <Text style={{ fontSize: 12 }}>←</Text>
            </View>
          )}
        </View>
        <View style={styles.divider} />
        <View style={styles.streakRow}>
          <Text style={{ fontSize: 24 }}>⚡</Text>
          <ThemedText style={styles.streakLabel}>{buddy?.name || 'Buddy'}:</ThemedText>
          <ThemedText style={styles.streakValue}>{buddyStatsData.currentStreak} days</ThemedText>
          {buddyStatsData.currentStreak > myStats.currentStreak && (
            <View style={styles.winBadge}>
              <Text style={{ fontSize: 12 }}>←</Text>
            </View>
          )}
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>MONEY EXCHANGED</ThemedText>
      <View style={styles.moneyCard}>
        <View style={styles.moneyRow}>
          <ThemedText style={styles.moneyLabel}>You paid {buddy?.name || 'buddy'}:</ThemedText>
          <ThemedText style={styles.moneyValue}>${myStats.totalPaid}</ThemedText>
        </View>
        <View style={styles.moneyRow}>
          <ThemedText style={styles.moneyLabel}>{buddy?.name || 'Buddy'} paid you:</ThemedText>
          <ThemedText style={styles.moneyValue}>${myStats.totalReceived}</ThemedText>
        </View>
        <View style={styles.divider} />
        <View style={styles.moneyRow}>
          <ThemedText style={styles.netLabel}>Net:</ThemedText>
          <View style={styles.netBadge}>
            <ThemedText style={[
              styles.netValue,
              { color: netAmount >= 0 ? Colors.green : Colors.red }
            ]}>
              {netAmount >= 0 ? '+' : ''}{netAmount >= 0 ? '$' : '-$'}{Math.abs(netAmount)}
            </ThemedText>
            {netAmount > 0 && (
              <ThemedText style={styles.netEmoji}> Nice!</ThemedText>
            )}
          </View>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>ALL TIME</ThemedText>
      <View style={styles.sectionCard}>
        <ComparisonBar 
          label="Longest Streak" 
          myValue={myStats.longestStreak} 
          buddyValue={buddyStatsData.longestStreak} 
        />
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
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barContainer: {
    gap: Spacing.sm,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  barWrapper: {
    gap: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barName: {
    fontSize: 14,
    color: Colors.text,
    width: 60,
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
  },
  barValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  winnerValue: {
    color: Colors.green,
  },
  streakCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  streakLabel: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  streakValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  winBadge: {
    marginLeft: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  moneyCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  moneyLabel: {
    fontSize: 15,
    color: Colors.text,
  },
  moneyValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  netBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  netEmoji: {
    fontSize: 14,
    color: Colors.green,
  },
});
