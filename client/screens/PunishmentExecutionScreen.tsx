/**
 * PUNISHMENT EXECUTION SCREEN
 * PunishmentExecutionScreen.tsx
 *
 * Shows punishment-specific UI and auto-executes the punishment action.
 * Each punishment type has its own experience (email, call, tweet, text, etc.)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getBuddyInfo } from '@/utils/storage';
import { getCurrentStreak } from '@/utils/tracking';
import { getShameVideo } from '@/utils/fileSystem';
import { setCurrentScreen } from '@/utils/soundKiller';

const isWeb = Platform.OS === 'web';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'PunishmentExecution'>;

// Punishment display config
const PUNISHMENT_CONFIG: Record<string, { icon: string; title: string; subtitle: string }> = {
  shame_video: { icon: '🎬', title: 'SHAME VIDEO', subtitle: 'Playing at max volume...' },
  email_boss: { icon: '📧', title: 'EMAILING BOSS', subtitle: 'Sending embarrassing email...' },
  tweet: { icon: '🐦', title: 'TWEETING', subtitle: 'Posting something embarrassing...' },
  call_mom: { icon: '👩', title: 'CALLING MOM', subtitle: 'At 6am. She\'ll be worried.' },
  call_grandma: { icon: '👵', title: 'CALLING GRANDMA', subtitle: 'At 6am. She WILL answer.' },
  call_buddy: { icon: '📞', title: 'CALLING BUDDY', subtitle: 'Waking them up too...' },
  text_wife_dad: { icon: '👴', title: 'TEXTING WIFE\'S DAD', subtitle: '"Hey Robert, quick question..."' },
  text_ex: { icon: '💔', title: 'TEXTING EX', subtitle: '"I miss you..."' },
  social_shame: { icon: '💬', title: 'GROUP CHAT SHAME', subtitle: 'Everyone will know...' },
  anti_charity: { icon: '🗳️', title: 'DONATING', subtitle: 'To a cause you hate...' },
};

// Embarrassing emails for boss
const EMBARRASSING_EMAILS = [
  { subject: "I pooped my pants this morning", body: "Hi,\n\nI'm running late because I had a bit of an accident. The less said the better.\n\nPlease don't bring this up." },
  { subject: "A raccoon is living in my car", body: "Hi,\n\nI can't come in because there's a raccoon in my car and it won't leave. It hissed at me. I'm scared.\n\nSend help." },
  { subject: "I stayed up until 4am playing Fortnite", body: "Hi,\n\nI made some bad decisions last night. I was SO close to a Victory Royale. I didn't get it. And now I'm exhausted.\n\nWorth it though." },
  { subject: "I got my head stuck in a fence", body: "Hi,\n\nLong story. Fire department is on the way. I'll explain later but please don't ask.\n\nThis is not a joke." },
  { subject: "I accidentally dyed myself blue", body: "Hi,\n\nI look like a Smurf. I can't come in like this. People will laugh. I'm already crying.\n\nBlue tears." },
];

// Embarrassing tweets
const EMBARRASSING_TWEETS = [
  "im gay",
  "i like butt",
  "i just mass sharted myself at work",
  "does anyone know how to get poop stains out of khakis asking for myself",
  "i still sleep with a stuffed animal im 28",
  "just googled 'how to make friends' at 2am",
  "i cry during pixar movies every single time",
  "my mom still does my laundry",
  "i talk to my plants and they dont even respond",
  "just got rejected by a bot on a dating app",
];

// Embarrassing texts for wife's dad
const WIFES_DAD_TEXTS = [
  "Hey Robert, quick question - is it normal for grown adults to hit snooze 5 times? Asking for a friend (me).",
  "Good morning! Just wanted you to know your daughter married someone who can't wake up on time.",
  "Hi, it's me. I overslept again. Please don't tell her.",
  "Robert, I need advice. How did you raise such an early riser? Asking because I clearly wasn't.",
  "Morning! I'm supposed to be at work but I'm still in bed. Life advice?",
];

export default function PunishmentExecutionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {
    alarmId,
    alarmLabel,
    punishmentType,
    shameVideoUri: routeVideoUri,
    config,
  } = route.params;

  const [isExecuting, setIsExecuting] = useState(false);
  const [videoUri, setVideoUri] = useState<string>(routeVideoUri || '');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15);
  const videoRef = useRef<Video>(null);
  const hasExecutedRef = useRef(false);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulsing animation
  const pulse = useSharedValue(1);

  const punishmentInfo = PUNISHMENT_CONFIG[punishmentType] || PUNISHMENT_CONFIG.shame_video;

  useEffect(() => {
    setCurrentScreen('PunishmentExecution');

    // Intense haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Pulsing animation
    pulse.value = withRepeat(
      withTiming(0.5, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Setup audio for video playback
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        if (__DEV__) console.error('Error setting audio mode:', error);
      }
    };

    setupAudio();

    // Load shame video if needed
    if (punishmentType === 'shame_video' && (!routeVideoUri || routeVideoUri.startsWith('mock://'))) {
      getShameVideo().then(uri => {
        if (uri) setVideoUri(uri);
      });
    }

    // Auto-execute punishment after brief delay
    const executeTimer = setTimeout(() => {
      executePunishment();
    }, 2000);

    return () => {
      clearTimeout(executeTimer);
      if (mockTimerRef.current) {
        clearInterval(mockTimerRef.current);
      }
    };
  }, []);

  const navigateToResult = useCallback(async () => {
    const [buddy, streak] = await Promise.all([
      getBuddyInfo(),
      getCurrentStreak(),
    ]);

    const buddyName = buddy?.name || 'Your buddy';
    const penaltyAmount = 5;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const currentTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

    navigation.navigate('ShameSent', {
      buddyName,
      amount: penaltyAmount,
      currentTime,
      previousStreak: streak,
      punishmentType,
    });
  }, [navigation, punishmentType]);

  const executePunishment = useCallback(async () => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;
    setIsExecuting(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      switch (punishmentType) {
        case 'shame_video':
          // Video plays inline, wait for it to finish
          if (isWeb) {
            // Mock video timer for web
            mockTimerRef.current = setInterval(() => {
              setRemainingSeconds(prev => {
                if (prev <= 1) {
                  if (mockTimerRef.current) clearInterval(mockTimerRef.current);
                  navigateToResult();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
          // Real video will call navigateToResult when finished via onPlaybackStatusUpdate
          break;

        case 'email_boss':
          if (config?.bossEmail) {
            const email = EMBARRASSING_EMAILS[Math.floor(Math.random() * EMBARRASSING_EMAILS.length)];
            const mailUrl = `mailto:${config.bossEmail}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
            await Linking.openURL(mailUrl);
          }
          setTimeout(navigateToResult, 1500);
          break;

        case 'tweet':
          const tweet = EMBARRASSING_TWEETS[Math.floor(Math.random() * EMBARRASSING_TWEETS.length)];
          const tweetUrl = `https://twitter.com/intent/post?text=${encodeURIComponent(tweet)}`;
          await Linking.openURL(tweetUrl);
          setTimeout(navigateToResult, 1500);
          break;

        case 'call_mom':
          if (config?.momPhone) {
            await Linking.openURL(`tel:${config.momPhone}`);
          }
          setTimeout(navigateToResult, 1500);
          break;

        case 'call_grandma':
          if (config?.grandmaPhone) {
            await Linking.openURL(`tel:${config.grandmaPhone}`);
          }
          setTimeout(navigateToResult, 1500);
          break;

        case 'call_buddy':
          if (config?.buddyPhone) {
            await Linking.openURL(`tel:${config.buddyPhone}`);
          }
          setTimeout(navigateToResult, 1500);
          break;

        case 'text_wife_dad':
          if (config?.wifesDadPhone) {
            const message = WIFES_DAD_TEXTS[Math.floor(Math.random() * WIFES_DAD_TEXTS.length)];
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
              await SMS.sendSMSAsync([config.wifesDadPhone], message);
            }
          }
          setTimeout(navigateToResult, 1500);
          break;

        case 'text_ex':
          if (config?.exPhone) {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
              await SMS.sendSMSAsync([config.exPhone], "I miss you 💔");
            }
          }
          setTimeout(navigateToResult, 1500);
          break;

        case 'social_shame':
          // Open group chat (would need group chat config)
          setTimeout(navigateToResult, 1500);
          break;

        case 'anti_charity':
          // Future: payment flow
          setTimeout(navigateToResult, 1500);
          break;

        default:
          setTimeout(navigateToResult, 1500);
      }
    } catch (error) {
      if (__DEV__) console.error('[PunishmentExecution] Error:', error);
      setTimeout(navigateToResult, 1500);
    }
  }, [punishmentType, config, navigateToResult]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.positionMillis !== undefined && status.durationMillis) {
      const remaining = Math.ceil((status.durationMillis - status.positionMillis) / 1000);
      setRemainingSeconds(Math.max(0, remaining));
    }

    if (status.didJustFinish) {
      navigateToResult();
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  // Shame video view
  if (punishmentType === 'shame_video') {
    return (
      <View style={styles.container}>
        <BackgroundGlow color="red" />

        {/* Pulsing red border */}
        <Animated.View style={[styles.borderTop, pulseStyle]} />
        <Animated.View style={[styles.borderBottom, pulseStyle]} />
        <Animated.View style={[styles.borderLeft, pulseStyle]} />
        <Animated.View style={[styles.borderRight, pulseStyle]} />

        {/* Video */}
        {isWeb || !videoUri || videoUri.startsWith('mock://') ? (
          <View style={styles.mockVideo}>
            <Text style={styles.mockVideoEmoji}>🎬</Text>
            <Text style={styles.mockVideoText}>Shame video playing...</Text>
            <Text style={styles.mockVideoSubtext}>{remainingSeconds}s remaining</Text>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            volume={1.0}
            isMuted={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        )}

        {/* Top overlay */}
        <View style={styles.topOverlay}>
          <Animated.View style={pulseStyle}>
            <ThemedText style={styles.shameText}>YOU SNOOZED</ThemedText>
          </Animated.View>
        </View>

        {/* Bottom overlay */}
        <View style={styles.bottomOverlay}>
          <ThemedText style={styles.watchText}>You must watch this</ThemedText>
          <ThemedText style={styles.countdownText}>{remainingSeconds}s remaining</ThemedText>
        </View>
      </View>
    );
  }

  // Generic punishment view
  return (
    <View style={styles.container}>
      <BackgroundGlow color="red" />

      {/* Pulsing red border */}
      <Animated.View style={[styles.borderTop, pulseStyle]} />
      <Animated.View style={[styles.borderBottom, pulseStyle]} />
      <Animated.View style={[styles.borderLeft, pulseStyle]} />
      <Animated.View style={[styles.borderRight, pulseStyle]} />

      <View style={styles.content}>
        <Animated.View style={pulseStyle}>
          <ThemedText style={styles.shameText}>YOU SNOOZED</ThemedText>
        </Animated.View>

        <View style={styles.punishmentCard}>
          <Text style={styles.punishmentIcon}>{punishmentInfo.icon}</Text>
          <ThemedText style={styles.punishmentTitle}>{punishmentInfo.title}</ThemedText>
          <ThemedText style={styles.punishmentSubtitle}>{punishmentInfo.subtitle}</ThemedText>
        </View>

        {isExecuting && (
          <View style={styles.executingContainer}>
            <ThemedText style={styles.executingText}>Executing punishment...</ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Borders
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },
  borderLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },
  borderRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 4,
    backgroundColor: Colors.red,
    zIndex: 100,
  },

  // Shame text
  shameText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 6,
    marginBottom: Spacing['2xl'],
  },

  // Punishment card
  punishmentCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.red,
    padding: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  punishmentIcon: {
    fontSize: 80,
  },
  punishmentTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  punishmentSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Executing state
  executingContainer: {
    marginTop: Spacing['2xl'],
  },
  executingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Video styles
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  mockVideo: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockVideoEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  mockVideoText: {
    fontSize: 18,
    color: Colors.red,
    fontWeight: '700',
  },
  mockVideoSubtext: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // Overlays
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: Spacing['2xl'],
    backgroundColor: 'rgba(12, 10, 9, 0.5)',
    zIndex: 10,
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 60,
    paddingTop: Spacing['2xl'],
    backgroundColor: 'rgba(12, 10, 9, 0.7)',
    zIndex: 10,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  watchText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  countdownText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
  },
});
