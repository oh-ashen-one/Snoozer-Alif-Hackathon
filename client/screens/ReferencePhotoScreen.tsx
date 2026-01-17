import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { savePhoto, generatePhotoFilename } from '@/utils/fileSystem';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ReferencePhoto'>;

export default function ReferencePhotoScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmTime, alarmLabel, isOnboarding } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoUri(null);
  };

  const handleNext = async () => {
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

  if (!permission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ThemedText>Loading camera...</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: headerHeight }]}>
        <View style={styles.permissionIcon}>
          <Feather name="camera-off" size={48} color={Colors.textMuted} />
        </View>
        <ThemedText style={styles.permissionTitle}>Camera Access Required</ThemedText>
        <ThemedText style={styles.permissionText}>
          Snoozer needs camera access to take reference photos for alarm verification.
        </ThemedText>
        <Button onPress={requestPermission} style={styles.permissionButton}>
          Enable Camera
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.instructionBar, { top: headerHeight + Spacing.lg }]}>
        <ThemedText style={styles.instructionText}>
          Take a photo of where you'll dismiss the alarm
        </ThemedText>
      </View>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />
      )}

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {photoUri ? (
          <View style={styles.photoControls}>
            <Button onPress={handleRetake} style={styles.retakeButton}>
              Retake
            </Button>
            <Button onPress={handleNext} style={styles.nextButton}>
              Next
            </Button>
          </View>
        ) : (
          <Pressable
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  instructionBar: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    backgroundColor: 'rgba(20, 18, 17, 0.9)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    zIndex: 10,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
    resizeMode: 'cover',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  captureButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.orange,
    borderWidth: 3,
    borderColor: Colors.text,
  },
  photoControls: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  retakeButton: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.orange,
  },
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
  permissionButton: {
    backgroundColor: Colors.orange,
    paddingHorizontal: Spacing['3xl'],
  },
});
