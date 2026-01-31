import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getOnboardingComplete, getAlarms, setOnboardingComplete } from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SplashLoadingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Animation values
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;

  // Shake animation
  const shakeRotation = useRef(new Animated.Value(0)).current;
  const shakeTranslateX = useRef(new Animated.Value(0)).current;

  // Navigate based on onboarding state when loading complete
  const navigateAway = useCallback(async () => {
    if (hasNavigated) return;
    setHasNavigated(true);

    let targetRoute: keyof RootStackParamList = 'Intro';

    try {
      const hasOnboarded = await getOnboardingComplete();
      // Also check if user has alarms - if so, they've completed onboarding
      const alarms = await getAlarms();
      const hasAlarms = alarms.length > 0;

      if (hasOnboarded || hasAlarms) {
        targetRoute = 'Home';
        // Fix the flag if it was missing
        if (!hasOnboarded && hasAlarms) {
          await setOnboardingComplete(true);
        }
      }
    } catch {
      // On error, start fresh with Intro (sign-in)
    }

    navigation.reset({
      index: 0,
      routes: [{ name: targetRoute }],
    });
  }, [hasNavigated, navigation]);

  // Start animations on mount
  useEffect(() => {
    // Fade in content
    setTimeout(() => {
      setLoaded(true);
      Animated.parallel([
        Animated.spring(contentOpacity, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);

    // Start shake animation
    const shakeAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(shakeRotation, {
            toValue: -5,
            duration: 25,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(shakeTranslateX, {
            toValue: -2,
            duration: 25,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ]),
        Animated.parallel([
          Animated.timing(shakeRotation, {
            toValue: 5,
            duration: 50,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(shakeTranslateX, {
            toValue: 2,
            duration: 50,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ]),
        Animated.parallel([
          Animated.timing(shakeRotation, {
            toValue: -5,
            duration: 50,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(shakeTranslateX, {
            toValue: -2,
            duration: 50,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ]),
        Animated.parallel([
          Animated.timing(shakeRotation, {
            toValue: 0,
            duration: 25,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(shakeTranslateX, {
            toValue: 0,
            duration: 25,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ]),
      ])
    );
    shakeAnimation.start();

    // Progress bar animation - fills over ~2.5 seconds
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 50);

    return () => {
      shakeAnimation.stop();
      clearInterval(interval);
    };
  }, [contentOpacity, contentScale, shakeRotation, shakeTranslateX]);

  // Navigate when progress reaches 100
  useEffect(() => {
    if (progress >= 100) {
      // Small delay before navigating for smoother transition
      setTimeout(navigateAway, 200);
    }
  }, [progress, navigateAway]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Orange glow */}
      <View style={styles.glow} />

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        {/* Shaking alarm icon */}
        <Animated.Text
          style={[
            styles.icon,
            {
              transform: [
                {
                  rotate: shakeRotation.interpolate({
                    inputRange: [-5, 5],
                    outputRange: ['-5deg', '5deg'],
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
        <Text style={styles.logo}>SNOOZER</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          The only app that actually{' '}
          <Text style={styles.taglineHighlight}>forces you</Text> to do the
          things you're supposed to.
        </Text>

        {/* Loading bar */}
        <View style={styles.loadingBarContainer}>
          <View style={[styles.loadingBarFill, { width: `${progress}%` }]} />
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    borderRadius: 150,
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 72,
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -2,
    marginBottom: Spacing.lg,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    marginBottom: Spacing['3xl'],
  },
  taglineHighlight: {
    color: Colors.orange,
    fontWeight: '600',
  },
  loadingBarContainer: {
    width: 200,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: Colors.orange,
    borderRadius: 2,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
