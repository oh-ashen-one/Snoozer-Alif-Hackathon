/**
 * SHAME SENT SCREEN
 *
 * Brutal. You snoozed. You're a failure. We told your buddy.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'ShameSent'>;

// Punishment-specific messages
const PUNISHMENT_MESSAGES: Record<string, { title: string; subtitle: string }> = {
  shame_video: { title: 'Your shame video played', subtitle: 'At max volume. Everyone heard.' },
  email_boss: { title: 'You emailed your boss', subtitle: 'Something embarrassing. Good luck Monday.' },
  tweet: { title: 'You tweeted something cringe', subtitle: 'Your followers will never forget.' },
  call_mom: { title: 'You called your mom', subtitle: 'At 6am. She\'s worried now.' },
  call_grandma: { title: 'You called your grandma', subtitle: 'At 6am. She probably thought someone died.' },
  call_buddy: { title: 'You called your buddy', subtitle: 'They\'re awake now too. Thanks.' },
  text_wife_dad: { title: 'You texted your wife\'s dad', subtitle: '"Hey Robert, quick question..."' },
  text_ex: { title: 'You texted your ex', subtitle: '"I miss you" — yikes.' },
  social_shame: { title: 'The group chat knows', subtitle: 'Everyone saw your failure.' },
  anti_charity: { title: 'You donated money', subtitle: 'To a cause you hate. Congrats.' },
};

export default function ShameSentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { buddyName, amount, currentTime, previousStreak, punishmentType } = route.params;

  // Get punishment-specific message
  const punishmentMessage = punishmentType
    ? PUNISHMENT_MESSAGES[punishmentType] || PUNISHMENT_MESSAGES.shame_video
    : PUNISHMENT_MESSAGES.shame_video;

  // Pulsing glow animation
  const glowScale = useSharedValue(0.9);
  const glowOpacity = useSharedValue(0.3);

  // Ring animations
  const ring1Scale = useSharedValue(0.3);
  const ring1Opacity = useSharedValue(0.4);
  const ring2Scale = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0.4);
  const ring3Scale = useSharedValue(0.3);
  const ring3Opacity = useSharedValue(0.4);

  useEffect(() => {
    // Main glow pulse
    glowScale.value = withRepeat(
      withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowOpacity.value = withRepeat(
      withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Ring 1
    ring1Scale.value = withRepeat(
      withTiming(2.5, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withTiming(0, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    // Ring 2 (delayed)
    ring2Scale.value = withDelay(1000, withRepeat(
      withTiming(2.5, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    ));
    ring2Opacity.value = withDelay(1000, withRepeat(
      withTiming(0, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    ));

    // Ring 3 (more delayed)
    ring3Scale.value = withDelay(2000, withRepeat(
      withTiming(2.5, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    ));
    ring3Opacity.value = withDelay(2000, withRepeat(
      withTiming(0, { duration: 4000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    ));
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const handleDismiss = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      {/* Red pulsing background */}
      <View style={styles.glowContainer}>
        <Animated.View style={[styles.orb, glowStyle]} />
        <Animated.View style={[styles.ring, ring1Style]} />
        <Animated.View style={[styles.ring, ring2Style]} />
        <Animated.View style={[styles.ring, ring3Style]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Big failure emoji */}
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>😴</Text>
        </View>

        {/* Main roast */}
        <ThemedText style={styles.title}>Pathetic.</ThemedText>
        <ThemedText style={styles.subtitle}>
          You had ONE job. Wake up.
        </ThemedText>

        {/* Shame stats */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>Time you gave up</ThemedText>
            <ThemedText style={styles.statValue}>{currentTime}</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>Money lost</ThemedText>
            <ThemedText style={styles.statValueRed}>-${amount}</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>Streak destroyed</ThemedText>
            <ThemedText style={styles.statValueRed}>{previousStreak} days → 0</ThemedText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <ThemedText style={styles.statLabel}>People disappointed</ThemedText>
            <ThemedText style={styles.statValue}>At least 1</ThemedText>
          </View>
        </View>

        {/* Punishment executed card */}
        <View style={styles.proofCard}>
          <View style={styles.proofIcon}>
            <Text style={styles.proofIconText}>✓</Text>
          </View>
          <View style={styles.proofText}>
            <ThemedText style={styles.proofTitle}>{punishmentMessage.title}</ThemedText>
            <ThemedText style={styles.proofSub}>{punishmentMessage.subtitle}</ThemedText>
          </View>
        </View>

        {/* Roast messages */}
        <View style={styles.roastSection}>
          <View style={styles.roastBubble}>
            <ThemedText style={styles.roastText}>"I'll wake up early tomorrow"</ThemedText>
            <ThemedText style={styles.roastAuthor}>— You, lying to yourself again</ThemedText>
          </View>

          <View style={styles.roastBubble}>
            <ThemedText style={styles.roastText}>"Just 5 more minutes"</ThemedText>
            <ThemedText style={styles.roastAuthor}>— Famous last words</ThemedText>
          </View>
        </View>

        {/* Final message */}
        <View style={styles.finalSection}>
          <ThemedText style={styles.finalText}>Sweet dreams 💤</ThemedText>
          <ThemedText style={styles.finalSubtext}>
            Have fun going back to sleep, lazy loser.
          </ThemedText>
          <ThemedText style={styles.finalSubtext2}>
            {buddyName} is ${amount} richer because you couldn't do the bare minimum.
          </ThemedText>
        </View>

        {/* Dismiss button */}
        <Pressable style={styles.dismissButton} onPress={handleDismiss}>
          <ThemedText style={styles.dismissButtonText}>Yeah yeah, I suck</ThemedText>
        </Pressable>

        <ThemedText style={styles.footer}>
          See you tomorrow. Maybe. If you can handle it.
        </ThemedText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Red/angry pulse background
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  orb: {
    position: 'absolute',
    top: '10%',
    left: '50%',
    marginLeft: -250,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  ring: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    marginLeft: -75,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'transparent',
  },

  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  emojiWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 56,
  },

  title: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.red,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },

  statsCard: {
    width: '100%',
    backgroundColor: 'rgba(28, 25, 23, 0.8)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  statLabel: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  statValueRed: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.red,
  },

  proofCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  proofIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  proofText: {
    flex: 1,
    gap: 2,
  },
  proofTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  proofSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  roastSection: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  roastBubble: {
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
    borderRadius: 12,
    padding: 14,
    paddingHorizontal: 18,
    borderLeftWidth: 3,
    borderLeftColor: Colors.textMuted,
  },
  roastText: {
    fontSize: 15,
    color: '#D6D3D1',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  roastAuthor: {
    fontSize: 13,
    color: '#57534E',
  },

  finalSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  finalText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  finalSubtext: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  finalSubtext2: {
    fontSize: 14,
    color: '#57534E',
    textAlign: 'center',
    lineHeight: 21,
  },

  dismissButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.red,
  },

  footer: {
    fontSize: 13,
    color: '#57534E',
    textAlign: 'center',
  },
});
