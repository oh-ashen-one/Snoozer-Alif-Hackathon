/**
 * ALARM RINGING SCREEN
 * AlarmRingingScreen.tsx
 *
 * ════════════════════════════════════════════════════════════════
 * FEATURES:
 * - Volume escalation bar (getting louder!)
 * - Today's first event reminder
 * - Wake-up tip / reason you set this
 * - Streak banner with fire icons
 * - Punishment cards (money + shame)
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  Vibration,
  BackHandler,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import {
  alarmRingingPattern,
  snoozeWarningPattern,
  shameTriggerPattern,
  buttonPress,
} from '@/utils/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { CheatWarningModal } from '@/components/CheatWarningModal';
import { Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getAlarms, getProofActivity, ProofActivity, getBuddyInfo, BuddyInfo, getUserName } from '@/utils/storage';
import { logWakeUp, getCurrentStreak } from '@/utils/tracking';
import { useEscalatingVolume } from '@/hooks/useEscalatingVolume';
import { useAntiCheat, CheatType } from '@/hooks/useAntiCheat';
import { getCalendarEvents, CalendarEvent } from '@/hooks/useGoogleCalendar';
import { PaymentPressureScreen } from '@/components/PaymentPressureScreen';
import ShameMessageSent from '@/components/ShameMessageSent';
import { notifyBuddySnoozed } from '@/utils/buddyNotifications';
import { setCurrentScreen } from '@/utils/soundKiller';

const CALENDAR_CONNECTED_KEY = '@snoozer/calendar_connected';

// Import local alarm sounds
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
type RouteProps = RouteProp<RootStackParamList, 'AlarmRinging'>;

type SnoozeStep = 0 | 1 | 2;

const SNOOZE_INSULTS = [
  "im such a fat chud",
  "i have no self control",
  "im a lazy piece of garbage",
  "i disappoint everyone",
  "winners wake up losers snooze",
  "i choose comfort over success",
  "my alarm deserves better than me",
  "i am the problem",
  "i let myself down again",
  "pathetic snooze addict",
];

const VIBRATION_PATTERN = [500, 500, 500, 500];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOTIVATIONAL_QUOTES = [
  "I'm done hitting snooze like a loser.",
  "Today I become the person I said I'd be.",
  "Winners get up. Losers stay in bed.",
  "My future self will thank me.",
  "No more excuses. Just action.",
  "I didn't set this alarm to ignore it.",
  "Discipline beats motivation every time.",
  "Every champion was once tired and didn't quit.",
  "The bed is a trap. I'm escaping.",
  "I'm not lazy. I'm building momentum.",
];

// Helper functions for proof activity UI
const getProofEmoji = (proofType: string): string => {
  switch (proofType) {
    case 'steps': return '\u{1F9ED}'; // compass/navigation emoji
    case 'photo_activity': return '\u{1F4F7}'; // camera emoji
    case 'math': return '\u{0023}\u{FE0F}\u{20E3}'; // hash emoji
    default: return '\u{1F4F7}'; // camera emoji
  }
};

const getProofDescription = (proofType: string, activity: ProofActivity | null): string => {
  switch (proofType) {
    case 'steps':
      return `Walk ${activity?.stepGoal || 50} steps`;
    case 'photo_activity':
      // Show the specific activity the user configured
      if (activity?.activity && activity.activity !== 'Wake up activity') {
        return `Photo: ${activity.activity}`;
      }
      return 'Take your wake-up photo';
    case 'math':
      return 'Solve 3 math problems';
    default:
      if (activity?.activity && activity.activity !== 'Wake up activity') {
        return `Photo: ${activity.activity}`;
      }
      return 'Take your wake-up photo';
  }
};

const getProofButtonText = (proofType: string): string => {
  switch (proofType) {
    case 'steps': return "I'M UP — START WALKING";
    case 'photo_activity': return "I'M UP — TAKE PHOTO";
    case 'math': return "I'M UP — DO MATH";
    default: return "I'M UP — TAKE PHOTO";
  }
};

export default function AlarmRingingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const params = route.params || {};

  const [alarmData, setAlarmData] = useState({
    alarmId: params.alarmId || '',
    alarmLabel: params.alarmLabel || 'Alarm',
    referencePhotoUri: params.referencePhotoUri || '',
    shameVideoUri: params.shameVideoUri || '',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [snoozeStep, setSnoozeStep] = useState<SnoozeStep>(0);
  const [snoozeText, setSnoozeText] = useState('');
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [proofActivity, setProofActivity] = useState<ProofActivity | null>(null);
  const [proofActivityType, setProofActivityType] = useState<string>('photo_activity');
  const [alarmSoundSource, setAlarmSoundSource] = useState<any>(null);
  const [cheatModalVisible, setCheatModalVisible] = useState(false);
  const [detectedCheat, setDetectedCheat] = useState<CheatType | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [buddyInfo, setBuddyInfo] = useState<BuddyInfo | null>(null);
  const [userName, setUserName] = useState('You');
  const [alarmPunishment, setAlarmPunishment] = useState<number>(5);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showShame, setShowShame] = useState(false);
  // Per-alarm punishment settings
  const [moneyEnabled, setMoneyEnabled] = useState(true);
  const [shameVideoEnabled, setShameVideoEnabled] = useState(true);
  const [buddyNotifyEnabled, setBuddyNotifyEnabled] = useState(true);
  const [motivationalQuote] = useState(() => 
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );
  const [snoozeInsult] = useState(() =>
    SNOOZE_INSULTS[Math.floor(Math.random() * SNOOZE_INSULTS.length)]
  );

  // Use actual buddy info or defaults
  const buddyName = buddyInfo?.name || 'Your buddy';
  const penaltyAmount = alarmPunishment;

  const { startAlarm: startEscalatingAlarm, stopAlarm: stopEscalatingAlarm, volumePercent } = useEscalatingVolume(alarmSoundSource);

  const {
    startHeartbeat,
    stopHeartbeat,
    scheduleBackupNotification,
    cancelBackupNotification,
  } = useAntiCheat({
    onCheatDetected: (cheatType) => {
      setDetectedCheat(cheatType);
      setCheatModalVisible(true);
    },
    onAlarmInterrupted: (alarmState) => {
      if (__DEV__) console.log('[AntiCheat] Alarm was interrupted:', alarmState);
      setDetectedCheat('app_killed');
      setCheatModalVisible(true);
    },
  });

  const pulseValue = useSharedValue(1);
  const fireScale = useSharedValue(1);
  const shakeValue = useSharedValue(0);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);

    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    fireScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    shakeValue.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 150 }),
        withTiming(3, { duration: 150 }),
        withTiming(-3, { duration: 150 }),
        withTiming(0, { duration: 150 }),
        withTiming(0, { duration: 2550 }) // Pause between shakes
      ),
      -1
    );

    getCurrentStreak().then(s => setStreak(s));
    // Note: proofActivity is now loaded per-alarm in loadAlarmData, not globally
    getBuddyInfo().then(buddy => {
      if (__DEV__) console.log('[AlarmRinging] Buddy info:', buddy);
      setBuddyInfo(buddy);
    });
    getUserName().then(name => {
      if (name) setUserName(name);
    });
    
    // Check if calendar is connected before fetching events
    AsyncStorage.getItem(CALENDAR_CONNECTED_KEY).then(connected => {
      const isConnected = connected === 'true';
      setIsCalendarConnected(isConnected);
      if (__DEV__) console.log('[AlarmRinging] Calendar connected:', isConnected);
      
      if (isConnected) {
        getCalendarEvents().then(events => {
          setCalendarEvents(events);
          if (__DEV__) console.log('[AlarmRinging] Calendar events:', events.length);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (__DEV__) console.log('ALARM: Ringing screen mounted');

    const loadAlarmData = async () => {
      try {
        const alarms = await getAlarms();
        let targetAlarm = alarms.find(a => a.id === alarmData.alarmId);
        
        // If no specific alarm, find any enabled alarm
        if (!targetAlarm && !alarmData.alarmId) {
          targetAlarm = alarms.find(a => a.enabled);
        }
        
        if (targetAlarm) {
          if (!alarmData.alarmId) {
            setAlarmData({
              alarmId: targetAlarm.id,
              alarmLabel: targetAlarm.label || 'Alarm',
              referencePhotoUri: targetAlarm.referencePhotoUri || '',
              shameVideoUri: targetAlarm.shameVideoUri || '',
            });
          }
          // Load punishment from alarm settings
          if (targetAlarm.punishment !== undefined) {
            setAlarmPunishment(targetAlarm.punishment);
            if (__DEV__) console.log('[AlarmRinging] Punishment amount:', targetAlarm.punishment);
          }
          // Load per-alarm punishment toggles
          // Check if money is enabled (either from moneyEnabled flag or if punishment > 0)
          const hasMoneyPunishment = targetAlarm.moneyEnabled !== undefined 
            ? targetAlarm.moneyEnabled 
            : (targetAlarm.punishment || 0) > 0;
          setMoneyEnabled(hasMoneyPunishment);
          
          // Check if shame video is enabled (from toggle or if extraPunishments includes it)
          const hasShameVideo = targetAlarm.shameVideoEnabled !== undefined
            ? targetAlarm.shameVideoEnabled
            : (targetAlarm.extraPunishments || []).includes('shame_video');
          setShameVideoEnabled(hasShameVideo);
          
          // Check if buddy notify is enabled
          const hasBuddyNotify = targetAlarm.buddyNotifyEnabled !== undefined
            ? targetAlarm.buddyNotifyEnabled
            : (targetAlarm.extraPunishments || []).includes('buddy_call');
          setBuddyNotifyEnabled(hasBuddyNotify);
          
          if (__DEV__) console.log('[AlarmRinging] Punishments - money:', hasMoneyPunishment, 'shame:', hasShameVideo, 'buddy:', hasBuddyNotify);
          
          // Load per-alarm proof activity settings
          if (targetAlarm.proofActivityType) {
            setProofActivityType(targetAlarm.proofActivityType);
            const proofFromAlarm: ProofActivity = {
              activity: targetAlarm.activityName || targetAlarm.label || 'Wake up activity',
              activityIcon: 'camera',
              createdAt: targetAlarm.createdAt,
              isStepOnly: targetAlarm.proofActivityType === 'steps',
              stepGoal: targetAlarm.stepGoal || (targetAlarm.proofActivityType === 'steps' ? 50 : 10),
            };
            setProofActivity(proofFromAlarm);
            if (__DEV__) console.log('[AlarmRinging] Per-alarm proof activity:', targetAlarm.proofActivityType, targetAlarm.activityName);
          } else {
            // Fallback to global settings for older alarms
            setProofActivityType('photo_activity');
            getProofActivity().then(activity => {
              if (activity) setProofActivity(activity);
            });
          }
          if (__DEV__) console.log('[AlarmRinging] Loaded alarm:', targetAlarm.id);
        } else if (!alarmData.alarmId) {
          if (__DEV__) console.log('[AlarmRinging] No alarms found, navigating home');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
        }
      } catch (error) {
        if (__DEV__) console.error('[AlarmRinging] Error loading alarm:', error);
      }
    };
    loadAlarmData();
  }, [alarmData.alarmId, navigation]);

  const stopAlarm = async () => {
    try {
      Vibration.cancel();
      await stopEscalatingAlarm();
    } catch (error) {
      if (__DEV__) console.log('[AlarmRinging] Error stopping alarm:', error);
    }
  };

  // HARD STOP: When screen gains or loses focus, manage sounds
  useFocusEffect(
    useCallback(() => {
      // Screen focused - set current screen to allow sounds
      setCurrentScreen('AlarmRinging');
      if (__DEV__) console.log('[AlarmRinging] Screen focused - sounds enabled');
      
      return () => {
        // Screen losing focus - KILL ALL SOUNDS
        if (__DEV__) console.log('[AlarmRinging] Screen lost focus - stopping all sounds');
        Vibration.cancel();
        stopEscalatingAlarm();
      };
    }, [stopEscalatingAlarm])
  );

  // Load alarm sound source on mount
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

    startEscalatingAlarm();
    alarmRingingPattern();

    // Start anti-cheat heartbeat
    startHeartbeat({
      alarmId: alarmData.alarmId,
      alarmLabel: alarmData.alarmLabel,
      referencePhotoUri: alarmData.referencePhotoUri,
      shameVideoUri: alarmData.shameVideoUri,
    });
    scheduleBackupNotification();

    if (Platform.OS !== 'web') {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });

    return () => {
      clearInterval(interval);
      backHandler.remove();
      stopAlarm();
      stopHeartbeat();
      cancelBackupNotification();
    };
  }, [alarmSoundSource]);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const displayHours = hours % 12 || 12;
    const period = hours >= 12 ? 'PM' : 'AM';
    return `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatEventTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const displayHours = hours % 12 || 12;
      const period = hours >= 12 ? 'PM' : 'AM';
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return '';
    }
  };

  const handleDismiss = async () => {
    buttonPress('primary');
    await stopAlarm();

    const stepGoal = proofActivity?.stepGoal || 50;

    // Route DIRECTLY to the chosen proof activity type
    switch (proofActivityType) {
      case 'steps':
        // Steps only - walk to dismiss
        navigation.navigate('StepMission', {
          alarmId: alarmData.alarmId,
          referencePhotoUri: alarmData.referencePhotoUri,
          onComplete: 'Home',
          stepGoal,
        });
        break;
      case 'photo_activity':
        // Photo proof - go DIRECTLY to camera (no forced steps)
        navigation.navigate('ProofCamera', {
          alarmId: alarmData.alarmId,
          referencePhotoUri: alarmData.referencePhotoUri,
          activityName: proofActivity?.activity || 'Take your proof photo',
        });
        break;
      case 'math':
        // Math problems - go to math proof screen
        navigation.navigate('MathProof', {
          alarmId: alarmData.alarmId,
        });
        break;
      default:
        // Fallback to photo proof (no forced steps)
        navigation.navigate('ProofCamera', {
          alarmId: alarmData.alarmId,
          referencePhotoUri: alarmData.referencePhotoUri,
          activityName: proofActivity?.activity || 'Take your proof photo',
        });
    }
  };

  const handleSnoozePress = () => {
    snoozeWarningPattern();
    setSnoozeStep(1);
  };

  const handleAreYouSure = () => {
    snoozeWarningPattern();
    setSnoozeStep(2);
  };

  const handleNevermind = () => {
    buttonPress('secondary');
    setSnoozeStep(0);
    setSnoozeText('');
  };

  const handleSnoozeConfirm = async () => {
    if (snoozeText.trim().toLowerCase() === snoozeInsult.toLowerCase()) {
      if (__DEV__) console.log('ALARM: User chose snooze - showing payment prompt');
      shameTriggerPattern();

      try {
        await logWakeUp(alarmData.alarmId, new Date(), true, 1);
        if (__DEV__) console.log('[AlarmRinging] Logged snooze');
        
        if (buddyInfo) {
          await notifyBuddySnoozed(userName, penaltyAmount);
          if (__DEV__) console.log('[AlarmRinging] Sent snooze notification to buddy');
        }
      } catch (error) {
        if (__DEV__) console.log('[AlarmRinging] Error logging snooze:', error);
      }

      setShowPaymentPrompt(true);
    }
  };

  const handlePaymentSent = async () => {
    if (__DEV__) console.log('ALARM: Payment sent - showing shame message');
    setShowPaymentPrompt(false);
    await stopAlarm();
    setShowShame(true);
  };

  const handleShameDismiss = async () => {
    if (__DEV__) console.log('ALARM: Shame triggered - navigating to shame video playback');
    setShowPaymentPrompt(false);
    setShowShame(false);
    await stopAlarm();
    navigation.navigate('ShamePlayback', {
      alarmId: alarmData.alarmId,
      shameVideoUri: alarmData.shameVideoUri,
      alarmLabel: alarmData.alarmLabel,
      referencePhotoUri: alarmData.referencePhotoUri,
      showPaymentAfter: false,
      buddyPhone: buddyInfo?.phone,
    });
  };

  const timeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseValue.value }],
  }));

  const fireAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
  }));

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeValue.value }],
  }));

  // Get first calendar event for today
  const firstEvent = calendarEvents.length > 0 ? calendarEvents[0] : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background Glow */}
      <Animated.View style={styles.backgroundGlow} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* STREAK BANNER */}
        {streak > 0 && (
          <View style={styles.streakBanner}>
            <Animated.View style={fireAnimatedStyle}>
              <Text style={{ fontSize: 28 }}>{'\u26A1'}</Text>
            </Animated.View>
            <View style={styles.streakInfo}>
              <ThemedText style={styles.streakNumber}>{streak} DAY STREAK</ThemedText>
              <ThemedText style={styles.streakSub}>Don't break it now</ThemedText>
            </View>
            <Animated.View style={fireAnimatedStyle}>
              <Text style={{ fontSize: 28 }}>{'\u26A1'}</Text>
            </Animated.View>
          </View>
        )}

        {/* MASSIVE TIME */}
        <Animated.View style={[styles.timeContainer, timeAnimatedStyle, { opacity: loaded ? 1 : 0 }]}>
          <ThemedText style={styles.time}>{formatTime(currentTime)}</ThemedText>
          <ThemedText style={styles.day}>{formatDay(currentTime).toUpperCase()}</ThemedText>
        </Animated.View>

        {/* VOLUME ESCALATION BAR */}
        <View style={styles.volumeSection}>
          <View style={styles.volumeHeader}>
            <Text style={{ fontSize: 18 }}>{'\u{1F50A}'}</Text>
            <ThemedText style={[
              styles.volumeLabel,
              { color: volumePercent >= 80 ? Colors.red : Colors.orange }
            ]}>
              {volumePercent >= 100 ? 'MAX VOLUME' : `Volume: ${Math.round(volumePercent)}%`}
            </ThemedText>
            {volumePercent < 100 && (
              <ThemedText style={styles.volumeWarning}>Getting louder...</ThemedText>
            )}
          </View>
          <View style={styles.volumeBarBg}>
            <View style={[
              styles.volumeBarFill,
              {
                width: `${volumePercent}%`,
                backgroundColor: volumePercent >= 80 ? Colors.red : Colors.orange,
              }
            ]} />
          </View>
        </View>

        {/* TODAY'S FIRST EVENT - only show if calendar is connected */}
        {isCalendarConnected && firstEvent ? (
          <View style={styles.eventCard}>
            <Text style={{ fontSize: 18 }}>{'\u{1F4C5}'}</Text>
            <ThemedText style={styles.eventTime}>{formatEventTime(firstEvent.start)}</ThemedText>
            <ThemedText style={styles.eventTitle} numberOfLines={1}>{firstEvent.summary}</ThemedText>
          </View>
        ) : null}

        {/* MOTIVATIONAL QUOTE */}
        <View style={styles.reasonCard}>
          <ThemedText style={styles.reasonQuote}>"{motivationalQuote}"</ThemedText>
        </View>

        {/* ACTIVITY CARD */}
        <View style={styles.activityCard}>
          <View style={styles.activityIconWrapper}>
            <Text style={{ fontSize: 22 }}>{getProofEmoji(proofActivityType)}</Text>
          </View>
          <View style={styles.activityTextContainer}>
            <ThemedText style={styles.activityText}>
              {getProofDescription(proofActivityType, proofActivity)}
            </ThemedText>
            <ThemedText style={styles.activityLabel}>to dismiss alarm</ThemedText>
          </View>
        </View>

        {/* SNOOZE = HEADER - only show if any punishment is enabled */}
        {(moneyEnabled || shameVideoEnabled || buddyNotifyEnabled) ? (
          <>
            <View style={styles.snoozeHeader}>
              <View style={styles.snoozeLine} />
              <ThemedText style={styles.snoozeHeaderText}>SNOOZE =</ThemedText>
              <View style={styles.snoozeLine} />
            </View>

            {/* PUNISHMENT CARDS - only show enabled punishments */}
            <View style={styles.punishmentGrid}>
              {moneyEnabled && penaltyAmount > 0 ? (
                <View style={styles.punishmentCard}>
                  <Text style={{ fontSize: 44 }}>{'\u{1F4B5}'}</Text>
                  <ThemedText style={styles.punishmentAmount}>${penaltyAmount}</ThemedText>
                  <ThemedText style={styles.punishmentDesc}>to {buddyName}</ThemedText>
                </View>
              ) : null}

              {shameVideoEnabled ? (
                <View style={styles.punishmentCard}>
                  <Text style={{ fontSize: 44 }}>{'\u{1F3A5}'}</Text>
                  <ThemedText style={styles.punishmentAmount}>SHAME</ThemedText>
                  <ThemedText style={styles.punishmentDesc}>MAX volume</ThemedText>
                </View>
              ) : null}
            </View>

            {/* NOTIFY CARD - only show if buddy notify is enabled */}
            {buddyNotifyEnabled ? (
              <Animated.View style={[styles.notifyCard, shakeAnimatedStyle]}>
                <Text style={{ fontSize: 40 }}>{'\u{1F4F1}'}</Text>
                <View style={styles.notifyContent}>
                  <ThemedText style={styles.notifyName}>{buddyName.toUpperCase()}</ThemedText>
                  <ThemedText style={styles.notifyText}>gets notified of your failure</ThemedText>
                </View>
              </Animated.View>
            ) : null}
          </>
        ) : (
          <View style={styles.noPunishmentCard}>
            <Text style={{ fontSize: 32 }}>{'\u{2705}'}</Text>
            <ThemedText style={styles.noPunishmentText}>No punishment - just snooze</ThemedText>
          </View>
        )}

        {/* SNOOZE CONFIRMATION FLOW */}
        {snoozeStep === 1 && (
          <View style={styles.confirmCard}>
            <ThemedText style={styles.confirmTitle}>Are you sure?</ThemedText>
            <ThemedText style={styles.confirmDescription}>
              {(() => {
                const consequences = [];
                if (moneyEnabled && penaltyAmount > 0) consequences.push(`lose $${penaltyAmount}`);
                if (shameVideoEnabled) consequences.push('your shame video will play');
                if (buddyNotifyEnabled) consequences.push(`${buddyName} gets notified`);
                return consequences.length > 0 
                  ? `You'll ${consequences.join(', ')}.`
                  : 'This will just snooze your alarm.';
              })()}
            </ThemedText>

            <View style={styles.confirmButtons}>
              <Pressable style={styles.nevermindButton} onPress={handleNevermind}>
                <ThemedText style={styles.nevermindButtonText}>Nevermind, I'm up</ThemedText>
              </Pressable>
              <Pressable style={styles.sureButton} onPress={handleAreYouSure}>
                <ThemedText style={styles.sureButtonText}>I'm sure</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {snoozeStep === 2 && (
          <View style={styles.inputCard}>
            <ThemedText style={styles.inputLabel}>
              Type <Text style={styles.redText}>"{snoozeInsult}"</Text> to confirm
            </ThemedText>

            <TextInput
              style={styles.snoozeInput}
              value={snoozeText}
              onChangeText={setSnoozeText}
              placeholder="Type here..."
              placeholderTextColor="#57534E"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              testID="input-snooze-confirmation"
            />

            <View style={styles.confirmButtons}>
              <Pressable style={styles.goBackButton} onPress={handleNevermind}>
                <ThemedText style={styles.goBackButtonText}>Go back</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmSnoozeButton,
                  snoozeText.trim().toLowerCase() === snoozeInsult.toLowerCase() && styles.confirmSnoozeButtonActive,
                ]}
                onPress={handleSnoozeConfirm}
                disabled={snoozeText.trim().toLowerCase() !== snoozeInsult.toLowerCase()}
                testID="button-confirm-snooze"
              >
                <ThemedText
                  style={[
                    styles.confirmSnoozeButtonText,
                    snoozeText.trim().toLowerCase() === snoozeInsult.toLowerCase() && styles.confirmSnoozeButtonTextActive,
                  ]}
                >
                  Confirm
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FOOTER BUTTONS */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 28 }]}>
        <Pressable
          style={styles.wakeUpButton}
          onPress={handleDismiss}
          testID="button-dismiss-alarm"
        >
          <ThemedText style={styles.wakeUpButtonText}>
            {getProofButtonText(proofActivityType)}
          </ThemedText>
        </Pressable>

        {snoozeStep === 0 && (
          <Pressable
            style={styles.snoozeButton}
            onPress={handleSnoozePress}
            testID="button-snooze"
          >
            <ThemedText style={styles.snoozeButtonText}>
              snooze{moneyEnabled && penaltyAmount > 0 ? (
                <Text style={styles.snoozeCost}> (lose ${penaltyAmount})</Text>
              ) : null}
            </ThemedText>
          </Pressable>
        )}
      </View>

      <CheatWarningModal
        visible={cheatModalVisible}
        cheatType={detectedCheat}
        onDismiss={() => setCheatModalVisible(false)}
      />

      <PaymentPressureScreen
        visible={showPaymentPrompt}
        amount={penaltyAmount}
        recipientName={buddyName}
        recipientPhone={buddyInfo?.phone || ''}
        onPaymentSent={handlePaymentSent}
        onShameTriggered={handleShameDismiss}
      />

      <ShameMessageSent
        visible={showShame}
        contacts={[
          { name: buddyName, type: 'buddy' },
        ]}
        amountSent={penaltyAmount}
        recipientName={buddyName}
        userName={userName}
        onDismiss={handleShameDismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  backgroundGlow: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    width: '160%',
    height: '80%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 1000,
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // STREAK BANNER
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(251, 146, 60, 0.4)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.orange,
    letterSpacing: 1,
  },
  streakSub: {
    fontSize: 11,
    color: Colors.orange,
    opacity: 0.8,
  },

  // MASSIVE TIME
  timeContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    fontSize: Math.min(SCREEN_WIDTH * 0.22, 100),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -4,
    lineHeight: Math.min(SCREEN_WIDTH * 0.24, 110),
  },
  day: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: 3,
    marginTop: 6,
  },

  // VOLUME ESCALATION
  volumeSection: {
    marginBottom: 10,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  volumeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  volumeWarning: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  volumeBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // TODAY'S EVENT
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.orange,
  },
  eventTitle: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },

  // REASON QUOTE
  reasonCard: {
    marginBottom: 10,
    alignItems: 'center',
  },
  reasonQuote: {
    fontSize: 15,
    fontStyle: 'italic',
    color: Colors.textSecondary,
  },
  reasonLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // ACTIVITY CARD
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  activityIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextContainer: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
  },
  activityLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // SNOOZE HEADER
  snoozeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  snoozeLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  snoozeHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.red,
    letterSpacing: 2,
  },

  // PUNISHMENT CARDS
  punishmentGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  punishmentCard: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  punishmentAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  punishmentDesc: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // NOTIFY CARD
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  notifyContent: {
    flexDirection: 'column',
  },
  notifyName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  notifyText: {
    fontSize: 12,
    color: Colors.red,
  },

  // NO PUNISHMENT CARD
  noPunishmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  noPunishmentText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.green,
  },

  // CONFIRM CARD
  confirmCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    padding: 20,
    marginTop: 8,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19.5,
  },
  redText: {
    color: Colors.red,
    fontWeight: '600',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  nevermindButton: {
    flex: 1,
    backgroundColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  nevermindButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  sureButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sureButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.red,
  },

  // INPUT CARD
  inputCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 20,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
  snoozeInput: {
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: '#3F3A36',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
  },
  goBackButton: {
    flex: 1,
    backgroundColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  goBackButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  confirmSnoozeButton: {
    flex: 1,
    backgroundColor: Colors.border,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmSnoozeButtonActive: {
    backgroundColor: Colors.red,
  },
  confirmSnoozeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#57534E',
  },
  confirmSnoozeButtonTextActive: {
    color: '#ffffff',
  },

  // FOOTER
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
    alignItems: 'center',
  },
  wakeUpButton: {
    width: '100%',
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  wakeUpButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  snoozeButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    opacity: 0.5,
  },
  snoozeButtonText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  snoozeCost: {
    color: Colors.red,
    fontWeight: '600',
  },
});
