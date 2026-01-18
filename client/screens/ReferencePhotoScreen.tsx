import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Text, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ProgressDots } from '@/components/ProgressDots';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { saveReferencePhoto } from '@/utils/fileSystem';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useAlarms } from '@/hooks/useAlarms';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ReferencePhoto'>;
type Phase = 'intro' | 'camera' | 'confirm';

// Check if we're on web (no camera)
const isWeb = Platform.OS === 'web';
const useMockCamera = isWeb;

const TIPS = [
  { text: 'Stand where you brush your teeth', icon: '🪥' },
  { text: 'Include the mirror or a landmark', icon: '🪞' },
  { text: 'Good lighting helps matching', icon: '💡' },
];

// Mock camera placeholder component for web
const MockCameraView = () => (
  <View style={styles.mockCamera}>
    <Text style={styles.mockCameraEmoji}>📷</Text>
    <Text style={styles.mockCameraText}>Camera preview</Text>
    <Text style={styles.mockCameraSubtext}>(Web preview)</Text>
  </View>
);

export default function ReferencePhotoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmTime, alarmLabel, isOnboarding, punishment, extraPunishments, days } = route.params;
  const { alarms, updateAlarm } = useAlarms();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('intro');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const fadeIn = useSharedValue(0);

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
      }
    } catch (error) {
      console.log('[ReferencePhoto] Failed to open settings:', error);
    }
  };

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [fadeIn]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
  }));

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('camera');
  };

  const handleCapture = async () => {
    if (capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (useMockCamera) {
        console.log('[ReferencePhoto] Mock capture - would take photo here');
        await new Promise(resolve => setTimeout(resolve, 300));
        setPhotoUri('mock://reference-photo');
        setPhase('confirm');
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        if (photo?.uri) {
          setPhotoUri(photo.uri);
          setPhase('confirm');
        }
      }
    } catch (error) {
      console.log('[ReferencePhoto] Capture error:', error);
      // On error, use mock data to continue flow
      setPhotoUri('mock://reference-photo');
      setPhase('confirm');
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoUri(null);
    setPhase('camera');
  };

  const handleConfirm = async () => {
    if (!photoUri) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let savedUri = photoUri;

      // Only save if it's a real photo
      if (!photoUri.startsWith('mock://')) {
        const result = await saveReferencePhoto(photoUri);
        if (result) savedUri = result;
      }

      // If coming from settings, update alarm and go back to settings
      if (isOnboarding === false) {
        console.log('[ReferencePhoto] Updating proof activity from settings');
        const firstAlarm = alarms[0];
        if (firstAlarm) {
          await updateAlarm(firstAlarm.id, { referencePhotoUri: savedUri });
        }
        navigation.navigate('Settings');
        return;
      }

      // Onboarding flow - continue to shame video
      console.log('[ReferencePhoto] Confirmed, navigating to RecordShame');
      navigation.navigate('RecordShame', {
        alarmTime,
        alarmLabel,
        referencePhotoUri: savedUri,
        isOnboarding,
        punishment,
        extraPunishments,
        days,
      });
    } catch (error) {
      console.error('[ReferencePhoto] Error confirming photo:', error);
      if (isOnboarding === false) {
        navigation.navigate('Settings');
      }
    }
  };

  // INTRO PHASE
  if (phase === 'intro') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="green" />
        <Animated.View style={[styles.introContent, fadeStyle]}>
          {/* Progress dots */}
          <View style={styles.progressContainer}>
            <ProgressDots total={4} current={3} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={{ fontSize: 18 }}>📷</Text>
              <ThemedText style={styles.badgeText}>Proof setup</ThemedText>
            </View>

            <ThemedText style={styles.title}>Set your wake-up spot</ThemedText>
            <ThemedText style={styles.subtitle}>
              Take a photo of your bathroom. You'll need to{'\n'}match it every morning to dismiss the alarm.
            </ThemedText>
          </View>

          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationCard}>
              <View style={styles.bathroomIcon}>
                <Text style={{ fontSize: 40 }}>📷</Text>
              </View>
              <ThemedText style={styles.illustrationTitle}>Your bathroom</ThemedText>
              <ThemedText style={styles.illustrationSubtitle}>Reference photo</ThemedText>

              {/* Corner guides */}
              <View style={[styles.cornerGuide, styles.cornerTopLeft]} />
              <View style={[styles.cornerGuide, styles.cornerTopRight]} />
              <View style={[styles.cornerGuide, styles.cornerBottomLeft]} />
              <View style={[styles.cornerGuide, styles.cornerBottomRight]} />
            </View>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              {TIPS.map((tip, i) => (
                <View key={i} style={styles.tipCard}>
                  <ThemedText style={styles.tipIcon}>{tip.icon}</ThemedText>
                  <ThemedText style={styles.tipText}>{tip.text}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Bottom CTA */}
        <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable testID="button-take-photo" style={styles.greenButton} onPress={handleTakePhoto}>
            <Text style={{ fontSize: 20 }}>📷</Text>
            <ThemedText style={styles.greenButtonText}>Take reference photo</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // CAMERA PHASE
  if (phase === 'camera') {
    // Permission loading state
    if (!isWeb && !permission) {
      return (
        <View style={[styles.container, styles.permissionContainer]}>
          <BackgroundGlow color="green" />
          <Text style={styles.permissionLoadingText}>Loading camera...</Text>
        </View>
      );
    }

    // Permission denied state
    if (!isWeb && permission && !permission.granted) {
      return (
        <View style={[styles.container, styles.permissionContainer]}>
          <BackgroundGlow color="green" />
          <View style={styles.permissionContent}>
            <Text style={styles.permissionEmoji}>📷</Text>
            <ThemedText style={styles.permissionTitle}>Camera Access Needed</ThemedText>
            <ThemedText style={styles.permissionText}>
              We need camera access to take your reference photo.
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
            
            <Pressable style={styles.backButtonSmall} onPress={() => setPhase('intro')}>
              <ThemedText style={styles.backButtonSmallText}>Go Back</ThemedText>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <BackgroundGlow color="green" />
        {/* Top bar */}
        <View style={[styles.cameraTopBar, { paddingTop: insets.top + 16 }]}>
          <Pressable style={styles.backButton} onPress={() => setPhase('intro')}>
            <ThemedText style={styles.backButtonText}>Back</ThemedText>
          </Pressable>
          <ThemedText style={styles.cameraTitle}>Reference photo</ThemedText>
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
            <View style={styles.guideBox}>
              <View style={styles.guidePill}>
                <ThemedText style={styles.guidePillText}>Align your bathroom here</ThemedText>
              </View>
            </View>
          </View>

          {/* Corner guides */}
          <View style={[styles.cameraCorner, styles.cameraCornerTL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
          <View style={[styles.cameraCorner, styles.cameraCornerBR]} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <ThemedText style={styles.instructionTitle}>Point at your bathroom mirror</ThemedText>
          <ThemedText style={styles.instructionSubtitle}>This is where you'll prove you're awake</ThemedText>
        </View>

        {/* Capture button */}
        <View style={[styles.captureContainer, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            testID="button-capture"
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
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

  // CONFIRM PHASE
  if (phase === 'confirm') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BackgroundGlow color="green" />
        <View style={styles.confirmContent}>
          {/* Success icon */}
          <View style={styles.successIcon}>
            <Text style={{ fontSize: 40 }}>✓</Text>
          </View>

          <ThemedText style={styles.confirmTitle}>Looking good!</ThemedText>
          <ThemedText style={styles.confirmSubtitle}>
            This is where you'll take your proof photo{'\n'}every morning to dismiss the alarm.
          </ThemedText>

          {/* Photo preview */}
          <View style={styles.previewContainer}>
            {photoUri && !photoUri.startsWith('mock://') ? (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.mockPreview}>
                <Text style={styles.mockPreviewEmoji}>🛁</Text>
                <Text style={styles.mockPreviewText}>Bathroom photo</Text>
              </View>
            )}
            <View style={styles.locationBadge}>
              <Text style={{ fontSize: 14 }}>📍</Text>
              <ThemedText style={styles.locationText}>Bathroom</ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom buttons */}
        <View style={[styles.confirmButtons, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable testID="button-retake" style={styles.secondaryButton} onPress={handleRetake}>
            <ThemedText style={styles.secondaryButtonText}>Retake photo</ThemedText>
          </Pressable>

          <Pressable testID="button-confirm" style={styles.greenButton} onPress={handleConfirm}>
            <ThemedText style={styles.greenButtonText}>Looks good, continue</ThemedText>
            <Text style={{ fontSize: 20 }}>→</Text>
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
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  mockPreviewText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Intro Phase
  introContent: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: Spacing['2xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  illustrationCard: {
    width: 200,
    height: 260,
    backgroundColor: Colors.bgElevated,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bathroomIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  illustrationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  illustrationSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cornerGuide: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3F3A36',
  },
  cornerTopLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 16,
    right: 16,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 4,
  },
  tipsContainer: {
    marginTop: Spacing['3xl'],
    width: '100%',
    maxWidth: 300,
    gap: Spacing.md,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
  },
  tipIcon: {
    fontSize: 18,
  },
  tipText: {
    fontSize: 14,
    color: Colors.textSecondary,
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

  // Camera Phase
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
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
  guideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideBox: {
    width: '75%',
    height: '50%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  instructionsContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  instructionSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
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

  // Confirm Phase
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
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  locationBadge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 100,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  permissionLoadingText: {
    fontSize: 16,
    color: Colors.textMuted,
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
