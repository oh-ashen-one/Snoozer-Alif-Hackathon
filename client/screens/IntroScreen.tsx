import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getOnboardingComplete } from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

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
  const [phase, setPhase] = useState(0);
  const [hasNavigated, setHasNavigated] = useState(false);

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

  const handleNavigate = useCallback(async () => {
    if (hasNavigated) return;
    setHasNavigated(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const hasOnboarded = await getOnboardingComplete();
      if (hasOnboarded) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    }
  }, [hasNavigated, navigation]);

  const handleGesture = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { translationY, velocityY } = event.nativeEvent;

      if (
        phase >= 8 &&
        (translationY < -SWIPE_THRESHOLD || velocityY < -500)
      ) {
        handleNavigate();
      }
    },
    [phase, handleNavigate]
  );

  const cardOpacities = [card0Opacity, card1Opacity, card2Opacity];
  const cardTranslates = [card0TranslateX, card1TranslateX, card2TranslateX];

  return (
    <PanGestureHandler onGestureEvent={handleGesture}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
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

        {/* Bottom CTA */}
        <Animated.View
          style={[
            styles.ctaContainer,
            {
              opacity: ctaOpacity,
              paddingBottom: Math.max(insets.bottom, 24) + 24,
            },
          ]}
        >
          <Text style={styles.ctaText}>Swipe up to start</Text>
          <View style={styles.ctaBar} />
        </Animated.View>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  glow: {
    position: 'absolute',
    top: '20%',
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
    marginBottom: Spacing['3xl'],
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
    marginBottom: Spacing['2xl'],
  },
  descriptionBold: {
    color: Colors.text,
    fontWeight: '600',
  },
  cardsContainer: {
    width: '100%',
    maxWidth: 340,
    gap: Spacing.md,
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
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  ctaBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
});
