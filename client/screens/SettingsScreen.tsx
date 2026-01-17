import React, { useState, useCallback } from 'react';
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
  Text,
} from 'react-native';
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
  emoji: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  isDestructive?: boolean;
}

function SettingsRow({
  emoji,
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
          <Text style={styles.rowEmoji}>{emoji}</Text>
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

  // State
  const [userName, setUserName] = useState('Alex');
  const [defaultPunishment, setDefaultPunishment] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('Venmo');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

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
            onPress: (name) => {
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
    const options = ['Venmo', 'PayPal', 'Cash App', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          title: 'Payment Method',
        },
        (buttonIndex) => {
          if (buttonIndex < options.length - 1) {
            setPaymentMethod(options[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert(
        'Payment Method',
        'Select payment method',
        [
          { text: 'Venmo', onPress: () => setPaymentMethod('Venmo') },
          { text: 'PayPal', onPress: () => setPaymentMethod('PayPal') },
          { text: 'Cash App', onPress: () => setPaymentMethod('Cash App') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, []);

  // Notification handlers
  const handleToggleVibration = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVibrationEnabled((prev) => !prev);
  }, []);

  // Support handlers
  const handleHelp = useCallback(() => {
    Linking.openURL('https://snoozer.app/help');
  }, []);

  const handleContact = useCallback(() => {
    Linking.openURL('mailto:support@snoozer.app?subject=Snoozer Support');
  }, []);

  const handleRateApp = useCallback(() => {
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/snoozer/id123456'
        : 'https://play.google.com/store/apps/details?id=com.snoozer';
    Linking.openURL(storeUrl);
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message:
          'Check out Snoozer - the alarm app that makes you pay if you snooze! Download it here: https://snoozer.app',
      });
    } catch (error) {
      // Share cancelled or failed
    }
  }, []);

  // About handlers
  const handleTerms = useCallback(() => {
    Linking.openURL('https://snoozer.app/terms');
  }, []);

  const handlePrivacy = useCallback(() => {
    Linking.openURL('https://snoozer.app/privacy');
  }, []);

  // Danger zone handlers
  const handleDeleteAllData = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your alarms, photos, and videos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
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
  }, [navigation]);

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
        {/* Account Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>ACCOUNT</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              emoji="👤"
              iconBg={ICON_COLORS.orange}
              label="Your name"
              value={userName}
              onPress={handleEditName}
            />
          </View>
        </View>

        {/* Proof Photo Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>PROOF PHOTO</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              emoji="📍"
              iconBg={ICON_COLORS.orange}
              label="Update proof location"
              onPress={handleUpdateProofLocation}
            />
          </View>
        </View>

        {/* Shame Video Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>SHAME VIDEO</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              emoji="🎬"
              iconBg={ICON_COLORS.purple}
              label="Re-record shame video"
              onPress={handleRerecordShameVideo}
            />
          </View>
        </View>

        {/* Punishment Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>PUNISHMENT</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              emoji="💰"
              iconBg={ICON_COLORS.green}
              label="Default amount"
              value={`$${defaultPunishment}`}
              onPress={handleChangePunishment}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              emoji="💳"
              iconBg={ICON_COLORS.blue}
              label="Payment method"
              value={paymentMethod}
              onPress={handleChangePayment}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>NOTIFICATIONS</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              emoji="🔔"
              iconBg={ICON_COLORS.blue}
              label="Alarm sound"
              value="Default"
              showChevron={false}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              emoji="📳"
              iconBg={ICON_COLORS.green}
              label="Vibration"
              showChevron={false}
              rightElement={
                <Toggle value={vibrationEnabled} onValueChange={handleToggleVibration} />
              }
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>SUPPORT</ThemedText>
          <View style={styles.card}>
            <SettingsRow
              emoji="❓"
              iconBg={ICON_COLORS.blue}
              label="Help & FAQ"
              onPress={handleHelp}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              emoji="💬"
              iconBg={ICON_COLORS.purple}
              label="Contact support"
              onPress={handleContact}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              emoji="⭐"
              iconBg={ICON_COLORS.orange}
              label="Rate Snoozer"
              onPress={handleRateApp}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              emoji="📤"
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
              emoji="📄"
              iconBg={ICON_COLORS.gray}
              label="Terms of Service"
              onPress={handleTerms}
            />
            <View style={styles.rowDivider} />
            <SettingsRow
              emoji="🔒"
              iconBg={ICON_COLORS.gray}
              label="Privacy Policy"
              onPress={handlePrivacy}
            />
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <ThemedText style={styles.dangerLabel}>DANGER ZONE</ThemedText>
          <View style={styles.dangerCard}>
            <SettingsRow
              emoji="🗑️"
              iconBg={ICON_COLORS.red}
              label="Delete all data"
              onPress={handleDeleteAllData}
              showChevron={false}
              isDestructive
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <ThemedText style={styles.versionText}>Snoozer v1.0</ThemedText>
        <ThemedText style={styles.madeWithText}>Made with ❤️</ThemedText>
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
  rowEmoji: {
    fontSize: 18,
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
  madeWithText: {
    fontSize: 12,
    color: '#57534E',
  },
});
