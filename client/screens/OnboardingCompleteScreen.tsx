import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { useAlarms } from '@/hooks/useAlarms';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { setOnboardingComplete } from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingComplete'>;

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function OnboardingCompleteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { 
    alarmTime, 
    alarmLabel, 
    referencePhotoUri, 
    shameVideoUri, 
    punishment, 
    extraPunishments, 
    days,
    proofActivityType,
    activityName,
    moneyEnabled,
    shameVideoEnabled,
    buddyNotifyEnabled,
    socialShameEnabled,
    antiCharityEnabled,
    escalatingVolume,
    wakeRecheck,
  } = route.params;
  const { addAlarm } = useAlarms();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withDelay(100, withSpring(1.1, { damping: 8 })),
      withSpring(1, { damping: 12 })
    );
    opacity.value = withDelay(200, withSpring(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [scale, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleDone = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save the alarm locally with all per-alarm settings
    await addAlarm({
      time: alarmTime,
      label: alarmLabel,
      enabled: true,
      referencePhotoUri,
      shameVideoUri,
      punishment,
      extraPunishments,
      days,
      // Per-alarm proof settings
      proofActivityType: proofActivityType || 'photo_activity',
      activityName: activityName || alarmLabel,
      stepGoal: proofActivityType === 'steps' ? 50 : 10,
      // Per-alarm punishment toggles
      moneyEnabled: moneyEnabled ?? true,
      shameVideoEnabled: shameVideoEnabled ?? true,
      buddyNotifyEnabled: buddyNotifyEnabled ?? true,
      socialShameEnabled: socialShameEnabled ?? false,
      antiCharityEnabled: antiCharityEnabled ?? false,
      // Per-alarm escalation settings
      escalatingVolume: escalatingVolume ?? true,
      wakeRecheck: wakeRecheck ?? true,
    });

    // Mark onboarding as complete and go to Home
    await setOnboardingComplete(true);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };

  const formattedTime = formatTime(alarmTime);
  const hasReferencePhoto = referencePhotoUri && referencePhotoUri.length > 0;
  const hasShameVideo = shameVideoUri && shameVideoUri.length > 0;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 48 }]}>
      <BackgroundGlow color="green" />
      <View style={styles.content}>
        {/* Success icon */}
        <Animated.View style={[styles.successIcon, iconStyle]}>
          <Text style={{ fontSize: 40 }}>✓</Text>
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentStyle]}>
          {/* Title */}
          <ThemedText style={styles.title}>You're all set!</ThemedText>
          <ThemedText style={styles.subtitle}>
            Your accountability alarm is ready
          </ThemedText>

          {/* Summary card */}
          <View style={styles.summaryCard}>
            {/* Alarm time row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <ThemedText style={styles.summaryEmoji}>⏰</ThemedText>
                <ThemedText style={styles.summaryTime}>{formattedTime}</ThemedText>
              </View>
              <View style={styles.weekdaysPill}>
                <ThemedText style={styles.weekdaysText}>Weekdays</ThemedText>
              </View>
            </View>

            {/* Proof location row */}
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryEmoji}>📍</ThemedText>
              <ThemedText style={styles.summaryText}>
                {hasReferencePhoto ? 'Proof location saved' : 'No proof location'}
              </ThemedText>
            </View>

            {/* Shame video row */}
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryEmoji}>🎬</ThemedText>
              <ThemedText style={styles.summaryText}>
                {hasShameVideo ? 'Shame video ready' : 'No shame video'}
              </ThemedText>
            </View>
          </View>

          {/* Motivation text */}
          <View style={styles.motivationContainer}>
            <ThemedText style={styles.motivationText}>
              🔥 Day 1 starts tomorrow
            </ThemedText>
          </View>
        </Animated.View>
      </View>

      {/* Bottom buttons */}
      <Animated.View style={[styles.bottomContainer, contentStyle]}>
        <Pressable testID="button-lets-go" style={styles.greenButton} onPress={handleDone}>
          <ThemedText style={styles.greenButtonText}>Let's go</ThemedText>
          <Text style={{ fontSize: 20 }}>→</Text>
        </Pressable>

        <Pressable style={styles.inviteLink}>
          <ThemedText style={styles.inviteLinkText}>Invite a buddy</ThemedText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Success icon
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },

  // Text
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },

  // Summary card
  summaryCard: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    gap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryEmoji: {
    fontSize: 18,
    marginRight: Spacing.md,
  },
  summaryTime: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  weekdaysPill: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 100,
  },
  weekdaysText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.orange,
  },

  // Motivation
  motivationContainer: {
    marginBottom: Spacing.lg,
  },
  motivationText: {
    fontSize: 14,
    color: Colors.orange,
    fontWeight: '500',
  },

  // Bottom
  bottomContainer: {
    width: '100%',
    gap: Spacing.lg,
  },
  greenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: 18,
    backgroundColor: Colors.green,
    borderRadius: 14,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  greenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  inviteLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  inviteLinkText: {
    fontSize: 14,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
