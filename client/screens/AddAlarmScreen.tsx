import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddAlarm'>;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ITEM_HEIGHT = 50;

export default function AddAlarmScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isOnboarding = route.params?.isOnboarding ?? true;

  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  const handleHourScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const hour = HOURS[Math.min(Math.max(index, 0), HOURS.length - 1)];
    if (hour !== selectedHour) {
      setSelectedHour(hour);
      Haptics.selectionAsync();
    }
  }, [selectedHour]);

  const handleMinuteScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const minute = MINUTES[Math.min(Math.max(index, 0), MINUTES.length - 1)];
    if (minute !== selectedMinute) {
      setSelectedMinute(minute);
      Haptics.selectionAsync();
    }
  }, [selectedMinute]);

  const toggleDay = useCallback((dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  }, []);

  const togglePeriod = useCallback((pm: boolean) => {
    if (pm !== isPM) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsPM(pm);
    }
  }, [isPM]);

  const getTimeString = () => {
    const hour = selectedHour.toString().padStart(2, '0');
    const minute = selectedMinute.toString().padStart(2, '0');
    return `${hour}:${minute} ${isPM ? 'PM' : 'AM'}`;
  };

  const getDaysString = () => {
    if (selectedDays.length === 0) return 'No days selected';
    if (selectedDays.length === 7) return 'Every day';
    if (JSON.stringify(selectedDays) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays';
    if (JSON.stringify(selectedDays) === JSON.stringify([0, 6])) return 'Weekends';
    return selectedDays.map(d => DAYS[d]).join(', ');
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hour24 = isPM ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour);
    const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;

    navigation.navigate('ReferencePhoto', {
      alarmTime: timeString,
      alarmLabel: 'Wake up',
      isOnboarding,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Dots */}
        <View style={styles.progressDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Pill Badge */}
        <View style={styles.pillBadge}>
          <ThemedText style={styles.pillText}>🔥 Wake up on time</ThemedText>
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>Set your first alarm</ThemedText>

        {/* Time Picker Card */}
        <View style={styles.timePickerCard}>
          <View style={styles.timePickerRow}>
            {/* Hour Scroll */}
            <View style={styles.scrollColumn}>
              <ScrollView
                ref={hourScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleHourScroll}
                contentContainerStyle={styles.scrollContent}
              >
                {HOURS.map((hour) => (
                  <Pressable
                    key={`hour-${hour}`}
                    style={styles.scrollItem}
                    onPress={() => {
                      setSelectedHour(hour);
                      hourScrollRef.current?.scrollTo({ y: (hour - 1) * ITEM_HEIGHT, animated: true });
                      Haptics.selectionAsync();
                    }}
                  >
                    <ThemedText style={[
                      styles.scrollItemText,
                      selectedHour === hour && styles.scrollItemTextActive
                    ]}>
                      {hour.toString().padStart(2, '0')}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Colon */}
            <ThemedText style={styles.colon}>:</ThemedText>

            {/* Minute Scroll */}
            <View style={styles.scrollColumn}>
              <ScrollView
                ref={minuteScrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={handleMinuteScroll}
                contentContainerStyle={styles.scrollContent}
              >
                {MINUTES.map((minute) => (
                  <Pressable
                    key={`minute-${minute}`}
                    style={styles.scrollItem}
                    onPress={() => {
                      setSelectedMinute(minute);
                      minuteScrollRef.current?.scrollTo({ y: minute * ITEM_HEIGHT, animated: true });
                      Haptics.selectionAsync();
                    }}
                  >
                    <ThemedText style={[
                      styles.scrollItemText,
                      selectedMinute === minute && styles.scrollItemTextActive
                    ]}>
                      {minute.toString().padStart(2, '0')}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM Toggle */}
            <View style={styles.periodToggle}>
              <Pressable
                style={[styles.periodButton, !isPM && styles.periodButtonActive]}
                onPress={() => togglePeriod(false)}
              >
                <ThemedText style={[
                  styles.periodText,
                  !isPM && styles.periodTextActive
                ]}>
                  AM
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.periodButton, isPM && styles.periodButtonActive]}
                onPress={() => togglePeriod(true)}
              >
                <ThemedText style={[
                  styles.periodText,
                  isPM && styles.periodTextActive
                ]}>
                  PM
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Day Pills */}
        <View style={styles.dayPillsRow}>
          {DAYS.map((day, index) => {
            const isSelected = selectedDays.includes(index);
            return (
              <Pressable
                key={`day-${index}`}
                style={[styles.dayPill, isSelected && styles.dayPillSelected]}
                onPress={() => toggleDay(index)}
              >
                <ThemedText style={[
                  styles.dayPillText,
                  isSelected && styles.dayPillTextSelected
                ]}>
                  {day}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryLabel}>Your alarm</ThemedText>
          <ThemedText style={styles.summaryValue}>
            {getTimeString()} · {getDaysString()}
          </ThemedText>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + Spacing['3xl'] }]}>
        <Button onPress={handleContinue}>
          Continue
        </Button>
      </View>
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
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.orange,
  },
  pillBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    marginBottom: Spacing.lg,
  },
  pillText: {
    color: Colors.orange,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  timePickerCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollColumn: {
    height: ITEM_HEIGHT * 3,
    width: 70,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  scrollItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollItemText: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  scrollItemTextActive: {
    color: Colors.text,
  },
  colon: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  periodToggle: {
    marginLeft: Spacing.lg,
    gap: Spacing.xs,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
    color: Colors.bgCard,
  },
  dayPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dayPill: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayPillSelected: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  dayPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dayPillTextSelected: {
    color: Colors.orange,
  },
  summaryCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
