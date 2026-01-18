import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Image, Text as RNText, Platform, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { successDismissPattern, buttonPress } from '@/utils/haptics';
import { setCurrentScreen, killAllSounds } from '@/utils/soundKiller';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getAlarmById } from '@/utils/storage';
import { cancelAlarm } from '@/utils/notifications';
import { saveProofPhoto } from '@/utils/fileSystem';
import { logWakeUp, getCurrentStreak, getMonthStats } from '@/utils/tracking';
import { validateProofPhoto } from '@/utils/imageComparison';
import { CheatWarningModal } from '@/components/CheatWarningModal';
import { useAntiCheat, CheatType } from '@/hooks/useAntiCheat';
import { getBuddyInfo, getUserName } from '@/utils/storage';
import { notifyBuddyWoke } from '@/utils/buddyNotifications';
import { apiRequest } from '@/lib/query-client';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ProofCamera'>;

// Check if we're on web (no camera)
const isWeb = Platform.OS === 'web';
const useMockCamera = isWeb;

// Random gesture prompts for anti-cheat and fun
const GESTURE_PROMPTS = [
  'while doing a peace sign',
  'with one eye closed',
  'while giving a thumbs up',
  'with your tongue out',
  'while touching your nose',
  'with a big smile',
  'while waving at the camera',
  'with your hand on your head',
  'while making an OK sign',
  'with both thumbs up',
  'while pointing at yourself',
  'with a surprised face',
];

// Mock camera placeholder component for web
const MockCameraView = () => (
  <View style={styles.mockCamera}>
    <RNText style={styles.mockCameraEmoji}>📷</RNText>
    <RNText style={styles.mockCameraText}>Camera preview</RNText>
    <RNText style={styles.mockCameraSubtext}>(Web preview)</RNText>
  </View>
);

export default function ProofCameraScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, referencePhotoUri, activityName } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoTimestamp, setPhotoTimestamp] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'passed' | 'failed'>('idle');
  const [verificationReason, setVerificationReason] = useState<string | null>(null);
  const [cheatModalVisible, setCheatModalVisible] = useState(false);
  const [detectedCheat, setDetectedCheat] = useState<CheatType | null>(null);
  const [userName, setUserName] = useState('You');
  const [gesturePrompt] = useState(() => 
    GESTURE_PROMPTS[Math.floor(Math.random() * GESTURE_PROMPTS.length)]
  );
  const cameraRef = useRef<CameraView>(null);

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
      }
    } catch (error) {
      if (__DEV__) console.log('[ProofCamera] Failed to open settings:', error);
    }
  };

  const { validatePhotoFreshness } = useAntiCheat({
    onCheatDetected: (cheatType) => {
      setDetectedCheat(cheatType);
      setCheatModalVisible(true);
    },
  });

  React.useEffect(() => {
    getUserName().then(name => {
      if (name) setUserName(name);
    });
  }, []);

  // Set current screen for sound control
  useFocusEffect(
    React.useCallback(() => {
      setCurrentScreen('ProofCamera');
      return () => {
        // Kill sounds when leaving this screen
        killAllSounds();
      };
    }, [])
  );

  // Auto-verify photo when captured
  const runAIVerification = React.useCallback(async (uri: string) => {
    if (!uri || uri.startsWith('mock://')) {
      // Mock mode - auto-pass for testing
      setVerificationStatus('passed');
      setVerificationReason('Mock verification passed');
      return;
    }

    // Use default activity description if none specified
    const verificationActivity = activityName || 'completing the morning wake-up activity';

    setVerifying(true);
    setVerificationStatus('verifying');
    setVerificationError(null);

    if (__DEV__) console.log('[ProofCamera] Auto-starting AI verification for activity:', activityName);

    try {
      // Convert proof photo to base64
      const imageBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as const,
      });

      // Prepare reference image if available
      let referenceImageBase64: string | undefined;
      if (referencePhotoUri && !referencePhotoUri.startsWith('mock://')) {
        referenceImageBase64 = await FileSystem.readAsStringAsync(referencePhotoUri, {
          encoding: 'base64' as const,
        });
      }

      // Call AI verification API
      const response = await apiRequest('POST', '/api/verify-proof', {
        imageBase64: `data:image/jpeg;base64,${imageBase64}`,
        activityDescription: verificationActivity,
        referenceImageBase64: referenceImageBase64 ? `data:image/jpeg;base64,${referenceImageBase64}` : undefined,
      });

      const result = await response.json();
      if (__DEV__) console.log('[ProofCamera] AI verification result:', result);

      if (!result.verified) {
        setVerificationStatus('failed');
        setVerificationReason(result.reason || "Couldn't verify the activity in your photo");
        setVerificationError(result.reason || "Photo doesn't match the required activity. Please retake.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setVerificationStatus('passed');
        setVerificationReason(result.reason);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (__DEV__) console.log('[ProofCamera] AI verification passed:', result.reason);
      }
    } catch (aiError) {
      if (__DEV__) console.log('[ProofCamera] AI verification failed:', aiError);
      // On API error, show error and require retry (strict verification)
      setVerificationStatus('failed');
      setVerificationReason('Verification service error. Please try again.');
      setVerificationError('Unable to verify photo. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setVerifying(false);
    }
  }, [activityName, referencePhotoUri]);

  // Trigger AI verification when photo is captured
  React.useEffect(() => {
    if (photoUri && photoTimestamp) {
      runAIVerification(photoUri);
    }
  }, [photoUri, photoTimestamp, runAIVerification]);

  const handleCapture = async () => {
    if (capturing) return;

    setCapturing(true);
    buttonPress('primary');
    if (__DEV__) console.log('[ProofCamera] Capture started');

    try {
      if (useMockCamera) {
        // Mock capture - just use a placeholder
        if (__DEV__) console.log('[ProofCamera] Mock capture - setting photo URI');
        // Simulate a brief delay
        await new Promise(resolve => setTimeout(resolve, 300));
        setPhotoUri('mock://proof-photo');
        setPhotoTimestamp(Date.now());
        if (__DEV__) console.log('[ProofCamera] Photo URI set to mock');
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        if (photo?.uri) {
          setPhotoUri(photo.uri);
          setPhotoTimestamp(Date.now());
          if (__DEV__) console.log('[ProofCamera] Photo URI set:', photo.uri);
        }
      }
    } catch (error) {
      if (__DEV__) console.log('[ProofCamera] Capture error:', error);
      // On error, use mock data to continue flow
      setPhotoUri('mock://proof-photo');
      setPhotoTimestamp(Date.now());
    } finally {
      setCapturing(false);
      if (__DEV__) console.log('[ProofCamera] Capture complete, photoUri should be set');
    }
  };

  const handleRetake = () => {
    buttonPress('secondary');
    setPhotoUri(null);
    setPhotoTimestamp(null);
    setVerificationError(null);
    setVerifying(false);
    setVerificationStatus('idle');
    setVerificationReason(null);
  };

  const handleConfirm = async (skipVerification = false) => {
    // Block if still verifying or verification failed (unless skipping)
    if (!skipVerification && (verifying || verificationStatus !== 'passed')) return;

    // Validate photo freshness (anti-cheat)
    if (photoTimestamp && !validatePhotoFreshness(photoTimestamp)) {
      return;
    }

    successDismissPattern();
    if (__DEV__) console.log('ALARM: Alarm dismissed');

    let targetTime = '6:00 AM';
    
    try {
      if (photoUri && !photoUri.startsWith('mock://')) {
        await saveProofPhoto(photoUri);
      }

      const alarm = await getAlarmById(alarmId);
      if (alarm?.notificationId) {
        await cancelAlarm(alarm.notificationId);
      }
      
      if (alarm?.time) {
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        targetTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }

      await logWakeUp(alarmId, new Date(), false);
      if (__DEV__) console.log('[ProofCamera] Logged successful wake up');
      
      const buddyInfo = await getBuddyInfo();
      if (buddyInfo) {
        const streak = await getCurrentStreak();
        const now = new Date();
        const wakeHours = now.getHours();
        const wakeMinutes = now.getMinutes();
        const wakePeriod = wakeHours >= 12 ? 'PM' : 'AM';
        const wakeDisplayHours = wakeHours % 12 || 12;
        const wakeTimeStr = `${wakeDisplayHours}:${wakeMinutes.toString().padStart(2, '0')} ${wakePeriod}`;
        await notifyBuddyWoke(userName, wakeTimeStr, streak);
        if (__DEV__) console.log('[ProofCamera] Sent wake notification to buddy');
      }
    } catch (error) {
      if (__DEV__) console.log('[ProofCamera] Error during dismiss:', error);
    }

    // Get stats for success screen
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
            targetTime,
          }
        }],
      })
    );
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  // Permission loading state
  if (!isWeb && !permission) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <BackgroundGlow color="green" />
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  // Permission denied state
  if (!isWeb && permission && !permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <BackgroundGlow color="green" />
        <View style={styles.permissionContent}>
          <RNText style={styles.permissionEmoji}>📷</RNText>
          <ThemedText style={styles.permissionTitle}>Camera Access Needed</ThemedText>
          <ThemedText style={styles.permissionText}>
            We need camera access to take your proof photo and dismiss the alarm.
          </ThemedText>
          
          {permission.canAskAgain ? (
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <ThemedText style={styles.permissionButtonText}>Enable Camera</ThemedText>
            </Pressable>
          ) : (
            <>
              <ThemedText style={styles.permissionDeniedText}>
                Camera permission was denied. Please enable it in Settings.
              </ThemedText>
              {Platform.OS !== 'web' && (
                <Pressable style={styles.permissionButton} onPress={handleOpenSettings}>
                  <ThemedText style={styles.permissionButtonText}>Open Settings</ThemedText>
                </Pressable>
              )}
            </>
          )}
          
          <Pressable style={styles.backButtonSmall} onPress={handleBack}>
            <ThemedText style={styles.backButtonSmallText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Preview state after capturing
  if (photoUri) {
    return (
      <View style={styles.container}>
        <BackgroundGlow color="green" />
        {photoUri.startsWith('mock://') ? (
          <View style={styles.mockPreview}>
            <RNText style={styles.mockPreviewEmoji}>✅</RNText>
            <RNText style={styles.mockPreviewText}>Photo captured</RNText>
          </View>
        ) : (
          <Image source={{ uri: photoUri }} style={styles.fullScreenImage} />
        )}

        {/* Verification status overlay */}
        {verificationStatus === 'verifying' ? (
          <View style={styles.verifyingOverlay}>
            <View style={styles.verifyingCard}>
              <ActivityIndicator size="large" color={Colors.green} />
              <ThemedText style={styles.verifyingTitle}>Verifying your photo...</ThemedText>
              <ThemedText style={styles.verifyingSubtext}>AI is checking that you completed the activity</ThemedText>
            </View>
          </View>
        ) : null}

        <View style={[styles.previewControls, { paddingBottom: insets.bottom + 24 }]}>
          {/* Show verification status message */}
          {verificationStatus === 'passed' ? (
            <View style={styles.successContainer}>
              <RNText style={{ fontSize: 20 }}>✅</RNText>
              <ThemedText style={styles.successText}>Photo verified! You're doing the activity.</ThemedText>
            </View>
          ) : null}

          {verificationStatus === 'failed' ? (
            <View style={styles.errorContainer}>
              <RNText style={{ fontSize: 20 }}>❌</RNText>
              <ThemedText style={styles.errorText}>{verificationError || "Photo doesn't show the required activity. Please retake."}</ThemedText>
            </View>
          ) : null}

          {/* Skip button - only show when verification fails */}
          {verificationStatus === 'failed' ? (
            <Pressable 
              testID="button-skip-verification" 
              style={styles.skipButton} 
              onPress={() => handleConfirm(true)}
            >
              <ThemedText style={styles.skipButtonText}>Skip verification</ThemedText>
            </Pressable>
          ) : null}

          {/* Always show retake button */}
          <Pressable 
            testID="button-retake-proof" 
            style={[
              styles.secondaryButton,
              verificationStatus === 'failed' && styles.retakeButtonHighlighted
            ]} 
            onPress={handleRetake}
          >
            <ThemedText style={[
              styles.secondaryButtonText,
              verificationStatus === 'failed' && styles.retakeButtonTextHighlighted
            ]}>
              {verificationStatus === 'failed' ? 'Retake Photo' : 'Retake'}
            </ThemedText>
          </Pressable>

          {/* Continue button - only enabled when verification passed */}
          <Pressable
            testID="button-confirm-proof"
            style={[
              styles.greenButton, 
              (verificationStatus !== 'passed') && styles.greenButtonDisabled
            ]}
            onPress={() => handleConfirm()}
            disabled={verificationStatus !== 'passed'}
          >
            {verificationStatus === 'verifying' ? (
              <View style={styles.verifyingButton}>
                <ActivityIndicator size="small" color={Colors.text} />
                <ThemedText style={styles.greenButtonText}>Scanning photo...</ThemedText>
              </View>
            ) : verificationStatus === 'passed' ? (
              <ThemedText style={styles.greenButtonText}>Looks good!</ThemedText>
            ) : verificationStatus === 'failed' ? (
              <ThemedText style={styles.greenButtonTextDisabled}>Photo not verified</ThemedText>
            ) : (
              <View style={styles.verifyingButton}>
                <ActivityIndicator size="small" color={Colors.text} />
                <ThemedText style={styles.greenButtonText}>Scanning...</ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // Camera state
  return (
    <View style={styles.container}>
      <BackgroundGlow color="green" />
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <RNText style={{ fontSize: 20 }}>←</RNText>
        </Pressable>
        <ThemedText style={styles.topBarTitle}>{activityName ? `Proof: ${activityName}` : 'Take your proof photo'}</ThemedText>
        <View style={styles.backButton} />
      </View>

      {/* Camera viewport */}
      <View style={styles.cameraContainer}>
        {useMockCamera ? (
          <MockCameraView />
        ) : (
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        )}

        {/* Guide overlay */}
        <View style={styles.guideOverlay}>
          <View style={styles.guidePill}>
            <ThemedText style={styles.guidePillText}>
              {activityName
                ? `Take a photo of yourself doing this activity ${gesturePrompt}`
                : `Align with reference ${gesturePrompt}`}
            </ThemedText>
          </View>
          <View style={styles.guideBox} />
        </View>

        {/* Corner guides */}
        <View style={[styles.cameraCorner, styles.cameraCornerTL]} />
        <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
        <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
        <View style={[styles.cameraCorner, styles.cameraCornerBR]} />

        {/* Reference thumbnail */}
        {referencePhotoUri && !referencePhotoUri.startsWith('mock://') && (
          <View style={styles.referenceThumbnail}>
            <Image source={{ uri: referencePhotoUri }} style={styles.referenceImage} />
            <ThemedText style={styles.referenceLabel}>Match this</ThemedText>
          </View>
        )}
      </View>

      {/* Capture button */}
      <View style={[styles.captureContainer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          testID="button-capture-proof"
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
          onPress={handleCapture}
          disabled={capturing}
          style={({ pressed }) => [
            styles.captureButton,
            pressed && styles.captureButtonPressed,
            capturing && styles.captureButtonDisabled,
          ]}
        >
          <View style={styles.captureButtonInner} />
        </Pressable>
      </View>

      <CheatWarningModal
        visible={cheatModalVisible}
        cheatType={detectedCheat}
        onDismiss={() => {
          setCheatModalVisible(false);
          handleRetake();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Mock camera
  mockCamera: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCameraEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  mockCameraText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  mockCameraSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
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

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Camera
  cameraContainer: {
    flex: 1,
    marginHorizontal: Spacing['2xl'],
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.bgElevated,
  },
  camera: {
    flex: 1,
  },
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  guideBox: {
    width: '75%',
    height: '50%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 16,
  },
  guidePill: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 100,
  },
  guidePillText: {
    fontSize: 14,
    color: Colors.green,
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

  // Reference thumbnail
  referenceThumbnail: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'center',
  },
  referenceImage: {
    width: 60,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.green,
  },
  referenceLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Capture button
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
  captureButtonPressed: {
    transform: [{ scale: 0.95 }],
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

  // Preview state
  fullScreenImage: {
    flex: 1,
    resizeMode: 'cover',
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
  greenButton: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: Colors.green,
    borderRadius: 14,
    alignItems: 'center',
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
  greenButtonDisabled: {
    opacity: 0.7,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: Colors.red,
    flex: 1,
  },
  skipButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },

  // Verification overlay
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
  verifyingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Success state
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: 14,
    color: Colors.green,
    flex: 1,
  },

  // Retake button highlighted (when verification failed)
  retakeButtonHighlighted: {
    borderColor: Colors.orange,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  retakeButtonTextHighlighted: {
    color: Colors.orange,
    fontWeight: '600',
  },

  // Disabled button text
  greenButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // Permission states
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  permissionButton: {
    backgroundColor: Colors.green,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['3xl'],
    borderRadius: 14,
    marginBottom: Spacing.md,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  backButtonSmall: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backButtonSmallText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
