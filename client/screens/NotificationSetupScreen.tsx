import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import Header from '@/components/Header';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SetupStep {
  number: number;
  title: string;
  description: string;
  path: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    number: 1,
    title: 'Enable Alarms & Timers',
    description: 'This allows Snoozer to schedule alarms that ring reliably.',
    path: 'Settings → Snoozer → Alarms & Timers → Enable',
  },
  {
    number: 2,
    title: 'Enable Time Sensitive Notifications',
    description: 'Ensures notifications break through Focus modes and deliver immediately.',
    path: 'Settings → Snoozer → Notifications → Time Sensitive → Enable',
  },
  {
    number: 3,
    title: 'Add Snoozer to Focus Mode',
    description: 'Allow Snoozer to notify you even when Focus mode is on.',
    path: 'Settings → Focus → [Your Mode] → Apps → Add Snoozer',
  },
  {
    number: 4,
    title: 'Disable Scheduled Summary',
    description: 'Prevents your alarm notifications from being delayed in a summary.',
    path: 'Settings → Notifications → Scheduled Summary → Turn Off',
  },
];

function StepCard({ step }: { step: SetupStep }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNumber}>
          <ThemedText style={styles.stepNumberText}>{step.number}</ThemedText>
        </View>
        <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
      </View>
      <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
      <View style={styles.pathContainer}>
        <Text style={{ fontSize: 14 }}>🧭</Text>
        <ThemedText style={styles.pathText}>{step.path}</ThemedText>
      </View>
    </View>
  );
}

export default function NotificationSetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleOpenSettings = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Open your device settings manually to configure Snoozer notifications.');
      return;
    }
    
    try {
      await Linking.openSettings();
    } catch (error) {
      if (__DEV__) console.error('Failed to open settings:', error);
      Alert.alert('Error', 'Could not open settings. Please open your Settings app manually.');
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />

      {/* Header */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <Header type="nav" title="Setup Guide" emoji={'\uD83D\uDCF1'} onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introSection}>
          <View style={styles.introBadge}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
            <ThemedText style={styles.introBadgeText}>iOS Settings</ThemedText>
          </View>
          <ThemedText style={styles.introTitle}>
            Make sure your alarms{'\n'}always ring
          </ThemedText>
          <ThemedText style={styles.introSubtitle}>
            Follow these steps to ensure Snoozer can wake you up even during Focus mode, Do Not Disturb, or Sleep mode.
          </ThemedText>
        </View>

        {/* Steps */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>SETUP STEPS</ThemedText>
          <View style={styles.stepsContainer}>
            {SETUP_STEPS.map((step, index) => (
              <React.Fragment key={step.number}>
                <StepCard step={step} />
                {index < SETUP_STEPS.length - 1 && (
                  <View style={styles.stepConnector}>
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Why this matters */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>WHY THIS MATTERS</ThemedText>
          <View style={styles.card}>
            <View style={styles.whyCard}>
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <ThemedText style={styles.whyText}>
                Without these settings, iOS may silence or delay your alarm notifications. This is especially important if you use Focus mode, Sleep mode, or Do Not Disturb at night.
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomCTA, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.primaryButton} onPress={handleOpenSettings}>
          <Text style={{ fontSize: 20 }}>🔗</Text>
          <ThemedText style={styles.primaryButtonText}>Open iOS Settings</ThemedText>
        </Pressable>
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
    fontSize: 18,
    fontWeight: '600',
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
  },

  // Intro
  introSection: {
    marginBottom: Spacing['2xl'],
  },
  introBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: 100,
    marginBottom: Spacing.lg,
  },
  introBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.orange,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  introSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMuted,
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

  // Steps
  stepsContainer: {
    gap: 0,
  },
  stepCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.bg,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginLeft: 40,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: 40,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  pathText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.orange,
  },
  stepConnector: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    backgroundColor: Colors.border,
    marginLeft: 13,
    alignSelf: 'flex-start',
  },

  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  whyCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  whyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },

  // Bottom CTA
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: 18,
    backgroundColor: Colors.orange,
    borderRadius: 14,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
