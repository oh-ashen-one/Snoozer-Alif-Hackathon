import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { clearAllData } from '@/utils/storage';
import { useAlarms } from '@/hooks/useAlarms';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { alarms } = useAlarms();

  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const togglePosition = useSharedValue(vibrationEnabled ? 23 : 3);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleUpdateProofLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ReferencePhoto', {
      alarmTime: '',
      alarmLabel: '',
      isOnboarding: false,
    });
  };

  const handleRerecordShameVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const firstAlarm = alarms[0];
    navigation.navigate('RecordShame', {
      alarmTime: firstAlarm?.time || '07:00',
      alarmLabel: firstAlarm?.label || 'Wake up',
      referencePhotoUri: firstAlarm?.referencePhotoUri || '',
      isOnboarding: false,
    });
  };

  const handleToggleVibration = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    togglePosition.value = withTiming(newValue ? 23 : 3, { duration: 200 });
  };

  const handleDeleteAllData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your alarms, photos, and videos. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'AddAlarm', params: { isOnboarding: true } }],
              })
            );
          },
        },
      ]
    );
  };

  const toggleKnobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePosition.value }],
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Proof Photo Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>PROOF PHOTO</ThemedText>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={handleUpdateProofLocation}>
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowEmoji}>📍</ThemedText>
                <ThemedText style={styles.rowText}>Update proof location</ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color="#57534E" />
            </Pressable>
          </View>
        </View>

        {/* Shame Video Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>SHAME VIDEO</ThemedText>
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={handleRerecordShameVideo}>
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowEmoji}>🎬</ThemedText>
                <ThemedText style={styles.rowText}>Re-record shame video</ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color="#57534E" />
            </Pressable>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>NOTIFICATIONS</ThemedText>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowEmoji}>🔔</ThemedText>
                <ThemedText style={styles.rowText}>Alarm sound</ThemedText>
              </View>
              <ThemedText style={styles.rowValueText}>Default</ThemedText>
            </View>
            <View style={styles.rowDivider} />
            <Pressable style={styles.row} onPress={handleToggleVibration}>
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowEmoji}>📳</ThemedText>
                <ThemedText style={styles.rowText}>Vibration</ThemedText>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: vibrationEnabled ? Colors.green : Colors.border }
              ]}>
                <Animated.View style={[styles.toggleKnob, toggleKnobStyle]} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <ThemedText style={styles.dangerLabel}>DANGER ZONE</ThemedText>
          <View style={styles.dangerCard}>
            <Pressable style={styles.row} onPress={handleDeleteAllData}>
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowEmoji}>🗑️</ThemedText>
                <ThemedText style={styles.dangerText}>Delete all data</ThemedText>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <ThemedText style={styles.versionText}>Snoozer v1.0</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  dangerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },

  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dangerCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    overflow: 'hidden',
  },

  // Row
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowEmoji: {
    fontSize: 18,
    marginRight: Spacing.md,
  },
  rowText: {
    fontSize: 16,
    color: Colors.text,
  },
  rowValueText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg,
  },
  dangerText: {
    fontSize: 16,
    color: Colors.red,
  },

  // Toggle
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  versionText: {
    fontSize: 12,
    color: '#57534E',
  },
});
