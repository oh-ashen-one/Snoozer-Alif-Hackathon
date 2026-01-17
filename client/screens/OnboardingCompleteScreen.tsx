import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { Colors, Spacing } from '@/constants/theme';
import { useAlarms } from '@/hooks/useAlarms';
import { setOnboardingComplete } from '@/utils/storage';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'OnboardingComplete'>;

export default function OnboardingCompleteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmTime, alarmLabel, referencePhotoUri, shameVideoUri } = route.params;
  const { addAlarm } = useAlarms();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withDelay(100, withSpring(1.1, { damping: 8 })),
      withSpring(1, { damping: 12 })
    );
    opacity.value = withDelay(200, withSpring(1));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleDone = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await addAlarm({
      time: alarmTime,
      label: alarmLabel,
      enabled: true,
      referencePhotoUri,
      shameVideoUri,
    });

    await setOnboardingComplete(true);

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing['5xl'], paddingBottom: insets.bottom + Spacing['3xl'] }]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Feather name="check-circle" size={80} color={Colors.green} />
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentStyle]}>
          <ThemedText style={styles.title}>You're All Set</ThemedText>
          <ThemedText style={styles.subtitle}>
            Your alarm is active. Don't snooze.
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttonContainer, contentStyle]}>
        <Button onPress={handleDone} style={styles.doneButton}>
          Done
        </Button>
      </Animated.View>
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
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  doneButton: {
    backgroundColor: Colors.orange,
  },
});
