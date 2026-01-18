import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';

const ALARM_STATE_KEY = '@snoozer_active_alarm';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

interface AlarmData {
  alarmId: string;
  alarmLabel: string;
  referencePhotoUri: string;
  shameVideoUri: string;
}

interface StoredAlarmState extends AlarmData {
  lastHeartbeat: number;
  startedAt: number;
}

type CheatType = 'photo_too_old' | 'time_manipulation' | 'app_killed' | 'shake_detected' | 'clock_drift';

interface UseAntiCheatProps {
  onCheatDetected?: (cheatType: CheatType) => void;
  onAlarmInterrupted?: (alarmState: StoredAlarmState) => void;
}

export function useAntiCheat({ onCheatDetected, onAlarmInterrupted }: UseAntiCheatProps) {
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const alarmStartTime = useRef<number | null>(null);

  const saveAlarmState = useCallback(async (alarmData: AlarmData) => {
    try {
      await AsyncStorage.setItem(ALARM_STATE_KEY, JSON.stringify({
        ...alarmData,
        lastHeartbeat: Date.now(),
        startedAt: alarmStartTime.current,
      }));
    } catch (error) {
      if (__DEV__) console.error('Failed to save alarm state:', error);
    }
  }, []);

  const clearAlarmState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ALARM_STATE_KEY);
    } catch (error) {
      if (__DEV__) console.error('Failed to clear alarm state:', error);
    }
  }, []);

  const checkForInterruptedAlarm = useCallback(async (): Promise<StoredAlarmState | null> => {
    try {
      const stored = await AsyncStorage.getItem(ALARM_STATE_KEY);
      if (stored) {
        const alarmState: StoredAlarmState = JSON.parse(stored);
        const timeSinceHeartbeat = Date.now() - alarmState.lastHeartbeat;
        
        if (timeSinceHeartbeat > 30000) {
          onAlarmInterrupted?.(alarmState);
          return alarmState;
        }
      }
      return null;
    } catch (error) {
      if (__DEV__) console.error('Failed to check interrupted alarm:', error);
      return null;
    }
  }, [onAlarmInterrupted]);

  const startHeartbeat = useCallback((alarmData: AlarmData) => {
    alarmStartTime.current = Date.now();
    
    saveAlarmState(alarmData);
    
    heartbeatInterval.current = setInterval(() => {
      saveAlarmState(alarmData);
    }, HEARTBEAT_INTERVAL);
  }, [saveAlarmState]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    clearAlarmState();
    alarmStartTime.current = null;
  }, [clearAlarmState]);

  const scheduleBackupNotification = useCallback(async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Nice try!",
          body: "Your alarm is still waiting. Open Snoozer now.",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
          seconds: 60, 
          repeats: false 
        },
        identifier: 'backup-alarm',
      });
    } catch (error) {
      if (__DEV__) console.error('Failed to schedule backup notification:', error);
    }
  }, []);

  const cancelBackupNotification = useCallback(async () => {
    try {
      await Notifications.cancelScheduledNotificationAsync('backup-alarm');
    } catch (error) {
      if (__DEV__) console.error('Failed to cancel backup notification:', error);
    }
  }, []);

  const validatePhotoFreshness = useCallback((photoTimestamp: number): boolean => {
    const now = Date.now();
    const age = now - photoTimestamp;
    const MAX_AGE = 60000; // 60 seconds

    if (age > MAX_AGE) {
      onCheatDetected?.('photo_too_old');
      return false;
    }
    return true;
  }, [onCheatDetected]);

  const validateTimeIntegrity = useCallback(async (): Promise<boolean> => {
    if (!alarmStartTime.current) return true;

    const elapsed = Date.now() - alarmStartTime.current;
    
    if (elapsed < 0 || elapsed > 24 * 60 * 60 * 1000) {
      onCheatDetected?.('time_manipulation');
      return false;
    }

    return true;
  }, [onCheatDetected]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background
      }
      appState.current = nextAppState;
    });

    checkForInterruptedAlarm();

    return () => {
      subscription?.remove();
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [checkForInterruptedAlarm]);

  return {
    startHeartbeat,
    stopHeartbeat,
    checkForInterruptedAlarm,
    scheduleBackupNotification,
    cancelBackupNotification,
    validatePhotoFreshness,
    validateTimeIntegrity,
  };
}

export type { CheatType, AlarmData, StoredAlarmState };
