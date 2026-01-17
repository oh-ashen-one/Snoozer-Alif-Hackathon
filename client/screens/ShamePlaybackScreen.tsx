import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { scheduleSnoozeAlarm } from '@/utils/notifications';
import { getAlarmById } from '@/utils/storage';
import { getShameVideo } from '@/utils/fileSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ShamePlayback'>;

export default function ShamePlaybackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, shameVideoUri: routeVideoUri, alarmLabel, referencePhotoUri } = route.params;
  
  const videoRef = useRef<Video>(null);
  const hasScheduledSnooze = useRef(false);
  
  const [videoUri, setVideoUri] = useState<string>(routeVideoUri);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
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

      if (!routeVideoUri) {
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
  }, [alarmId, routeVideoUri]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.durationMillis && videoDuration === 0) {
      setVideoDuration(Math.ceil(status.durationMillis / 1000));
    }

    if (status.positionMillis !== undefined && status.durationMillis) {
      const remaining = Math.ceil((status.durationMillis - status.positionMillis) / 1000);
      setRemainingSeconds(Math.max(0, remaining));
    }

    if (status.didJustFinish) {
      navigation.navigate('AlarmRinging', {
        alarmId,
        alarmLabel,
        referencePhotoUri,
        shameVideoUri: videoUri,
      });
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.topOverlay}>
        <Animated.View style={pulseStyle}>
          <ThemedText style={styles.shameText}>YOU SNOOZED</ThemedText>
        </Animated.View>
      </View>
      
      {videoUri ? (
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
      ) : (
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
        </View>
      )}

      <View style={styles.bottomOverlay}>
        {remainingSeconds > 0 ? (
          <ThemedText style={styles.countdownText}>
            Video will end in {remainingSeconds}s
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
    alignItems: 'center',
  },
  shameText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingTop: Spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 16,
    color: '#78716C',
    fontWeight: '500',
  },
});
