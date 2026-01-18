import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { scheduleSnoozeAlarm } from '@/utils/notifications';
import { getAlarmById } from '@/utils/storage';
import { getShameVideo } from '@/utils/fileSystem';

// Check if we're in dev mode or on web (no video)
const isDev = __DEV__;
const isWeb = Platform.OS === 'web';
const useMockVideo = isDev || isWeb;

// Mock video component for dev/web
const MockVideoView = ({ remainingSeconds }: { remainingSeconds: number }) => (
  <View style={styles.mockVideo}>
    <Text style={styles.mockVideoEmoji}>🎬</Text>
    <Text style={styles.mockVideoText}>Shame video playing...</Text>
    <Text style={styles.mockVideoSubtext}>{remainingSeconds}s remaining</Text>
  </View>
);

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ShamePlayback'>;

export default function ShamePlaybackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, shameVideoUri: routeVideoUri, alarmLabel, referencePhotoUri } = route.params;

  const videoRef = useRef<Video>(null);
  const hasScheduledSnooze = useRef(false);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [videoUri, setVideoUri] = useState<string>(routeVideoUri || '');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoError, setVideoError] = useState<boolean>(false);

  // Pulsing animations
  const textPulse = useSharedValue(1);
  const borderPulse = useSharedValue(1);

  useEffect(() => {
    if (__DEV__) console.log('ALARM: Shame video playing');
    
    // Intense haptic feedback - you snoozed!
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Pulsing text animation (opacity)
    textPulse.value = withRepeat(
      withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Pulsing border animation (opacity)
    borderPulse.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 300, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    const setupAudioAndScheduleSnooze = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error('Error setting audio mode:', error);
      }

      if (!routeVideoUri || routeVideoUri.startsWith('mock://')) {
        const storedUri = await getShameVideo();
        if (storedUri) {
          setVideoUri(storedUri);
        }
      }

      if (!hasScheduledSnooze.current) {
        hasScheduledSnooze.current = true;
        try {
          const alarm = await getAlarmById(alarmId);
          if (alarm) {
            await scheduleSnoozeAlarm(alarm, 5);
          }
        } catch (error) {
          console.error('Error scheduling snooze alarm:', error);
        }
      }
    };

    setupAudioAndScheduleSnooze();

    // Mock video timer for dev mode
    if (useMockVideo) {
      mockTimerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (mockTimerRef.current) {
              clearInterval(mockTimerRef.current);
            }
            // Navigate when mock video "ends"
            navigation.navigate('AlarmRinging', {
              alarmId,
              alarmLabel,
              referencePhotoUri,
              shameVideoUri: videoUri,
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (mockTimerRef.current) {
        clearInterval(mockTimerRef.current);
      }
    };
  }, [alarmId, routeVideoUri, alarmLabel, referencePhotoUri, videoUri, navigation, textPulse, borderPulse]);

  const navigateBackToAlarm = () => {
    if (__DEV__) console.log('ALARM: Shame video ended, returning to alarm');
    navigation.navigate('AlarmRinging', {
      alarmId,
      alarmLabel,
      referencePhotoUri,
      shameVideoUri: videoUri,
    });
  };

  const handleSkipVideo = () => {
    if (__DEV__) console.log('ALARM: Video skipped (debug)');
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
    }
    navigateBackToAlarm();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        if (__DEV__) console.error('[ShamePlayback] Video error:', status.error);
        setVideoError(true);
        setTimeout(navigateBackToAlarm, 2000);
      }
      return;
    }

    if (status.durationMillis && videoDuration === 0) {
      setVideoDuration(Math.ceil(status.durationMillis / 1000));
    }

    if (status.positionMillis !== undefined && status.durationMillis) {
      const remaining = Math.ceil((status.durationMillis - status.positionMillis) / 1000);
      setRemainingSeconds(Math.max(0, remaining));
    }

    if (status.didJustFinish) {
      navigateBackToAlarm();
    }
  };

  // Animated styles
  const textPulseStyle = useAnimatedStyle(() => ({
    opacity: textPulse.value,
  }));

  const borderPulseStyle = useAnimatedStyle(() => ({
    opacity: borderPulse.value,
  }));

  return (
    <View style={styles.container}>
      <BackgroundGlow color="red" />
      {/* Pulsing red border - all 4 sides */}
      <Animated.View style={[styles.borderTop, borderPulseStyle]} />
      <Animated.View style={[styles.borderBottom, borderPulseStyle]} />
      <Animated.View style={[styles.borderLeft, borderPulseStyle]} />
      <Animated.View style={[styles.borderRight, borderPulseStyle]} />

      {/* Video layer */}
      {useMockVideo || !videoUri || videoUri.startsWith('mock://') ? (
        <MockVideoView remainingSeconds={remainingSeconds} />
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          volume={1.0}
          isMuted={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      )}

      {/* Top overlay - YOU SNOOZED */}
      <View style={styles.topOverlay}>
        <Animated.View style={textPulseStyle}>
          <ThemedText style={styles.shameText}>YOU SNOOZED</ThemedText>
        </Animated.View>
      </View>

      {/* Bottom overlay - countdown */}
      <View style={styles.bottomOverlay}>
        <ThemedText style={styles.watchText}>You must watch this</ThemedText>
        <ThemedText style={styles.countdownText}>
          {remainingSeconds}s remaining
        </ThemedText>

        {__DEV__ && (
          <Pressable
            testID="button-skip-video"
            style={styles.debugSkipButton}
            onPress={handleSkipVideo}
          >
            <Text style={styles.debugSkipText}>Skip Video (DEV)</Text>
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

  // Pulsing red border (4px on all sides)
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },
  borderLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },
  borderRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },

  // Video
  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // Mock video for dev/web
  mockVideo: {
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
    color: Colors.red,
    fontWeight: '700',
  },
  mockVideoSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Top overlay - YOU SNOOZED
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: Spacing['2xl'],
    backgroundColor: 'rgba(12, 10, 9, 0.5)',
    zIndex: 10,
    alignItems: 'center',
  },
  shameText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 6,
  },

  // Bottom overlay - countdown
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingTop: Spacing['2xl'],
    backgroundColor: 'rgba(12, 10, 9, 0.7)',
    zIndex: 10,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  watchText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },
  debugSkipButton: {
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  debugSkipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.red,
  },
});
