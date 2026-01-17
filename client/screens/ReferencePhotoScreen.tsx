import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { ProgressDots } from '@/components/ProgressDots';
import { Colors, Spacing } from '@/constants/theme';
import { savePhoto, generatePhotoFilename } from '@/utils/fileSystem';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ReferencePhoto'>;
type Phase = 'intro' | 'camera' | 'confirm';

const TIPS = [
  { text: 'Stand where you brush your teeth', icon: '🪥' },
  { text: 'Include the mirror or a landmark', icon: '🪞' },
  { text: 'Good lighting helps matching', icon: '💡' },
];

export default function ReferencePhotoScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmTime, alarmLabel, isOnboarding } = route.params;

  const [phase, setPhase] = useState<Phase>('intro');
  const [permission, requestPermission] = useCameraPermissions();
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

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('camera');
  };

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setPhase('confirm');
      }
    } catch (error) {
      // Handle error silently
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tempId = Date.now().toString();
    const filename = generatePhotoFilename(tempId);
    const savedUri = await savePhoto(photoUri, filename);

    navigation.navigate('RecordShame', {
      alarmTime,
      alarmLabel,
      referencePhotoUri: savedUri || photoUri,
      isOnboarding,
    });
  };

  // INTRO PHASE
  if (phase === 'intro') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.introContent, fadeStyle]}>
          {/* Progress dots */}
          <View style={styles.progressContainer}>
            <ProgressDots total={4} current={3} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Feather name="aperture" size={18} color={Colors.green} />
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
                <Feather name="aperture" size={40} color={Colors.green} />
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
          <Pressable style={styles.greenButton} onPress={handleTakePhoto}>
            <Feather name="camera" size={20} color={Colors.text} />
            <ThemedText style={styles.greenButtonText}>Take reference photo</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // CAMERA PHASE
  if (phase === 'camera') {
    return (
      <View style={styles.container}>
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
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />

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
        <View style={styles.confirmContent}>
          {/* Success icon */}
          <View style={styles.successIcon}>
            <Feather name="check" size={40} color={Colors.green} />
          </View>

          <ThemedText style={styles.confirmTitle}>Looking good!</ThemedText>
          <ThemedText style={styles.confirmSubtitle}>
            This is where you'll take your proof photo{'\n'}every morning to dismiss the alarm.
          </ThemedText>

          {/* Photo preview */}
          <View style={styles.previewContainer}>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            )}
            <View style={styles.locationBadge}>
              <Feather name="map-pin" size={14} color={Colors.textSecondary} />
              <ThemedText style={styles.locationText}>Bathroom</ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom buttons */}
        <View style={[styles.confirmButtons, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable style={styles.secondaryButton} onPress={handleRetake}>
            <ThemedText style={styles.secondaryButtonText}>Retake photo</ThemedText>
          </Pressable>

          <Pressable style={styles.greenButton} onPress={handleConfirm}>
            <ThemedText style={styles.greenButtonText}>Looks good, continue</ThemedText>
            <Feather name="arrow-right" size={20} color={Colors.text} />
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
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
    backgroundColor: Colors.bgCard,
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
    backgroundColor: Colors.bgCard,
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
    marginHorizontal: Spacing.lg,
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

  // Permission
  permissionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
});
