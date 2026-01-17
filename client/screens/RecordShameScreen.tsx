import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { saveVideo, generateVideoFilename } from '@/utils/fileSystem';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'RecordShame'>;

export default function RecordShameScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmTime, alarmLabel, referencePhotoUri, isOnboarding } = route.params;

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 30,
      });
      if (video?.uri) {
        setVideoUri(video.uri);
      }
    } catch (error) {
      console.error('Error recording video:', error);
    } finally {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cameraRef.current.stopRecording();
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVideoUri(null);
    setRecordingDuration(0);
  };

  const handleNext = async () => {
    if (!videoUri) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tempId = Date.now().toString();
    const filename = generateVideoFilename(tempId);
    const savedUri = await saveVideo(videoUri, filename);

    navigation.navigate('OnboardingComplete', {
      alarmTime,
      alarmLabel,
      referencePhotoUri,
      shameVideoUri: savedUri || videoUri,
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasPermissions = cameraPermission?.granted && micPermission?.granted;

  if (!cameraPermission || !micPermission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ThemedText>Loading permissions...</ThemedText>
      </View>
    );
  }

  if (!hasPermissions) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: headerHeight }]}>
        <View style={styles.permissionIcon}>
          <Feather name="video-off" size={48} color={Colors.textMuted} />
        </View>
        <ThemedText style={styles.permissionTitle}>Camera & Microphone Required</ThemedText>
        <ThemedText style={styles.permissionText}>
          Snoozer needs camera and microphone access to record your shame video.
        </ThemedText>
        <View style={styles.permissionButtons}>
          {!cameraPermission.granted ? (
            <Button onPress={requestCameraPermission} style={styles.permissionButton}>
              Enable Camera
            </Button>
          ) : null}
          {!micPermission.granted ? (
            <Button onPress={requestMicPermission} style={styles.permissionButton}>
              Enable Microphone
            </Button>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.instructionBar, { top: headerHeight + Spacing.lg }]}>
        <ThemedText style={styles.instructionText}>
          Record what you'll see if you snooze. Make it embarrassing.
        </ThemedText>
      </View>

      {videoUri ? (
        <Video
          source={{ uri: videoUri }}
          style={styles.videoPreview}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted={false}
        />
      ) : (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          mode="video"
        />
      )}

      {isRecording ? (
        <View style={[styles.recordingIndicator, { top: headerHeight + Spacing.lg + 60 }]}>
          <View style={styles.recordingDot} />
          <ThemedText style={styles.recordingTime}>
            {formatDuration(recordingDuration)}
          </ThemedText>
        </View>
      ) : null}

      <View style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {videoUri ? (
          <View style={styles.videoControls}>
            <Button onPress={handleRetake} style={styles.retakeButton}>
              Retake
            </Button>
            <Button onPress={handleNext} style={styles.nextButton}>
              Next
            </Button>
          </View>
        ) : (
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            style={({ pressed }) => [
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              pressed && styles.recordButtonPressed,
            ]}
          >
            <View style={[
              styles.recordButtonInner,
              isRecording && styles.recordButtonInnerActive,
            ]} />
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
    color: Colors.textMuted,
    textAlign: 'center',
  },
  camera: {
    flex: 1,
  },
  videoPreview: {
    flex: 1,
  },
  recordingIndicator: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    zIndex: 10,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.red,
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.orange,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  recordButton: {
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
  recordButtonActive: {
    backgroundColor: Colors.red,
  },
  recordButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  recordButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.orange,
    borderWidth: 3,
    borderColor: Colors.text,
  },
  recordButtonInnerActive: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: Colors.red,
    borderWidth: 0,
  },
  videoControls: {
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
  permissionButtons: {
    gap: Spacing.md,
    width: '100%',
  },
  permissionButton: {
    backgroundColor: Colors.orange,
  },
});
