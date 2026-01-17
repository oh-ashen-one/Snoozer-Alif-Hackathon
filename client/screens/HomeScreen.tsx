import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAlarms } from '@/hooks/useAlarms';
import { Alarm } from '@/utils/storage';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

const DEBUG_LONG_PRESS_DURATION = 3000;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

// Toggle Component
function Toggle({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  const translateX = useSharedValue(value ? 23 : 3);

  React.useEffect(() => {
    translateX.value = withTiming(value ? 23 : 3, { duration: 200 });
  }, [value, translateX]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      onPress={onValueChange}
      style={[styles.toggle, { backgroundColor: value ? Colors.green : '#292524' }]}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </Pressable>
  );
}

// Day Pills Component
function DayPills({ selectedDays }: { selectedDays: number[] }) {
  return (
    <View style={styles.dayPillsRow}>
      {DAYS.map((day, index) => {
        const isSelected = selectedDays.includes(index);
        return (
          <View
            key={index}
            style={[
              styles.dayPill,
              isSelected ? styles.dayPillSelected : styles.dayPillUnselected,
            ]}
          >
            <ThemedText
              style={[
                styles.dayPillText,
                isSelected ? styles.dayPillTextSelected : styles.dayPillTextUnselected,
              ]}
            >
              {day}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

// Header Component with debug mode long press
function Header({ onDebugModeActivate }: { onDebugModeActivate: () => void }) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressIn = () => {
    longPressTimerRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDebugModeActivate();
    }, DEBUG_LONG_PRESS_DURATION);
  };

  const handlePressOut = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <Pressable
      style={styles.header}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View>
        <ThemedText style={styles.greeting}>{getGreeting()}</ThemedText>
        <ThemedText style={styles.userName}>Alex</ThemedText>
      </View>
    </Pressable>
  );
}

// Active Badge Component
function ActiveBadge() {
  return (
    <View style={styles.activeBadge}>
      <View style={styles.activeDot} />
      <ThemedText style={styles.activeText}>Active</ThemedText>
    </View>
  );
}

// Next Alarm Card Component
function NextAlarmCard({ alarm }: { alarm: Alarm }) {
  const { time, period } = formatTime(alarm.time);
  const timeUntil = getTimeUntilAlarm(alarm.time);

  return (
    <View style={styles.nextAlarmCard}>
      {/* Top row */}
      <View style={styles.nextAlarmHeader}>
        <ThemedText style={styles.nextAlarmLabel}>NEXT ALARM</ThemedText>
        <ActiveBadge />
      </View>

      {/* Time row */}
      <View style={styles.timeRow}>
        <ThemedText style={styles.nextAlarmTime}>{time}</ThemedText>
        <ThemedText style={styles.nextAlarmPeriod}>{period}</ThemedText>
      </View>

      {/* Subtitle row */}
      <View style={styles.subtitleRow}>
        <ThemedText style={styles.alarmLabelText}>{alarm.label || 'Wake up'}</ThemedText>
        <ThemedText style={styles.subtitleDot}> · </ThemedText>
        <ThemedText style={styles.countdownText}>{timeUntil}</ThemedText>
      </View>

      {/* Stakes row */}
      <View style={styles.stakesRow}>
        <View style={styles.stakeBox}>
          <Feather name="alert-triangle" size={16} color={Colors.red} />
          <ThemedText style={styles.stakeLabel}>If you snooze</ThemedText>
          <ThemedText style={styles.stakePenalty}>-$2</ThemedText>
        </View>
        <View style={styles.stakeBox}>
          <Feather name="eye" size={16} color="#78716C" />
          <ThemedText style={styles.stakeLabel}>Buddy</ThemedText>
          <ThemedText style={styles.stakeValue}>Solo mode</ThemedText>
        </View>
      </View>
    </View>
  );
}

// Stats Row Component
function StatsRow() {
  return (
    <View style={styles.statsRow}>
      {/* Streak Card */}
      <View style={styles.statCard}>
        <ThemedText style={styles.statEmoji}>🔥</ThemedText>
        <ThemedText style={styles.statLabel}>Streak</ThemedText>
        <ThemedText style={styles.statValueGray}>0</ThemedText>
        <ThemedText style={styles.statSubLabel}>days</ThemedText>
      </View>

      {/* Saved Card */}
      <View style={styles.statCard}>
        <ThemedText style={styles.statEmoji}>💰</ThemedText>
        <ThemedText style={styles.statLabel}>Saved</ThemedText>
        <ThemedText style={styles.statValueGray}>$0</ThemedText>
        <ThemedText style={styles.statSubLabel}>this month</ThemedText>
      </View>

      {/* Buddy Card */}
      <View style={[styles.statCard, styles.statCardDashed]}>
        <ThemedText style={styles.statEmojiGray}>👥</ThemedText>
        <ThemedText style={styles.statLabel}>Buddy</ThemedText>
        <ThemedText style={styles.addBuddyText}>+ Add</ThemedText>
        <ThemedText style={styles.statSubLabel}>2x motivation</ThemedText>
      </View>
    </View>
  );
}

// Section Header Component
function SectionHeader({ onAddPress }: { onAddPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>Your Alarms</ThemedText>
      <Pressable style={styles.addButton} onPress={onAddPress}>
        <Feather name="plus" size={16} color={Colors.text} />
        <ThemedText style={styles.addButtonText}>Add</ThemedText>
      </Pressable>
    </View>
  );
}

// Alarm List Item Component
function AlarmListItem({ alarm, onToggle }: { alarm: Alarm; onToggle: () => void }) {
  const { time, period } = formatTime(alarm.time);
  const selectedDays = [1, 2, 3, 4, 5]; // Default to weekdays

  return (
    <View style={styles.alarmCard}>
      <View style={styles.alarmContent}>
        <View style={styles.alarmTopRow}>
          <View style={styles.alarmLeft}>
            <View style={styles.alarmTimeRow}>
              <ThemedText style={styles.alarmTime}>{time}</ThemedText>
              <ThemedText style={styles.alarmPeriod}>{period}</ThemedText>
            </View>
            <View style={styles.alarmSubtitleRow}>
              <ThemedText style={styles.alarmLabel}>{alarm.label || 'Wake up'}</ThemedText>
              <ThemedText style={styles.alarmDot}> · </ThemedText>
              <ThemedText style={styles.alarmPenalty}>-$2 if snooze</ThemedText>
            </View>
          </View>
          <Toggle value={alarm.enabled} onValueChange={onToggle} />
        </View>
        <DayPills selectedDays={selectedDays} />
      </View>
    </View>
  );
}

// Bottom Nav Component
function BottomNav({ activeTab, onStatsPress, onSettingsPress }: { activeTab: string; onStatsPress: () => void; onSettingsPress: () => void }) {
  const insets = useSafeAreaInsets();

  const tabs = [
    { key: 'alarms', icon: 'clock', label: 'Alarms', onPress: undefined },
    { key: 'stats', icon: 'bar-chart-2', label: 'Stats', onPress: onStatsPress },
    { key: 'buddy', icon: 'users', label: 'Buddy', onPress: undefined },
    { key: 'settings', icon: 'sliders', label: 'Settings', onPress: onSettingsPress },
  ];

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 28) }]}>
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.navTab} onPress={tab.onPress}>
            <Feather
              name={tab.icon as any}
              size={24}
              color={isActive ? Colors.text : '#78716C'}
              style={{ opacity: isActive ? 1 : 0.4 }}
            />
            <ThemedText style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// Empty State Component
function EmptyState({ onAddAlarm }: { onAddAlarm: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Feather name="bell-off" size={48} color="#57534E" />
      </View>
      <ThemedText style={styles.emptyTitle}>No alarms yet</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Create your first alarm to start your accountability journey
      </ThemedText>
      <Pressable style={styles.emptyButton} onPress={onAddAlarm}>
        <ThemedText style={styles.emptyButtonText}>Create Alarm</ThemedText>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { alarms, loading, toggleAlarm, loadAlarms } = useAlarms();
  const [activeTab] = useState('alarms');
  const [debugMode, setDebugMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAlarms();
    }, [loadAlarms])
  );

  const handleDebugModeActivate = useCallback(() => {
    setDebugMode(prev => {
      const newValue = !prev;
      if (__DEV__) console.log('[Home] Debug mode:', newValue ? 'ENABLED' : 'DISABLED');
      if (Platform.OS === 'web') {
        window.alert(newValue ? 'DEBUG MODE ENABLED' : 'DEBUG MODE DISABLED');
      } else {
        Alert.alert(newValue ? 'DEBUG MODE ENABLED' : 'DEBUG MODE DISABLED');
      }
      return newValue;
    });
  }, []);

  const handleTestAlarmNow = useCallback(() => {
    if (__DEV__) console.log('[Home] Test Alarm Now pressed - navigating to AlarmRinging');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('AlarmRinging', {
      alarmId: 'test',
      alarmLabel: 'Test Alarm',
      referencePhotoUri: '',
      shameVideoUri: '',
    });
  }, [navigation]);

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

  const handleStatsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Stats');
  }, [navigation]);

  const handleToggleAlarm = useCallback(
    (id: string) => {
      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleAlarm(id);
      };
    },
    [toggleAlarm]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Header onDebugModeActivate={handleDebugModeActivate} />

        {debugMode && (
          <Pressable
            testID="button-test-alarm"
            style={styles.debugButton}
            onPress={handleTestAlarmNow}
          >
            <Feather name="zap" size={20} color={Colors.text} />
            <ThemedText style={styles.debugButtonText}>Test Alarm Now</ThemedText>
          </Pressable>
        )}

        {nextAlarm ? (
          <>
            <NextAlarmCard alarm={nextAlarm} />
            <StatsRow />
            <SectionHeader onAddPress={handleAddAlarm} />
            {alarms.map(alarm => (
              <AlarmListItem
                key={alarm.id}
                alarm={alarm}
                onToggle={handleToggleAlarm(alarm.id)}
              />
            ))}
          </>
        ) : (
          <>
            <StatsRow />
            <EmptyState onAddAlarm={handleAddAlarm} />
          </>
        )}
      </ScrollView>

      <BottomNav activeTab={activeTab} onStatsPress={handleStatsPress} onSettingsPress={handleSettingsPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A09',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#78716C',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FAFAF9',
    marginTop: 4,
  },

  // Active Badge
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#22C55E',
  },

  // Next Alarm Card
  nextAlarmCard: {
    backgroundColor: '#1C1917',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#292524',
    padding: 24,
    marginTop: 8,
  },
  nextAlarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextAlarmLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nextAlarmTime: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FAFAF9',
  },
  nextAlarmPeriod: {
    fontSize: 20,
    color: '#78716C',
    marginLeft: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  alarmLabelText: {
    fontSize: 14,
    color: '#A8A29E',
  },
  subtitleDot: {
    fontSize: 14,
    color: '#A8A29E',
  },
  countdownText: {
    fontSize: 14,
    color: '#FB923C',
  },
  stakesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  stakeBox: {
    flex: 1,
    backgroundColor: '#292524',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  stakeLabel: {
    fontSize: 11,
    color: '#78716C',
  },
  stakePenalty: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  stakeValue: {
    fontSize: 14,
    color: '#A8A29E',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1917',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292524',
    padding: 16,
    alignItems: 'center',
  },
  statCardDashed: {
    borderStyle: 'dashed',
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statEmojiGray: {
    fontSize: 20,
    marginBottom: 4,
    opacity: 0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#78716C',
  },
  statValueGray: {
    fontSize: 28,
    fontWeight: '600',
    color: '#57534E',
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 12,
    color: '#57534E',
  },
  addBuddyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#78716C',
    marginTop: 4,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAF9',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#292524',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FAFAF9',
  },

  // Alarm Card
  alarmCard: {
    backgroundColor: '#1C1917',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292524',
    padding: 16,
    marginBottom: 12,
  },
  alarmContent: {},
  alarmTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alarmLeft: {},
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  alarmTime: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FAFAF9',
  },
  alarmPeriod: {
    fontSize: 14,
    color: '#78716C',
    marginLeft: 4,
  },
  alarmSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  alarmLabel: {
    fontSize: 13,
    color: '#A8A29E',
  },
  alarmDot: {
    fontSize: 13,
    color: '#A8A29E',
  },
  alarmPenalty: {
    fontSize: 12,
    color: '#EF4444',
  },

  // Toggle
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FAFAF9',
  },

  // Day Pills
  dayPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dayPill: {
    width: 32,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillUnselected: {
    backgroundColor: '#292524',
  },
  dayPillSelected: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  dayPillText: {
    fontSize: 10,
    fontWeight: '500',
  },
  dayPillTextUnselected: {
    color: '#57534E',
  },
  dayPillTextSelected: {
    color: '#FB923C',
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 10, 9, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#1C1917',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navTab: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78716C',
  },
  navLabelActive: {
    color: '#FAFAF9',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1C1917',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FAFAF9',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#FB923C',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAF9',
  },

  // Debug Mode
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.red,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  debugButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
