import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';

const ALARM_STATE_KEY = '@snoozer_active_alarm';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const STALE_THRESHOLD = 30000; // 30 seconds - if heartbeat is older than this, alarm was interrupted

interface AlarmData {
  alarmId: string;
  alarmLabel: string;
  referencePhotoUri: string;
  shameVideoUri: string;
}

type AlarmStatus = 'ringing' | 'dismissed';

interface StoredAlarmState extends AlarmData {
  lastHeartbeat: number;
  startedAt: number;
  status: AlarmStatus;
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

  const saveAlarmState = useCallback(async (alarmData: AlarmData, status: AlarmStatus = 'ringing') => {
    try {
      const state: StoredAlarmState = {
        ...alarmData,
        lastHeartbeat: Date.now(),
        startedAt: alarmStartTime.current || Date.now(),
        status,
      };
      await AsyncStorage.setItem(ALARM_STATE_KEY, JSON.stringify(state));
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

        // Only consider it interrupted if:
        // 1. Status is 'ringing' (not properly dismissed)
        // 2. Heartbeat is stale (app was killed/crashed)
        if (alarmState.status === 'ringing' && timeSinceHeartbeat > STALE_THRESHOLD) {
          if (__DEV__) console.log('[AntiCheat] Detected interrupted alarm:', alarmState.alarmId, 'stale for:', timeSinceHeartbeat, 'ms');
          onAlarmInterrupted?.(alarmState);
          return alarmState;
        }

        // If status is 'dismissed', the alarm was handled properly - clear it
        if (alarmState.status === 'dismissed') {
          if (__DEV__) console.log('[AntiCheat] Found dismissed alarm state, clearing');
          await AsyncStorage.removeItem(ALARM_STATE_KEY);
        }
      }
      return null;
    } catch (error) {
      if (__DEV__) console.error('Failed to check interrupted alarm:', error);
      return null;
    }
  }, [onAlarmInterrupted]);

  const startHeartbeat = useCallback(async (alarmData: AlarmData) => {
    // Clear any stale alarm state first to prevent false positives
    await clearAlarmState();

    alarmStartTime.current = Date.now();

    // Save initial state with 'ringing' status
    saveAlarmState(alarmData, 'ringing');

    heartbeatInterval.current = setInterval(() => {
      saveAlarmState(alarmData, 'ringing');
    }, HEARTBEAT_INTERVAL);
  }, [saveAlarmState, clearAlarmState]);

  // Call this when alarm is properly dismissed (proof completed or punishment executed)
  const markAlarmDismissed = useCallback(async () => {
    if (__DEV__) console.log('[AntiCheat] Marking alarm as properly dismissed');
    // Stop heartbeat first
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    // Clear the alarm state entirely - the alarm was handled properly
    await clearAlarmState();
    alarmStartTime.current = null;
  }, [clearAlarmState]);

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

    // Don't automatically check for interrupted alarms on mount
    // This causes false positives - the feature needs more work

    return () => {
      subscription?.remove();
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, []);

  return {
    startHeartbeat,
    stopHeartbeat,
    markAlarmDismissed,
    checkForInterruptedAlarm,
    scheduleBackupNotification,
    cancelBackupNotification,
    validatePhotoFreshness,
    validateTimeIntegrity,
  };
}

// Standalone function to check for interrupted alarms (used by HomeScreen on mount)
export async function getInterruptedAlarm(): Promise<StoredAlarmState | null> {
  try {
    const stored = await AsyncStorage.getItem(ALARM_STATE_KEY);
    if (stored) {
      const alarmState: StoredAlarmState = JSON.parse(stored);
      const timeSinceHeartbeat = Date.now() - alarmState.lastHeartbeat;

      // Only return if status is 'ringing' and heartbeat is stale
      if (alarmState.status === 'ringing' && timeSinceHeartbeat > STALE_THRESHOLD) {
        if (__DEV__) console.log('[AntiCheat] getInterruptedAlarm found:', alarmState.alarmId);
        return alarmState;
      }

      // If dismissed, clean it up
      if (alarmState.status === 'dismissed') {
        await AsyncStorage.removeItem(ALARM_STATE_KEY);
      }
    }
    return null;
  } catch (error) {
    if (__DEV__) console.error('[AntiCheat] getInterruptedAlarm error:', error);
    return null;
  }
}

// Clear the interrupted alarm state (call after punishment is executed)
export async function clearInterruptedAlarm(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ALARM_STATE_KEY);
    if (__DEV__) console.log('[AntiCheat] Cleared interrupted alarm state');
  } catch (error) {
    if (__DEV__) console.error('[AntiCheat] clearInterruptedAlarm error:', error);
  }
}

export type { CheatType, AlarmData, StoredAlarmState };
