import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { BottomNav } from '@/components/BottomNav';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import { AnimatedCard } from '@/components/AnimatedCard';
import Header from '@/components/Header';
// import { getBuddyInfo, BuddyInfo } from '@/utils/storage'; // Buddy not fully built yet

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ModeId = '1v1' | 'group' | 'survivor' | 'accountability' | 'charity';

interface Mode {
  id: ModeId;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  stakes: string;
  players: string;
  color: string;
  features: string[];
}

const MODES: Mode[] = [
  {
    id: '1v1',
    icon: 'zap',
    title: '1v1 Battle',
    subtitle: 'Head-to-head with one friend',
    description: 'Race to the gym every morning. Whoever checks in first wins the day. Weekly loser buys protein shakes.',
    stakes: '$5-20/week',
    players: '2 people',
    color: '#FB923C',
    features: ['Daily winner/loser', 'Weekly payout', 'See their misses'],
  },
  {
    id: 'group',
    icon: 'users',
    title: 'Group Pool',
    subtitle: 'Everyone puts money in',
    description: 'Family group chat for calling mom weekly. Most calls by month end takes the pot.',
    stakes: '$5-10/person',
    players: '3-8 people',
    color: '#22C55E',
    features: ['Winner takes all', 'Group leaderboard', 'Shame the slackers'],
  },
  {
    id: 'survivor',
    icon: 'target',
    title: 'Survivor Mode',
    subtitle: 'Last one standing wins',
    description: "Miss your Fajr prayer? You're eliminated. Last person standing wins the pot.",
    stakes: '$10-50 buy-in',
    players: '4-12 people',
    color: '#EF4444',
    features: ['Single elimination', 'High stakes', 'Ultimate pressure'],
  },
  {
    id: 'accountability',
    icon: 'heart',
    title: 'Accountability Partner',
    subtitle: 'No money, just support',
    description: 'Get notified when your partner skips meditation. Send nudges. Build streaks together.',
    stakes: 'Free',
    players: '2 people',
    color: '#7C3AED',
    features: ['No money involved', 'Mutual notifications', 'Streak sharing'],
  },
  {
    id: 'charity',
    icon: 'gift',
    title: 'Charity Stakes',
    subtitle: 'Skip = donate to cause',
    description: 'Every time you skip reading, money goes to a charity. Pick one you hate for motivation.',
    stakes: '$1-5/skip',
    players: 'Solo + buddy witness',
    color: '#EC4899',
    features: ['Auto-donations', 'Buddy verifies', 'Tax deductible'],
  },
];

function ModeCard({
  mode,
  isSelected,
  onSelect,
}: {
  mode: Mode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.modeCard,
        isSelected && {
          borderWidth: 2,
          borderColor: mode.color,
        },
      ]}
      onPress={onSelect}
    >
      {/* Main row */}
      <View style={styles.modeMainRow}>
        {/* Icon */}
        <View style={[styles.modeIconCircle, { backgroundColor: `${mode.color}20` }]}>
          <Text style={{ fontSize: 26 }}>
            {mode.icon === 'zap' ? '⚡' : mode.icon === 'users' ? '👥' : mode.icon === 'target' ? '🎯' : mode.icon === 'heart' ? '❤️' : mode.icon === 'gift' ? '🎁' : ''}
          </Text>
        </View>

        {/* Text */}
        <View style={styles.modeTextContainer}>
          <View style={styles.modeTitleRow}>
            <ThemedText style={styles.modeTitle}>{mode.title}</ThemedText>
            {mode.stakes === 'Free' && (
              <View style={styles.freeBadge}>
                <ThemedText style={styles.freeBadgeText}>FREE</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={styles.modeSubtitle}>{mode.subtitle}</ThemedText>
        </View>

        {/* Radio */}
        <View
          style={[
            styles.radioOuter,
            isSelected && { backgroundColor: mode.color, borderColor: mode.color },
          ]}
        >
          {isSelected && <Text style={{ fontSize: 14, color: '#FAFAF9' }}>✓</Text>}
        </View>
      </View>

      {/* Expanded details */}
      {isSelected && (
        <View style={styles.expandedSection}>
          {/* Description */}
          <ThemedText style={styles.modeDescription}>{mode.description}</ThemedText>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <ThemedText style={styles.statLabel}>Stakes: </ThemedText>
              <ThemedText style={[styles.statValue, { color: mode.color }]}>{mode.stakes}</ThemedText>
            </View>
            <View style={styles.statPill}>
              <ThemedText style={styles.statLabel}>Players: </ThemedText>
              <ThemedText style={styles.statValueWhite}>{mode.players}</ThemedText>
            </View>
          </View>

          {/* Features */}
          <View style={styles.featuresRow}>
            {mode.features.map((feature, i) => (
              <View key={i} style={[styles.featureChip, { backgroundColor: `${mode.color}15` }]}>
                <Text style={{ fontSize: 10, color: mode.color }}>✓</Text>
                <ThemedText style={[styles.featureText, { color: mode.color }]}>{feature}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}
    </Pressable>
  );
}

export default function BuddyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Buddy feature not fully built - always show mode selection
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const handleSelectMode = useCallback((modeId: ModeId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedMode(prev => (prev === modeId ? null : modeId));
  }, []);

  const handleSetup = useCallback(() => {
    if (!selectedMode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('BuddySetup', { mode: selectedMode });
  }, [selectedMode, navigation]);

  const handleEnterCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('JoinCode');
  }, [navigation]);

  const selectedModeData = MODES.find(m => m.id === selectedMode);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.headerContainer}>
        <Header type="buddy" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <FadeInView delay={50} direction="up">
          <View style={styles.heroSection}>
            <View style={styles.heroBadge}>
              <Text style={{ fontSize: 14 }}>⚡</Text>
              <ThemedText style={styles.heroBadgeText}>2x more likely to succeed</ThemedText>
            </View>
            <ThemedText style={styles.heroTitle}>Choose your accountability style</ThemedText>
            <ThemedText style={styles.heroSubtitle}>Different ways to make sure you never snooze</ThemedText>
          </View>
        </FadeInView>

        {/* Mode Cards */}
        <View style={styles.modeList}>
          {MODES.map((mode, index) => (
            <AnimatedCard key={mode.id} index={index} delayBase={100} delayIncrement={60}>
              <ModeCard
                mode={mode}
                isSelected={selectedMode === mode.id}
                onSelect={() => handleSelectMode(mode.id)}
              />
            </AnimatedCard>
          ))}
        </View>

        {/* Popular badge */}
        <FadeInView delay={400} direction="up">
          <View style={styles.popularBadge}>
            <View style={styles.popularIcon}>
              <Text style={{ fontSize: 18 }}>📊</Text>
            </View>
            <View>
              <ThemedText style={styles.popularTitle}>Most popular: 1v1 Battle</ThemedText>
              <ThemedText style={styles.popularSubtitle}>78% of users choose this mode</ThemedText>
            </View>
          </View>
        </FadeInView>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: selectedMode ? selectedModeData?.color : '#292524',
                shadowColor: selectedMode ? selectedModeData?.color : 'transparent',
                shadowOpacity: selectedMode ? 0.4 : 0,
              },
            ]}
            onPress={handleSetup}
            disabled={!selectedMode}
          >
            <ThemedText
              style={[styles.primaryButtonText, { color: selectedMode ? '#FAFAF9' : '#57534E' }]}
            >
              {selectedMode ? `Set up ${selectedModeData?.title}` : 'Select a mode to continue'}
            </ThemedText>
            {selectedMode && <Text style={{ fontSize: 20, color: '#FAFAF9' }}>→</Text>}
          </Pressable>

          <Pressable style={styles.enterCodeButton} onPress={handleEnterCode}>
            <ThemedText style={styles.enterCodeText}>Already have an invite? </ThemedText>
            <ThemedText style={styles.enterCodeLink}>Enter code</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <BottomNav activeTab="buddy" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  headerContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: 100,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FB923C',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Mode List
  modeList: {
    gap: 12,
  },

  // Mode Card
  modeCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  modeMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  modeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  modeSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  freeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 100,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22C55E',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded Section
  expandedSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingLeft: 82, // 16 + 52 + 14 = align with text
  },
  modeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statPill: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValueWhite: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Popular Badge
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popularIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  popularSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Bottom CTA
  ctaSection: {
    marginTop: Spacing.xl,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enterCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  enterCodeText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  enterCodeLink: {
    fontSize: 13,
    color: Colors.orange,
  },
});
