import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ProgressDots } from '@/components/ProgressDots';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { saveVideo, generateVideoFilename, saveShameVideo } from '@/utils/fileSystem';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useAlarms } from '@/hooks/useAlarms';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecordShame'>;

const MAX_DURATION = 15;

// Check if we're on web (no camera)
const isWeb = Platform.OS === 'web';
const useMockCamera = isWeb;

// Video ref type
type VideoRef = Video | null;

const PROMPTS = [
  '"im such a fat chud"',
  '"I broke my promise to myself again..."',
  '"This is what a lazy person looks like..."',
];

// Mock camera placeholder component for web
const MockCameraView = ({ isRecording }: { isRecording: boolean }) => (
  <View style={styles.mockCamera}>
    <Text style={styles.mockCameraEmoji}>{isRecording ? '🔴' : '🎬'}</Text>
    <Text style={styles.mockCameraText}>
      {isRecording ? 'Recording...' : 'Camera preview'}
    </Text>
    <Text style={styles.mockCameraSubtext}>(Web preview)</Text>
  </View>
);

// Mock video preview component
const MockVideoPreview = () => (
  <View style={styles.mockVideoPreview}>
    <Text style={styles.mockVideoEmoji}>✅</Text>
    <Text style={styles.mockVideoText}>Video recorded</Text>
  </View>
);

export default function RecordShameScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    alarmTime,
    alarmLabel,
    referencePhotoUri,
    isOnboarding,
    returnTo,
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
  const { alarms, updateAlarm } = useAlarms();

  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockRecordingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<VideoRef>(null);

  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulseAnim.value = withRepeat(
        withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [isRecording, pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mockRecordingRef.current) {
        clearTimeout(mockRecordingRef.current);
      }
      // Stop video playback when leaving screen
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) return;

    setIsRecording(true);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      if (useMockCamera) {
        console.log('[RecordShame] Mock recording started');
        // Auto-stop after MAX_DURATION in mock mode
        mockRecordingRef.current = setTimeout(() => {
          console.log('[RecordShame] Mock recording auto-stopped');
          setIsRecording(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setVideoUri('mock://shame-video');
        }, MAX_DURATION * 1000);
      } else if (cameraRef.current) {
        const video = await cameraRef.current.recordAsync({
          maxDuration: MAX_DURATION,
        });
        if (video?.uri) {
          setVideoUri(video.uri);
        }
      }
    } catch (error) {
      console.log('[RecordShame] Recording error:', error);
      // On error, use mock data to continue flow
      setVideoUri('mock://shame-video');
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (useMockCamera) {
      console.log('[RecordShame] Mock recording stopped manually');
      if (mockRecordingRef.current) {
        clearTimeout(mockRecordingRef.current);
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setVideoUri('mock://shame-video');
    } else if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  const handleRetake = async () => {
    // Stop video playback before retaking
    if (videoRef.current) {
      await videoRef.current.pauseAsync().catch(() => {});
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVideoUri(null);
    setRecordingDuration(0);
  };

  const handleUseVideo = async () => {
    if (!videoUri) return;

    try {
      // Stop video playback before navigating
      if (videoRef.current) {
        await videoRef.current.pauseAsync().catch(() => {});
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let savedUri = videoUri;

      // Only save if it's a real video
      if (!videoUri.startsWith('mock://')) {
        const result = await saveShameVideo(videoUri);
        if (result) savedUri = result;
      }

      // If coming from settings/punishments, update the alarm and go back
      if (isOnboarding === false) {
        console.log('[RecordShame] Updating shame video from settings/punishments');
        const firstAlarm = alarms[0];
        if (firstAlarm) {
          await updateAlarm(firstAlarm.id, { shameVideoUri: savedUri });
        }
        navigation.goBack();
        return;
      }

      // If returning to onboarding punishment setup
      if (returnTo === 'Onboarding') {
        console.log('[RecordShame] Returning to Onboarding with video');
        navigation.navigate('Onboarding', { shameVideoUri: savedUri });
        return;
      }

      // Onboarding flow - navigate to complete screen
      console.log('[RecordShame] Using video, navigating to OnboardingComplete');
      navigation.navigate('OnboardingComplete', {
        alarmTime,
        alarmLabel,
        referencePhotoUri,
        shameVideoUri: savedUri,
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
      });
    } catch (error) {
      console.error('[RecordShame] Error using video:', error);
      // On error, go back if from settings, otherwise try to continue onboarding
      if (isOnboarding === false) {
        navigation.goBack();
      } else {
        navigation.navigate('OnboardingComplete', {
          alarmTime,
          alarmLabel,
          referencePhotoUri,
          shameVideoUri: videoUri.startsWith('mock://') ? '' : videoUri,
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
        });
      }
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If coming from settings/punishments, go back
    if (isOnboarding === false) {
      console.log('[RecordShame] Skipped from settings/punishments, going back');
      navigation.goBack();
      return;
    }

    // If returning to onboarding punishment setup (skip = no video)
    if (returnTo === 'Onboarding') {
      console.log('[RecordShame] Skipped, returning to Onboarding without video');
      navigation.navigate('Onboarding', { shameVideoUri: '' });
      return;
    }

    console.log('[RecordShame] Skipped, navigating to OnboardingComplete');
    navigation.navigate('OnboardingComplete', {
      alarmTime,
      alarmLabel,
      referencePhotoUri,
      shameVideoUri: '',
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
    });
  };

  const handleChoosePunishment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Punishments');
  };

  // Preview state after recording
  if (videoUri) {
    return (
      <View style={styles.container}>
        <BackgroundGlow color="red" />
        {videoUri.startsWith('mock://') ? (
          <MockVideoPreview />
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.fullScreenVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            isMuted={false}
          />
        )}

        <View style={[styles.previewControls, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable testID="button-record-again" style={styles.secondaryButton} onPress={handleRetake}>
            <ThemedText style={styles.secondaryButtonText}>Record again</ThemedText>
          </Pressable>

          <Pressable testID="button-use-video" style={styles.redButton} onPress={handleUseVideo}>
            <ThemedText style={styles.redButtonText}>Use this video</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Recording state
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="red" />
      <View style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <ThemedText style={styles.headerTitle}>Shame video</ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress dots */}
        <View style={styles.progressContainer}>
          <ProgressDots total={4} current={3} activeColor={Colors.red} />
        </View>

        {/* Red badge */}
        <View style={styles.badge}>
          <ThemedText style={styles.badgeEmoji}>🎬</ThemedText>
          <ThemedText style={styles.badgeText}>Record your shame</ThemedText>
        </View>

        {/* Title */}
        <ThemedText style={styles.title}>Record your shame video</ThemedText>
        <ThemedText style={styles.subtitle}>
          This plays at MAX VOLUME when you snooze.{'\n'}Make it embarrassing.
        </ThemedText>

        {/* Prompts */}
        <View style={styles.promptsContainer}>
          {PROMPTS.map((prompt, i) => (
            <View key={i} style={styles.promptCard}>
              <ThemedText style={styles.promptText}>{prompt}</ThemedText>
            </View>
          ))}
        </View>

        {/* Camera preview */}
        <View style={styles.cameraWrapper}>
          <View style={styles.cameraContainer}>
            {useMockCamera ? (
              <MockCameraView isRecording={isRecording} />
            ) : (
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                mode="video"
              />
            )}
          </View>

          {/* Timer when recording */}
          {isRecording && (
            <View style={styles.timerContainer}>
              <ThemedText style={styles.timerText}>
                {recordingDuration}s / {MAX_DURATION}s
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Record button */}
      <View style={[styles.recordContainer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          testID="button-record"
          accessibilityRole="button"
          accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
          onPress={isRecording ? stopRecording : startRecording}
          style={styles.recordButton}
        >
          {isRecording ? (
            <>
              <Animated.View style={[styles.recordButtonPulse, pulseStyle]} />
              <View style={styles.recordButtonOuter}>
                <View style={styles.recordButtonStop} />
              </View>
            </>
          ) : (
            <View style={styles.recordButtonOuter}>
              <View style={styles.recordButtonInner} />
            </View>
          )}
        </Pressable>

        {/* Alternative punishment link */}
        <Pressable style={styles.alternativeButton} onPress={handleChoosePunishment}>
          <Text style={{ fontSize: 16 }}>⚙️</Text>
          <Text style={styles.alternativeText}>Choose a different punishment</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },

  // Mock camera
  mockCamera: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCameraEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  mockCameraText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  mockCameraSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  mockVideoPreview: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockVideoEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  mockVideoText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  skipButton: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Progress
  progressContainer: {
    marginBottom: Spacing['2xl'],
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 100,
    marginBottom: Spacing.xl,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.red,
  },

  // Title
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },

  // Prompts
  promptsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing['2xl'],
  },
  promptCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    padding: Spacing.md,
  },
  promptText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Camera
  cameraWrapper: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  cameraContainer: {
    width: 200,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.bgElevated,
  },
  camera: {
    flex: 1,
  },
  timerContainer: {
    marginTop: Spacing.md,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.red,
  },

  // Record button
  recordContainer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  recordButton: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.red,
  },
  recordButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.red,
    borderWidth: 3,
    borderColor: Colors.text,
  },
  recordButtonStop: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.text,
  },

  // Preview state
  fullScreenVideo: {
    flex: 1,
  },
  previewControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  redButton: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: Colors.red,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  redButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },

  // Alternative punishment button
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: Spacing.lg,
  },
  alternativeText: {
    fontSize: 15,
    color: Colors.orange,
    fontWeight: '500',
  },
});
