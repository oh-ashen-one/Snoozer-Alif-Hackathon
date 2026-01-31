/**
 * PUNISHMENT EXECUTION SCREEN
 * PunishmentExecutionScreen.tsx
 *
 * Executes ALL enabled punishments sequentially.
 * Shows progress indicator and punishment-specific UI for each one.
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
  withSequence,
  Easing,
} from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getBuddyInfo } from '@/utils/storage';
import { getCurrentStreak } from '@/utils/tracking';
import { getShameVideo } from '@/utils/fileSystem';
import { setCurrentScreen } from '@/utils/soundKiller';
import { useEscalatingVolume } from '@/hooks/useEscalatingVolume';

const isWeb = Platform.OS === 'web';

// Alarm sound files (same as AlarmRingingScreen)
const ALARM_SOUND_FILES: Record<string, any> = {
  nuclear: require('@/assets/sounds/nuclear-alarm.wav'),
  mosquito: require('@/assets/sounds/mosquito-swarm.wav'),
  emp: require('@/assets/sounds/emp-blast.wav'),
  siren: require('@/assets/sounds/siren-from-hell.wav'),
  chaos: require('@/assets/sounds/chaos-engine.wav'),
  escalator: require('@/assets/sounds/the-escalator.wav'),
  'ear-shatter': require('@/assets/sounds/ear-shatter.wav'),
  'high-pitch': require('@/assets/sounds/high-pitch.wav'),
  'angry-goose': require('@/assets/sounds/angry-goose.wav'),
  'air-horn': require('@/assets/sounds/air-horn.wav'),
  'screaming-goat': require('@/assets/sounds/screaming-goat.wav'),
  'smoke-detector': require('@/assets/sounds/smoke-detector.wav'),
  'car-alarm': require('@/assets/sounds/car-alarm.wav'),
  'baby-crying': require('@/assets/sounds/baby-crying.wav'),
  'dog-barking': require('@/assets/sounds/dog-barking.wav'),
  'drill-sergeant': require('@/assets/sounds/drill-sergeant.wav'),
  'submarine-alarm': require('@/assets/sounds/submarine-alarm.wav'),
  chainsaw: require('@/assets/sounds/chainsaw.wav'),
  motorcycle: require('@/assets/sounds/motorcycle.wav'),
  rooster: require('@/assets/sounds/rooster.wav'),
  'police-siren': require('@/assets/sounds/police-siren.wav'),
  'broken-glass': require('@/assets/sounds/broken-glass.wav'),
};
const ALARM_SOUND_IDS = Object.keys(ALARM_SOUND_FILES);
const ALARM_SOUND_KEY = '@snoozer/alarm_sound';

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
    punishmentTypes,
    moneyEnabled,
    moneyAmount,
    shameVideoUri: routeVideoUri,
    config,
    wasForceClose,
  } = route.params;

  // Sequential execution state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [executedPunishments, setExecutedPunishments] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [videoUri, setVideoUri] = useState<string>(routeVideoUri || '');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(15);
  const videoRef = useRef<Video>(null);
  const hasStartedRef = useRef(false);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Alarm sound state
  const [alarmSoundSource, setAlarmSoundSource] = useState<any>(null);
  const { startAlarm, stopAlarm } = useEscalatingVolume(alarmSoundSource);

  // Get current punishment (if any)
  const currentPunishment = punishmentTypes.length > 0 ? punishmentTypes[currentIndex] : null;
  const punishmentInfo = currentPunishment
    ? PUNISHMENT_CONFIG[currentPunishment] || PUNISHMENT_CONFIG.shame_video
    : null;
  const totalPunishments = punishmentTypes.length;

  // Pulsing animation
  const pulse = useSharedValue(1);
  const progressScale = useSharedValue(1);

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

    // Progress number pop animation
    progressScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 150 })
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
    if (currentPunishment === 'shame_video' && (!routeVideoUri || routeVideoUri.startsWith('mock://'))) {
      getShameVideo().then(uri => {
        if (uri) setVideoUri(uri);
      });
    }

    // Start first punishment after brief delay
    if (!hasStartedRef.current && totalPunishments > 0) {
      hasStartedRef.current = true;
      const startTimer = setTimeout(() => {
        executePunishment();
      }, 2000);

      return () => clearTimeout(startTimer);
    }
  }, []);

  // Load alarm sound on mount
  useEffect(() => {
    const loadAlarmSound = async () => {
      let soundId = ALARM_SOUND_IDS[Math.floor(Math.random() * ALARM_SOUND_IDS.length)];
      try {
        const savedSound = await AsyncStorage.getItem(ALARM_SOUND_KEY);
        if (savedSound && ALARM_SOUND_FILES[savedSound]) {
          soundId = savedSound;
        }
      } catch {
        // Use random default if error
      }
      setAlarmSoundSource(ALARM_SOUND_FILES[soundId]);
    };
    loadAlarmSound();
  }, []);

  // Start alarm when sound source is loaded
  useEffect(() => {
    if (!alarmSoundSource) return;
    startAlarm();

    return () => {
      stopAlarm();
    };
  }, [alarmSoundSource, startAlarm, stopAlarm]);

  // Execute next punishment when currentIndex changes
  useEffect(() => {
    if (currentIndex > 0 && currentIndex < totalPunishments) {
      // Pop animation for progress number
      progressScale.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      // Reload video URI if this punishment is shame_video
      if (punishmentTypes[currentIndex] === 'shame_video') {
        getShameVideo().then(uri => {
          if (uri) setVideoUri(uri);
        });
      }

      const timer = setTimeout(() => {
        executePunishment();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  const navigateToResult = useCallback(async () => {
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
    }

    // Stop the alarm sound before navigating away
    stopAlarm();

    const [buddy, streak] = await Promise.all([
      getBuddyInfo(),
      getCurrentStreak(),
    ]);

    const buddyName = buddy?.name || 'Your buddy';

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const currentTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

    navigation.navigate('ShameSent', {
      buddyName,
      amount: moneyAmount || 0,
      currentTime,
      previousStreak: streak,
      executedPunishments: punishmentTypes,
      moneyEnabled: moneyEnabled || false,
    });
  }, [navigation, punishmentTypes, moneyEnabled, moneyAmount, stopAlarm]);

  const moveToNextPunishment = useCallback(() => {
    // Mark current as executed
    if (currentPunishment) {
      setExecutedPunishments(prev => [...prev, currentPunishment]);
    }

    if (currentIndex < totalPunishments - 1) {
      // More punishments to execute
      setCurrentIndex(prev => prev + 1);
      setIsExecuting(false);
    } else {
      // All done - navigate to result
      navigateToResult();
    }
  }, [currentIndex, totalPunishments, currentPunishment, navigateToResult]);

  const executePunishment = useCallback(async () => {
    if (!currentPunishment) {
      navigateToResult();
      return;
    }

    setIsExecuting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (__DEV__) console.log(`[PunishmentExecution] Executing ${currentIndex + 1}/${totalPunishments}: ${currentPunishment}`);

    try {
      switch (currentPunishment) {
        case 'shame_video':
          // Video plays inline, wait for it to finish
          if (isWeb) {
            // Mock video timer for web
            mockTimerRef.current = setInterval(() => {
              setRemainingSeconds(prev => {
                if (prev <= 1) {
                  if (mockTimerRef.current) clearInterval(mockTimerRef.current);
                  moveToNextPunishment();
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
          // Real video will call moveToNextPunishment when finished via onPlaybackStatusUpdate
          break;

        case 'email_boss':
          if (config?.bossEmail) {
            const email = EMBARRASSING_EMAILS[Math.floor(Math.random() * EMBARRASSING_EMAILS.length)];
            const mailUrl = `mailto:${config.bossEmail}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
            await Linking.openURL(mailUrl);
          }
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'tweet':
          const tweet = EMBARRASSING_TWEETS[Math.floor(Math.random() * EMBARRASSING_TWEETS.length)];
          const tweetUrl = `https://twitter.com/intent/post?text=${encodeURIComponent(tweet)}`;
          await Linking.openURL(tweetUrl);
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'call_mom':
          if (config?.momPhone) {
            await Linking.openURL(`tel:${config.momPhone}`);
          }
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'call_grandma':
          if (config?.grandmaPhone) {
            await Linking.openURL(`tel:${config.grandmaPhone}`);
          }
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'call_buddy':
          if (config?.buddyPhone) {
            await Linking.openURL(`tel:${config.buddyPhone}`);
          }
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'text_wife_dad':
          if (config?.wifesDadPhone) {
            const message = WIFES_DAD_TEXTS[Math.floor(Math.random() * WIFES_DAD_TEXTS.length)];
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
              await SMS.sendSMSAsync([config.wifesDadPhone], message);
            }
          }
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'text_ex':
          if (config?.exPhone) {
            const isAvailable = await SMS.isAvailableAsync();
            if (isAvailable) {
              await SMS.sendSMSAsync([config.exPhone], "I miss you 💔");
            }
          }
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'social_shame':
          // Open group chat (would need group chat config)
          setTimeout(moveToNextPunishment, 1500);
          break;

        case 'anti_charity':
          // Future: payment flow
          setTimeout(moveToNextPunishment, 1500);
          break;

        default:
          setTimeout(moveToNextPunishment, 1500);
      }
    } catch (error) {
      if (__DEV__) console.error('[PunishmentExecution] Error:', error);
      setTimeout(moveToNextPunishment, 1500);
    }
  }, [currentPunishment, currentIndex, totalPunishments, config, moveToNextPunishment]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    if (status.positionMillis !== undefined && status.durationMillis) {
      const remaining = Math.ceil((status.durationMillis - status.positionMillis) / 1000);
      setRemainingSeconds(Math.max(0, remaining));
    }

    if (status.didJustFinish) {
      moveToNextPunishment();
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const progressScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  // No punishments - go straight to result
  if (totalPunishments === 0) {
    useEffect(() => {
      navigateToResult();
    }, []);
    return null;
  }

  // Shame video view
  if (currentPunishment === 'shame_video') {
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
            <ThemedText style={styles.shameText}>
              {wasForceClose ? 'NICE TRY' : 'YOU SNOOZED'}
            </ThemedText>
          </Animated.View>
          {wasForceClose && (
            <ThemedText style={styles.forceCloseSubtext}>
              You can't escape by closing the app
            </ThemedText>
          )}
          {totalPunishments > 1 && (
            <Animated.View style={[styles.progressBadge, progressScaleStyle]}>
              <ThemedText style={styles.progressText}>
                Punishment {currentIndex + 1} of {totalPunishments}
              </ThemedText>
            </Animated.View>
          )}
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
          <ThemedText style={styles.shameText}>
            {wasForceClose ? 'NICE TRY' : 'YOU SNOOZED'}
          </ThemedText>
        </Animated.View>
        {wasForceClose && (
          <ThemedText style={styles.forceCloseSubtext}>
            You can't escape by closing the app
          </ThemedText>
        )}

        {/* Progress indicator */}
        {totalPunishments > 1 && (
          <Animated.View style={[styles.progressBadge, progressScaleStyle]}>
            <ThemedText style={styles.progressText}>
              Punishment {currentIndex + 1} of {totalPunishments}
            </ThemedText>
          </Animated.View>
        )}

        {punishmentInfo && (
          <View style={styles.punishmentCard}>
            <Text style={styles.punishmentIcon}>{punishmentInfo.icon}</Text>
            <ThemedText style={styles.punishmentTitle}>{punishmentInfo.title}</ThemedText>
            <ThemedText style={styles.punishmentSubtitle}>{punishmentInfo.subtitle}</ThemedText>
          </View>
        )}

        {isExecuting && (
          <View style={styles.executingContainer}>
            <ThemedText style={styles.executingText}>Executing punishment...</ThemedText>
          </View>
        )}

        {/* Already executed punishments */}
        {executedPunishments.length > 0 && (
          <View style={styles.executedSection}>
            <ThemedText style={styles.executedTitle}>Executed</ThemedText>
            <View style={styles.executedList}>
              {executedPunishments.map((p, i) => (
                <View key={i} style={styles.executedItem}>
                  <Text style={styles.executedCheck}>✓</Text>
                  <ThemedText style={styles.executedText}>
                    {PUNISHMENT_CONFIG[p]?.title || p}
                  </ThemedText>
                </View>
              ))}
            </View>
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

  // Progress badge
  progressBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.red,
    letterSpacing: 1,
  },

  // Shame text
  shameText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.red,
    textTransform: 'uppercase',
    letterSpacing: 6,
    marginBottom: Spacing.sm,
  },
  forceCloseSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
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

  // Already executed section
  executedSection: {
    marginTop: Spacing['2xl'],
    alignItems: 'center',
  },
  executedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  executedList: {
    gap: 6,
  },
  executedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  executedCheck: {
    fontSize: 14,
    color: Colors.green,
  },
  executedText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    paddingBottom: Spacing.lg,
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
