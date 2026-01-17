import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ProofCamera'>;

export default function ProofCameraScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, referencePhotoUri } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (photo?.uri) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        );
      }
    } catch (error) {
      console.error('Error taking proof photo:', error);
    } finally {
      setCapturing(false);
    }
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
          Enable camera access to dismiss the alarm.
        </ThemedText>
        <Button onPress={requestPermission} style={styles.permissionButton}>
          Enable Camera
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.referenceContainer, { top: headerHeight + Spacing.lg }]}>
        <Image
          source={{ uri: referencePhotoUri }}
          style={styles.referencePhoto}
        />
        <ThemedText style={styles.referenceLabel}>Reference</ThemedText>
      </View>

      <View style={[styles.instructionBar, { top: headerHeight + Spacing.lg + 90 }]}>
        <ThemedText style={styles.instructionText}>
          Match your reference photo
        </ThemedText>
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
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
  referenceContainer: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 10,
    alignItems: 'center',
  },
  referencePhoto: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  referenceLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  instructionBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: 100,
    backgroundColor: 'rgba(20, 18, 17, 0.9)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    zIndex: 10,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
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
    backgroundColor: Colors.green,
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
    backgroundColor: Colors.green,
    borderWidth: 3,
    borderColor: Colors.text,
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
