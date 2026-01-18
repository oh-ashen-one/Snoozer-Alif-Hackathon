import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useAuth } from '@/contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EXAMPLES = [
  {
    emoji: '😴',
    action: 'Snooze alarm?',
    consequence: 'Venmo your ex $5 with "miss u"',
  },
  {
    emoji: '🏋️',
    action: 'Skip the gym?',
    consequence: 'Tweets "I\'m weak willed and hate myself"',
  },
  {
    emoji: '📞',
    action: "Didn't call mom?",
    consequence: "Texts your wife's dad something risky",
  },
];

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { signInWithApple, signInWithGoogle, isAuthenticated } = useAuth();
  const [phase, setPhase] = useState(0);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Animation values
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-30)).current;
  const logoScale = useRef(new Animated.Value(1.2)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const descTranslateY = useRef(new Animated.Value(10)).current;
  const card0Opacity = useRef(new Animated.Value(0)).current;
  const card0TranslateX = useRef(new Animated.Value(-20)).current;
  const card1Opacity = useRef(new Animated.Value(0)).current;
  const card1TranslateX = useRef(new Animated.Value(-20)).current;
  const card2Opacity = useRef(new Animated.Value(0)).current;
  const card2TranslateX = useRef(new Animated.Value(-20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Shake animation
  const shakeRotation = useRef(new Animated.Value(0)).current;
  const shakeTranslateX = useRef(new Animated.Value(0)).current;

  // Navigate after successful sign-in
  useEffect(() => {
    if (isAuthenticated) {
      // Go to Onboarding flow (Name → Goals → Habit → Set Alarm → etc.)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    }
  }, [isAuthenticated, navigation]);

  // Start shake animation loop
  useEffect(() => {
    if (phase >= 1) {
      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(shakeRotation, {
              toValue: -8,
              duration: 20,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
            Animated.timing(shakeTranslateX, {
              toValue: -3,
              duration: 20,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
          Animated.parallel([
            Animated.timing(shakeRotation, {
              toValue: 8,
              duration: 40,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
            Animated.timing(shakeTranslateX, {
              toValue: 3,
              duration: 40,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
          Animated.parallel([
            Animated.timing(shakeRotation, {
              toValue: -8,
              duration: 40,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
            Animated.timing(shakeTranslateX, {
              toValue: -3,
              duration: 40,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
          Animated.parallel([
            Animated.timing(shakeRotation, {
              toValue: 0,
              duration: 20,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
            Animated.timing(shakeTranslateX, {
              toValue: 0,
              duration: 20,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
        ])
      );
      shakeAnimation.start();
      return () => shakeAnimation.stop();
    }
  }, [phase, shakeRotation, shakeTranslateX]);

  // Phase-based animations
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2400),
      setTimeout(() => setPhase(6), 3000),
      setTimeout(() => setPhase(7), 3500),
      setTimeout(() => setPhase(8), 4000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Animate based on phase changes
  useEffect(() => {
    const springConfig = {
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    };

    if (phase >= 1) {
      Animated.parallel([
        Animated.spring(iconOpacity, { ...springConfig, toValue: 1 }),
        Animated.spring(iconScale, { ...springConfig, toValue: 1 }),
      ]).start();
    }

    if (phase >= 2) {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    if (phase >= 3) {
      Animated.parallel([
        Animated.spring(logoOpacity, { ...springConfig, toValue: 1 }),
        Animated.spring(logoTranslateY, { ...springConfig, toValue: 0 }),
        Animated.spring(logoScale, { ...springConfig, toValue: 1 }),
        Animated.timing(lineWidth, {
          toValue: 60,
          duration: 400,
          delay: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }

    if (phase >= 4) {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }

    if (phase >= 5) {
      Animated.parallel([
        Animated.timing(descOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(descTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (phase >= 6) {
      Animated.parallel([
        Animated.timing(card0Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card0TranslateX, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (phase >= 7) {
      Animated.parallel([
        Animated.timing(card1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card1TranslateX, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (phase >= 8) {
      Animated.parallel([
        Animated.timing(card2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(card2TranslateX, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    phase,
    iconOpacity,
    iconScale,
    logoOpacity,
    logoTranslateY,
    logoScale,
    lineWidth,
    taglineOpacity,
    descOpacity,
    descTranslateY,
    card0Opacity,
    card0TranslateX,
    card1Opacity,
    card1TranslateX,
    card2Opacity,
    card2TranslateX,
    ctaOpacity,
    glowOpacity,
  ]);

  const handleAppleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signInWithApple();
    } catch (error) {
      setSignInError('Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn, signInWithApple]);

  const handleGoogleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await signInWithGoogle();
    } catch (error) {
      setSignInError('Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn, signInWithGoogle]);

  const cardOpacities = [card0Opacity, card1Opacity, card2Opacity];
  const cardTranslates = [card0TranslateX, card1TranslateX, card2TranslateX];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Red glow background */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Shaking alarm icon */}
        <Animated.Text
          style={[
            styles.icon,
            {
              opacity: iconOpacity,
              transform: [
                { scale: iconScale },
                {
                  rotate: shakeRotation.interpolate({
                    inputRange: [-8, 8],
                    outputRange: ['-8deg', '8deg'],
                  }),
                },
                { translateX: shakeTranslateX },
              ],
            },
          ]}
        >
          ⏰
        </Animated.Text>

        {/* Logo */}
        <Animated.Text
          style={[
            styles.logo,
            {
              opacity: logoOpacity,
              transform: [
                { translateY: logoTranslateY },
                { scale: logoScale },
              ],
            },
          ]}
        >
          SNOOZER
        </Animated.Text>

        {/* Red line */}
        <Animated.View
          style={[
            styles.redLine,
            {
              width: lineWidth,
            },
          ]}
        />

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
            },
          ]}
        >
          No mercy
        </Animated.Text>
      </View>

      {/* Description */}
      <Animated.Text
        style={[
          styles.description,
          {
            opacity: descOpacity,
            transform: [{ translateY: descTranslateY }],
          },
        ]}
      >
        The only app that actually{' '}
        <Text style={styles.descriptionBold}>punishes you</Text> when you
        don't do what you're supposed to
      </Animated.Text>

      {/* Example cards */}
      <View style={styles.cardsContainer}>
        {EXAMPLES.map((item, i) => (
          <Animated.View
            key={i}
            style={[
              styles.card,
              {
                opacity: cardOpacities[i],
                transform: [{ translateX: cardTranslates[i] }],
              },
            ]}
          >
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardAction}>{item.action}</Text>
              <Text style={styles.cardConsequence}>{item.consequence}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Sign-in section */}
      <Animated.View
        style={[
          styles.signInContainer,
          {
            opacity: ctaOpacity,
          },
        ]}
      >
        <Text style={styles.getStartedText}>Get started</Text>

        {/* Error message */}
        {signInError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{signInError}</Text>
          </View>
        )}

        {/* Google Sign-In */}
        <Pressable
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.buttonPressed,
            isSigningIn && styles.buttonDisabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <ActivityIndicator size="small" color={Colors.bg} />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {/* Apple Sign-In (iOS only) */}
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={BorderRadius.md}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        {/* Terms text */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>

        {/* Skip for testing */}
        {__DEV__ && (
          <Pressable
            style={styles.skipButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            }}
          >
            <Text style={styles.skipButtonText}>Skip (Dev Only)</Text>
          </Pressable>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    minHeight: '100%',
  },
  glow: {
    position: 'absolute',
    top: '10%',
    left: '50%',
    width: 400,
    height: 400,
    marginLeft: -200,
    borderRadius: 200,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  mainContent: {
    alignItems: 'center',
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 80,
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -2,
  },
  redLine: {
    height: 4,
    backgroundColor: Colors.red,
    borderRadius: 2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.red,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: Spacing.xl,
  },
  descriptionBold: {
    color: Colors.text,
    fontWeight: '600',
  },
  cardsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardAction: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  cardConsequence: {
    fontSize: 14,
    color: Colors.red,
    fontWeight: '500',
  },
  signInContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: Colors.red,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  googleButton: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.text,
    borderRadius: BorderRadius.md,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.bg,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  termsLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  skipButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    borderStyle: 'dashed',
  },
  skipButtonText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
