import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if running in Expo Go (where native modules crash)
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

// Check if Live Activity is available
function isLiveActivityAvailable(): boolean {
  // Never available in Expo Go
  if (isExpoGo()) return false;
  if (Platform.OS !== 'ios') return false;
  return true;
}

export interface AlarmCountdownParams {
  alarmId: string;
  alarmTime: Date;
  label: string;
}

/**
 * Start a Live Activity showing countdown to alarm in Dynamic Island and Lock Screen.
 * Returns the activity ID for later cleanup.
 */
export async function startAlarmCountdown(
  params: AlarmCountdownParams
): Promise<string | undefined> {
  // Skip entirely in Expo Go to prevent native module crash
  if (!isLiveActivityAvailable()) {
    return undefined;
  }

  try {
    const LA = await import('expo-live-activity');
    
    if (!LA.startActivity || typeof LA.startActivity !== 'function') {
      if (__DEV__) console.log('[LiveActivity] Not available');
      return undefined;
    }

    const timeString = params.alarmTime.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    const state = {
      title: params.label || 'Alarm',
      subtitle: `Set for ${timeString}`,
      progressBar: {
        date: params.alarmTime.getTime(), // Countdown to this time
      },
    };

    const config = {
      backgroundColor: '#0C0A09',
      titleColor: '#FAFAF9',
      subtitleColor: '#A8A29E',
      progressViewTint: '#FB923C',
      timerType: 'digital' as const,
    };

    const activityId = LA.startActivity(state, config);
    if (__DEV__) console.log('[LiveActivity] Started countdown:', activityId);
    return activityId || undefined;
  } catch (error) {
    if (__DEV__) console.log('[LiveActivity] Not supported');
    return undefined;
  }
}

/**
 * Update an existing Live Activity (e.g., when alarm time changes).
 */
export async function updateAlarmCountdown(
  activityId: string,
  params: AlarmCountdownParams
): Promise<void> {
  // Skip entirely in Expo Go to prevent native module crash
  if (!isLiveActivityAvailable() || !activityId) {
    return;
  }

  try {
    const LA = await import('expo-live-activity');
    
    if (!LA.updateActivity || typeof LA.updateActivity !== 'function') {
      return;
    }

    const timeString = params.alarmTime.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    await LA.updateActivity(activityId, {
      title: params.label || 'Alarm',
      subtitle: `Set for ${timeString}`,
      progressBar: {
        date: params.alarmTime.getTime(),
      },
    });
    if (__DEV__) console.log('[LiveActivity] Updated:', activityId);
  } catch (error) {
    if (__DEV__) console.log('[LiveActivity] Update not supported');
  }
}

/**
 * Stop the Live Activity countdown (e.g., when alarm fires or is cancelled).
 */
export async function stopAlarmCountdown(activityId: string): Promise<void> {
  // Skip entirely in Expo Go to prevent native module crash
  if (!isLiveActivityAvailable() || !activityId) {
    return;
  }

  try {
    const LA = await import('expo-live-activity');
    
    if (!LA.stopActivity || typeof LA.stopActivity !== 'function') {
      return;
    }

    await LA.stopActivity(activityId, {
      title: 'Alarm Complete',
      progressBar: { progress: 1 },
    });
    if (__DEV__) console.log('[LiveActivity] Stopped:', activityId);
  } catch (error) {
    if (__DEV__) console.log('[LiveActivity] Stop not supported');
  }
}
