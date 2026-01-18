/**
 * PUNISHMENTS SCREEN
 * PunishmentsScreen.tsx
 *
 * Settings page for managing default punishments.
 * Uses the shared PunishmentList component.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import Header from '@/components/Header';
import { PunishmentList } from '@/components/PunishmentList';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getDefaultPunishments,
  saveDefaultPunishments,
  getPunishmentConfig,
  savePunishmentConfig,
  PunishmentConfig,
} from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PunishmentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [enabledPunishments, setEnabledPunishments] = useState<string[]>(['shame_video']);
  const [punishmentConfig, setPunishmentConfig] = useState<PunishmentConfig>({});
  const [expandedPunishment, setExpandedPunishment] = useState<string | null>(null);

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
    setEnabledPunishments(prev => {
      const isCurrentlyEnabled = prev.includes(id);
      const newPunishments = isCurrentlyEnabled
        ? prev.filter(p => p !== id)
        : [...prev, id];

      saveDefaultPunishments(newPunishments);
      return newPunishments;
    });
  }, []);

  const handleSaveConfig = useCallback(async (config: PunishmentConfig) => {
    setPunishmentConfig(config);
    await savePunishmentConfig(config);
    setExpandedPunishment(null);
  }, []);

  return (
    <View style={styles.container}>
      <BackgroundGlow color="orange" />

      <View style={{ paddingTop: insets.top + Spacing.sm, paddingHorizontal: Spacing.lg }}>
        <Header type="nav" title="Punishments" onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>ENABLED PUNISHMENTS</ThemedText>
            <ThemedText style={styles.sectionHint}>
              These will be selected by default when creating new alarms
            </ThemedText>
            <PunishmentList
              enabledPunishments={enabledPunishments}
              onTogglePunishment={handleTogglePunishment}
              punishmentConfig={punishmentConfig}
              onSaveConfig={handleSaveConfig}
              expandedPunishment={expandedPunishment}
              onExpandPunishment={setExpandedPunishment}
            />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
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
});
