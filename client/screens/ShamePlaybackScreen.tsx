import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Platform, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { shameTriggerPattern, hapticFeedback } from '@/utils/haptics';
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
import { getAlarmById, getBuddyInfo } from '@/utils/storage';
import { getCurrentStreak } from '@/utils/tracking';
import { getShameVideo } from '@/utils/fileSystem';
import { useIMessage } from '@/hooks/useIMessage';
import { setCurrentScreen } from '@/utils/soundKiller';

// Check if we're on web (no video)
const isWeb = Platform.OS === 'web';
const useMockVideo = isWeb;

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
  const {
    alarmId,
    shameVideoUri: routeVideoUri,
    alarmLabel,
    referencePhotoUri,
    showPaymentAfter,
    buddyPhone,
  } = route.params;

  const { sendShameMessage } = useIMessage();

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
    // Set current screen to allow audio
    setCurrentScreen('ShamePlayback');
    
    if (__DEV__) console.log('ALARM: Shame video playing');
    
    // Intense haptic feedback pattern - you snoozed!
    shameTriggerPattern();

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

  const navigateToShameSent = async () => {
    if (__DEV__) console.log('ALARM: Shame video ended, showing shame sent screen');

    // Get buddy info and streak for shame screen
    const [buddy, streak] = await Promise.all([
      getBuddyInfo(),
      getCurrentStreak(),
    ]);

    const buddyName = buddy?.name || 'Your buddy';
    const penaltyAmount = 5; // Could be passed as param

    // Send shame message to buddy (auto-opens Messages app)
    if (buddyPhone) {
      try {
        await sendShameMessage(
          { name: buddyName, phone: buddyPhone, type: 'buddy' },
          alarmLabel || 'Your buddy',
          penaltyAmount
        );
        if (__DEV__) console.log('[ShamePlayback] Shame message sent');
      } catch (error) {
        // Silent fail - don't block user flow
        if (__DEV__) console.log('[ShamePlayback] Could not send shame message:', error);
      }
    }

    // Format current time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const currentTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

    navigation.navigate('ShameSent', {
      buddyName,
      amount: penaltyAmount,
      currentTime,
      previousStreak: streak,
      executedPunishments: ['shame_video'],
      moneyEnabled: true,
    });
  };

  // Navigate when mock video countdown reaches 0
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (useMockVideo && remainingSeconds === 0 && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigateToShameSent();
    }
  }, [remainingSeconds]);

  const handleSkipVideo = () => {
    if (__DEV__) console.log('ALARM: Video skipped (debug)');
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
    }
    navigateToShameSent();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        if (__DEV__) console.error('[ShamePlayback] Video error:', status.error);
        setVideoError(true);
        setTimeout(navigateToShameSent, 2000);
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
      navigateToShameSent();
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

{isWeb && (
          <Pressable
            testID="button-skip-video"
            style={styles.debugSkipButton}
            onPress={handleSkipVideo}
          >
            <Text style={styles.debugSkipText}>Skip Video (Web)</Text>
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
