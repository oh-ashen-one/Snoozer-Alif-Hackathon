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
  Text,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode } from 'expo-av';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import Header from '@/components/Header';
import { PunishmentList } from '@/components/PunishmentList';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getDefaultPunishments,
  saveDefaultPunishments,
  getPunishmentConfig,
  savePunishmentConfig,
  PunishmentConfig,
} from '@/utils/storage';
import { getShameVideo } from '@/utils/fileSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PunishmentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [enabledPunishments, setEnabledPunishments] = useState<string[]>(['shame_video']);
  const [punishmentConfig, setPunishmentConfig] = useState<PunishmentConfig>({});
  const [expandedPunishment, setExpandedPunishment] = useState<string | null>(null);
  const [showMaxLimitCard, setShowMaxLimitCard] = useState(false);
  const [shameVideoUri, setShameVideoUri] = useState<string | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

  const loadShameVideo = useCallback(async () => {
    try {
      const uri = await getShameVideo();
      setShameVideoUri(uri);
      if (__DEV__) console.log('[Punishments] Loaded shame video:', uri ? 'exists' : 'none');
    } catch {
      setShameVideoUri(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShameVideo();
    }, [loadShameVideo])
  );

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
    const MAX_PUNISHMENTS = 4;

    const isCurrentlyEnabled = enabledPunishments.includes(id);

    // If disabling, always allow
    if (isCurrentlyEnabled) {
      const newPunishments = enabledPunishments.filter(p => p !== id);
      setEnabledPunishments(newPunishments);
      saveDefaultPunishments(newPunishments);
      setShowMaxLimitCard(false);
      return;
    }

    // Check max limit when enabling
    if (enabledPunishments.length >= MAX_PUNISHMENTS) {
      setShowMaxLimitCard(true);
      return;
    }

    setShowMaxLimitCard(false);
    const newPunishments = [...enabledPunishments, id];
    setEnabledPunishments(newPunishments);
    saveDefaultPunishments(newPunishments);
  }, [enabledPunishments]);

  const handleSaveConfig = useCallback(async (config: PunishmentConfig) => {
    setPunishmentConfig(config);
    await savePunishmentConfig(config);
    setExpandedPunishment(null);
  }, []);

  const handleRecordShameVideo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('RecordShame', {
      alarmTime: '6:00 AM',
      alarmLabel: 'Settings',
      referencePhotoUri: '',
      isOnboarding: false,
      returnTo: undefined,
    });
  }, [navigation]);

  const handleViewShameVideo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowVideoPreview(true);
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
              shameVideoUri={shameVideoUri}
              onRecordShameVideo={handleRecordShameVideo}
              onViewShameVideo={handleViewShameVideo}
            />
            {showMaxLimitCard && (
              <View style={styles.maxLimitCard}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text style={styles.maxLimitText}>
                  Maximum 4 punishments. Disable one to add another.
                </Text>
              </View>
            )}
          </View>
        </FadeInView>
      </ScrollView>

      <Modal
        visible={showVideoPreview}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVideoPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Your Shame Video</ThemedText>
            
            {shameVideoUri && Platform.OS !== 'web' ? (
              <View style={styles.videoContainer}>
                <Video
                  source={{ uri: shameVideoUri }}
                  style={styles.video}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                />
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={{ fontSize: 48 }}>🎬</Text>
                <ThemedText style={styles.placeholderText}>
                  {Platform.OS === 'web' ? 'Video preview not available on web' : 'No video recorded'}
                </ThemedText>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setShowVideoPreview(false);
                  handleRecordShameVideo();
                }}
              >
                <ThemedText style={styles.modalSecondaryButtonText}>Re-record</ThemedText>
              </Pressable>
              <Pressable 
                style={styles.modalPrimaryButton}
                onPress={() => setShowVideoPreview(false)}
              >
                <ThemedText style={styles.modalPrimaryButtonText}>Done</ThemedText>
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
  maxLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  maxLimitText: {
    flex: 1,
    fontSize: 14,
    color: Colors.red,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  videoContainer: {
    aspectRatio: 9 / 16,
    width: '100%',
    maxHeight: 350,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.bg,
    marginBottom: Spacing.lg,
  },
  video: {
    flex: 1,
  },
  videoPlaceholder: {
    aspectRatio: 9 / 16,
    width: '100%',
    maxHeight: 300,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modalPrimaryButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.green,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
});
