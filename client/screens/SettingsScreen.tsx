import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Linking,
  Share,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BottomNav } from '@/components/BottomNav';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import { AnimatedToggle } from '@/components/AnimatedToggle';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { setOnboardingComplete } from '@/utils/storage';
import { useAlarms } from '@/hooks/useAlarms';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEYS = {
  VIBRATION_ENABLED: '@snoozer/vibration_enabled',
  ALARM_SOUND: '@snoozer/alarm_sound',
};

export const ALARM_SOUNDS = [
  { id: 'nuclear', name: 'Nuclear Alarm' },
  { id: 'mosquito', name: 'Mosquito Swarm' },
  { id: 'emp', name: 'EMP Blast' },
  { id: 'siren', name: 'Siren From Hell' },
  { id: 'chaos', name: 'Chaos Engine' },
  { id: 'escalator', name: 'The Escalator' },
  { id: 'ear-shatter', name: 'Ear Shatter' },
  { id: 'high-pitch', name: 'High Pitch' },
] as const;

export type AlarmSoundId = typeof ALARM_SOUNDS[number]['id'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Icon background colors
const ICON_COLORS = {
  orange: 'rgba(251,146,60,0.15)',
  purple: 'rgba(147,51,234,0.15)',
  blue: 'rgba(59,130,246,0.15)',
  green: 'rgba(34,197,94,0.15)',
  gray: 'rgba(120,113,108,0.15)',
  red: 'rgba(239,68,68,0.15)',
};

// Reusable Settings Row Component
interface SettingsRowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}

function SettingsRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  onPress,
  showChevron = true,
  rightElement,
  isDestructive = false,
}: SettingsRowProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  const content = (
    <>
      <View style={styles.rowLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Feather name={icon as any} size={18} color={iconColor} />
        </View>
        <ThemedText style={[styles.rowText, isDestructive && styles.dangerText]}>
          {label}
        </ThemedText>
      </View>
      {rightElement || (
        <View style={styles.rowRight}>
          {value && <ThemedText style={styles.rowValueText}>{value}</ThemedText>}
          {showChevron && onPress && (
            <Feather name="chevron-right" size={20} color="#57534E" />
          )}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={handlePress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

// Toggle Component
function Toggle({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  const translateX = useSharedValue(value ? 23 : 3);

  React.useEffect(() => {
    translateX.value = withTiming(value ? 23 : 3, { duration: 200 });
  }, [value, translateX]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      onPress={onValueChange}
      style={[styles.toggle, { backgroundColor: value ? Colors.green : Colors.border }]}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { alarms } = useAlarms();
  const { signOut } = useAuth();

  // State
  const [userName, setUserName] = useState('Alex');
  const [defaultPunishment, setDefaultPunishment] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('Venmo');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  // Random default alarm sound
  const [alarmSound, setAlarmSound] = useState<AlarmSoundId>(() => {
    const randomIndex = Math.floor(Math.random() * ALARM_SOUNDS.length);
    return ALARM_SOUNDS[randomIndex].id;
  });

  // Load settings on mount and when returning to screen
  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        try {
          const vibration = await AsyncStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED);
          if (vibration !== null) {
            setVibrationEnabled(vibration === 'true');
          }
          const sound = await AsyncStorage.getItem(STORAGE_KEYS.ALARM_SOUND);
          if (sound !== null) {
            setAlarmSound(sound as AlarmSoundId);
          }
        } catch (error) {
          // Default values if error
        }
      };
      loadSettings();
    }, [])
  );

  // Navigation handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleUpdateProofLocation = useCallback(() => {
    navigation.navigate('ReferencePhoto', {
      alarmTime: '',
      alarmLabel: '',
      isOnboarding: false,
    });
  }, [navigation]);

  const handleRerecordShameVideo = useCallback(() => {
    const firstAlarm = alarms[0];
    navigation.navigate('RecordShame', {
      alarmTime: firstAlarm?.time || '07:00',
      alarmLabel: firstAlarm?.label || 'Wake up',
      referencePhotoUri: firstAlarm?.referencePhotoUri || '',
      isOnboarding: false,
    });
  }, [alarms, navigation]);

  // Account handlers
  const handleEditName = useCallback(() => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Edit Name',
        'Enter your display name',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (name: string | undefined) => {
              if (name && name.trim()) {
                setUserName(name.trim());
              }
            },
          },
        ],
        'plain-text',
        userName
      );
    } else {
      // Android fallback - just show an alert for now
      Alert.alert('Edit Name', 'Name editing coming soon on Android');
    }
  }, [userName]);

  // Punishment handlers
  const handleChangePunishment = useCallback(() => {
    const options = ['$1', '$2', '$5', '$10', '$20', 'Cancel'];
    const values = [1, 2, 5, 10, 20];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Default Punishment Amount',
        },
        (buttonIndex) => {
          if (buttonIndex < values.length) {
            setDefaultPunishment(values[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert(
        'Default Punishment Amount',
        'Select amount',
        [
          ...values.map((val) => ({
            text: `$${val}`,
            onPress: () => setDefaultPunishment(val),
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, []);

  const handleChangePayment = useCallback(() => {
    navigation.navigate('PaymentMethod');
  }, [navigation]);

  // Alarm sound handler - navigate to dedicated screen
  const handleChangeAlarmSound = useCallback(() => {
    navigation.navigate('AlarmSound');
  }, [navigation]);

  // Notification handlers
  const handleToggleVibration = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VIBRATION_ENABLED, newValue.toString());
    } catch (error) {
      // Silently fail
    }
  }, [vibrationEnabled]);

  // Support handlers
  const handleHelp = useCallback(() => {
    navigation.navigate('Help');
  }, [navigation]);

  const handleContact = useCallback(() => {
    Linking.openURL('https://twitter.com/ashen_one');
  }, []);

  const handleRateApp = useCallback(() => {
    Alert.alert('Rating coming soon!', 'App store rating will be available when the app is published.');
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: "I'm using Snoozer to stop hitting snooze! No more excuses. Download it: https://snoozer.replit.app",
        title: 'Snoozer',
      });
    } catch (error) {
      // Share cancelled or failed
    }
  }, []);

  // About handlers
  const handleTerms = useCallback(() => {
    navigation.navigate('Legal', { type: 'terms' });
  }, [navigation]);

  const handlePrivacy = useCallback(() => {
    navigation.navigate('Legal', { type: 'privacy' });
  }, [navigation]);

  // Sign out handler
  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out?',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await setOnboardingComplete(false);
              await signOut();
            } catch {
              // Sign out failed, but continue with navigation
            }
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Intro' }],
              })
            );
          },
        },
      ]
    );
  }, [navigation, signOut]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <FadeInView delay={50} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>ACCOUNT</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="user"
                iconColor="#FB923C"
                iconBg={ICON_COLORS.orange}
                label="Your name"
                value={userName}
                onPress={handleEditName}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="log-out"
                iconColor="#EF4444"
                iconBg={ICON_COLORS.red}
                label="Sign out"
                onPress={handleSignOut}
              />
            </View>
          </View>
        </FadeInView>

        {/* Proof Photo Section */}
        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>PROOF PHOTO</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="map-pin"
                iconColor="#FB923C"
                iconBg={ICON_COLORS.orange}
                label="Update proof location"
                onPress={handleUpdateProofLocation}
              />
            </View>
          </View>
        </FadeInView>

        {/* Shame Video Section */}
        <FadeInView delay={150} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>SHAME VIDEO</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="video"
                iconColor="#9333EA"
                iconBg={ICON_COLORS.purple}
                label="Re-record shame video"
                onPress={handleRerecordShameVideo}
              />
            </View>
          </View>
        </FadeInView>

        {/* Punishment Section */}
        <FadeInView delay={200} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>PUNISHMENT</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="dollar-sign"
                iconColor="#22C55E"
                iconBg={ICON_COLORS.green}
                label="Default amount"
                value={`$${defaultPunishment}`}
                onPress={handleChangePunishment}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="credit-card"
                iconColor="#3B82F6"
                iconBg={ICON_COLORS.blue}
                label="Payment method"
                value={paymentMethod}
                onPress={handleChangePayment}
              />
            </View>
          </View>
        </FadeInView>

        {/* Notifications Section */}
        <FadeInView delay={250} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>NOTIFICATIONS</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="bell"
                iconColor="#3B82F6"
                iconBg={ICON_COLORS.blue}
                label="Alarm sound"
                value={ALARM_SOUNDS.find(s => s.id === alarmSound)?.name || 'Nuclear Alarm'}
                onPress={handleChangeAlarmSound}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="smartphone"
                iconColor="#22C55E"
                iconBg={ICON_COLORS.green}
                label="Vibration"
                showChevron={false}
                rightElement={
                  <Toggle value={vibrationEnabled} onValueChange={handleToggleVibration} />
                }
              />
            </View>
          </View>
        </FadeInView>

        {/* Support Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>SUPPORT</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              icon="help-circle"
              iconColor="#3B82F6"
              iconBg={ICON_COLORS.blue}
              label="Help & FAQ"
              onPress={handleHelp}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="message-circle"
              iconColor="#9333EA"
              iconBg={ICON_COLORS.purple}
              label="Contact support"
              onPress={handleContact}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="star"
              iconColor="#FB923C"
              iconBg={ICON_COLORS.orange}
              label="Rate Snoozer"
              onPress={handleRateApp}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="share-2"
              iconColor="#22C55E"
              iconBg={ICON_COLORS.green}
              label="Share with friends"
              onPress={handleShare}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>ABOUT</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              icon="file-text"
              iconColor="#78716C"
              iconBg={ICON_COLORS.gray}
              label="Terms of Service"
              onPress={handleTerms}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              icon="lock"
              iconColor="#78716C"
              iconBg={ICON_COLORS.gray}
              label="Privacy Policy"
              onPress={handlePrivacy}
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={styles.versionText}>Snoozer v1.0</ThemedText>
        </View>
      </ScrollView>

      <BottomNav activeTab="settings" />
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
    paddingBottom: Spacing['3xl'],
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
  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Row
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 60,
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
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    color: '#57534E',
  },
});
