import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Image, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { CameraView } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getAlarmById } from '@/utils/storage';
import { cancelAlarm } from '@/utils/notifications';
import { saveProofPhoto } from '@/utils/fileSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ProofCamera'>;

// Check if we're in dev mode or on web (no camera)
const isDev = __DEV__;
const isWeb = Platform.OS === 'web';
const useMockCamera = isDev || isWeb;

// Mock camera placeholder component
const MockCameraView = () => (
  <View style={styles.mockCamera}>
    <Text style={styles.mockCameraEmoji}>📷</Text>
    <Text style={styles.mockCameraText}>Camera preview</Text>
    {isDev && <Text style={styles.mockCameraSubtext}>(Dev mode - mock camera)</Text>}
  </View>
);

export default function ProofCameraScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, referencePhotoUri } = route.params;

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (__DEV__) console.log('[ProofCamera] Capture started');

    try {
      if (useMockCamera) {
        // Mock capture - just use a placeholder
        if (__DEV__) console.log('[ProofCamera] Mock capture - setting photo URI');
        // Simulate a brief delay
        await new Promise(resolve => setTimeout(resolve, 300));
        setPhotoUri('mock://proof-photo');
        if (__DEV__) console.log('[ProofCamera] Photo URI set to mock');
      } else if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        if (photo?.uri) {
          setPhotoUri(photo.uri);
          if (__DEV__) console.log('[ProofCamera] Photo URI set:', photo.uri);
        }
      }
    } catch (error) {
      if (__DEV__) console.log('[ProofCamera] Capture error:', error);
      // On error, use mock data to continue flow
      setPhotoUri('mock://proof-photo');
    } finally {
      setCapturing(false);
      if (__DEV__) console.log('[ProofCamera] Capture complete, photoUri should be set');
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoUri(null);
  };

  const handleConfirm = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (__DEV__) console.log('ALARM: Alarm dismissed');

    try {
      if (photoUri && !photoUri.startsWith('mock://')) {
        await saveProofPhoto(photoUri);
      }

      const alarm = await getAlarmById(alarmId);
      if (alarm?.notificationId) {
        await cancelAlarm(alarm.notificationId);
      }
    } catch (error) {
      if (__DEV__) console.log('[ProofCamera] Error during dismiss:', error);
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  // Preview state after capturing
  if (photoUri) {
    return (
      <View style={styles.container}>
        {photoUri.startsWith('mock://') ? (
          <View style={styles.mockPreview}>
            <Text style={styles.mockPreviewEmoji}>✅</Text>
            <Text style={styles.mockPreviewText}>Photo captured</Text>
          </View>
        ) : (
          <Image source={{ uri: photoUri }} style={styles.fullScreenImage} />
        )}

        <View style={[styles.previewControls, { paddingBottom: insets.bottom + 24 }]}>
          <Pressable testID="button-retake-proof" style={styles.secondaryButton} onPress={handleRetake}>
            <ThemedText style={styles.secondaryButtonText}>Retake</ThemedText>
          </Pressable>

          <Pressable testID="button-confirm-proof" style={styles.greenButton} onPress={handleConfirm}>
            <ThemedText style={styles.greenButtonText}>Looks good!</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  // Camera state
  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>
        <ThemedText style={styles.topBarTitle}>Take your proof photo</ThemedText>
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
              <ThemedText style={styles.guidePillText}>Align with reference</ThemedText>
            </View>
          </View>
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
    backgroundColor: '#1C1917',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCameraEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  mockCameraText: {
    fontSize: 16,
    color: '#57534E',
    fontWeight: '500',
  },
  mockCameraSubtext: {
    fontSize: 12,
    color: '#57534E',
    marginTop: Spacing.xs,
  },
  mockPreview: {
    flex: 1,
    backgroundColor: '#1C1917',
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
    color: '#57534E',
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
});
