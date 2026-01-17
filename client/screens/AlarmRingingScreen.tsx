import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmRinging'>;

type SnoozeState = 'idle' | 'confirm' | 'input';

const SNOOZE_CONFIRMATION = 'I FAIL';

// Camera Icon
const CameraIcon = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={6} width={20} height={14} rx={3} stroke="#22C55E" strokeWidth={2} fill="rgba(34, 197, 94, 0.1)" />
    <Circle cx={12} cy={13} r={4} stroke="#22C55E" strokeWidth={2} />
    <Path d="M7 6V5C7 4.44772 7.44772 4 8 4H10L11 6" stroke="#22C55E" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Flame Icon for streak badge
const FlameIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C12 2 7 7 7 12C7 14.5 8.5 17 12 17C15.5 17 17 14.5 17 12C17 9 14 6 14 6C14 6 14 9 12 11C10 9 10 6 12 2Z"
      fill="rgba(251, 146, 60, 0.3)"
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

export default function AlarmRingingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, alarmLabel, referencePhotoUri, shameVideoUri } = route.params;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [snoozeState, setSnoozeState] = useState<SnoozeState>('idle');
  const [snoozeInput, setSnoozeInput] = useState('');
  const [streak] = useState(12); // TODO: Get from storage

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return {
      time: `${displayHours}:${minutes.toString().padStart(2, '0')}`,
      period,
    };
  };

  const { time, period } = formatTime(currentTime);

  const handleTakePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('ProofCamera', {
      alarmId,
      referencePhotoUri,
    });
  };

  const handleSnoozePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (snoozeState === 'idle') {
      setSnoozeState('confirm');
    } else if (snoozeState === 'confirm') {
      setSnoozeState('input');
      setSnoozeInput('');
    }
  };

  const handleSnoozeInputChange = (text: string) => {
    setSnoozeInput(text);

    if (text.toUpperCase() === SNOOZE_CONFIRMATION) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      navigation.navigate('ShamePlayback', {
        alarmId,
        shameVideoUri,
        alarmLabel,
        referencePhotoUri,
      });
    }
  };

  const handleCancelSnooze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSnoozeState('idle');
    setSnoozeInput('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing['2xl'] }]}>
      {/* Streak Badge */}
      <View style={styles.streakBadge}>
        <FlameIcon />
        <Text style={styles.streakText}>{streak} day streak</Text>
      </View>

      {/* Time Display */}
      <View style={styles.timeContainer}>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.period}>{period}</Text>
        </View>
        <Text style={styles.wakeUpText}>Time to wake up</Text>
      </View>

      {/* Hero Card */}
      <View style={styles.heroCard}>
        <CameraIcon />
        <Text style={styles.heroTitle}>Prove you're up</Text>
        <Pressable style={styles.heroButton} onPress={handleTakePhoto}>
          <Text style={styles.heroButtonText}>Take Photo & Dismiss</Text>
        </Pressable>
      </View>

      {/* Divider with "or" */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Snooze Section */}
      <View style={[styles.snoozeContainer, { paddingBottom: insets.bottom + Spacing['3xl'] }]}>
        {snoozeState === 'idle' && (
          <Pressable style={styles.snoozeButton} onPress={handleSnoozePress}>
            <Text style={styles.snoozeButtonText}>Snooze</Text>
          </Pressable>
        )}

        {snoozeState === 'confirm' && (
          <View style={styles.snoozeConfirmContainer}>
            <Pressable style={styles.snoozeConfirmButton} onPress={handleSnoozePress}>
              <Text style={styles.snoozeConfirmText}>Are you sure?</Text>
            </Pressable>
            <Pressable onPress={handleCancelSnooze}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {snoozeState === 'input' && (
          <View style={styles.snoozeInputContainer}>
            <Text style={styles.snoozeInputLabel}>Type "I FAIL" to snooze</Text>
            <TextInput
              style={styles.snoozeInput}
              value={snoozeInput}
              onChangeText={handleSnoozeInputChange}
              placeholder="I FAIL"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoFocus
              autoCorrect={false}
            />
            <Pressable onPress={handleCancelSnooze}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.xl,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
  },
  timeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  time: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.text,
  },
  period: {
    fontSize: 24,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  wakeUpText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  heroCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  heroButton: {
    width: '100%',
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  heroButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
  },
  snoozeContainer: {
    alignItems: 'center',
  },
  snoozeButton: {
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  snoozeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  snoozeConfirmContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  snoozeConfirmButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
  },
  snoozeConfirmText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.red,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  snoozeInputContainer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
  },
  snoozeInputLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  snoozeInput: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 4,
  },
});
