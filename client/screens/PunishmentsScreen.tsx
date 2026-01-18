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

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getDefaultPunishments,
  saveDefaultPunishments,
} from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PunishmentOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
}

const PUNISHMENT_OPTIONS: PunishmentOption[] = [
  { id: 'shame_video', label: 'Shame video plays', description: 'At max volume', icon: '🎬', color: '#EF4444' },
  { id: 'buddy_call', label: 'Auto-call your buddy', description: 'Jake gets woken up too', icon: '📞', color: '#FB923C' },
  { id: 'group_chat', label: 'Text the group chat', description: '"The boys" on iMessage', icon: '💬', color: '#7C3AED' },
  { id: 'wife_dad', label: "Text your wife's dad", description: '"Hey Robert, quick question"', icon: '👴', color: '#EF4444' },
  { id: 'mom', label: 'Auto-call your mom', description: "At 6am. She'll be worried.", icon: '👩', color: '#EC4899' },
  { id: 'twitter', label: 'Tweet something bad', description: '"I overslept again lol"', icon: '🐦', color: '#1DA1F2' },
  { id: 'text_ex', label: 'Text your ex "I miss u"', description: 'From your actual number', icon: '💔', color: '#EF4444' },
  { id: 'like_ex_photo', label: "Like your ex's old photo", description: "From 2019. They'll know.", icon: '📸', color: '#E4405F' },
  { id: 'email_boss', label: 'Email your boss', description: '"Running late again, sorry"', icon: '📧', color: '#EA4335' },
  { id: 'venmo_ex', label: 'Venmo your ex $1', description: 'With memo: "thinking of u"', icon: '💸', color: '#008CFF' },
  { id: 'grandma_call', label: 'Auto-call your grandma', description: 'She WILL answer at 6am', icon: '👵', color: '#EC4899' },
  { id: 'tinder_bio', label: 'Update Tinder bio', description: '"Can\'t even wake up on time"', icon: '🔥', color: '#FE3C72' },
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
}

function PunishmentRow({ punishment, enabled, onToggle, isLast }: PunishmentRowProps) {
  const handleToggle = useCallback(() => {
    if (punishment.comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle, punishment.comingSoon]);

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
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function PunishmentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [enabledPunishments, setEnabledPunishments] = useState<string[]>(['shame_video']);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const punishments = await getDefaultPunishments();
        setEnabledPunishments(punishments);
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

  const handleTogglePunishment = useCallback(async (id: string) => {
    setEnabledPunishments(prev => {
      const newPunishments = prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id];

      // Save to storage
      saveDefaultPunishments(newPunishments);

      return newPunishments;
    });
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
});
