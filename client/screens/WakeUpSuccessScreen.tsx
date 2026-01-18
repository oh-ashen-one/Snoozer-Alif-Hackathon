import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { setCurrentScreen, killAllSounds } from '@/utils/soundKiller';
import { clearInterruptedAlarm } from '@/hooks/useAntiCheat';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WakeUpSuccessRouteProp = RouteProp<RootStackParamList, 'WakeUpSuccess'>;

interface WakeUpSuccessStats {
  streak: number;
  previousStreak: number;
  wakeTime: string;
  targetTime: string;
  moneySaved: number;
  wakeUpRate: number;
}

const FACTS = [
  {
    stat: 'Studies show consistent wake times improve sleep quality by 30%',
    source: 'Journal of Sleep Research, 2023',
  },
  {
    stat: 'People with regular sleep schedules have 25% better cognitive performance',
    source: 'Nature Neuroscience, 2022',
  },
  {
    stat: 'Waking at the same time daily regulates cortisol and boosts mood by 40%',
    source: 'Harvard Medical School',
  },
  {
    stat: 'Consistent sleepers have 50% lower risk of cardiovascular disease',
    source: 'European Heart Journal, 2023',
  },
];

const CONFETTI_COLORS = [Colors.orange, Colors.green, Colors.text, Colors.red];

export default function WakeUpSuccessScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WakeUpSuccessRouteProp>();
  const { streak = 1, moneySaved = 0, wakeUpRate = 100, wakeTime = '6:00 AM', targetTime = '6:00 AM' } = route.params ?? {};

  // Animation states
  const [loaded, setLoaded] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFact, setShowFact] = useState(false);

  // Animation values
  const successScale = useRef(new Animated.Value(0.5)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const streakBounce = useRef(new Animated.Value(0)).current;

  // Confetti animations
  const confettiPieces = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 500,
      duration: 2000 + Math.random() * 2000,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      translateY: new Animated.Value(-50),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    })),
  []);

  // Stats from route params
  const stats: WakeUpSuccessStats = {
    streak,
    previousStreak: Math.max(0, streak - 1),
    wakeTime,
    targetTime,
    moneySaved,
    wakeUpRate,
  };

  const todaysFact = useMemo(() =>
    FACTS[Math.floor(Math.random() * FACTS.length)],
  []);

  // Stop alarm sound when this screen is shown and clear anti-cheat state
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('WakeUpSuccess');
      killAllSounds();
      // Clear the anti-cheat alarm state since wake-up was successful
      clearInterruptedAlarm();
    }, [])
  );

  const isNewRecord = stats.streak > stats.previousStreak && stats.streak % 5 === 0;
  const onTime = stats.wakeTime <= stats.targetTime;

  // Start animations on mount
  useEffect(() => {
    // Start confetti
    confettiPieces.forEach((piece) => {
      Animated.parallel([
        Animated.timing(piece.translateY, {
          toValue: 800,
          duration: piece.duration,
          delay: piece.delay,
          useNativeDriver: true,
        }),
        Animated.timing(piece.opacity, {
          toValue: 0,
          duration: piece.duration,
          delay: piece.delay,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: 720,
          duration: piece.duration,
          delay: piece.delay,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Success icon animation
    setTimeout(() => {
      setLoaded(true);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.spring(titleTranslateY, {
          toValue: 0,
          tension: 80,
          friction: 10,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    // Stats animation
    setTimeout(() => setShowStats(true), 600);

    // Fact animation
    setTimeout(() => setShowFact(true), 1200);

    // Start bouncing flame animation
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(streakBounce, {
          toValue: -8,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(streakBounce, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();

    return () => bounceAnimation.stop();
  }, [confettiPieces, successScale, successOpacity, titleOpacity, titleTranslateY, streakBounce]);

  const handleStartDay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `I just hit a ${stats.streak}-day wake-up streak on Snoozer! No mercy. 🔥⏰`,
      });
    } catch {
      // User cancelled or error
    }
  }, [stats.streak]);

  const getMotivationalMessage = useCallback(() => {
    if (stats.streak < 7) {
      return "You're building momentum. Keep showing up!";
    } else if (stats.streak < 14) {
      return 'One week strong! Your brain is adapting.';
    } else if (stats.streak < 30) {
      return 'Two weeks! This is becoming a habit.';
    }
    return "You're unstoppable. This is who you are now.";
  }, [stats.streak]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Green glow background */}
      <View style={styles.glowBackground} />

      {/* Confetti */}
      {confettiPieces.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.confettiPiece,
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.size > 10 ? piece.size / 2 : 2,
              transform: [
                { translateY: piece.translateY },
                {
                  rotate: piece.rotate.interpolate({
                    inputRange: [0, 720],
                    outputRange: ['0deg', '720deg'],
                  }),
                },
              ],
              opacity: piece.opacity,
            },
          ]}
        />
      ))}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success icon */}
        <Animated.View
          style={[
            styles.successIcon,
            {
              opacity: successOpacity,
              transform: [{ scale: successScale }],
            },
          ]}
        >
          <Text style={styles.successCheck}>✓</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          You're up! 🎉
        </Animated.Text>

        {/* Wake time */}
        <Animated.Text
          style={[
            styles.wakeTimeText,
            { opacity: titleOpacity },
          ]}
        >
          Woke up at{' '}
          <Text style={[styles.wakeTimeHighlight, onTime && styles.wakeTimeOnTime]}>
            {stats.wakeTime}
          </Text>
        </Animated.Text>

        {/* On time badge */}
        {onTime && (
          <Animated.View
            style={[
              styles.onTimeBadge,
              { opacity: titleOpacity },
            ]}
          >
            <Text style={styles.onTimeBadgeEmoji}>⚡</Text>
            <Text style={styles.onTimeBadgeText}>Right on time!</Text>
          </Animated.View>
        )}

        {/* Streak Hero Card */}
        <Animated.View
          style={[
            styles.streakCard,
            {
              opacity: showStats ? 1 : 0,
              transform: [{ translateY: showStats ? 0 : 20 }],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.streakFlame,
              { transform: [{ translateY: streakBounce }] },
            ]}
          >
            🔥
          </Animated.Text>
          <Text style={styles.streakLabel}>Current Streak</Text>
          <Text style={styles.streakNumber} numberOfLines={1} adjustsFontSizeToFit>{stats.streak}</Text>
          <Text style={styles.streakSubtext}>days in a row</Text>

          {isNewRecord && (
            <View style={styles.milestoneContainer}>
              <Text style={styles.milestoneText}>
                🏆 New milestone! Keep it going!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View
          style={[
            styles.statsGrid,
            {
              opacity: showStats ? 1 : 0,
              transform: [{ translateY: showStats ? 0 : 20 }],
            },
          ]}
        >
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>💰 Saved</Text>
            <Text style={styles.statValueGreen} numberOfLines={1} adjustsFontSizeToFit>${stats.moneySaved}</Text>
            <Text style={styles.statSubtext}>this month</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>⏰ Wake Rate</Text>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.wakeUpRate}%</Text>
            <Text style={styles.statSubtext}>on time</Text>
          </View>
        </Animated.View>

        {/* Scientific Fact Card */}
        <Animated.View
          style={[
            styles.factCard,
            {
              opacity: showFact ? 1 : 0,
              transform: [{ translateY: showFact ? 0 : 20 }],
            },
          ]}
        >
          <View style={styles.factHeader}>
            <Text style={styles.factEmoji}>🧠</Text>
            <Text style={styles.factLabel}>DID YOU KNOW?</Text>
          </View>
          <Text style={styles.factText}>{todaysFact.stat}</Text>
          <Text style={styles.factSource}>— {todaysFact.source}</Text>
        </Animated.View>

        {/* Motivational message */}
        <Animated.Text
          style={[
            styles.motivationalText,
            {
              opacity: showFact ? 1 : 0,
            },
          ]}
        >
          {getMotivationalMessage()}
        </Animated.Text>

        {/* CTA Button */}
        <Animated.View
          style={[
            styles.ctaContainer,
            { opacity: showFact ? 1 : 0 },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed,
            ]}
            onPress={handleStartDay}
          >
            <Text style={styles.ctaButtonText}>Start your day →</Text>
          </Pressable>

          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>📤 Share my streak</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  glowBackground: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '70%',
    backgroundColor: 'transparent',
    borderRadius: 300,
    opacity: 0.12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 100,
      },
      android: {
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
      },
    }),
  },
  confettiPiece: {
    position: 'absolute',
    top: -20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successCheck: {
    fontSize: 48,
    color: Colors.green,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  wakeTimeText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  wakeTimeHighlight: {
    color: Colors.orange,
    fontWeight: '600',
  },
  wakeTimeOnTime: {
    color: Colors.green,
  },
  onTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing['2xl'],
  },
  onTimeBadgeEmoji: {
    fontSize: 14,
  },
  onTimeBadgeText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '500',
  },
  streakCard: {
    width: '100%',
    maxWidth: 340,
    padding: Spacing.xl,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakFlame: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  streakLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  streakNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.orange,
    lineHeight: 64,
    marginBottom: Spacing.sm,
  },
  streakSubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  milestoneContainer: {
    marginTop: Spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
  },
  milestoneText: {
    fontSize: 14,
    color: Colors.orange,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 340,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  statValueGreen: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.green,
  },
  statSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  factCard: {
    width: '100%',
    maxWidth: 340,
    padding: Spacing.xl,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    marginBottom: Spacing['2xl'],
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  factEmoji: {
    fontSize: 18,
  },
  factLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
    letterSpacing: 1,
  },
  factText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  factSource: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  motivationalText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  ctaContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  ctaButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  shareButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  shareButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
