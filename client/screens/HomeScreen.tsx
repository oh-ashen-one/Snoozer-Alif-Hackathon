import React, { useCallback, useMemo, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Platform, Text } from 'react-native';
import { Swipeable, RectButton, TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BottomNav } from '@/components/BottomNav';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import Header, { getGreeting } from '@/components/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAlarms } from '@/hooks/useAlarms';
import { Alarm, getUserName, getPunishmentConfig } from '@/utils/storage';
import { killAllSounds, setCurrentScreen } from '@/utils/soundKiller';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getInterruptedAlarm, clearInterruptedAlarm, StoredAlarmState } from '@/hooks/useAntiCheat';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


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

// Helper to convert "HH:MM" to minutes for sorting
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Sort alarms by time (earliest first)
function sortAlarmsByTime(alarmList: Alarm[]): Alarm[] {
  return [...alarmList].sort((a, b) =>
    parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
  );
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
    <GHTouchableOpacity
      onPress={onValueChange}
      activeOpacity={0.8}
      style={[styles.toggle, { backgroundColor: value ? Colors.green : Colors.border }]}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </GHTouchableOpacity>
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
  const proofLabel = getProofTypeLabel(alarm.proofActivityType, alarm.activityName, alarm.stepGoal);

  // Build punishment text based on actual alarm settings
  // Check both extraPunishments array AND individual boolean flags for compatibility
  const getPunishmentDisplay = () => {
    const parts: string[] = [];
    const extras = alarm.extraPunishments ?? [];
    const alarmAny = alarm as any; // Access optional boolean flags
    
    // Check money punishment (check both moneyEnabled flag and punishment amount)
    if ((alarmAny.moneyEnabled && alarm.punishment && alarm.punishment > 0) || 
        (!alarmAny.hasOwnProperty('moneyEnabled') && alarm.punishment && alarm.punishment > 0)) {
      parts.push(`-$${alarm.punishment}`);
    }
    
    // Check other punishments - check both array AND individual flags
    if (extras.includes('shame_video') || alarmAny.shameVideoEnabled) {
      parts.push('Video');
    }
    if (extras.includes('buddy_call') || alarmAny.buddyNotifyEnabled) {
      parts.push('Buddy alert');
    }
    if (extras.includes('group_chat') || alarmAny.socialShameEnabled) {
      parts.push('Social');
    }
    if (extras.includes('donate_enemy') || alarmAny.antiCharityEnabled) {
      parts.push('Anti-charity');
    }
    
    if (parts.length === 0) {
      return 'No stakes';
    }
    
    return parts.join(' + ');
  };

  // Check if buddy notifications are enabled (check both array and flag)
  const hasBuddyEnabled = (alarm.extraPunishments ?? []).includes('buddy_call') || 
                          (alarm as any).buddyNotifyEnabled;

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
        <View style={styles.proofBadge}>
          <ThemedText style={styles.proofBadgeText}>{proofLabel}</ThemedText>
        </View>
        <ThemedText style={styles.countdownText}>{timeUntil}</ThemedText>
      </View>

      {/* Stakes row */}
      <View style={styles.stakesRow}>
        <View style={styles.stakeBox}>
          <ThemedText style={{ fontSize: 16 }}>⚠️</ThemedText>
          <ThemedText style={styles.stakeLabel}>If you snooze</ThemedText>
          <ThemedText style={styles.stakePenalty}>{getPunishmentDisplay()}</ThemedText>
        </View>
        <View style={styles.stakeBox}>
          <ThemedText style={{ fontSize: 16 }}>👁️</ThemedText>
          <ThemedText style={styles.stakeLabel}>Buddy</ThemedText>
          <ThemedText style={styles.stakeValue}>{hasBuddyEnabled ? 'Will be notified' : 'Solo mode'}</ThemedText>
        </View>
      </View>
    </View>
  );
}

// Stats Row Component
function StatsRow({ onBuddyPress }: { onBuddyPress: () => void }) {
  return (
    <View style={styles.statsRow}>
      {/* Streak Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconCircle, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
          <ThemedText style={{ fontSize: 18 }}>⚡</ThemedText>
        </View>
        <ThemedText style={styles.statLabel}>Streak</ThemedText>
        <ThemedText style={styles.statValueGray}>0</ThemedText>
        <ThemedText style={styles.statSubLabel}>days</ThemedText>
      </View>

      {/* Saved Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconCircle, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
          <ThemedText style={{ fontSize: 18 }}>💵</ThemedText>
        </View>
        <ThemedText style={styles.statLabel}>Saved</ThemedText>
        <ThemedText style={styles.statValueGray}>$0</ThemedText>
        <ThemedText style={styles.statSubLabel}>this month</ThemedText>
      </View>

      {/* Buddy Card */}
      <Pressable style={[styles.statCard, styles.statCardDashed]} onPress={onBuddyPress}>
        <View style={[styles.statIconCircle, { backgroundColor: '#292524' }]}>
          <ThemedText style={{ fontSize: 18 }}>👥</ThemedText>
        </View>
        <ThemedText style={styles.statLabel}>Buddy</ThemedText>
        <ThemedText style={styles.addBuddyText}>+ Add</ThemedText>
        <ThemedText style={styles.statSubLabel}>2x motivation</ThemedText>
      </Pressable>
    </View>
  );
}

// Section Header Component
function SectionHeader({ onAddPress }: { onAddPress: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>Your Alarms</ThemedText>
      <Pressable style={styles.addButton} onPress={onAddPress}>
        <ThemedText style={{ fontSize: 16 }}>➕</ThemedText>
        <ThemedText style={styles.addButtonText}>Add</ThemedText>
      </Pressable>
    </View>
  );
}

// Get proof type display with icon
function getProofTypeLabel(proofType: string | undefined, activityName?: string, stepGoal?: number): string {
  switch (proofType) {
    case 'photo_activity':
      return activityName ? `📷 ${activityName}` : '📷 Photo';
    case 'steps':
      return stepGoal ? `👟 ${stepGoal} steps` : '👟 Steps';
    case 'math':
      return '🧮 Math';
    case 'type_phrase':
      return '⌨️ Type';
    case 'stretch':
      return '🧘 Stretch';
    default:
      return '📷 Photo';
  }
}

// Format days display for chip
function getDaysDisplay(days: number[]): string {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (days.length === 0) return 'No days';
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  if (JSON.stringify(sorted) === JSON.stringify([1, 2, 3, 4, 5])) return 'Mon - Fri';
  if (JSON.stringify(sorted) === JSON.stringify([0, 6])) return 'Sat, Sun';
  return sorted.map(d => dayLabels[d]).join(', ');
}

// Alarm List Item Component - A1 Style
function AlarmListItem({ alarm, onToggle, onDelete, onTest, onEdit }: { alarm: Alarm; onToggle: () => void; onDelete: () => void; onTest: () => void; onEdit: () => void }) {
  const { time, period } = formatTime(alarm.time);
  const selectedDays = alarm.days ?? [1, 2, 3, 4, 5];
  const proofLabel = getProofTypeLabel(alarm.proofActivityType, alarm.activityName, alarm.stepGoal);
  const alarmAny = alarm as any;
  const extras = alarm.extraPunishments ?? [];

  // Check if alarm has stakes
  const money = alarm.punishment ?? 0;
  const hasMoneyStake = (alarmAny.moneyEnabled && money > 0) ||
    (!alarmAny.hasOwnProperty('moneyEnabled') && money > 0);
  const buddyName = alarmAny.buddyName || 'Buddy';

  // Check if alarm has ANY stakes (money or punishments)
  const hasStakes = hasMoneyStake ||
    alarmAny.shameVideoEnabled ||
    alarmAny.buddyNotifyEnabled ||
    alarmAny.socialShameEnabled ||
    alarmAny.emailBossEnabled ||
    alarmAny.tweetBadEnabled ||
    alarmAny.callBuddyEnabled ||
    alarmAny.textWifesDadEnabled ||
    alarmAny.textExEnabled ||
    alarmAny.momEnabled ||
    alarmAny.grandmaEnabled ||
    extras.includes('shame_video') ||
    extras.includes('buddy_call') ||
    extras.includes('group_chat');

  // Get stake text for chip
  const getStakeText = (): string | null => {
    if (!hasMoneyStake) return null;
    return `$${money} → ${buddyName}`;
  };

  const stakeText = getStakeText();

  // Get list of enabled punishments for display
  const getPunishmentParts = (): string[] => {
    const parts: string[] = [];

    if (alarmAny.shameVideoEnabled || extras.includes('shame_video')) {
      parts.push('Video');
    }
    if (alarmAny.buddyNotifyEnabled || extras.includes('buddy_call')) {
      parts.push('Buddy');
    }
    if (alarmAny.socialShameEnabled || extras.includes('group_chat')) {
      parts.push('Social');
    }
    if (alarmAny.antiCharityEnabled || extras.includes('donate_enemy')) {
      parts.push('Anti-charity');
    }
    if (alarmAny.emailBossEnabled) {
      parts.push('Email boss');
    }
    if (alarmAny.tweetBadEnabled) {
      parts.push('Tweet');
    }
    if (alarmAny.callBuddyEnabled) {
      parts.push('Call buddy');
    }
    if (alarmAny.textWifesDadEnabled) {
      parts.push("Wife's dad");
    }
    if (alarmAny.textExEnabled) {
      parts.push('Text ex');
    }
    if (alarmAny.momEnabled) {
      parts.push('Call mom');
    }
    if (alarmAny.grandmaEnabled) {
      parts.push('Call grandma');
    }

    return parts;
  };

  const punishmentParts = getPunishmentParts();

  return (
    <View style={[
      styles.alarmCard,
      { 
        opacity: alarm.enabled ? 1 : 0.5,
        borderColor: alarm.enabled && hasStakes ? 'rgba(251, 146, 60, 0.2)' : Colors.border,
      }
    ]}>
      {/* Row 1: Time + Toggle */}
      <View style={styles.cardRow1}>
        <View style={styles.alarmTimeRow}>
          <ThemedText style={styles.alarmTime}>{time}</ThemedText>
          <ThemedText style={styles.alarmPeriod}>{period}</ThemedText>
        </View>
        <Pressable
          style={[styles.toggle, { backgroundColor: alarm.enabled ? Colors.green : Colors.border }]}
          onPress={onToggle}
        >
          <View style={[
            styles.toggleKnobStatic,
            { transform: [{ translateX: alarm.enabled ? 20 : 0 }] }
          ]} />
        </Pressable>
      </View>

      {/* Row 2: Info chips */}
      <View style={styles.cardRow2}>
        {hasStakes ? (
          <>
            <View style={styles.chipDays}>
              <ThemedText style={styles.chipDaysText}>{getDaysDisplay(selectedDays)}</ThemedText>
            </View>
            {stakeText ? (
              <View style={styles.chipStake}>
                <ThemedText style={styles.chipStakeText}>{stakeText}</ThemedText>
              </View>
            ) : null}
            {/* Punishment chips */}
            {punishmentParts.map((p, i) => (
              <View key={i} style={styles.chipPunishment}>
                <ThemedText style={styles.chipPunishmentText}>{p}</ThemedText>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.chipMuted}>
              <ThemedText style={styles.chipMutedText}>{getDaysDisplay(selectedDays)}</ThemedText>
            </View>
            <View style={styles.chipMuted}>
              <ThemedText style={styles.chipMutedText}>No stakes</ThemedText>
            </View>
          </>
        )}
        {/* Always show proof type chip */}
        <View style={styles.chipProof}>
          <ThemedText style={styles.chipProofText}>{proofLabel}</ThemedText>
        </View>
      </View>

      {/* Row 3: Actions */}
      <View style={styles.cardRow3}>
        <Pressable style={styles.actionPill} onPress={onTest}>
          <Text style={{ fontSize: 14 }}>⚡</Text>
          <ThemedText style={styles.actionText}>Test</ThemedText>
        </Pressable>
        <Pressable style={styles.actionPill} onPress={onEdit}>
          <Text style={{ fontSize: 14 }}>✏️</Text>
          <ThemedText style={styles.actionText}>Edit</ThemedText>
        </Pressable>
        <Pressable style={styles.actionPillDanger} onPress={onDelete}>
          <Text style={{ fontSize: 14 }}>🗑️</Text>
          <ThemedText style={styles.actionTextDanger}>Delete</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

// Empty State Component
function EmptyState({ onAddAlarm }: { onAddAlarm: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconEmoji}>🔕</Text>
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
  const { alarms, loading, toggleAlarm, deleteAlarm, loadAlarms } = useAlarms();
  const [debugMode, setDebugMode] = useState(false);
  const [userName, setUserName] = useState('');

  useFocusEffect(
    useCallback(() => {
      // HARD STOP: Set current screen and kill any rogue alarm sounds
      setCurrentScreen('Home');
      killAllSounds();

      loadAlarms();
      const loadUserName = async () => {
        const name = await getUserName();
        setUserName(name);
      };
      loadUserName();

      // Check for interrupted alarms (user force-closed app during alarm)
      const checkForForceClose = async () => {
        const interrupted = await getInterruptedAlarm();
        if (interrupted) {
          if (__DEV__) console.log('[Home] Detected force-closed alarm:', interrupted.alarmId);

          // Get the alarm details to determine punishments
          const allAlarms = await loadAlarms();
          const alarm = allAlarms?.find((a: Alarm) => a.id === interrupted.alarmId);

          // Build punishment types from alarm settings
          const punishmentTypes: string[] = [];
          if (alarm) {
            const alarmAny = alarm as any;
            if (alarmAny.shameVideoEnabled) punishmentTypes.push('shame_video');
            if (alarmAny.emailBossEnabled) punishmentTypes.push('email_boss');
            if (alarmAny.tweetBadEnabled) punishmentTypes.push('tweet');
            if (alarmAny.callBuddyEnabled) punishmentTypes.push('call_buddy');
            if (alarmAny.momEnabled) punishmentTypes.push('call_mom');
            if (alarmAny.grandmaEnabled) punishmentTypes.push('call_grandma');
            if (alarmAny.textWifesDadEnabled) punishmentTypes.push('text_wife_dad');
            if (alarmAny.textExEnabled) punishmentTypes.push('text_ex');
            if (alarmAny.socialShameEnabled) punishmentTypes.push('social_shame');
            if (alarmAny.antiCharityEnabled) punishmentTypes.push('anti_charity');
          } else {
            // Default to shame video if we can't find the alarm
            punishmentTypes.push('shame_video');
          }

          const config = await getPunishmentConfig();
          const moneyEnabled = alarm ? ((alarm as any).moneyEnabled ?? true) : true;
          const moneyAmount = alarm?.punishment ?? 5;

          // Navigate directly to punishment execution
          navigation.navigate('PunishmentExecution', {
            alarmId: interrupted.alarmId,
            alarmLabel: interrupted.alarmLabel || 'Force-closed alarm',
            punishmentTypes,
            moneyEnabled,
            moneyAmount,
            shameVideoUri: interrupted.shameVideoUri,
            config: {
              bossEmail: config.email_boss?.bossEmail,
              momPhone: config.mom?.phoneNumber,
              grandmaPhone: config.grandma?.phoneNumber,
              wifesDadPhone: config.wife_dad?.phoneNumber,
              exPhone: config.text_ex?.exPhoneNumber,
            },
            wasForceClose: true, // Flag to show special message
          });

          // Clear the interrupted state so we don't trigger again
          await clearInterruptedAlarm();
        }
      };
      checkForForceClose();
    }, [loadAlarms, navigation])
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

  // Sort alarms chronologically for display
  const sortedAlarms = useMemo(() => sortAlarmsByTime(alarms), [alarms]);

  const nextAlarm = useMemo(() => {
    const enabledAlarms = alarms.filter(a => a.enabled);
    if (enabledAlarms.length === 0) return null;
    // Sort by time and return the earliest
    const sorted = sortAlarmsByTime(enabledAlarms);
    return sorted[0];
  }, [alarms]);

  const handleAddAlarm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddAlarm', { isOnboarding: true });
  }, [navigation]);

  const handleBuddyPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Buddy');
  }, [navigation]);

  const handleToggleAlarm = useCallback(
    (id: string) => {
      return () => {
        if (__DEV__) console.log('[Home] Toggling alarm:', id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleAlarm(id);
      };
    },
    [toggleAlarm]
  );

  const handleDeleteAlarm = useCallback(
    async (id: string) => {
      if (__DEV__) console.log('[Home] Deleting alarm:', id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteAlarm(id);
    },
    [deleteAlarm]
  );

  const handleTestAlarm = useCallback(
    (alarm: Alarm) => {
      return () => {
        if (__DEV__) console.log('[Home] Testing alarm:', alarm.id, alarm.label);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        navigation.navigate('AlarmRinging', {
          alarmId: alarm.id,
          alarmLabel: alarm.label || 'Test Alarm',
          referencePhotoUri: alarm.referencePhotoUri || '',
          shameVideoUri: alarm.shameVideoUri || '',
        });
      };
    },
    [navigation]
  );

  const handleEditAlarm = useCallback(
    (alarm: Alarm) => {
      return () => {
        if (__DEV__) console.log('[Home] Editing alarm:', alarm.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('AddAlarm', {
          isOnboarding: false,
          editAlarmId: alarm.id,
        });
      };
    },
    [navigation]
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
      <BackgroundGlow color="orange" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Header
            type="home"
            greeting={getGreeting()}
            name={userName || 'You'}
          />
        </View>

        {nextAlarm ? (
          <>
            <FadeInView delay={100} direction="up">
              <NextAlarmCard alarm={nextAlarm} />
            </FadeInView>
            <FadeInView delay={200} direction="up">
              <StatsRow onBuddyPress={handleBuddyPress} />
            </FadeInView>
            <FadeInView delay={300} direction="up">
              <SectionHeader onAddPress={handleAddAlarm} />
            </FadeInView>
            {sortedAlarms.map((alarm, index) => (
              <AnimatedCard
                key={alarm.id}
                index={index}
                delayBase={350}
                delayIncrement={60}
                direction="up"
              >
                <AlarmListItem
                  alarm={alarm}
                  onToggle={handleToggleAlarm(alarm.id)}
                  onDelete={() => handleDeleteAlarm(alarm.id)}
                  onTest={handleTestAlarm(alarm)}
                  onEdit={handleEditAlarm(alarm)}
                />
              </AnimatedCard>
            ))}

          </>
        ) : (
          <>
            <FadeInView delay={100} direction="up">
              <StatsRow onBuddyPress={handleBuddyPress} />
            </FadeInView>
            <FadeInView delay={200} direction="up">
              <EmptyState onAddAlarm={handleAddAlarm} />
            </FadeInView>
          </>
        )}
      </ScrollView>

      <BottomNav activeTab="alarms" />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Header
  headerContainer: {
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
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginTop: 8,
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
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
    lineHeight: 56,
  },
  nextAlarmPeriod: {
    fontSize: 20,
    color: '#78716C',
    marginLeft: 8,
    lineHeight: 24,
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
  proofBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  proofBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22C55E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stakesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  stakeBox: {
    flex: 1,
    backgroundColor: Colors.border,
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
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  statCardDashed: {
    borderStyle: 'dashed',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#78716C',
  },
  statValueGray: {
    fontSize: 22,
    fontWeight: '700',
    color: '#57534E',
    letterSpacing: 0.5,
    lineHeight: 28,
  },
  statSubLabel: {
    fontSize: 12,
    color: '#57534E',
    marginTop: 2,
    lineHeight: 16,
  },
  addBuddyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
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
    backgroundColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FAFAF9',
  },

  // Alarm Card - A1 Style
  alarmCard: {
    backgroundColor: 'rgba(28, 25, 23, 0.8)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  alarmTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  alarmTime: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FAFAF9',
    lineHeight: 42,
  },
  alarmPeriod: {
    fontSize: 18,
    fontWeight: '500',
    color: '#78716C',
  },

  // Toggle
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
  },
  toggleKnobStatic: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FAFAF9',
  },

  // Row 2 - Info chips
  cardRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipDays: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderRadius: 8,
  },
  chipDaysText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FB923C',
  },
  chipStake: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
  },
  chipStakeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  chipPunishment: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
  },
  chipPunishmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.red,
  },
  chipProof: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 8,
  },
  chipProofText: {
    fontSize: 13,
    color: '#A8A29E',
  },
  chipMuted: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderRadius: 8,
  },
  chipMutedText: {
    fontSize: 13,
    color: '#57534E',
  },

  // Row 3 - Actions
  cardRow3: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#3a3533',
    borderRadius: 10,
  },
  actionPillDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A8A29E',
  },
  actionTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Day Pills (kept for other uses)
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
    backgroundColor: Colors.border,
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
    borderTopColor: Colors.bgElevated,
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
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconEmoji: {
    fontSize: 48,
    textAlign: 'center',
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
