import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Linking,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
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
import Header from '@/components/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { setOnboardingComplete, getUserName, saveUserName } from '@/utils/storage';
import { clearTrackingData } from '@/utils/tracking';
import { setCurrentScreen } from '@/utils/soundKiller';
import { useAlarms } from '@/hooks/useAlarms';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import {
  isAlarmKitAvailable,
  getAlarmKitPermissionStatus,
  requestAlarmKitPermission,
  AlarmKitPermissionStatus,
} from '@/utils/alarmKit';
import * as Notifications from 'expo-notifications';

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

// Emoji mappings for icons
const ICON_EMOJIS: Record<string, string> = {
  'chevron-right': '\u203A',
  'check': '\u2713',
  'video': '\uD83C\uDFA5',
  'calendar': '\uD83D\uDCC5',
  'credit-card': '\uD83D\uDCB3',
  'map-pin': '\uD83D\uDCCD',
  'bell': '\uD83D\uDD14',
  'info': '\u2139\uFE0F',
  'smartphone': '\uD83D\uDCF1',
  'message-circle': '\uD83D\uDCAC',
  'star': '\u2B50',
  'help-circle': '\u2753',
  'file-text': '\uD83D\uDCC4',
  'lock': '\uD83D\uDD12',
  'user': '\uD83D\uDC64',
  'log-out': '\uD83D\uDEAA',
  'zap': '\u26A1',
  'clock': '\u23F0',
  'share-2': '\uD83D\uDCE4',
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
          <Text style={{ fontSize: 18 }}>{ICON_EMOJIS[icon] || icon}</Text>
        </View>
        <ThemedText style={[styles.rowText, isDestructive && styles.dangerText]}>
          {label}
        </ThemedText>
      </View>
      {rightElement || (
        <View style={styles.rowRight}>
          {value && <ThemedText style={styles.rowValueText}>{value}</ThemedText>}
          {showChevron && onPress && (
            <Text style={{ fontSize: 20, color: '#57534E' }}>{ICON_EMOJIS['chevron-right']}</Text>
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
  const { isConnected: calendarConnected, isLoading: calendarLoading, connect: connectCalendar, disconnect: disconnectCalendar, error: calendarError } = useGoogleCalendar();

  // State
  const [userName, setUserName] = useState('');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  // Random default alarm sound
  const [alarmSound, setAlarmSound] = useState<AlarmSoundId>(() => {
    const randomIndex = Math.floor(Math.random() * ALARM_SOUNDS.length);
    return ALARM_SOUNDS[randomIndex].id;
  });
  // Permission states
  const [alarmPermission, setAlarmPermission] = useState<AlarmKitPermissionStatus>('undetermined');
  const [notifPermission, setNotifPermission] = useState(false);

  // Load settings on mount and when returning to screen
  useFocusEffect(
    useCallback(() => {
      // Set current screen to allow sound testing
      setCurrentScreen('Settings');
      
      const loadSettings = async () => {
        try {
          const name = await getUserName();
          setUserName(name);
          const vibration = await AsyncStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED);
          if (vibration !== null) {
            setVibrationEnabled(vibration === 'true');
          }
          const sound = await AsyncStorage.getItem(STORAGE_KEYS.ALARM_SOUND);
          if (sound !== null) {
            setAlarmSound(sound as AlarmSoundId);
          }
        } catch {
          // Default values if error
        }
      };

      const checkPermissions = async () => {
        // Check AlarmKit permission (iOS 26+)
        if (Platform.OS === 'ios' && isAlarmKitAvailable()) {
          const status = await getAlarmKitPermissionStatus();
          setAlarmPermission(status);
        }
        // Check notification permission
        const { status } = await Notifications.getPermissionsAsync();
        setNotifPermission(status === 'granted');
      };

      loadSettings();
      checkPermissions();
    }, [])
  );

  // Navigation handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleUpdateProofLocation = useCallback(() => {
    navigation.navigate('ProofSetup', {
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
            onPress: async (name: string | undefined) => {
              if (name && name.trim()) {
                const trimmedName = name.trim();
                setUserName(trimmedName);
                await saveUserName(trimmedName);
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

  // Payment handlers
  const handleChangePayment = useCallback(() => {
    navigation.navigate('PaymentMethod');
  }, [navigation]);

  const handleManagePunishments = useCallback(() => {
    navigation.navigate('Punishments');
  }, [navigation]);

  // Alarm sound handler - navigate to dedicated screen
  const handleChangeAlarmSound = useCallback(() => {
    navigation.navigate('AlarmSound');
  }, [navigation]);

  // Alarm permission handler
  const handleAlarmPermissions = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios' && isAlarmKitAvailable()) {
      if (alarmPermission !== 'granted') {
        const granted = await requestAlarmKitPermission();
        setAlarmPermission(granted ? 'granted' : 'denied');
        if (!granted) {
          // Permission was denied - direct to settings
          Alert.alert(
            'Permission Required',
            'To enable alarms that ring during Focus mode, please enable alarm permissions in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        }
      } else {
        // Already granted - open settings to manage
        Linking.openSettings();
      }
    } else {
      // Not iOS 26+ - open general settings
      Linking.openSettings();
    }
  }, [alarmPermission]);

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

  const handleClearStats = useCallback(() => {
    console.log('[Settings] Clear stats pressed');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Clear Stats?',
      'This will delete all your wake-up history, streaks, and stats. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearTrackingData();
            Alert.alert('Stats Cleared', 'Your stats have been reset.');
          },
        },
      ]
    );
  }, []);

  const handleCalendarToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (calendarConnected) {
      Alert.alert(
        'Disconnect Calendar?',
        'You will no longer see your upcoming events on the alarm screen.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: disconnectCalendar },
        ]
      );
    } else {
      await connectCalendar();
    }
  }, [calendarConnected, connectCalendar, disconnectCalendar]);

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
      <View style={styles.headerContainer}>
        <Header type="settings" />
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

        {/* Calendar Section */}
        <FadeInView delay={175} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>CALENDAR</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="calendar"
                iconColor={calendarConnected ? '#22C55E' : '#3B82F6'}
                iconBg={calendarConnected ? ICON_COLORS.green : ICON_COLORS.blue}
                label="Google Calendar"
                onPress={handleCalendarToggle}
                rightElement={
                  <View style={styles.permissionBadge}>
                    <View
                      style={[
                        styles.permissionDot,
                        { backgroundColor: calendarConnected ? Colors.green : Colors.textMuted },
                      ]}
                    />
                    <ThemedText style={styles.permissionText}>
                      {calendarLoading ? '...' : calendarConnected ? 'Connected' : 'Not linked'}
                    </ThemedText>
                  </View>
                }
              />
            </View>
            <ThemedText style={styles.permissionHint}>
              {calendarConnected 
                ? "Your today's events will show on the alarm screen"
                : 'Link to see your schedule when waking up'}
            </ThemedText>
          </View>
        </FadeInView>

        {/* Punishment Section */}
        <FadeInView delay={200} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>PUNISHMENT</ThemedText>
            <View style={styles.card}>
              <SettingsRow
                icon="credit-card"
                iconColor="#3B82F6"
                iconBg={ICON_COLORS.blue}
                label="Payment settings"
                onPress={handleChangePayment}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="zap"
                iconColor="#FB923C"
                iconBg={ICON_COLORS.orange}
                label="Manage punishments"
                showChevron={true}
                onPress={handleManagePunishments}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="video"
                iconColor="#9333EA"
                iconBg={ICON_COLORS.purple}
                label="Re-record shame video"
                onPress={handleRerecordShameVideo}
              />
              <View style={styles.rowDivider} />
              <SettingsRow
                icon="map-pin"
                iconColor="#FB923C"
                iconBg={ICON_COLORS.orange}
                label="Update proof activity"
                onPress={handleUpdateProofLocation}
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
                icon="info"
                iconColor="#FB923C"
                iconBg={ICON_COLORS.orange}
                label="Setup Guide"
                value="Focus & DND"
                onPress={() => navigation.navigate('NotificationSetup')}
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

        {/* Alarm Permissions Section - iOS only */}
        {Platform.OS === 'ios' && (
          <FadeInView delay={300} direction="up">
            <View style={styles.section}>
              <ThemedText style={styles.sectionLabel}>ALARM PERMISSIONS</ThemedText>
              <View style={styles.card}>
                <SettingsRow
                  icon="clock"
                  iconColor={alarmPermission === 'granted' ? '#22C55E' : '#FB923C'}
                  iconBg={alarmPermission === 'granted' ? ICON_COLORS.green : ICON_COLORS.orange}
                  label="Schedule alarms"
                  onPress={handleAlarmPermissions}
                  rightElement={
                    <View style={styles.permissionBadge}>
                      <View
                        style={[
                          styles.permissionDot,
                          {
                            backgroundColor:
                              alarmPermission === 'granted' ? Colors.green : Colors.orange,
                          },
                        ]}
                      />
                      <ThemedText style={styles.permissionText}>
                        {alarmPermission === 'granted' ? 'On' : 'Off'}
                      </ThemedText>
                    </View>
                  }
                />
                <View style={styles.rowDivider} />
                <SettingsRow
                  icon="bell"
                  iconColor={notifPermission ? '#22C55E' : '#FB923C'}
                  iconBg={notifPermission ? ICON_COLORS.green : ICON_COLORS.orange}
                  label="Notifications"
                  onPress={() => Linking.openSettings()}
                  rightElement={
                    <View style={styles.permissionBadge}>
                      <View
                        style={[
                          styles.permissionDot,
                          { backgroundColor: notifPermission ? Colors.green : Colors.orange },
                        ]}
                      />
                      <ThemedText style={styles.permissionText}>
                        {notifPermission ? 'On' : 'Off'}
                      </ThemedText>
                    </View>
                  }
                />
              </View>
              <ThemedText style={styles.permissionHint}>
                {alarmPermission === 'granted'
                  ? 'Alarms will ring even during Focus mode and Sleep'
                  : 'Enable to ensure alarms ring during Focus mode'}
              </ThemedText>
            </View>
          </FadeInView>
        )}

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
              icon="📊"
              iconColor="#EF4444"
              iconBg={ICON_COLORS.red}
              label="Clear stats"
              onPress={handleClearStats}
              isDestructive={true}
            />
            <View style={styles.rowDivider} />
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
  headerContainer: {
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

  // Permission badge
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  permissionHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },

  // Guide inline (inside Notifications card)
  guideInlineSection: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  guideInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  guideInlineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  guideInlineSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  guideInlineSteps: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  guideInlineStep: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  guideInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(251,146,60,0.1)',
    borderRadius: BorderRadius.sm,
  },
  guideInlineButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FB923C',
  },
});
