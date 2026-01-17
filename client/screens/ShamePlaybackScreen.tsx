import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ShamePlayback'>;

export default function ShamePlaybackScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, shameVideoUri, alarmLabel, referencePhotoUri } = route.params;
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    const setMaxVolume = async () => {
      if (videoRef.current) {
        await videoRef.current.setVolumeAsync(1.0);
      }
    };
    setMaxVolume();
  }, []);

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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
    alignItems: 'center',
  },
  shameText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
