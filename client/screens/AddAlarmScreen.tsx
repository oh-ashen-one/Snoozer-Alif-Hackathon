import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  hapticForPunishment,
  getPunishmentLevel,
  selectionChanged,
  buttonPress,
  alarmCreatedPattern,
} from '@/utils/haptics';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import { AnimatedPressable } from '@/components/AnimatedPressable';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddAlarm'>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PUNISHMENT_OPTIONS = [0, 1, 2, 5, 10];

const EXTRA_PUNISHMENT_OPTIONS = [
  { id: 'shame_video', label: 'Shame video plays', description: 'At max volume', icon: '🎬', color: '#EF4444' },
  { id: 'buddy_call', label: 'Auto-call your buddy', description: 'Jake gets woken up too', icon: '📞', color: '#FB923C' },
  { id: 'group_chat', label: 'Text the group chat', description: '"The boys" on iMessage', icon: '💬', color: '#7C3AED' },
  { id: 'wife_dad', label: "Text your wife's dad", description: '"Hey Robert, quick question"', icon: '👴', color: '#EF4444' },
  { id: 'mom', label: 'Auto-call your mom', description: "At 6am. She'll be worried.", icon: '👩', color: '#EC4899' },
  { id: 'linkedin', label: 'Post on LinkedIn', description: '"I overslept again. Hiring?"', icon: '💼', color: '#0A66C2' },
  { id: 'text_ex', label: 'Text your ex "I miss u"', description: 'From your actual number', icon: '💔', color: '#EF4444' },
  { id: 'like_ex_photo', label: "Like your ex's old photo", description: "From 2019. They'll know.", icon: '📸', color: '#E4405F' },
  { id: 'donate_enemy', label: 'Donate to a party you hate', description: 'Opposite of your politics', icon: '🗳️', color: '#EF4444' },
  { id: 'email_boss', label: 'Email your boss', description: '"Running late again, sorry"', icon: '📧', color: '#EA4335' },
  { id: 'venmo_ex', label: 'Venmo your ex $1', description: 'With memo: "thinking of u"', icon: '💸', color: '#008CFF' },
  { id: 'slack_company', label: 'Post in #general', description: '"I couldn\'t wake up today"', icon: '🏢', color: '#4A154B' },
  { id: 'grandma_call', label: 'Auto-call your grandma', description: 'She WILL answer at 6am', icon: '👵', color: '#EC4899' },
  { id: 'tinder_bio', label: 'Update Tinder bio', description: '"Can\'t even wake up on time"', icon: '🔥', color: '#FE3C72' },
  { id: 'thermostat', label: 'Drop thermostat to 55°F', description: 'Smart home integration', icon: '🥶', color: '#22C55E' },
  { id: 'book_dentist', label: 'Book a dentist appointment', description: 'For next week. Auto-confirmed.', icon: '🦷', color: '#78716C' },
];

// Icons
const FlameIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C12 2 7 7 7 12C7 14.5 8.5 17 12 17C15.5 17 17 14.5 17 12C17 9 14 6 14 6C14 6 14 9 12 11C10 9 10 6 12 2Z"
      fill="rgba(251, 146, 60, 0.2)"
    />
    <Path
      d="M12 2C12 2 7 7 7 12C7 14.5 8.5 17 12 17C15.5 17 17 14.5 17 12C17 9 14 6 14 6C14 6 14 9 12 11C10 9 10 6 12 2Z"
      stroke="#FB923C"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronUp = ({ color = '#78716C' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 15L12 9L6 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDown = ({ color = '#78716C' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ArrowIcon = ({ color = '#FAFAF9' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const WarningIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke="#EF4444" strokeWidth={2} fill="rgba(239, 68, 68, 0.1)" />
    <Path d="M12 7V13" stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" />
    <Circle cx={12} cy={16.5} r={1.25} fill="#EF4444" />
  </Svg>
);

const CheckIcon = ({ color = '#FAFAF9' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5L10 17.5L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function AddAlarmScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isOnboarding = route.params?.isOnboarding ?? true;

  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectedDays, setSelectedDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [punishment, setPunishment] = useState(1);
  const [extraPunishments, setExtraPunishments] = useState<string[]>(['shame_video']);
  const [showAllPunishments, setShowAllPunishments] = useState(false);

  const incrementHour = useCallback(() => {
    selectionChanged();
    setHour(h => (h === 12 ? 1 : h + 1));
  }, []);

  const decrementHour = useCallback(() => {
    selectionChanged();
    setHour(h => (h === 1 ? 12 : h - 1));
  }, []);

  const incrementMinute = useCallback(() => {
    selectionChanged();
    setMinute(m => (m === 55 ? 0 : m + 5));
  }, []);

  const decrementMinute = useCallback(() => {
    selectionChanged();
    setMinute(m => (m === 0 ? 55 : m - 5));
  }, []);

  const toggleDay = useCallback((day: string) => {
    buttonPress('secondary');
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        if (prev.length > 1) {
          return prev.filter(d => d !== day);
        }
        return prev;
      }
      return [...prev, day];
    });
  }, []);

  const togglePeriod = useCallback((p: 'AM' | 'PM') => {
    if (p !== period) {
      buttonPress('secondary');
      setPeriod(p);
    }
  }, [period]);

  const toggleExtraPunishment = useCallback((id: string) => {
    const hasShameVideo = id === 'shame_video' ? !extraPunishments.includes(id) : extraPunishments.includes('shame_video');
    const level = getPunishmentLevel(punishment, hasShameVideo);
    hapticForPunishment(level);
    setExtraPunishments(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }, [punishment, extraPunishments]);

  const formatMinute = (m: number) => m.toString().padStart(2, '0');

  const handleContinue = () => {
    const hasShameVideo = extraPunishments.includes('shame_video');
    const level = getPunishmentLevel(punishment, hasShameVideo);
    alarmCreatedPattern(level);
    const hour24 = period === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const timeString = `${hour24.toString().padStart(2, '0')}:${formatMinute(minute)}`;
    const dayIndices = selectedDays.map(day => DAYS.indexOf(day));

    navigation.navigate('ReferencePhoto', {
      alarmTime: timeString,
      alarmLabel: 'Wake up',
      isOnboarding,
      punishment,
      extraPunishments,
      days: dayIndices,
    });
  };

  const visiblePunishments = showAllPunishments
    ? EXTRA_PUNISHMENT_OPTIONS
    : EXTRA_PUNISHMENT_OPTIONS.slice(0, 4);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Dots */}
        <FadeInView delay={50} direction="up">
          <View style={styles.progressDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dotInactive} />
          </View>
        </FadeInView>

        {/* Header */}
        <FadeInView delay={100} direction="up">
          <View style={styles.header}>
            <View style={styles.pillBadge}>
              <FlameIcon />
              <Text style={styles.pillText}>Wake up on time</Text>
            </View>
            <Text style={styles.title}>Set your first alarm</Text>
            <Text style={styles.subtitle}>When do you need to wake up?</Text>
          </View>
        </FadeInView>

        {/* Time Picker */}
        <FadeInView delay={150} direction="up">
          <View style={styles.timePickerCard}>
          <View style={styles.timePickerRow}>
            {/* Hour */}
            <View style={styles.timeColumn}>
              <Pressable style={styles.chevronButton} onPress={incrementHour}>
                <ChevronUp />
              </Pressable>
              <Text style={styles.timeText}>{hour}</Text>
              <Pressable style={styles.chevronButton} onPress={decrementHour}>
                <ChevronDown />
              </Pressable>
            </View>

            <Text style={styles.colon}>:</Text>

            {/* Minute */}
            <View style={styles.timeColumn}>
              <Pressable style={styles.chevronButton} onPress={incrementMinute}>
                <ChevronUp />
              </Pressable>
              <Text style={styles.timeText}>{formatMinute(minute)}</Text>
              <Pressable style={styles.chevronButton} onPress={decrementMinute}>
                <ChevronDown />
              </Pressable>
            </View>

            {/* AM/PM */}
            <View style={styles.periodContainer}>
              <Pressable
                style={[styles.periodButton, period === 'AM' && styles.periodButtonActive]}
                onPress={() => togglePeriod('AM')}
              >
                <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
              </Pressable>
              <Pressable
                style={[styles.periodButton, period === 'PM' && styles.periodButtonActive]}
                onPress={() => togglePeriod('PM')}
              >
                <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </FadeInView>

        {/* Days */}
        <FadeInView delay={200} direction="up">
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>REPEAT</Text>
            <View style={styles.daysRow}>
              {DAYS.map(day => {
                const isSelected = selectedDays.includes(day);
                return (
                  <Pressable
                    key={day}
                    style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                      {day.charAt(0)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </FadeInView>

        {/* Money Punishment */}
        <FadeInView delay={250} direction="up">
          <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <WarningIcon />
            <Text style={styles.sectionLabel}>IF YOU SNOOZE, YOU PAY</Text>
          </View>
          <View style={styles.punishmentRow}>
            {PUNISHMENT_OPTIONS.map(amount => {
              const isSelected = punishment === amount;
              const isLater = amount === 0;
              return (
                <Pressable
                  key={amount}
                  style={[
                    styles.punishmentButton,
                    isLater && styles.punishmentButtonLater,
                    isSelected && (isLater ? styles.punishmentButtonLaterSelected : styles.punishmentButtonSelected),
                  ]}
                  onPress={() => {
                    const hasShameVideo = extraPunishments.includes('shame_video');
                    const level = getPunishmentLevel(amount, hasShameVideo);
                    hapticForPunishment(level);
                    setPunishment(amount);
                  }}
                >
                  <Text
                    style={[
                      styles.punishmentText,
                      isLater && styles.punishmentTextLater,
                      isSelected && (isLater ? styles.punishmentTextLaterSelected : styles.punishmentTextSelected),
                    ]}
                  >
                    {isLater ? 'Later' : `$${amount}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>
            {punishment === 0 ? 'You can add payment stakes in settings anytime' : 'Higher stakes = stronger motivation'}
          </Text>
          </View>
        </FadeInView>

        {/* Extra Consequences */}
        <FadeInView delay={300} direction="up">
          <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXTRA CONSEQUENCES (OPTIONAL)</Text>
          <View style={styles.consequencesList}>
            {visiblePunishments.map(option => {
              const isSelected = extraPunishments.includes(option.id);
              return (
                <Pressable
                  key={option.id}
                  style={[
                    styles.consequenceItem,
                    isSelected && { backgroundColor: `${option.color}15`, borderColor: `${option.color}40` },
                  ]}
                  onPress={() => toggleExtraPunishment(option.id)}
                >
                  <View style={[styles.consequenceIcon, isSelected && { backgroundColor: `${option.color}20` }]}>
                    <Text style={styles.consequenceEmoji}>{option.icon}</Text>
                  </View>
                  <View style={styles.consequenceText}>
                    <Text style={[styles.consequenceLabel, isSelected && styles.consequenceLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.consequenceDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && { backgroundColor: option.color, borderWidth: 0 }]}>
                    {isSelected && <CheckIcon />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.showMoreButton}
            onPress={() => {
              buttonPress('secondary');
              setShowAllPunishments(!showAllPunishments);
            }}
          >
            <Text style={styles.showMoreText}>
              {showAllPunishments ? 'Show less' : `Show ${EXTRA_PUNISHMENT_OPTIONS.length - 4} more unhinged options 😈`}
            </Text>
          </Pressable>

          <Text style={styles.helperText}>The more consequences, the more likely you'll get up</Text>
          </View>
        </FadeInView>

        {/* Summary Card */}
        <FadeInView delay={350} direction="up">
          <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryLabel}>Your alarm</Text>
              <Text style={styles.summaryValue}>
                {hour}:{formatMinute(minute)} {period} · {selectedDays.length} days
              </Text>
            </View>
            <View style={[styles.moneyBadge, punishment === 0 && styles.moneyBadgeGray]}>
              <Text style={[styles.moneyBadgeText, punishment === 0 && styles.moneyBadgeTextGray]}>
                {punishment === 0 ? 'No $ set' : `-$${punishment}`}
              </Text>
            </View>
          </View>

          {extraPunishments.length > 0 && (
            <View style={styles.selectedPunishments}>
              {extraPunishments.map(id => {
                const option = EXTRA_PUNISHMENT_OPTIONS.find(o => o.id === id);
                if (!option) return null;
                return (
                  <View key={id} style={[styles.punishmentPill, { backgroundColor: `${option.color}15` }]}>
                    <Text style={styles.punishmentPillIcon}>{option.icon}</Text>
                    <Text style={[styles.punishmentPillText, { color: option.color }]}>{option.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
          </View>
        </FadeInView>

        {/* Continue Button */}
        <FadeInView delay={400} direction="up">
          <Pressable testID="button-continue" style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
            <ArrowIcon />
          </Pressable>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.xl,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.orange,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  timePickerCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  timeColumn: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chevronButton: {
    width: 48,
    height: 44,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 64,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 80,
    textAlign: 'center',
  },
  colon: {
    fontSize: 56,
    fontWeight: '300',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  periodContainer: {
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  periodButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.sm,
  },
  periodButtonActive: {
    backgroundColor: Colors.orange,
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodTextActive: {
    color: Colors.text,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayPillSelected: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dayTextSelected: {
    color: Colors.orange,
  },
  punishmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  punishmentButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  punishmentButtonLater: {
    flex: 1.2,
  },
  punishmentButtonSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  punishmentButtonLaterSelected: {
    backgroundColor: 'rgba(120, 113, 108, 0.15)',
    borderColor: 'rgba(120, 113, 108, 0.4)',
  },
  punishmentText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  punishmentTextLater: {
    fontSize: 13,
    fontWeight: '600',
  },
  punishmentTextSelected: {
    color: Colors.red,
  },
  punishmentTextLaterSelected: {
    color: Colors.textSecondary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  consequencesList: {
    gap: Spacing.sm,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  consequenceIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  consequenceEmoji: {
    fontSize: 20,
  },
  consequenceText: {
    flex: 1,
  },
  consequenceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  consequenceLabelSelected: {
    color: Colors.text,
  },
  consequenceDescription: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: '#3F3A36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreButton: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  moneyBadge: {
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.pill,
  },
  moneyBadgeGray: {
    backgroundColor: 'rgba(120, 113, 108, 0.1)',
  },
  moneyBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.red,
  },
  moneyBadgeTextGray: {
    color: Colors.textSecondary,
  },
  selectedPunishments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  punishmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
  },
  punishmentPillIcon: {
    fontSize: 12,
  },
  punishmentPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
