import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_ALARM_KEY = '@snoozer/active_alarm';

export interface ActiveAlarm {
  id: string;
  time: string;
  label: string;
  soundKey?: string;
  referencePhotoUri?: string;
  shameVideoUri?: string;
  punishments: Array<{
    emoji: string;
    name: string;
    enabled: boolean;
  }>;
  stakeAmount?: number;
}

interface AlarmContextType {
  activeAlarm: ActiveAlarm | null;
  isRinging: boolean;
  isSoundPlaying: boolean;
  startAlarmSound: (soundKey?: string) => Promise<void>;
  stopAlarmSound: () => Promise<void>;
  setActiveAlarm: (alarm: ActiveAlarm | null) => void;
  scheduleAlarm: (alarm: ActiveAlarm) => Promise<void>;
  cancelAlarm: () => Promise<void>;
  missionCompleted: () => Promise<void>;
  snoozeAlarm: (durationMinutes?: number) => Promise<void>;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

const SOUND_MAP: Record<string, ReturnType<typeof require>> = {
  'nuclear-alarm': require('@/assets/sounds/nuclear-alarm.wav'),
  'air-horn': require('@/assets/sounds/air-horn.wav'),
  'angry-goose': require('@/assets/sounds/angry-goose.wav'),
  'baby-crying': require('@/assets/sounds/baby-crying.wav'),
  'broken-glass': require('@/assets/sounds/broken-glass.wav'),
  'car-alarm': require('@/assets/sounds/car-alarm.wav'),
  'chainsaw': require('@/assets/sounds/chainsaw.wav'),
  'chaos-engine': require('@/assets/sounds/chaos-engine.wav'),
  'dog-barking': require('@/assets/sounds/dog-barking.wav'),
  'drill-sergeant': require('@/assets/sounds/drill-sergeant.wav'),
  'ear-shatter': require('@/assets/sounds/ear-shatter.wav'),
  'emp-blast': require('@/assets/sounds/emp-blast.wav'),
  'high-pitch': require('@/assets/sounds/high-pitch.wav'),
  'mosquito-swarm': require('@/assets/sounds/mosquito-swarm.wav'),
  'motorcycle': require('@/assets/sounds/motorcycle.wav'),
  'police-siren': require('@/assets/sounds/police-siren.wav'),
  'rooster': require('@/assets/sounds/rooster.wav'),
  'screaming-goat': require('@/assets/sounds/screaming-goat.wav'),
  'siren-from-hell': require('@/assets/sounds/siren-from-hell.wav'),
  'smoke-detector': require('@/assets/sounds/smoke-detector.wav'),
  'submarine-alarm': require('@/assets/sounds/submarine-alarm.wav'),
  'the-escalator': require('@/assets/sounds/the-escalator.wav'),
};

interface AlarmProviderProps {
  children: ReactNode;
}

export function AlarmProvider({ children }: AlarmProviderProps) {
  const [activeAlarm, setActiveAlarmState] = useState<ActiveAlarm | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    setupNotifications();
    loadSavedAlarm();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const setupNotifications = async () => {
    if (Platform.OS === 'web') return;

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowCriticalAlerts: true,
      },
    });

    if (status !== 'granted') {
      if (__DEV__) console.warn('[AlarmContext] Notification permissions not granted');
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });

    await Notifications.setNotificationCategoryAsync('ALARM', [
      {
        identifier: 'WAKE_UP',
        buttonTitle: "I'm Up",
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE',
        buttonTitle: 'Snooze',
        options: { opensAppToForeground: true, isDestructive: true },
      },
    ]);

    if (__DEV__) console.log('[AlarmContext] Notifications configured');
  };

  const startAlarmSound = useCallback(async (soundKey: string = 'nuclear-alarm') => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const soundSource = SOUND_MAP[soundKey] || SOUND_MAP['nuclear-alarm'];
      const { sound } = await Audio.Sound.createAsync(soundSource, {
        isLooping: true,
        volume: 1.0,
        shouldPlay: true,
      });

      soundRef.current = sound;
      setIsSoundPlaying(true);
      setIsRinging(true);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if ('isPlaying' in status) {
          setIsSoundPlaying(status.isPlaying);
        }
      });

      if (__DEV__) console.log('[AlarmContext] Alarm sound started:', soundKey);
    } catch (error) {
      if (__DEV__) console.error('[AlarmContext] Failed to play alarm:', error);
    }
  }, []);

  const stopAlarmSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsSoundPlaying(false);
      setIsRinging(false);

      if (__DEV__) console.log('[AlarmContext] Alarm sound stopped');
    } catch (error) {
      if (__DEV__) console.error('[AlarmContext] Failed to stop alarm:', error);
    }
  }, []);

  const setActiveAlarm = useCallback((alarm: ActiveAlarm | null) => {
    setActiveAlarmState(alarm);
    if (alarm) {
      AsyncStorage.setItem(ACTIVE_ALARM_KEY, JSON.stringify(alarm));
    } else {
      AsyncStorage.removeItem(ACTIVE_ALARM_KEY);
    }
  }, []);

  const scheduleAlarm = useCallback(async (alarm: ActiveAlarm) => {
    if (Platform.OS === 'web') {
      if (__DEV__) console.log('[AlarmContext] Notifications not available on web');
      setActiveAlarm(alarm);
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const punishmentEmojis = alarm.punishments
      .filter((p) => p.enabled)
      .map((p) => p.emoji)
      .join(' ');

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'WAKE UP!',
        body: punishmentEmojis ? `GET UP OR: ${punishmentEmojis}` : 'Time to wake up!',
        sound: 'default',
        categoryIdentifier: 'ALARM',
        data: {
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          referencePhotoUri: alarm.referencePhotoUri,
          shameVideoUri: alarm.shameVideoUri,
        },
        interruptionLevel: 'critical',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(alarm.time) },
    });

    setActiveAlarm(alarm);

    if (__DEV__) console.log('[AlarmContext] Alarm scheduled for:', alarm.time);
  }, [setActiveAlarm]);

  const cancelAlarm = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await stopAlarmSound();
    setActiveAlarm(null);

    if (__DEV__) console.log('[AlarmContext] Alarm cancelled');
  }, [setActiveAlarm, stopAlarmSound]);

  const missionCompleted = useCallback(async () => {
    await stopAlarmSound();
    await Notifications.dismissAllNotificationsAsync();
    setActiveAlarm(null);

    if (__DEV__) console.log('[AlarmContext] Mission completed - alarm dismissed');
  }, [setActiveAlarm, stopAlarmSound]);

  const snoozeAlarm = useCallback(async (durationMinutes: number = 5) => {
    if (!activeAlarm) return;

    await stopAlarmSound();

    const newAlarm: ActiveAlarm = {
      ...activeAlarm,
      time: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
    };

    await scheduleAlarm(newAlarm);

    if (__DEV__) console.log('[AlarmContext] Alarm snoozed for', durationMinutes, 'minutes');
  }, [activeAlarm, scheduleAlarm, stopAlarmSound]);

  const loadSavedAlarm = async () => {
    try {
      const saved = await AsyncStorage.getItem(ACTIVE_ALARM_KEY);
      if (saved) {
        const alarm = JSON.parse(saved) as ActiveAlarm;
        setActiveAlarmState(alarm);

        const alarmTime = new Date(alarm.time);
        if (alarmTime <= new Date()) {
          setIsRinging(true);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('[AlarmContext] Failed to load saved alarm:', error);
    }
  };

  const value: AlarmContextType = {
    activeAlarm,
    isRinging,
    isSoundPlaying,
    startAlarmSound,
    stopAlarmSound,
    setActiveAlarm,
    scheduleAlarm,
    cancelAlarm,
    missionCompleted,
    snoozeAlarm,
  };

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarm() {
  const context = useContext(AlarmContext);
  if (context === undefined) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
}
