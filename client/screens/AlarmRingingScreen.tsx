import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Modal, Pressable } from 'react-native';
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
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmRinging'>;

const SNOOZE_CONFIRMATION = 'I FAIL';

export default function AlarmRingingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId, alarmLabel, referencePhotoUri, shameVideoUri } = route.params;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeInput, setSnoozeInput] = useState('');
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

  const handleTakePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('ProofCamera', {
      alarmId,
      referencePhotoUri,
    });
  };

  const handleSnoozePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSnoozeModal(true);
    setSnoozeInput('');
  };

  const handleSnoozeConfirm = () => {
    if (snoozeInput.toUpperCase() === SNOOZE_CONFIRMATION) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowSnoozeModal(false);
      navigation.navigate('ShamePlayback', {
        alarmId,
        shameVideoUri,
        alarmLabel,
        referencePhotoUri,
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSnoozeCancel = () => {
    setShowSnoozeModal(false);
    setSnoozeInput('');
  };

  const isSnoozeValid = snoozeInput.toUpperCase() === SNOOZE_CONFIRMATION;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing['2xl'], paddingBottom: insets.bottom + Spacing.xl }]}>
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
        <Button onPress={handleTakePhoto} variant="success" style={styles.takePhotoButton}>
          Take Photo to Dismiss
        </Button>
        
        <View style={styles.snoozeSection}>
          <Button onPress={handleSnoozePress} variant="danger" style={styles.snoozeButton}>
            Snooze
          </Button>
          <ThemedText style={styles.snoozeWarning}>
            Requires typing "I FAIL" - plays your shame video
          </ThemedText>
        </View>
      </View>

      <Modal
        visible={showSnoozeModal}
        transparent
        animationType="fade"
        onRequestClose={handleSnoozeCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Confirm Snooze</ThemedText>
            <ThemedText style={styles.modalSubtitle}>
              Type "I FAIL" to snooze and watch your shame video
            </ThemedText>
            
            <TextInput
              style={styles.modalInput}
              value={snoozeInput}
              onChangeText={setSnoozeInput}
              placeholder="Type here..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalCancelButton} 
                onPress={handleSnoozeCancel}
              >
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              
              <Pressable
                style={[
                  styles.modalConfirmButton,
                  !isSnoozeValid && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleSnoozeConfirm}
                disabled={!isSnoozeValid}
              >
                <ThemedText style={styles.modalConfirmText}>
                  Confirm Snooze
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.xl,
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
    marginBottom: Spacing['2xl'],
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
  takePhotoButton: {
    height: 60,
  },
  snoozeSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  snoozeButton: {
    width: '100%',
  },
  snoozeWarning: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.red,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
