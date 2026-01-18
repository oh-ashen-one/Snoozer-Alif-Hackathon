import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Vibration, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Pedometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'StepMission'>;

const STEP_GOAL = 10;
const SHAKE_THRESHOLD = 5;

const isWeb = Platform.OS === 'web';

export default function StepMissionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, referencePhotoUri, onComplete } = route.params;

  const [steps, setSteps] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [shakeWarning, setShakeWarning] = useState(false);
  const [lastStepCount, setLastStepCount] = useState(0);
  const [lastStepTime, setLastStepTime] = useState(Date.now());

  const progressWidth = useSharedValue(0);
  const circleScale = useSharedValue(1);

  useEffect(() => {
    progressWidth.value = withSpring(Math.min(steps / STEP_GOAL, 1) * 100, {
      damping: 15,
      stiffness: 100,
    });
  }, [steps, progressWidth]);

  useEffect(() => {
    if (isWeb) {
      console.log('[StepMission] Pedometer not available on web');
      return;
    }

    let subscription: { remove: () => void } | null = null;

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();

      if (!isAvailable) {
        console.warn('[StepMission] Pedometer not available on this device');
        return;
      }

      subscription = Pedometer.watchStepCount((result) => {
        const now = Date.now();
        const timeDiff = (now - lastStepTime) / 1000;
        const stepDiff = result.steps - lastStepCount;

        if (stepDiff > SHAKE_THRESHOLD && timeDiff < 1) {
          setShakeWarning(true);
          Vibration.vibrate(500);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setTimeout(() => setShakeWarning(false), 2000);
          return;
        }

        setLastStepTime(now);
        setLastStepCount(result.steps);
        setSteps(prev => {
          const newSteps = prev + stepDiff;
          if (newSteps >= STEP_GOAL && !isComplete) {
            setIsComplete(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Vibration.vibrate(200);
          }
          return newSteps;
        });
      });
    };

    subscribe();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [lastStepTime, lastStepCount, isComplete]);

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onComplete === 'ProofCamera') {
      navigation.navigate('ProofCamera', {
        alarmId,
        referencePhotoUri,
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, alarmId, referencePhotoUri, onComplete]);

  const handleDevSkip = useCallback(() => {
    setIsComplete(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  if (isComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="green" />
        <Animated.View 
          style={styles.content}
          entering={FadeIn.duration(400)}
        >
          <View style={styles.successIcon}>
            <Feather name="check" size={64} color={Colors.green} />
          </View>
          <ThemedText style={styles.title}>Mission Complete</ThemedText>
          <ThemedText style={styles.subtitle}>You're moving. Good.</ThemedText>
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable style={styles.primaryButton} onPress={handleContinue}>
            <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
            <Feather name="arrow-right" size={20} color={Colors.bg} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.content}>
        <View style={styles.missionIcon}>
          <Feather name="navigation" size={48} color={Colors.orange} />
        </View>
        <ThemedText style={styles.title}>Walk {STEP_GOAL} Steps</ThemedText>

        <Animated.View style={[styles.stepCircle, circleStyle]}>
          <ThemedText style={styles.stepCount}>{steps}</ThemedText>
          <ThemedText style={styles.stepLabel}>/ {STEP_GOAL} steps</ThemedText>
        </Animated.View>

        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, progressStyle]} />
        </View>

        {shakeWarning ? (
          <View style={styles.warningContainer}>
            <Feather name="alert-circle" size={18} color={Colors.red} />
            <ThemedText style={styles.warningText}>Nice try. Walk, don't shake.</ThemedText>
          </View>
        ) : (
          <ThemedText style={styles.subtitle}>
            Get out of bed. Walk to your wake-up spot.{'\n'}No cheating.
          </ThemedText>
        )}

        {(__DEV__ || isWeb) && (
          <Pressable style={styles.devButton} onPress={handleDevSkip}>
            <ThemedText style={styles.devButtonText}>Skip (Dev)</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(251, 146, 60, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing['2xl'],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing['2xl'],
  },
  stepCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.bgElevated,
    borderWidth: 4,
    borderColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  stepCount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.orange,
  },
  stepLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: Spacing['2xl'],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.orange,
    borderRadius: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 100,
  },
  warningText: {
    fontSize: 15,
    color: Colors.red,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: 18,
    backgroundColor: Colors.orange,
    borderRadius: 14,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
  devButton: {
    marginTop: Spacing['3xl'],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.bgElevated,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
