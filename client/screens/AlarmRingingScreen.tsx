import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmRinging'>;

export default function AlarmRingingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, alarmLabel, referencePhotoUri, shameVideoUri } = route.params;

  const [currentTime, setCurrentTime] = useState(new Date());
  const pulse = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    pulse.value = withRepeat(
      withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    return () => clearInterval(interval);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return {
      time: `${displayHours}:${minutes.toString().padStart(2, '0')}`,
      period,
    };
  };

  const { time, period } = formatTime(currentTime);

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('ProofCamera', {
      alarmId,
      referencePhotoUri,
    });
  };

  const handleSnooze = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    navigation.navigate('ShamePlayback', {
      alarmId,
      shameVideoUri,
      alarmLabel,
      referencePhotoUri,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing['3xl'], paddingBottom: insets.bottom + Spacing['2xl'] }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, pulseStyle]}>
          <Feather name="bell" size={48} color={Colors.orange} />
        </Animated.View>

        <View style={styles.timeContainer}>
          <View style={styles.timeRow}>
            <ThemedText style={styles.time}>{time}</ThemedText>
            <ThemedText style={styles.period}>{period}</ThemedText>
          </View>
          <ThemedText style={styles.label}>{alarmLabel || 'Alarm'}</ThemedText>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button onPress={handleDismiss} style={styles.dismissButton}>
          Dismiss
        </Button>
        
        <View style={styles.snoozeSection}>
          <Button onPress={handleSnooze} style={styles.snoozeButton}>
            Snooze
          </Button>
          <ThemedText style={styles.snoozeWarning}>
            This will play your shame video
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  timeContainer: {
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  time: {
    fontSize: 72,
    fontWeight: '700',
    color: Colors.text,
  },
  period: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  buttonContainer: {
    gap: Spacing.lg,
  },
  dismissButton: {
    backgroundColor: Colors.green,
    height: 60,
  },
  snoozeSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  snoozeButton: {
    backgroundColor: Colors.red,
    width: '100%',
  },
  snoozeWarning: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
