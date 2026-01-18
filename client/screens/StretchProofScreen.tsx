import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { logWakeUp, getCurrentStreak } from '@/utils/tracking';
import { setCurrentScreen, killAllSounds } from '@/utils/soundKiller';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'StretchProof'>;

const STRETCH_DURATION = 30;

export default function StretchProofScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [timeLeft, setTimeLeft] = useState(STRETCH_DURATION);
  const [isStretching, setIsStretching] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const pulseScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('StretchProof');
    }, [])
  );

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [pulseScale]);

  useEffect(() => {
    if (!isStretching) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleStretchComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStretching]);

  useEffect(() => {
    const progress = ((STRETCH_DURATION - timeLeft) / STRETCH_DURATION) * 100;
    progressWidth.value = withTiming(progress, { duration: 300 });
  }, [timeLeft, progressWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleStartStretch = useCallback(() => {
    setIsStretching(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (__DEV__) console.log('[StretchProof] Timer started');
  }, []);

  const handleStretchComplete = useCallback(async () => {
    if (__DEV__) console.log('[StretchProof] Timer complete - taking photo');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsCapturing(true);

    if (Platform.OS === 'web') {
      setPhotoTaken(true);
      await finishStretch();
      return;
    }

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: true,
        });
        if (__DEV__) console.log('[StretchProof] Photo captured:', photo?.uri);
        setPhotoTaken(true);
        await finishStretch();
      }
    } catch (error) {
      if (__DEV__) console.log('[StretchProof] Photo capture error:', error);
      await finishStretch();
    }
  }, []);

  const finishStretch = useCallback(async () => {
    killAllSounds();
    await logWakeUp(alarmId, new Date(), false, 0);
    const streak = await getCurrentStreak();

    setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'WakeUpSuccess',
            params: {
              streak,
              moneySaved: 0,
              wakeUpRate: 100,
              wakeTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              targetTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            },
          }],
        })
      );
    }, 500);
  }, [alarmId, navigation]);

  const formatTime = (seconds: number) => {
    return `${seconds}s`;
  };

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <BackgroundGlow color="orange" />
        <ThemedText style={styles.loadingText}>Loading camera...</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + Spacing.xl }]}>
        <BackgroundGlow color="orange" />
        <View style={styles.permissionContainer}>
          <ThemedText style={styles.permissionTitle}>Camera Access Required</ThemedText>
          <ThemedText style={styles.permissionText}>
            We need camera access to capture your stretch pose
          </ThemedText>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <ThemedText style={styles.permissionButtonText}>Enable Camera</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BackgroundGlow color="green" />
      
      <View style={[styles.cameraContainer, { marginTop: insets.top + Spacing.lg }]}>
        {Platform.OS !== 'web' ? (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
        ) : (
          <View style={[styles.camera, styles.webCameraPlaceholder]}>
            <ThemedText style={styles.webCameraText}>Camera Preview</ThemedText>
          </View>
        )}

        <View style={styles.cameraOverlay}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.timerSection}>
          <ThemedText style={styles.instructionText}>
            {!isStretching 
              ? 'Hold a stretch pose for 30 seconds'
              : photoTaken 
                ? 'Great stretch!' 
                : 'Keep holding your stretch!'}
          </ThemedText>

          <Animated.View style={[styles.timerContainer, isStretching && pulseStyle]}>
            <ThemedText style={[styles.timerText, timeLeft === 0 && styles.timerComplete]}>
              {timeLeft === 0 ? 'Done!' : formatTime(timeLeft)}
            </ThemedText>
          </Animated.View>

          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, progressStyle]} />
          </View>
        </View>

        {!isStretching ? (
          <Pressable 
            style={styles.startButton}
            onPress={handleStartStretch}
          >
            <ThemedText style={styles.startButtonText}>Start Stretch</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.stretchingIndicator}>
            <View style={styles.pulseDot} />
            <ThemedText style={styles.stretchingText}>
              {isCapturing ? 'Capturing...' : 'Stretching...'}
            </ThemedText>
          </View>
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
  loadingText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.orange,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.bg,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  webCameraPlaceholder: {
    backgroundColor: Colors.bgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCameraText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.green,
    borderTopLeftRadius: BorderRadius.md,
  },
  cornerTR: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.green,
    borderTopRightRadius: BorderRadius.md,
  },
  cornerBL: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.green,
    borderBottomLeftRadius: BorderRadius.md,
  },
  cornerBR: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.green,
    borderBottomRightRadius: BorderRadius.md,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  timerSection: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  instructionText: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  timerContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.bgElevated,
    borderWidth: 4,
    borderColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.green,
  },
  timerComplete: {
    fontSize: 36,
    color: Colors.green,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 4,
  },
  startButton: {
    backgroundColor: Colors.green,
    paddingVertical: 18,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.bg,
  },
  stretchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 18,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
  },
  stretchingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.green,
  },
});
