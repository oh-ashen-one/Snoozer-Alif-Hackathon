import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text as RNText, Platform, ActivityIndicator, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { logWakeUp, getCurrentStreak, getMonthStats } from '@/utils/tracking';
import { setCurrentScreen, killAllSounds } from '@/utils/soundKiller';
import { apiRequest } from '@/lib/query-client';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'StretchProof'>;

// Check if we're on web (no camera)
const isWeb = Platform.OS === 'web';
const useMockCamera = isWeb;

type Phase = 'camera' | 'countdown' | 'verifying' | 'result';

const COUNTDOWN_SECONDS = 5;

export default function StretchProofScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'passed' | 'failed'>('idle');
  const [verificationReason, setVerificationReason] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const cameraRef = useRef<CameraView>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('StretchProof');
    }, [])
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
      }
    } catch (error) {
      if (__DEV__) console.log('[StretchProof] Failed to open settings:', error);
    }
  };

  const runVerification = useCallback(async (uri: string) => {
    setVerificationStatus('verifying');
    if (__DEV__) console.log('[StretchProof] Starting AI verification...');

    if (uri.startsWith('mock://')) {
      // Mock mode - simulate API call for testing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerificationStatus('passed');
      setVerificationReason('Mock verification passed');
      setPhase('result');
      return;
    }

    try {
      // Convert photo to base64
      const imageBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as const,
      });
      if (__DEV__) console.log('[StretchProof] Image converted to base64, sending to API...');

      // Call the AI verification API
      const response = await apiRequest('POST', '/api/verify-proof', {
        imageBase64: `data:image/jpeg;base64,${imageBase64}`,
        activityDescription: 'stretching - person should be doing any form of stretching like arms up, touching toes, side stretches, or any stretching movement',
      });

      const result = await response.json();
      if (__DEV__) console.log('[StretchProof] AI verification result:', result);

      if (!result.verified) {
        setVerificationStatus('failed');
        setVerificationReason(result.reason || "Couldn't verify you're stretching. Try again!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setVerificationStatus('passed');
        setVerificationReason(result.reason || 'Stretch verified!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setPhase('result');
    } catch (error) {
      if (__DEV__) console.log('[StretchProof] Verification API error:', error);
      // On API error, allow user to retry
      setVerificationStatus('failed');
      setVerificationReason('Verification service error. Please try again.');
      setPhase('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (isCapturing) return;
    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (__DEV__) console.log('[StretchProof] Capturing photo...');

    try {
      if (useMockCamera) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const mockUri = 'mock://stretch-photo';
        setPhotoUri(mockUri);
        setPhase('verifying');
        runVerification(mockUri);
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        if (photo?.uri) {
          if (__DEV__) console.log('[StretchProof] Photo captured:', photo.uri);
          setPhotoUri(photo.uri);
          setPhase('verifying');
          runVerification(photo.uri);
        } else {
          throw new Error('No photo URI returned');
        }
      }
    } catch (error) {
      if (__DEV__) console.log('[StretchProof] Capture error:', error);
      // Use mock on error for testing
      const mockUri = 'mock://stretch-photo';
      setPhotoUri(mockUri);
      setPhase('verifying');
      runVerification(mockUri);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, runVerification]);

  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(COUNTDOWN_SECONDS);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let current = COUNTDOWN_SECONDS;

    countdownTimerRef.current = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        capturePhoto();
      }
    }, 1000);
  }, [capturePhoto]);

  const handleRetry = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setPhase('camera');
    setPhotoUri(null);
    setCountdown(COUNTDOWN_SECONDS);
    setVerificationStatus('idle');
    setVerificationReason(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSuccess = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    killAllSounds();

    await logWakeUp(alarmId, new Date(), false, 0);

    const streak = await getCurrentStreak();
    const monthStats = await getMonthStats();
    const now = new Date();
    const wakeHours = now.getHours();
    const wakeMinutes = now.getMinutes();
    const wakePeriod = wakeHours >= 12 ? 'PM' : 'AM';
    const wakeDisplayHours = wakeHours % 12 || 12;
    const wakeTime = `${wakeDisplayHours}:${wakeMinutes.toString().padStart(2, '0')} ${wakePeriod}`;
    const totalDays = monthStats.wakeUps + monthStats.snoozes;
    const wakeUpRate = totalDays > 0 ? Math.round((monthStats.wakeUps / totalDays) * 100) : 100;

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{
          name: 'WakeUpSuccess',
          params: {
            streak,
            moneySaved: monthStats.savedMoney,
            wakeUpRate,
            wakeTime,
            targetTime: wakeTime,
          },
        }],
      })
    );
  }, [alarmId, navigation]);

  // Permission loading state
  if (!isWeb && !permission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <BackgroundGlow color="orange" />
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  // Permission denied state
  if (!isWeb && permission && !permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <BackgroundGlow color="orange" />
        <View style={styles.permissionContent}>
          <RNText style={styles.permissionEmoji}>📷</RNText>
          <ThemedText style={styles.permissionTitle}>Camera Access Needed</ThemedText>
          <ThemedText style={styles.permissionText}>
            We need camera access to verify your stretch.
          </ThemedText>
          {permission.canAskAgain ? (
            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <ThemedText style={styles.primaryButtonText}>Enable Camera</ThemedText>
            </Pressable>
          ) : (
            <>
              <ThemedText style={styles.permissionDeniedText}>
                Camera permission was denied. Please enable it in Settings.
              </ThemedText>
              <Pressable style={styles.primaryButton} onPress={handleOpenSettings}>
                <ThemedText style={styles.primaryButtonText}>Open Settings</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  // Camera phase - show camera with start timer button
  if (phase === 'camera') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="orange" />

        {/* Header */}
        <View style={styles.header}>
          <RNText style={styles.headerEmoji}>🧘</RNText>
          <ThemedText style={styles.headerTitle}>Stretch Proof</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Get ready to strike a stretch pose</ThemedText>
        </View>

        {/* Camera view */}
        <View style={styles.cameraContainer}>
          {useMockCamera ? (
            <View style={styles.mockCamera}>
              <RNText style={styles.mockCameraEmoji}>📷</RNText>
              <RNText style={styles.mockCameraText}>Camera preview</RNText>
            </View>
          ) : (
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          )}

          {/* Corner guides */}
          <View style={[styles.cameraCorner, styles.cameraCornerTL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBR]} />
        </View>

        {/* Start timer button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <ThemedText style={styles.captureHint}>
            Prop up your phone, then tap to start the 5s timer
          </ThemedText>
          <Pressable style={styles.timerButton} onPress={startCountdown}>
            <ThemedText style={styles.timerButtonText}>Start 5s Timer</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Countdown phase - show countdown overlay
  if (phase === 'countdown') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="orange" />

        {/* Camera view with countdown overlay */}
        <View style={styles.cameraContainer}>
          {useMockCamera ? (
            <View style={styles.mockCamera}>
              <RNText style={styles.mockCameraEmoji}>📷</RNText>
              <RNText style={styles.mockCameraText}>Camera preview</RNText>
            </View>
          ) : (
            <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          )}

          {/* Countdown overlay */}
          <View style={styles.countdownOverlay}>
            <View style={styles.countdownCircle}>
              <ThemedText style={styles.countdownNumber}>{countdown}</ThemedText>
            </View>
            <ThemedText style={styles.countdownLabel}>Get into your stretch pose!</ThemedText>
          </View>

          {/* Corner guides */}
          <View style={[styles.cameraCorner, styles.cameraCornerTL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBR]} />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
          <ThemedText style={styles.countdownHint}>
            Arms up, touching toes, or any stretch!
          </ThemedText>
        </View>
      </View>
    );
  }

  // Verifying phase
  if (phase === 'verifying') {
    return (
      <View style={styles.container}>
        <BackgroundGlow color="orange" />

        {photoUri && !photoUri.startsWith('mock://') ? (
          <Image source={{ uri: photoUri }} style={styles.fullScreenImage} />
        ) : (
          <View style={styles.mockPreview}>
            <RNText style={styles.mockPreviewEmoji}>📸</RNText>
            <RNText style={styles.mockPreviewText}>Photo captured</RNText>
          </View>
        )}

        <View style={styles.verifyingOverlay}>
          <View style={styles.verifyingCard}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <ThemedText style={styles.verifyingTitle}>Verifying your stretch...</ThemedText>
            <ThemedText style={styles.verifyingSubtext}>
              AI is checking your photo
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  // Result phase
  if (phase === 'result') {
    const passed = verificationStatus === 'passed';

    return (
      <View style={styles.container}>
        <BackgroundGlow color={passed ? 'green' : 'red'} />

        {photoUri && !photoUri.startsWith('mock://') ? (
          <Image source={{ uri: photoUri }} style={styles.fullScreenImage} />
        ) : (
          <View style={styles.mockPreview}>
            <RNText style={styles.mockPreviewEmoji}>{passed ? '✅' : '❌'}</RNText>
            <RNText style={styles.mockPreviewText}>
              {passed ? 'Stretch verified!' : 'Not quite...'}
            </RNText>
          </View>
        )}

        <View style={[styles.resultControls, { paddingBottom: insets.bottom + 24 }]}>
          {passed ? (
            <>
              <View style={styles.successContainer}>
                <RNText style={{ fontSize: 24 }}>✅</RNText>
                <ThemedText style={styles.successText}>
                  {verificationReason || 'Great stretch! You\'re awake!'}
                </ThemedText>
              </View>
              <Pressable style={styles.successButton} onPress={handleSuccess}>
                <ThemedText style={styles.successButtonText}>Continue</ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.errorContainer}>
                <RNText style={{ fontSize: 24 }}>❌</RNText>
                <ThemedText style={styles.errorText}>
                  {verificationReason || "Couldn't verify a stretch. Try again!"}
                </ThemedText>
              </View>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
              </Pressable>
            </>
          )}
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
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
  },
  mockCameraEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
    color: Colors.textMuted,
  },
  mockCameraText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  cameraCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'rgba(251, 146, 60, 0.5)',
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
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  captureHint: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.orange,
    borderWidth: 3,
    borderColor: Colors.text,
  },
  timerButton: {
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  timerButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.bg,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '700',
    color: Colors.bg,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  countdownHint: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  mockPreview: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockPreviewEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  mockPreviewText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },
  fullScreenImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 10, 9, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyingCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    padding: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    width: '80%',
    maxWidth: 300,
    gap: Spacing.md,
  },
  verifyingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  verifyingSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  resultControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  successText: {
    fontSize: 16,
    color: Colors.green,
    fontWeight: '600',
    flex: 1,
  },
  successButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  successButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.bg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  errorText: {
    fontSize: 15,
    color: Colors.red,
    flex: 1,
  },
  retryButton: {
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  retryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.bg,
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  permissionEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  permissionDeniedText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: Spacing['2xl'],
    alignItems: 'center',
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.bg,
  },
});
