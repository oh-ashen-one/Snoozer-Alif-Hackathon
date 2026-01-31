import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Text, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ProgressDots } from '@/components/ProgressDots';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { saveReferencePhoto } from '@/utils/fileSystem';
import { KEYS } from '@/utils/storage';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useAlarms } from '@/hooks/useAlarms';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ProofSetup'>;
type Step = 'activity' | 'camera' | 'confirm';

// Check if we're on web (no camera)
const isWeb = Platform.OS === 'web';
const useMockCamera = isWeb;

interface ActivityPreset {
  label: string;
  icon: string;
}

const PRESETS: ActivityPreset[] = [
  { label: 'Coffee', icon: '\u2615' },
  { label: 'Brush teeth', icon: '\uD83D\uDE01' },
  { label: 'Drink water', icon: '\uD83D\uDCA7' },
  { label: 'Stretch', icon: '\uD83D\uDEB6' },
  { label: 'Walk around', icon: '\uD83E\uDDED' },
];

// Step-only activities don't require a reference photo
const STEP_ONLY_ACTIVITIES = ['Walk around'];
const STEP_GOAL_WALK = 50;

// Mock camera placeholder component for web
const MockCameraView = () => (
  <View style={styles.mockCamera}>
    <Text style={{ fontSize: 48 }}>{'\uD83D\uDCF7'}</Text>
    <Text style={styles.mockCameraText}>Camera preview</Text>
    <Text style={styles.mockCameraSubtext}>(Web preview)</Text>
  </View>
);

export default function ProofSetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { 
    alarmTime, 
    alarmLabel, 
    isOnboarding, 
    punishment, 
    extraPunishments, 
    days,
    proofActivityType,
    activityName: passedActivityName,
    moneyEnabled,
    shameVideoEnabled,
    buddyNotifyEnabled,
    socialShameEnabled,
    antiCharityEnabled,
    escalatingVolume,
    wakeRecheck,
  } = route.params;
  const { alarms, updateAlarm } = useAlarms();

  const [step, setStep] = useState<Step>('activity');
  const [activity, setActivity] = useState('');
  const [activityIcon, setActivityIcon] = useState<string>('\uD83D\uDCF7');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const fadeIn = useSharedValue(0);

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [fadeIn]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  const handlePresetSelect = (preset: ActivityPreset) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActivity(preset.label);
    setActivityIcon(preset.icon);
  };

  const isStepOnly = STEP_ONLY_ACTIVITIES.includes(activity);

  const handleContinue = () => {
    if (!activity.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Step-only activities skip the camera and go straight to confirm
    if (STEP_ONLY_ACTIVITIES.includes(activity)) {
      setPhotoUri('step-only://no-photo');
      setStep('confirm');
    } else {
      setStep('camera');
    }
  };

  const handleCapture = async () => {
    if (capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (useMockCamera) {
        console.log('[ProofSetup] Mock capture - would take photo here');
        await new Promise(resolve => setTimeout(resolve, 300));
        setPhotoUri('mock://reference-photo');
        setStep('confirm');
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        if (photo?.uri) {
          setPhotoUri(photo.uri);
          setStep('confirm');
        }
      }
    } catch (error) {
      console.log('[ProofSetup] Capture error:', error);
      setPhotoUri('mock://reference-photo');
      setStep('confirm');
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoUri(null);
    setStep('camera');
  };

  const handleSave = async () => {
    if (!photoUri) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('[ProofSetup] Saving activity and photo');

      let savedUri = photoUri;

      // Only save actual photos, not step-only or mock URIs
      if (!photoUri.startsWith('mock://') && !photoUri.startsWith('step-only://')) {
        const result = await saveReferencePhoto(photoUri);
        if (result) savedUri = result;
      }

      // For step-only activities, use empty string as reference photo
      if (photoUri.startsWith('step-only://')) {
        savedUri = '';
      }

      // Save activity to AsyncStorage with step-only flag
      await AsyncStorage.setItem(KEYS.PROOF_ACTIVITY, JSON.stringify({
        activity: activity.trim(),
        activityIcon,
        isStepOnly: STEP_ONLY_ACTIVITIES.includes(activity),
        stepGoal: STEP_ONLY_ACTIVITIES.includes(activity) ? STEP_GOAL_WALK : 10,
        createdAt: Date.now(),
      }));

      // If coming from settings, update alarm and go back to settings
      if (isOnboarding === false) {
        console.log('[ProofSetup] Updating proof activity from settings');
        const firstAlarm = alarms[0];
        if (firstAlarm) {
          await updateAlarm(firstAlarm.id, { referencePhotoUri: savedUri });
        }
        navigation.navigate('Settings');
        return;
      }

      // Onboarding flow - continue to shame video
      navigation.navigate('RecordShame', {
        alarmTime,
        alarmLabel,
        referencePhotoUri: savedUri,
        isOnboarding,
        punishment,
        extraPunishments,
        days,
        proofActivityType,
        activityName: passedActivityName || activity.trim(),
        moneyEnabled,
        shameVideoEnabled,
        buddyNotifyEnabled,
        socialShameEnabled,
        antiCharityEnabled,
        escalatingVolume,
        wakeRecheck,
      });
    } catch (error) {
      console.error('[ProofSetup] Error saving:', error);
      if (isOnboarding === false) {
        navigation.navigate('Settings');
      }
    }
  };

  if (step === 'activity') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="green" />
        <Animated.View style={[styles.content, fadeStyle]}>
          <View style={styles.progressContainer}>
            <ProgressDots total={4} current={3} />
          </View>

          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={{ fontSize: 18 }}>{'\u2705'}</Text>
              <ThemedText style={styles.badgeText}>Proof setup</ThemedText>
            </View>

            <ThemedText style={styles.title}>What's the FIRST thing{'\n'}you do when you wake up?</ThemedText>
            <ThemedText style={styles.subtitle}>
              You'll prove you're awake by taking a photo{'\n'}of yourself doing this every morning.
            </ThemedText>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your morning activity..."
              placeholderTextColor={Colors.textMuted}
              value={activity}
              onChangeText={(text) => {
                setActivity(text);
                setActivityIcon('\uD83D\uDCF7');
              }}
              testID="input-activity"
            />
          </View>

          <ThemedText style={styles.orText}>or pick one:</ThemedText>

          <View style={styles.presetsGrid}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                style={[
                  styles.presetChip,
                  activity === preset.label && styles.presetChipActive,
                ]}
                onPress={() => handlePresetSelect(preset)}
                testID={`preset-${preset.label.toLowerCase().replace(' ', '-')}`}
              >
                <Text style={{ fontSize: 18 }}>{preset.icon}</Text>
                <ThemedText style={[
                  styles.presetLabel,
                  activity === preset.label && styles.presetLabelActive,
                ]}>{preset.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            style={[styles.greenButton, !activity.trim() && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!activity.trim()}
            testID="button-continue"
          >
            <ThemedText style={styles.greenButtonText}>Continue</ThemedText>
            <Text style={{ fontSize: 20, color: Colors.text }}>{'\u2192'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'camera') {
    return (
      <View style={styles.container}>
        <BackgroundGlow color="green" />
        <View style={[styles.cameraTopBar, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backButton} onPress={() => setStep('activity')}>
            <ThemedText style={styles.backButtonText}>Back</ThemedText>
          </Pressable>
          <ThemedText style={styles.cameraTitle}>Reference photo</ThemedText>
          <View style={styles.backButton} />
        </View>

        <View style={styles.activityBadge}>
          <Text style={{ fontSize: 16 }}>{activityIcon}</Text>
          <ThemedText style={styles.activityBadgeText}>{activity}</ThemedText>
        </View>

        <ThemedText style={styles.cameraInstructions}>
          Take a photo of yourself doing this activity
        </ThemedText>

        <View style={styles.cameraContainer}>
          {useMockCamera ? (
            <MockCameraView />
          ) : (
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          )}

          <View style={[styles.cameraCorner, styles.cameraCornerTL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBR]} />
        </View>

        <View style={[styles.captureContainer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            testID="button-capture"
            onPress={handleCapture}
            disabled={capturing}
            style={[styles.captureButton, capturing && styles.captureButtonDisabled]}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'confirm') {
    // Different confirm UI for step-only activities
    if (isStepOnly) {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <BackgroundGlow color="green" />
          <Animated.View
            style={styles.confirmContent}
            entering={FadeIn.duration(400)}
          >
            <View style={styles.successIcon}>
              <Text style={{ fontSize: 40 }}>{'\uD83E\uDDED'}</Text>
            </View>

            <ThemedText style={styles.confirmTitle}>Walk to wake up!</ThemedText>
            <ThemedText style={styles.confirmSubtitle}>
              Your morning proof will be walking{'\n'}{STEP_GOAL_WALK} steps measured by your phone.
            </ThemedText>

            <View style={styles.stepPreviewContainer}>
              <View style={styles.stepCircle}>
                <ThemedText style={styles.stepNumber}>{STEP_GOAL_WALK}</ThemedText>
                <ThemedText style={styles.stepLabel}>steps</ThemedText>
              </View>
              <View style={styles.activityTag}>
                <Text style={{ fontSize: 14 }}>{activityIcon}</Text>
                <ThemedText style={styles.activityTagText}>{activity}</ThemedText>
              </View>
            </View>
          </Animated.View>

          <View style={[styles.confirmButtons, { paddingBottom: insets.bottom + 24 }]}>
            <Pressable testID="button-change" style={styles.secondaryButton} onPress={() => setStep('activity')}>
              <ThemedText style={styles.secondaryButtonText}>Change activity</ThemedText>
            </Pressable>

            <Pressable testID="button-save" style={styles.greenButton} onPress={handleSave}>
              <ThemedText style={styles.greenButtonText}>Let's go</ThemedText>
              <Text style={{ fontSize: 20, color: Colors.text }}>{'\u2713'}</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="green" />
        <Animated.View
          style={styles.confirmContent}
          entering={FadeIn.duration(400)}
        >
          <View style={styles.successIcon}>
            <Text style={{ fontSize: 40, color: Colors.green }}>{'\u2713'}</Text>
          </View>

          <ThemedText style={styles.confirmTitle}>Looking good!</ThemedText>
          <ThemedText style={styles.confirmSubtitle}>
            This is your reference photo for "{activity}".{'\n'}You'll retake it every morning.
          </ThemedText>

          <View style={styles.previewContainer}>
            {photoUri && !photoUri.startsWith('mock://') ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.mockPreview}>
                <Text style={{ fontSize: 48 }}>{activityIcon}</Text>
                <Text style={styles.mockPreviewText}>{activity}</Text>
              </View>
            )}
            <View style={styles.activityTag}>
              <Text style={{ fontSize: 14 }}>{activityIcon}</Text>
              <ThemedText style={styles.activityTagText}>{activity}</ThemedText>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.confirmButtons, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable testID="button-retake" style={styles.secondaryButton} onPress={handleRetake}>
            <ThemedText style={styles.secondaryButtonText}>Retake photo</ThemedText>
          </Pressable>

          <Pressable testID="button-save" style={styles.greenButton} onPress={handleSave}>
            <ThemedText style={styles.greenButtonText}>Looks good</ThemedText>
            <Text style={{ fontSize: 20, color: Colors.text }}>{'\u2713'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 100,
    marginBottom: Spacing.xl,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.green,
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
    lineHeight: 22,
  },
  inputContainer: {
    paddingHorizontal: Spacing['2xl'],
    marginTop: Spacing['2xl'],
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: Spacing['2xl'],
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  presetChipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  presetLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  presetLabelActive: {
    color: Colors.bg,
  },
  bottomCTA: {
    paddingHorizontal: Spacing['2xl'],
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
  buttonDisabled: {
    opacity: 0.4,
  },

  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    zIndex: 10,
  },
  backButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 100,
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cameraTitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 100,
    marginBottom: Spacing.md,
  },
  activityBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.green,
  },
  cameraInstructions: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: Spacing.xl,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.bgElevated,
  },
  camera: {
    flex: 1,
  },
  mockCamera: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  mockCameraText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  mockCameraSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cameraCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(250, 250, 249, 0.3)',
  },
  cameraCornerTL: {
    top: 20,
    left: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cameraCornerTR: {
    top: 20,
    right: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cameraCornerBL: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cameraCornerBR: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  captureContainer: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.text,
    borderWidth: 4,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.text,
    borderWidth: 2,
    borderColor: '#E7E5E4',
  },

  confirmContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  confirmSubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    lineHeight: 22,
  },
  previewContainer: {
    width: 200,
    height: 280,
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.green,
    overflow: 'hidden',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
  },
  stepPreviewContainer: {
    width: 200,
    height: 200,
    backgroundColor: Colors.bgElevated,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 8,
  },
  stepCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.green,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: -4,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  mockPreview: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  mockPreviewText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  activityTag: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 100,
  },
  activityTagText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  confirmButtons: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
