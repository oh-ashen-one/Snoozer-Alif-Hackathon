import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import {
  saveDefaultPunishments,
  savePunishmentConfig,
  getPunishmentConfig,
  PunishmentConfig,
} from '@/utils/storage';
import { saveShameVideo } from '@/utils/fileSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'Onboarding'>;

// Contact punishments that need phone numbers
const CONTACT_PUNISHMENTS = [
  {
    id: 'wife_dad',
    emoji: '👴',
    title: "Text your wife's dad",
    desc: '"hey bro what are you wearing"',
    inputType: 'phone' as const,
    placeholder: 'Phone number',
    configKey: 'phoneNumber',
  },
  {
    id: 'mom',
    emoji: '😰',
    title: 'Auto-call your mom',
    desc: "At 6am. She'll be worried.",
    inputType: 'phone' as const,
    placeholder: "Mom's phone number",
    configKey: 'phoneNumber',
  },
  {
    id: 'text_ex',
    emoji: '💔',
    title: 'Text your ex you miss them',
    desc: '"imysm" - she knows now.',
    inputType: 'phone' as const,
    placeholder: "Ex's phone number",
    configKey: 'exPhoneNumber',
  },
  {
    id: 'buddy_call',
    emoji: '📞',
    title: 'Auto-call your buddy',
    desc: 'They get woken up too',
    inputType: 'phone' as const,
    placeholder: "Buddy's phone number",
    configKey: 'phoneNumber',
  },
  {
    id: 'grandma_call',
    emoji: '👵',
    title: 'Auto-call your grandma',
    desc: 'She WILL answer at 6am',
    inputType: 'phone' as const,
    placeholder: "Grandma's phone number",
    configKey: 'phoneNumber',
  },
];

// Digital punishments
const DIGITAL_PUNISHMENTS = [
  {
    id: 'email_boss',
    emoji: '📧',
    title: 'Email your boss',
    desc: '"Running late again, sorry"',
    inputType: 'email' as const,
    placeholder: "Boss's email address",
    configKey: 'bossEmail',
  },
  {
    id: 'twitter',
    emoji: '🐦',
    title: 'Tweet something bad',
    desc: '"I overslept again lol"',
    inputType: null,
    placeholder: '',
    configKey: '',
  },
  {
    id: 'shame_video',
    emoji: '📹',
    title: 'Shame video plays',
    desc: "At max volume, can't stop it",
    inputType: null,
    placeholder: '',
    configKey: '',
  },
];

// Coming soon punishments
const COMING_SOON = [
  { id: 'group_chat', emoji: '💬', title: 'Text the group chat', desc: '"The boys" on iMessage' },
  { id: 'tinder_bio', emoji: '🔥', title: 'Update Tinder bio', desc: '"Can\'t even wake up on time"' },
  { id: 'like_ex_photo', emoji: '🤳', title: "Like your ex's old photo", desc: "From 2019. They'll know." },
  { id: 'venmo_ex', emoji: '💸', title: 'Venmo your ex $1', desc: 'Memo: "thinking of u"' },
  { id: 'donate_enemy', emoji: '🏛️', title: 'Donate to a party you hate', desc: 'Opposite of your politics' },
  { id: 'thermostat', emoji: '🥶', title: 'Drop thermostat to 55°F', desc: 'Smart home integration' },
];

const HABITS = [
  {
    id: 'wakeup',
    emoji: '🌅',
    title: 'Wake up on time',
    subtitle: 'Build a morning routine',
    available: true,
  },
  {
    id: 'gym',
    emoji: '💪',
    title: 'Go to the gym',
    subtitle: 'Stay fit and healthy',
    available: false,
  },
  {
    id: 'pray',
    emoji: '🌙',
    title: 'Pray consistently',
    subtitle: 'Never miss a prayer',
    available: false,
  },
  {
    id: 'touch',
    emoji: '📞',
    title: 'Stay in touch',
    subtitle: 'Call loved ones regularly',
    available: false,
  },
];

interface ProgressDotsProps {
  total: number;
  active: number;
}

const ProgressDots = ({ total, active }: ProgressDotsProps) => {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index <= active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
}

const Toggle = ({ value, onToggle }: ToggleProps) => {
  const translateX = useSharedValue(value ? 20 : 0);

  React.useEffect(() => {
    translateX.value = withSpring(value ? 20 : 0, { damping: 15 });
  }, [value, translateX]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}
      onPress={onToggle}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </Pressable>
  );
};

interface PunishmentCardProps {
  item: typeof CONTACT_PUNISHMENTS[0];
  isEnabled: boolean;
  configValue: string;
  onToggle: () => void;
  onConfigChange: (value: string) => void;
  // Optional props for shame_video special case
  isVideoCard?: boolean;
  videoRecorded?: boolean;
  onRecordVideo?: () => void;
}

const PunishmentCard = ({ item, isEnabled, configValue, onToggle, onConfigChange, isVideoCard, videoRecorded, onRecordVideo }: PunishmentCardProps) => {
  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle]);

  return (
    <View style={[styles.punishmentCard, isEnabled && styles.punishmentCardOn]}>
      <View style={styles.punishmentRow}>
        <Text style={styles.punishmentEmoji}>{item.emoji}</Text>
        <View style={styles.punishmentInfo}>
          <Text style={styles.punishmentTitle}>{item.title}</Text>
          <Text style={styles.punishmentDesc}>{item.desc}</Text>
        </View>
        <Toggle value={isEnabled} onToggle={handleToggle} />
      </View>
      {isEnabled && item.inputType && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={item.placeholder}
            placeholderTextColor={Colors.textMuted}
            value={configValue}
            onChangeText={onConfigChange}
            keyboardType={item.inputType === 'phone' ? 'phone-pad' : item.inputType === 'email' ? 'email-address' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}
      {isEnabled && isVideoCard && onRecordVideo && (
        <View style={styles.inputRow}>
          <Pressable style={styles.recordButton} onPress={onRecordVideo}>
            <Text style={styles.recordButtonEmoji}>{videoRecorded ? '✅' : '🎬'}</Text>
            <Text style={styles.recordButtonText}>
              {videoRecorded ? 'Video recorded' : 'Record video'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

interface ComingSoonCardProps {
  item: typeof COMING_SOON[0];
}

const ComingSoonCard = ({ item }: ComingSoonCardProps) => (
  <View style={styles.soonCard}>
    <Text style={styles.punishmentEmoji}>{item.emoji}</Text>
    <View style={styles.punishmentInfo}>
      <Text style={styles.soonTitle}>{item.title}</Text>
      <Text style={styles.punishmentDesc}>{item.desc}</Text>
    </View>
    <View style={styles.soonBadge}>
      <Text style={styles.soonBadgeText}>Soon</Text>
    </View>
  </View>
);

interface HabitCardProps {
  habit: typeof HABITS[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const HabitCard = ({ habit, isSelected, onSelect }: HabitCardProps) => {
  const handlePress = useCallback(() => {
    if (habit.available) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(habit.id);
    }
  }, [habit.available, habit.id, onSelect]);

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.card,
        !habit.available && styles.cardDisabled,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
        <Text style={{ fontSize: 24 }}>{habit.emoji}</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !habit.available && styles.cardTitleDisabled]}>
          {habit.title}
        </Text>
        <Text style={styles.cardSubtitle}>{habit.subtitle}</Text>
      </View>

      {habit.available ? (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected ? <Text style={{ fontSize: 16, color: Colors.text }}>✓</Text> : null}
        </View>
      ) : (
        <View style={styles.habitSoonPill}>
          <Text style={styles.habitSoonText}>SOON</Text>
        </View>
      )}
    </Pressable>
  );
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [step, setStep] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  // Punishment setup state
  const [enabledPunishments, setEnabledPunishments] = useState<string[]>([]);
  const [punishmentConfig, setPunishmentConfig] = useState<PunishmentConfig>({});
  const [shameVideoUri, setShameVideoUri] = useState<string | null>(null);

  // Read video URI from route params (returned from RecordShameScreen)
  useEffect(() => {
    if (route.params?.shameVideoUri) {
      setShameVideoUri(route.params.shameVideoUri);
      // Auto-enable shame_video toggle when video is recorded
      if (!enabledPunishments.includes('shame_video')) {
        setEnabledPunishments(prev => [...prev, 'shame_video']);
      }
    }
  }, [route.params?.shameVideoUri]);

  // Load existing punishment config from storage (entered elsewhere in the app)
  useEffect(() => {
    const loadExistingConfig = async () => {
      const existingConfig = await getPunishmentConfig();
      if (Object.keys(existingConfig).length > 0) {
        setPunishmentConfig(existingConfig);
      }
    };
    loadExistingConfig();
  }, []);

  const handleTogglePunishment = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnabledPunishments(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  }, []);

  // Map punishment IDs to storage config keys (to match PunishmentConfig interface)
  const PUNISHMENT_ID_TO_CONFIG_KEY: Record<string, string> = {
    'grandma_call': 'grandma',
    'wife_dad': 'wife_dad',
    'mom': 'mom',
    'text_ex': 'text_ex',
    'email_boss': 'email_boss',
    'buddy_call': 'buddy_call',
    'group_chat': 'group_chat',
    'twitter': 'twitter',
  };

  const handleConfigChange = useCallback((id: string, configKey: string, value: string) => {
    const storageKey = PUNISHMENT_ID_TO_CONFIG_KEY[id] || id;
    setPunishmentConfig(prev => ({
      ...prev,
      [storageKey]: {
        ...((prev as Record<string, Record<string, string>>)[storageKey] || {}),
        [configKey]: value,
      },
    }));
  }, []);

  const getConfigValue = useCallback((id: string, configKey: string): string => {
    const storageKey = PUNISHMENT_ID_TO_CONFIG_KEY[id] || id;
    const config = punishmentConfig as Record<string, Record<string, string>>;
    return config[storageKey]?.[configKey] || '';
  }, [punishmentConfig]);

  const handleHabitSelect = useCallback((habitId: string) => {
    setSelectedHabit(prev => (prev === habitId ? null : habitId));
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(prev => prev - 1);
  }, []);

  const handleRecordVideo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('RecordShame', {
      alarmTime: '',
      alarmLabel: '',
      referencePhotoUri: '',
      isOnboarding: true,
      returnTo: 'Onboarding',
    });
  }, [navigation]);

  // Count how many punishments are fully configured
  const getConfiguredCount = useCallback(() => {
    let count = 0;
    for (const id of enabledPunishments) {
      if (id === 'shame_video') {
        if (shameVideoUri) count++;
        continue;
      }

      const contactItem = CONTACT_PUNISHMENTS.find(p => p.id === id);
      if (contactItem) {
        if (getConfigValue(id, contactItem.configKey).trim().length > 0) count++;
        continue;
      }

      const digitalItem = DIGITAL_PUNISHMENTS.find(p => p.id === id);
      if (digitalItem && digitalItem.inputType) {
        if (getConfigValue(id, digitalItem.configKey).trim().length > 0) count++;
      }
    }
    return count;
  }, [enabledPunishments, getConfigValue, shameVideoUri]);

  const configuredCount = getConfiguredCount();

  const handleContinue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step === 0) {
      // Save punishment config
      try {
        await saveDefaultPunishments(enabledPunishments);
        await savePunishmentConfig(punishmentConfig);
        // Save shame video to persistent storage if recorded
        if (shameVideoUri && !shameVideoUri.startsWith('mock://')) {
          await saveShameVideo(shameVideoUri);
        }
      } catch (error) {
        console.log('Error saving punishment config:', error);
      }
      setStep(1);
    } else {
      // Navigate to alarm setup
      navigation.navigate('AddAlarm', { isOnboarding: true });
    }
  }, [step, enabledPunishments, punishmentConfig, shameVideoUri, navigation]);

  const enabledCount = enabledPunishments.length;
  const MIN_CONFIGURED = 2;
  const isButtonEnabled =
    (step === 0 && configuredCount >= MIN_CONFIGURED) ||
    (step === 1 && selectedHabit !== null);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <FadeInView delay={50} direction="up">
              <View style={styles.header}>
                <Text style={styles.headerIcon}>⚙️</Text>
                <Text style={styles.title}>Set Up Punishments</Text>
                <Text style={styles.subtitle}>
                  Turn on the punishments you want and add contact info. These will trigger if you <Text style={styles.redText}>snooze</Text>.
                </Text>
              </View>
            </FadeInView>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.punishmentScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Contact Punishments */}
              <FadeInView delay={100} direction="up">
                <Text style={styles.sectionTitle}>CONTACT PUNISHMENTS</Text>
                {CONTACT_PUNISHMENTS.map((item) => (
                  <PunishmentCard
                    key={item.id}
                    item={item}
                    isEnabled={enabledPunishments.includes(item.id)}
                    configValue={getConfigValue(item.id, item.configKey)}
                    onToggle={() => handleTogglePunishment(item.id)}
                    onConfigChange={(value) => handleConfigChange(item.id, item.configKey, value)}
                  />
                ))}
              </FadeInView>

              {/* Digital Punishments */}
              <FadeInView delay={200} direction="up">
                <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>DIGITAL PUNISHMENTS</Text>
                {DIGITAL_PUNISHMENTS.map((item) => (
                  <PunishmentCard
                    key={item.id}
                    item={item}
                    isEnabled={enabledPunishments.includes(item.id)}
                    configValue={item.configKey ? getConfigValue(item.id, item.configKey) : ''}
                    onToggle={() => handleTogglePunishment(item.id)}
                    onConfigChange={(value) => item.configKey && handleConfigChange(item.id, item.configKey, value)}
                    isVideoCard={item.id === 'shame_video'}
                    videoRecorded={!!shameVideoUri}
                    onRecordVideo={handleRecordVideo}
                  />
                ))}
              </FadeInView>

              {/* Coming Soon */}
              <FadeInView delay={300} direction="up">
                <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>COMING SOON</Text>
                {COMING_SOON.map((item) => (
                  <ComingSoonCard key={item.id} item={item} />
                ))}
              </FadeInView>

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <FadeInView delay={50} direction="up">
              <View style={styles.header}>
                <View style={styles.pillBadge}>
                  <Text style={{ fontSize: 14 }}>✅</Text>
                  <Text style={styles.pillText}>Almost done</Text>
                </View>
                <Text style={styles.title}>What do you want to be consistent with?</Text>
                <Text style={styles.subtitle}>Start with one habit</Text>
              </View>
            </FadeInView>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.optionsList}>
                {HABITS.map((habit, index) => (
                  <FadeInView key={habit.id} delay={100 + index * 50} direction="up">
                    <HabitCard
                      habit={habit}
                      isSelected={selectedHabit === habit.id}
                      onSelect={handleHabitSelect}
                    />
                  </FadeInView>
                ))}
              </View>
              <FadeInView delay={300} direction="up">
                <Text style={styles.helperText}>More habits coming soon!</Text>
              </FadeInView>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.topRow}>
        {step > 0 ? (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={{ fontSize: 20, color: Colors.text }}>←</Text>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <ProgressDots total={2} active={step} />
        <View style={styles.backButton} />
      </View>

      {renderStep()}

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
        <Pressable
          testID="button-onboarding-continue"
          onPress={handleContinue}
          disabled={!isButtonEnabled}
          style={[
            styles.continueButton,
            isButtonEnabled ? styles.continueButtonEnabled : styles.continueButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.continueButtonText,
              !isButtonEnabled && styles.continueButtonTextDisabled,
            ]}
          >
            {step === 0
              ? configuredCount >= MIN_CONFIGURED
                ? `Continue with ${configuredCount} Punishment${configuredCount > 1 ? 's' : ''}`
                : configuredCount > 0
                  ? `Set up ${MIN_CONFIGURED - configuredCount} more`
                  : 'Set up 2 Punishments'
              : 'Set Up Alarm'}
          </Text>
          {isButtonEnabled && (
            <Text style={{ fontSize: 20, color: Colors.bg }}>→</Text>
          )}
        </Pressable>
        {step === 0 && (
          <Text style={styles.footerHint}>You can change these anytime in Settings</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.orange,
  },
  dotInactive: {
    backgroundColor: Colors.border,
  },
  stepContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,146,60,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.lg,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.orange,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  redText: {
    color: Colors.red,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  punishmentScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  optionsList: {
    gap: Spacing.md,
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
    paddingLeft: 4,
  },

  // Punishment cards
  punishmentCard: {
    backgroundColor: 'rgba(28,25,23,0.8)',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
  },
  punishmentCardOn: {
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },
  punishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  punishmentEmoji: {
    fontSize: 26,
    width: 36,
    textAlign: 'center',
  },
  punishmentInfo: {
    flex: 1,
  },
  punishmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  punishmentDesc: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOff: {
    backgroundColor: Colors.border,
  },
  toggleOn: {
    backgroundColor: Colors.green,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  input: {
    width: '100%',
    padding: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(12,10,9,0.6)',
    borderWidth: 1,
    borderColor: '#3a3533',
    borderRadius: 10,
    fontSize: 15,
    color: Colors.text,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  recordButtonEmoji: {
    fontSize: 18,
  },
  recordButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.orange,
  },

  // Coming soon cards
  soonCard: {
    backgroundColor: 'rgba(28,25,23,0.4)',
    borderRadius: 16,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    opacity: 0.5,
  },
  soonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  soonBadge: {
    backgroundColor: 'rgba(41,37,36,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  // Habit cards (kept from original)
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardSelected: {
    borderColor: Colors.orange,
    backgroundColor: 'rgba(251,146,60,0.05)',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(251,146,60,0.15)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  cardTitleDisabled: {
    color: Colors.textMuted,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orange,
  },
  habitSoonPill: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  habitSoonText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
  },
  continueButtonEnabled: {
    backgroundColor: Colors.orange,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.bg,
  },
  continueButtonTextDisabled: {
    color: Colors.textMuted,
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 10,
  },
});
