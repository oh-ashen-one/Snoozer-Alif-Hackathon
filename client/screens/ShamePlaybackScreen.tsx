import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { scheduleSnoozeAlarm } from '@/utils/notifications';
import { getAlarmById } from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ShamePlayback'>;

export default function ShamePlaybackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, shameVideoUri, alarmLabel, referencePhotoUri } = route.params;
  const videoRef = useRef<Video>(null);
  const hasScheduledSnooze = useRef(false);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
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
  }, [alarmId]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      navigation.navigate('AlarmRinging', {
        alarmId,
        alarmLabel,
        referencePhotoUri,
        shameVideoUri,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <ThemedText style={styles.shameText}>You Snoozed</ThemedText>
        <ThemedText style={styles.shameSubtext}>Alarm rescheduled for 5 minutes</ThemedText>
      </View>
      
      <Video
        ref={videoRef}
        source={{ uri: shameVideoUri }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        volume={1.0}
        isMuted={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  video: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
    alignItems: 'center',
  },
  shameText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  shameSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
