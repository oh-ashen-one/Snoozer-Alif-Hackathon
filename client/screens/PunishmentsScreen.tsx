/**
 * PUNISHMENTS SCREEN
 * PunishmentsScreen.tsx
 *
 * Settings page for managing default punishments.
 * Users can toggle which punishments are enabled by default.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import * as SMS from 'expo-sms';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getDefaultPunishments,
  saveDefaultPunishments,
  getPunishmentConfig,
  savePunishmentConfig,
  PunishmentConfig,
} from '@/utils/storage';
import { openURL } from '@/utils/linking';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PunishmentOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
  configurable?: boolean;
}

const PUNISHMENT_OPTIONS: PunishmentOption[] = [
  { id: 'shame_video', label: 'Shame video plays', description: 'At max volume', icon: '🎬', color: '#EF4444' },
  { id: 'buddy_call', label: 'Auto-call your buddy', description: 'Jake gets woken up too', icon: '📞', color: '#FB923C' },
  { id: 'group_chat', label: 'Text the group chat', description: '"The boys" on iMessage', icon: '💬', color: '#7C3AED' },
  { id: 'wife_dad', label: "Text your wife's dad", description: '"Hey Robert, quick question"', icon: '👴', color: '#EF4444', configurable: true },
  { id: 'mom', label: 'Auto-call your mom', description: "At 6am. She'll be worried.", icon: '👩', color: '#EC4899' },
  { id: 'twitter', label: 'Tweet something bad', description: '"I overslept again lol"', icon: '🐦', color: '#1DA1F2' },
  { id: 'text_ex', label: 'Text your ex "I miss u"', description: 'From your actual number', icon: '💔', color: '#EF4444', configurable: true },
  { id: 'email_boss', label: 'Email your boss', description: '"Running late again, sorry"', icon: '📧', color: '#EA4335', configurable: true },
  { id: 'grandma_call', label: 'Auto-call your grandma', description: 'She WILL answer at 6am', icon: '👵', color: '#EC4899' },
  { id: 'tinder_bio', label: 'Update Tinder bio', description: '"Can\'t even wake up on time"', icon: '🔥', color: '#FE3C72' },
  { id: 'like_ex_photo', label: "Like your ex's old photo", description: "From 2019. They'll know.", icon: '📸', color: '#E4405F', comingSoon: true },
  { id: 'venmo_ex', label: 'Venmo your ex $1', description: 'With memo: "thinking of u"', icon: '💸', color: '#008CFF', comingSoon: true },
  { id: 'donate_enemy', label: 'Donate to a party you hate', description: 'Opposite of your politics', icon: '🗳️', color: '#EF4444', comingSoon: true },
  { id: 'thermostat', label: 'Drop thermostat to 55°F', description: 'Smart home integration', icon: '🥶', color: '#22C55E', comingSoon: true },
];

// Toggle Component
function Toggle({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  const translateX = useSharedValue(value ? 23 : 3);

  useEffect(() => {
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

// Punishment Row Component
interface PunishmentRowProps {
  punishment: PunishmentOption;
  enabled: boolean;
  onToggle: () => void;
  isLast: boolean;
  expanded: boolean;
  config: PunishmentConfig;
  onSaveConfig: (config: PunishmentConfig) => void;
  onExpand: () => void;
}

function PunishmentRow({ punishment, enabled, onToggle, isLast, expanded, config, onSaveConfig, onExpand }: PunishmentRowProps) {
  const [bossEmail, setBossEmail] = useState(config.email_boss?.bossEmail || '');
  const [exPhoneNumber, setExPhoneNumber] = useState(config.text_ex?.exPhoneNumber || '');
  const [wifesDadPhone, setWifesDadPhone] = useState(config.wife_dad?.phoneNumber || '');

  // Sync local state when config changes
  useEffect(() => {
    if (punishment.id === 'email_boss') {
      setBossEmail(config.email_boss?.bossEmail || '');
    }
    if (punishment.id === 'text_ex') {
      setExPhoneNumber(config.text_ex?.exPhoneNumber || '');
    }
    if (punishment.id === 'wife_dad') {
      setWifesDadPhone(config.wife_dad?.phoneNumber || '');
    }
  }, [config, punishment.id]);

  const handleToggle = useCallback(() => {
    if (punishment.comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle, punishment.comingSoon]);

  const handleTestEmail = useCallback(async () => {
    if (!bossEmail) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const subject = encodeURIComponent("Running late again, sorry");
    const body = encodeURIComponent(
      "Hi,\n\nI overslept again this morning. I know this is becoming a pattern and I'm really sorry.\n\nI'll be in as soon as I can.\n\nSorry again."
    );
    const mailtoUrl = `mailto:${bossEmail}?subject=${subject}&body=${body}`;
    await openURL(mailtoUrl);
  }, [bossEmail]);

  const handleSaveEmailConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      email_boss: { bossEmail },
    });
  }, [bossEmail, config, onSaveConfig]);

  const handleTestTextEx = useCallback(async () => {
    if (!exPhoneNumber) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([exPhoneNumber], 'I miss you');
    }
  }, [exPhoneNumber]);

  const handleSaveTextExConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      text_ex: { exPhoneNumber },
    });
  }, [exPhoneNumber, config, onSaveConfig]);

  const handleTestWifesDad = useCallback(async () => {
    if (!wifesDadPhone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const messages = [
      "Hey Robert, quick question - is it normal for grown adults to hit snooze 5 times? Asking for a friend (me).",
      "Good morning! Just wanted you to know your daughter married someone who can't wake up on time.",
      "Hi, it's me. I overslept again. Please don't tell her.",
      "Robert, I need advice. How did you raise such an early riser? Asking because I clearly wasn't.",
      "Hey! Random thought at 6am - do you think I'm good enough for your daughter? I can't even wake up.",
      "Morning! I'm supposed to be at work but I'm still in bed. Life advice?",
      "Hi Robert! Quick poll: is hitting snooze 7 times a red flag?",
      "Hey, hypothetically, if someone snoozed their alarm 5 times, would that be grounds for disappointment?",
      "Good morning sir. I have failed. Again. The alarm won.",
      "Robert, I'm texting you from bed at 6am because I can't adult properly.",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([wifesDadPhone], randomMessage);
    }
  }, [wifesDadPhone]);

  const handleSaveWifesDadConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      wife_dad: { phoneNumber: wifesDadPhone },
    });
  }, [wifesDadPhone, config, onSaveConfig]);

  const content = (
    <View style={styles.punishmentLeft}>
      <ThemedText style={[styles.punishmentIcon, punishment.comingSoon && styles.comingSoonIcon]}>{punishment.icon}</ThemedText>
      <View style={styles.punishmentInfo}>
        <ThemedText style={[styles.punishmentLabel, punishment.comingSoon && styles.comingSoonLabel]}>{punishment.label}</ThemedText>
        <ThemedText style={styles.punishmentDescription}>{punishment.description}</ThemedText>
      </View>
    </View>
  );

  return (
    <>
      {punishment.comingSoon ? (
        <View style={styles.punishmentRow}>
          {content}
          <View style={styles.comingSoonBadge}>
            <ThemedText style={styles.comingSoonText}>Coming Soon</ThemedText>
          </View>
        </View>
      ) : (
        <Pressable style={styles.punishmentRow} onPress={handleToggle}>
          {content}
          <Toggle value={enabled} onValueChange={handleToggle} />
        </Pressable>
      )}

      {/* Show saved email when configured and not expanded */}
      {enabled && punishment.id === 'email_boss' && config.email_boss?.bossEmail && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            📧 {config.email_boss.bossEmail}
          </ThemedText>
          <View style={styles.savedConfigButtons}>
            <Pressable style={styles.savedConfigButton} onPress={handleTestEmail}>
              <ThemedText style={styles.testLinkText}>Test</ThemedText>
            </Pressable>
            <Pressable style={styles.savedConfigButton} onPress={onExpand}>
              <ThemedText style={styles.editText}>Edit</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Email Boss Configuration */}
      {expanded && punishment.id === 'email_boss' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your boss's email?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="boss@company.com"
            placeholderTextColor={Colors.textMuted}
            value={bossEmail}
            onChangeText={setBossEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !bossEmail && styles.buttonDisabled]}
              onPress={handleTestEmail}
              disabled={!bossEmail}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !bossEmail && styles.buttonDisabled]}
              onPress={handleSaveEmailConfig}
              disabled={!bossEmail}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Show saved phone number when configured and not expanded */}
      {enabled && punishment.id === 'text_ex' && config.text_ex?.exPhoneNumber && !expanded && (
        <Pressable style={styles.savedConfigRow} onPress={onExpand}>
          <ThemedText style={styles.savedConfigText}>
            📱 {config.text_ex.exPhoneNumber}
          </ThemedText>
          <ThemedText style={styles.editText}>Edit</ThemedText>
        </Pressable>
      )}

      {/* Text Ex Configuration */}
      {expanded && punishment.id === 'text_ex' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>Enter their number</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={exPhoneNumber}
            onChangeText={setExPhoneNumber}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !exPhoneNumber && styles.buttonDisabled]}
              onPress={handleTestTextEx}
              disabled={!exPhoneNumber}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !exPhoneNumber && styles.buttonDisabled]}
              onPress={handleSaveTextExConfig}
              disabled={!exPhoneNumber}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Show saved wife's dad number when configured and not expanded */}
      {enabled && punishment.id === 'wife_dad' && config.wife_dad?.phoneNumber && !expanded && (
        <Pressable style={styles.savedConfigRow} onPress={onExpand}>
          <ThemedText style={styles.savedConfigText}>
            📱 {config.wife_dad.phoneNumber}
          </ThemedText>
          <ThemedText style={styles.editText}>Edit</ThemedText>
        </Pressable>
      )}

      {/* Wife's Dad Configuration */}
      {expanded && punishment.id === 'wife_dad' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your wife's dad's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={wifesDadPhone}
            onChangeText={setWifesDadPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !wifesDadPhone && styles.buttonDisabled]}
              onPress={handleTestWifesDad}
              disabled={!wifesDadPhone}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !wifesDadPhone && styles.buttonDisabled]}
              onPress={handleSaveWifesDadConfig}
              disabled={!wifesDadPhone}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function PunishmentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [enabledPunishments, setEnabledPunishments] = useState<string[]>(['shame_video']);
  const [punishmentConfig, setPunishmentConfig] = useState<PunishmentConfig>({});
  const [expandedPunishment, setExpandedPunishment] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [punishments, config] = await Promise.all([
          getDefaultPunishments(),
          getPunishmentConfig(),
        ]);
        setEnabledPunishments(punishments);
        setPunishmentConfig(config);
      } catch {
        // Use defaults
      }
    };
    loadSettings();
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleTogglePunishment = useCallback((id: string) => {
    const punishment = PUNISHMENT_OPTIONS.find(p => p.id === id);
    const isCurrentlyEnabled = enabledPunishments.includes(id);

    setEnabledPunishments(prev => {
      const newPunishments = isCurrentlyEnabled
        ? prev.filter(p => p !== id)
        : [...prev, id];

      // Save to storage
      saveDefaultPunishments(newPunishments);

      return newPunishments;
    });

    // If toggling ON a configurable punishment, expand it
    if (!isCurrentlyEnabled && punishment?.configurable) {
      setExpandedPunishment(id);
    } else if (isCurrentlyEnabled) {
      // If toggling OFF, collapse
      setExpandedPunishment(null);
    }
  }, [enabledPunishments]);

  const handleSaveConfig = useCallback(async (config: PunishmentConfig) => {
    setPunishmentConfig(config);
    await savePunishmentConfig(config);
    // Collapse after saving
    setExpandedPunishment(null);
  }, []);

  return (
    <View style={styles.container}>
      <BackgroundGlow color="orange" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Punishments</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Punishments List */}
        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>ENABLED PUNISHMENTS</ThemedText>
            <ThemedText style={styles.sectionHint}>
              These will be selected by default when creating new alarms
            </ThemedText>
            <View style={styles.card}>
              {PUNISHMENT_OPTIONS.map((punishment, index) => (
                <PunishmentRow
                  key={punishment.id}
                  punishment={punishment}
                  enabled={enabledPunishments.includes(punishment.id)}
                  onToggle={() => handleTogglePunishment(punishment.id)}
                  isLast={index === PUNISHMENT_OPTIONS.length - 1}
                  expanded={expandedPunishment === punishment.id}
                  config={punishmentConfig}
                  onSaveConfig={handleSaveConfig}
                  onExpand={() => setExpandedPunishment(punishment.id)}
                />
              ))}
            </View>
          </View>
        </FadeInView>
      </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Punishment Row
  punishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  punishmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  punishmentIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  punishmentInfo: {
    flex: 1,
  },
  punishmentLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  punishmentDescription: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 24 + Spacing.md, // icon width + margin
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

  // Coming Soon
  comingSoonBadge: {
    backgroundColor: 'rgba(120, 113, 108, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  comingSoonIcon: {
    opacity: 0.5,
  },
  comingSoonLabel: {
    color: Colors.textMuted,
  },

  // Configuration Section
  configSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  configInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  configButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  testButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Saved config display
  savedConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  savedConfigText: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  savedConfigTextGreen: {
    fontSize: 13,
    color: Colors.green,
    flex: 1,
    fontWeight: '500',
  },
  savedConfigButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  savedConfigButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  testLinkText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '500',
  },
  editText: {
    fontSize: 13,
    color: Colors.orange,
    fontWeight: '500',
  },
});
