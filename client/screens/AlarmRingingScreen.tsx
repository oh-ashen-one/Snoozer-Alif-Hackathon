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
import * as SMS from 'expo-sms';
import { getAlarms, getProofActivity, ProofActivity, getBuddyInfo, BuddyInfo, getUserName, getPunishmentConfig, PunishmentConfig } from '@/utils/storage';
import { logWakeUp, getCurrentStreak } from '@/utils/tracking';
import { useEscalatingVolume } from '@/hooks/useEscalatingVolume';
import { useAntiCheat, CheatType } from '@/hooks/useAntiCheat';
import { getCalendarEvents, CalendarEvent } from '@/hooks/useGoogleCalendar';
import { PaymentPressureScreen } from '@/components/PaymentPressureScreen';
import ShameMessageSent from '@/components/ShameMessageSent';
import { notifyBuddySnoozed } from '@/utils/buddyNotifications';
import { setCurrentScreen } from '@/utils/soundKiller';
import { useIMessage } from '@/hooks/useIMessage';

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

// Motivational phrases for type_phrase proof
const WAKE_PHRASES = [
  "I am awake and ready to conquer today",
  "Today I choose discipline over comfort",
  "Winners get up when the alarm rings",
  "My goals are worth getting up for",
  "I refuse to waste another morning",
  "This is the first step to my best day",
  "No more excuses I am building my future",
  "I am stronger than my desire to sleep",
  "Every early morning is an investment",
  "I am becoming the person I want to be",
];

// Helper functions for proof activity UI
const getProofEmoji = (proofType: string): string => {
  switch (proofType) {
    case 'steps': return '\u{1F9ED}'; // compass/navigation emoji
    case 'photo_activity': return '\u{1F4F7}'; // camera emoji
    case 'math': return '\u{0023}\u{FE0F}\u{20E3}'; // hash emoji
    case 'type_phrase': return '\u{2328}\u{FE0F}'; // keyboard emoji
    case 'stretch': return '\u{1F9D8}'; // yoga/stretch emoji
    default: return '\u{1F4F7}'; // camera emoji
  }
};

const getProofDescription = (proofType: string, activity: ProofActivity | null): string => {
  switch (proofType) {
    case 'steps':
      return `Walk ${activity?.stepGoal || 10} steps`;
    case 'photo_activity':
      // Show the specific activity the user configured
      if (activity?.activity && activity.activity !== 'Wake up activity') {
        return `Photo: ${activity.activity}`;
      }
      return 'Take your wake-up photo';
    case 'math':
      return 'Solve 3 math problems';
    case 'type_phrase':
      return 'Type a motivational phrase';
    case 'stretch':
      return 'Strike a stretch pose';
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
    case 'type_phrase': return "I'M UP — TYPE PHRASE";
    case 'stretch': return "I'M UP — STRETCH";
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
  const [alarmSetTime, setAlarmSetTime] = useState<string>(''); // The alarm's configured time (e.g., "7:30AM")
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
  const [emailBossEnabled, setEmailBossEnabled] = useState(false);
  const [tweetBadEnabled, setTweetBadEnabled] = useState(false);
  const [callBuddyEnabled, setCallBuddyEnabled] = useState(false);
  const [textWifesDadEnabled, setTextWifesDadEnabled] = useState(false);
  const [textExEnabled, setTextExEnabled] = useState(false);
  const [exPhoneNumber, setExPhoneNumber] = useState<string>('');
  const [textExSent, setTextExSent] = useState(false);
  // Additional punishment flags
  const [socialShameEnabled, setSocialShameEnabled] = useState(false);
  const [antiCharityEnabled, setAntiCharityEnabled] = useState(false);
  const [momEnabled, setMomEnabled] = useState(false);
  const [grandmaEnabled, setGrandmaEnabled] = useState(false);
  const [motivationalQuote] = useState(() => 
    MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
  );
  const [snoozeInsult] = useState(() =>
    SNOOZE_INSULTS[Math.floor(Math.random() * SNOOZE_INSULTS.length)]
  );
  // Type phrase proof state
  const [showTypePhraseProof, setShowTypePhraseProof] = useState(false);
  const [typePhraseText, setTypePhraseText] = useState('');
  const [wakePhrase] = useState(() =>
    WAKE_PHRASES[Math.floor(Math.random() * WAKE_PHRASES.length)]
  );

  // Use actual buddy info or defaults
  const buddyName = buddyInfo?.name || 'your archenemy';
  const penaltyAmount = alarmPunishment;

  // iMessage for Apple Cash payments
  const { sendAppleCash } = useIMessage();

  // Detect if ONLY money punishment is enabled (pay-only mode)
  const isPayOnlyMode = moneyEnabled && penaltyAmount > 0 && !shameVideoEnabled && !buddyNotifyEnabled;

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
          // Store the alarm's set time for display
          if (targetAlarm.time) {
            setAlarmSetTime(targetAlarm.time);
          }
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

          // Load additional punishment settings
          setEmailBossEnabled(targetAlarm.emailBossEnabled ?? false);
          setTweetBadEnabled(targetAlarm.tweetBadEnabled ?? false);
          setCallBuddyEnabled(targetAlarm.callBuddyEnabled ?? false);
          setTextWifesDadEnabled(targetAlarm.textWifesDadEnabled ?? false);
          setTextExEnabled(targetAlarm.textExEnabled ?? false);

          // Load social shame (check both flag and extraPunishments for compatibility)
          const hasSocialShame = targetAlarm.socialShameEnabled !== undefined
            ? targetAlarm.socialShameEnabled
            : (targetAlarm.extraPunishments || []).includes('group_chat');
          setSocialShameEnabled(hasSocialShame);

          // Load anti-charity
          const hasAntiCharity = targetAlarm.antiCharityEnabled !== undefined
            ? targetAlarm.antiCharityEnabled
            : (targetAlarm.extraPunishments || []).includes('donate_enemy');
          setAntiCharityEnabled(hasAntiCharity);

          // Load mom and grandma call settings
          setMomEnabled(targetAlarm.momEnabled ?? false);
          setGrandmaEnabled(targetAlarm.grandmaEnabled ?? false);

          // Load ex phone number from punishment config
          if (targetAlarm.textExEnabled) {
            const config = await getPunishmentConfig();
            if (config.text_ex?.exPhoneNumber) {
              setExPhoneNumber(config.text_ex.exPhoneNumber);
            }
          }

          if (__DEV__) console.log('[AlarmRinging] Punishments - money:', hasMoneyPunishment, 'shame:', hasShameVideo, 'buddy:', hasBuddyNotify);
          
          // Load per-alarm proof activity settings
          if (targetAlarm.proofActivityType) {
            setProofActivityType(targetAlarm.proofActivityType);
            const proofFromAlarm: ProofActivity = {
              activity: targetAlarm.activityName || targetAlarm.label || 'Wake up activity',
              activityIcon: 'camera',
              createdAt: targetAlarm.createdAt,
              isStepOnly: targetAlarm.proofActivityType === 'steps',
              stepGoal: targetAlarm.stepGoal || (targetAlarm.proofActivityType === 'steps' ? 10 : 10),
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

  // Format alarm time string from "HH:MM" (24h) to "H:MMAM/PM" (12h)
  const formatAlarmTimeString = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
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

    const stepGoal = proofActivity?.stepGoal || 10;

    // Route DIRECTLY to the chosen proof activity type
    switch (proofActivityType) {
      case 'steps':
        // Steps only - walk to dismiss
        await stopAlarm();
        navigation.navigate('StepMission', {
          alarmId: alarmData.alarmId,
          referencePhotoUri: alarmData.referencePhotoUri,
          onComplete: 'Home',
          stepGoal,
        });
        break;
      case 'photo_activity':
        // Photo proof - go DIRECTLY to camera (no forced steps)
        await stopAlarm();
        navigation.navigate('ProofCamera', {
          alarmId: alarmData.alarmId,
          referencePhotoUri: alarmData.referencePhotoUri,
          activityName: proofActivity?.activity || 'Take your proof photo',
        });
        break;
      case 'math':
        // Math problems - go to math proof screen
        await stopAlarm();
        navigation.navigate('MathProof', {
          alarmId: alarmData.alarmId,
        });
        break;
      case 'type_phrase':
        // Type phrase proof - show inline text input (don't stop alarm yet)
        setShowTypePhraseProof(true);
        break;
      case 'stretch':
        // Stretch proof - go to stretch screen with timer
        await stopAlarm();
        navigation.navigate('StretchProof', {
          alarmId: alarmData.alarmId,
        });
        break;
      default:
        // Fallback to photo proof (no forced steps)
        await stopAlarm();
        navigation.navigate('ProofCamera', {
          alarmId: alarmData.alarmId,
          referencePhotoUri: alarmData.referencePhotoUri,
          activityName: proofActivity?.activity || 'Take your proof photo',
        });
    }
  };

  // Handle type phrase proof completion
  const handleTypePhraseComplete = async () => {
    if (typePhraseText.trim().toLowerCase() === wakePhrase.toLowerCase()) {
      buttonPress('primary');
      await stopAlarm();

      // Log successful wake-up
      try {
        await logWakeUp(alarmData.alarmId, new Date(), false, 0);
        if (__DEV__) console.log('[AlarmRinging] Logged successful wake-up via type phrase');
      } catch (error) {
        if (__DEV__) console.log('[AlarmRinging] Error logging wake-up:', error);
      }

      // Navigate to success screen
      const now = new Date();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'WakeUpSuccess',
            params: {
              streak: streak + 1,
              moneySaved: penaltyAmount,
              wakeUpRate: 100,
              wakeTime: formatTime(now),
              targetTime: alarmData.alarmLabel,
            },
          }],
        })
      );
    }
  };

  const handleSnoozePress = () => {
    snoozeWarningPattern();
    setSnoozeStep(1);
  };

  // Execute snooze directly - go straight to punishment execution
  const executeSnooze = async () => {
    if (__DEV__) console.log('ALARM: User chose snooze - going directly to punishment');
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

    // Go directly to punishment execution (skip PaymentPressureScreen)
    await handleShameDismiss();
  };

  const handleAreYouSure = async () => {
    // Skip step 2 (text entry) and execute snooze directly
    snoozeWarningPattern();
    await executeSnooze();
  };

  const handleNevermind = () => {
    buttonPress('secondary');
    setSnoozeStep(0);
    setSnoozeText('');
  };

  const handleTextEx = async () => {
    if (!exPhoneNumber) return;
    buttonPress('primary');
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([exPhoneNumber], 'I miss you');
      setTextExSent(true);
    }
  };

  const handlePaymentSent = async () => {
    if (__DEV__) console.log('ALARM: Payment sent - showing shame message');
    setShowPaymentPrompt(false);
    await stopAlarm();
    setShowShame(true);
  };

  const handleShameDismiss = async () => {
    if (__DEV__) console.log('ALARM: Shame triggered - determining punishment types');
    setShowPaymentPrompt(false);
    setShowShame(false);
    await stopAlarm();

    // Get ALL enabled punishments (not just primary)
    const getEnabledPunishments = (): string[] => {
      const punishments: string[] = [];
      if (shameVideoEnabled) punishments.push('shame_video');
      if (emailBossEnabled) punishments.push('email_boss');
      if (tweetBadEnabled) punishments.push('tweet');
      if (callBuddyEnabled) punishments.push('call_buddy');
      if (momEnabled) punishments.push('call_mom');
      if (grandmaEnabled) punishments.push('call_grandma');
      if (textWifesDadEnabled) punishments.push('text_wife_dad');
      if (textExEnabled) punishments.push('text_ex');
      if (socialShameEnabled) punishments.push('social_shame');
      if (antiCharityEnabled) punishments.push('anti_charity');
      return punishments;
    };

    const punishmentTypes = getEnabledPunishments();
    if (__DEV__) console.log('ALARM: Enabled punishment types:', punishmentTypes);

    // Get punishment config for phone numbers/emails
    const config = await getPunishmentConfig();

    navigation.navigate('PunishmentExecution', {
      alarmId: alarmData.alarmId,
      alarmLabel: alarmData.alarmLabel,
      punishmentTypes,
      moneyEnabled,
      moneyAmount: penaltyAmount,
      shameVideoUri: alarmData.shameVideoUri,
      config: {
        bossEmail: config.email_boss?.bossEmail,
        momPhone: config.mom?.phoneNumber,
        grandmaPhone: config.grandma?.phoneNumber,
        buddyPhone: buddyInfo?.phone,
        wifesDadPhone: config.wife_dad?.phoneNumber,
        exPhone: config.text_ex?.exPhoneNumber,
      },
    });
  };

  // Pay-Only mode: Open iMessage to send Apple Cash
  const handlePayOnlyPayment = async () => {
    if (__DEV__) console.log('ALARM: Pay-only mode - opening iMessage for Apple Cash');
    buttonPress('primary');

    const phoneNumber = buddyInfo?.phone || '';
    if (!phoneNumber) {
      if (__DEV__) console.log('[AlarmRinging] No buddy phone number');
      return;
    }

    const result = await sendAppleCash(phoneNumber, penaltyAmount);
    if (result.success) {
      // Log the wake-up as a snooze (paid)
      try {
        await logWakeUp(alarmData.alarmId, new Date(), true, 1);
        if (__DEV__) console.log('[AlarmRinging] Logged paid snooze');
      } catch (error) {
        if (__DEV__) console.log('[AlarmRinging] Error logging snooze:', error);
      }

      // Stop alarm and navigate to shame screen
      await stopAlarm();

      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const streak = await getCurrentStreak();

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{
            name: 'ShameSent',
            params: {
              buddyName: buddyInfo?.name || 'Your buddy',
              amount: penaltyAmount,
              currentTime,
              previousStreak: streak,
              executedPunishments: ['money_sent'],
              moneyEnabled: true,
            },
          }],
        })
      );
    }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PAY-ONLY MODE UI
  // Shown when ONLY money punishment is enabled (no shame video, no buddy notify)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isPayOnlyMode) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Red pulsing background glow */}
        <View style={styles.payOnlyGlowContainer}>
          <Animated.View style={[styles.payOnlyOrb, timeAnimatedStyle]} />
          <Animated.View style={[styles.payOnlyRing, { opacity: 0.3 }]} />
          <Animated.View style={[styles.payOnlyRing, { opacity: 0.2, transform: [{ scale: 1.5 }] }]} />
          <Animated.View style={[styles.payOnlyRing, { opacity: 0.1, transform: [{ scale: 2 }] }]} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.payOnlyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: ALARM RINGING with pulsing dots */}
          <View style={styles.payOnlyHeader}>
            <Animated.View style={[styles.payOnlyDot, timeAnimatedStyle]} />
            <ThemedText style={styles.payOnlyHeaderText}>ALARM RINGING</ThemedText>
            <Animated.View style={[styles.payOnlyDot, timeAnimatedStyle]} />
          </View>

          {/* Volume indicator */}
          <View style={styles.payOnlyVolumeSection}>
            <Text style={{ fontSize: 20 }}>{'\u{1F50A}'}</Text>
            <View style={styles.payOnlyVolumeBarBg}>
              <Animated.View
                style={[
                  styles.payOnlyVolumeBarFill,
                  { width: `${volumePercent}%` },
                ]}
              />
            </View>
            <ThemedText style={styles.payOnlyVolumeText}>{Math.round(volumePercent)}%</ThemedText>
          </View>

          {/* PAY TO STOP card */}
          <View style={styles.payOnlyCard}>
            <View style={styles.payOnlyCardHeader}>
              <ThemedText style={styles.payOnlyCardLabel}>PAY TO STOP</ThemedText>
            </View>

            <View style={styles.payOnlyAmountRow}>
              <ThemedText style={styles.payOnlyDollarSign}>$</ThemedText>
              <ThemedText style={styles.payOnlyAmount}>{penaltyAmount}</ThemedText>
            </View>

            <View style={styles.payOnlyRecipient}>
              <ThemedText style={styles.payOnlyToText}>goes to</ThemedText>
              <ThemedText style={styles.payOnlyBuddyName}>{buddyName}</ThemedText>
            </View>

            <View style={styles.payOnlyBadge}>
              <Text style={{ fontSize: 16 }}>{'\uF8FF'}</Text>
              <ThemedText style={styles.payOnlyBadgeText}>Apple Cash</ThemedText>
            </View>
          </View>

          {/* What happens checklist */}
          <View style={styles.payOnlyChecklist}>
            <View style={styles.payOnlyCheckRow}>
              <View style={styles.payOnlyCheckIcon}>
                <ThemedText style={styles.payOnlyCheckMark}>{'\u2713'}</ThemedText>
              </View>
              <ThemedText style={styles.payOnlyCheckText}>Alarm stops immediately</ThemedText>
            </View>
            <View style={styles.payOnlyCheckRow}>
              <View style={styles.payOnlyCheckIcon}>
                <ThemedText style={styles.payOnlyCheckMark}>{'\u2713'}</ThemedText>
              </View>
              <ThemedText style={styles.payOnlyCheckText}>{buddyName} gets ${penaltyAmount}</ThemedText>
            </View>
          </View>

          {/* CTA Button */}
          <Pressable
            style={styles.payOnlyCTAButton}
            onPress={handlePayOnlyPayment}
            testID="button-pay-to-stop"
          >
            <Text style={{ fontSize: 22 }}>{'\u{1F4AC}'}</Text>
            <ThemedText style={styles.payOnlyCTAText}>Open iMessage to Pay</ThemedText>
          </Pressable>

          {/* Instructions */}
          <View style={styles.payOnlyInstructions}>
            <View style={styles.payOnlyStep}>
              <View style={styles.payOnlyStepNum}>
                <ThemedText style={styles.payOnlyStepNumText}>1</ThemedText>
              </View>
              <ThemedText style={styles.payOnlyStepText}>Tap send in iMessage</ThemedText>
            </View>
            <ThemedText style={styles.payOnlyArrow}>{'\u2192'}</ThemedText>
            <View style={styles.payOnlyStep}>
              <View style={styles.payOnlyStepNum}>
                <ThemedText style={styles.payOnlyStepNumText}>2</ThemedText>
              </View>
              <ThemedText style={styles.payOnlyStepText}>Tap {'\uF8FF'} Pay</ThemedText>
            </View>
          </View>

          {/* Warning */}
          <ThemedText style={styles.payOnlyWarning}>
            This is the only way to stop the alarm
          </ThemedText>
        </ScrollView>

        <CheatWarningModal
          visible={cheatModalVisible}
          cheatType={detectedCheat}
          onDismiss={() => setCheatModalVisible(false)}
        />
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NORMAL ALARM RINGING UI (with all punishments)
  // ═══════════════════════════════════════════════════════════════════════════
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

        {/* MASSIVE TIME - Shows the alarm's set time, not current time */}
        <Animated.View style={[styles.timeContainer, timeAnimatedStyle, { opacity: loaded ? 1 : 0 }]}>
          <ThemedText style={styles.time}>{alarmSetTime ? formatAlarmTimeString(alarmSetTime) : formatTime(currentTime)}</ThemedText>
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
        {(moneyEnabled || shameVideoEnabled || buddyNotifyEnabled || socialShameEnabled ||
          antiCharityEnabled || emailBossEnabled || tweetBadEnabled || callBuddyEnabled ||
          textWifesDadEnabled || textExEnabled || momEnabled || grandmaEnabled) ? (
          <>
            <View style={styles.snoozeHeader}>
              <View style={styles.snoozeLine} />
              <ThemedText style={styles.snoozeHeaderText}>SNOOZE =</ThemedText>
              <View style={styles.snoozeLine} />
            </View>

            {/* Punishment List */}
            <View style={styles.punishmentList}>
              {textWifesDadEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F474}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Text wife's dad</ThemedText>
                </View>
              )}
              {textExEnabled && exPhoneNumber && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F494}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Text ex "i miss u"</ThemedText>
                </View>
              )}
              {emailBossEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F4E7}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Email your boss</ThemedText>
                </View>
              )}
              {shameVideoEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F3AC}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Shame video plays</ThemedText>
                </View>
              )}
              {moneyEnabled && penaltyAmount > 0 && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F4B8}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Pay ${penaltyAmount}</ThemedText>
                </View>
              )}
              {callBuddyEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F4DE}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Call buddy</ThemedText>
                </View>
              )}
              {momEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F469}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Call mom</ThemedText>
                </View>
              )}
              {grandmaEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F475}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Call grandma</ThemedText>
                </View>
              )}
              {buddyNotifyEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F4F1}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Notify {buddyName}</ThemedText>
                </View>
              )}
              {socialShameEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F4AC}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Group chat shamed</ThemedText>
                </View>
              )}
              {antiCharityEnabled && (
                <View style={styles.punishmentItem}>
                  <Text style={styles.punishmentEmoji}>{'\u{1F5F3}'}</Text>
                  <ThemedText style={styles.punishmentItemText}>Donate to enemy</ThemedText>
                </View>
              )}
            </View>
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

        {/* TYPE PHRASE PROOF UI */}
        {showTypePhraseProof && (
          <View style={styles.typePhraseCard}>
            <View style={styles.typePhraseHeader}>
              <Text style={{ fontSize: 28 }}>{'\u{2328}\u{FE0F}'}</Text>
              <ThemedText style={styles.typePhraseTitle}>Type to Dismiss</ThemedText>
            </View>

            <ThemedText style={styles.typePhraseLabel}>
              Type this phrase exactly:
            </ThemedText>

            <View style={styles.phraseBox}>
              <ThemedText style={styles.phraseText}>"{wakePhrase}"</ThemedText>
            </View>

            <TextInput
              style={styles.typePhraseInput}
              value={typePhraseText}
              onChangeText={setTypePhraseText}
              placeholder="Type the phrase here..."
              placeholderTextColor="#57534E"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              testID="input-type-phrase"
            />

            <Pressable
              style={[
                styles.typePhraseButton,
                typePhraseText.trim().toLowerCase() === wakePhrase.toLowerCase() && styles.typePhraseButtonActive,
              ]}
              onPress={handleTypePhraseComplete}
              disabled={typePhraseText.trim().toLowerCase() !== wakePhrase.toLowerCase()}
              testID="button-confirm-phrase"
            >
              <ThemedText
                style={[
                  styles.typePhraseButtonText,
                  typePhraseText.trim().toLowerCase() === wakePhrase.toLowerCase() && styles.typePhraseButtonTextActive,
                ]}
              >
                {typePhraseText.trim().toLowerCase() === wakePhrase.toLowerCase() ? "I'M AWAKE!" : 'Type the phrase to dismiss'}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* FOOTER BUTTONS - hide when type phrase proof is showing */}
      {!showTypePhraseProof && (
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
      )}

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
  punishmentCardSent: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
    opacity: 0.7,
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

  // PUNISHMENT LIST
  punishmentList: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  punishmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  punishmentEmoji: {
    fontSize: 20,
  },
  punishmentItemText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
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

  // TYPE PHRASE PROOF
  typePhraseCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  typePhraseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  typePhraseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.green,
  },
  typePhraseLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  phraseBox: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phraseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  typePhraseInput: {
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: '#3F3A36',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  typePhraseButton: {
    width: '100%',
    backgroundColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  typePhraseButtonActive: {
    backgroundColor: Colors.green,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  typePhraseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#57534E',
  },
  typePhraseButtonTextActive: {
    color: Colors.text,
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PAY-ONLY MODE STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  payOnlyGlowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  payOnlyOrb: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    marginLeft: -250,
    width: 500,
    height: 500,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 250,
    opacity: 0.5,
  },
  payOnlyRing: {
    position: 'absolute',
    top: '25%',
    left: '50%',
    marginLeft: -75,
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  payOnlyScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  payOnlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  payOnlyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.red,
  },
  payOnlyHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.red,
    letterSpacing: 2,
  },
  payOnlyVolumeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 32,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  payOnlyVolumeBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  payOnlyVolumeBarFill: {
    height: '100%',
    backgroundColor: Colors.red,
    borderRadius: 3,
  },
  payOnlyVolumeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.red,
    minWidth: 45,
    textAlign: 'right',
  },
  payOnlyCard: {
    width: '100%',
    backgroundColor: 'rgba(28, 25, 23, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  payOnlyCardHeader: {
    marginBottom: 8,
  },
  payOnlyCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.green,
    letterSpacing: 2,
  },
  payOnlyAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 4,
  },
  payOnlyDollarSign: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.green,
    marginTop: 8,
  },
  payOnlyAmount: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.green,
    lineHeight: 80,
  },
  payOnlyRecipient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  payOnlyToText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  payOnlyBuddyName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  payOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
  },
  payOnlyBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  payOnlyChecklist: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  payOnlyCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payOnlyCheckIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOnlyCheckMark: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.green,
  },
  payOnlyCheckText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  payOnlyCTAButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: Colors.green,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  payOnlyCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.bg,
  },
  payOnlyInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  payOnlyStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payOnlyStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOnlyStepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  payOnlyStepText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  payOnlyArrow: {
    fontSize: 14,
    color: Colors.border,
  },
  payOnlyWarning: {
    fontSize: 13,
    color: Colors.red,
    textAlign: 'center',
  },
});
