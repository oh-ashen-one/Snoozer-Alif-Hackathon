import { Platform } from 'react-native';

// Dynamically import to avoid crashes on unsupported platforms
let LiveActivity: typeof import('expo-live-activity') | null = null;

async function getLiveActivity() {
  if (Platform.OS !== 'ios') return null;

  if (!LiveActivity) {
    try {
      LiveActivity = await import('expo-live-activity');
    } catch (error) {
      if (__DEV__) console.error('[LiveActivity] Failed to import:', error);
      return null;
    }
  }
  return LiveActivity;
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
  const LA = await getLiveActivity();
  if (!LA) return undefined;

  try {
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

    // Check if startActivity exists (not available in Expo Go)
    if (!LA.startActivity || typeof LA.startActivity !== 'function') {
      if (__DEV__) console.log('[LiveActivity] Not available in Expo Go');
      return undefined;
    }
    
    const activityId = LA.startActivity(state, config);
    if (__DEV__) console.log('[LiveActivity] Started countdown:', activityId);
    return activityId || undefined;
  } catch (error) {
    if (__DEV__) console.log('[LiveActivity] Not supported:', error);
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
  const LA = await getLiveActivity();
  if (!LA || !activityId) return;

  try {
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
    if (__DEV__) console.log('[LiveActivity] Update not supported:', error);
  }
}

/**
 * Stop the Live Activity countdown (e.g., when alarm fires or is cancelled).
 */
export async function stopAlarmCountdown(activityId: string): Promise<void> {
  const LA = await getLiveActivity();
  if (!LA || !activityId) return;

  try {
    if (!LA.stopActivity || typeof LA.stopActivity !== 'function') {
      return;
    }
    
    await LA.stopActivity(activityId, {
      title: 'Alarm Complete',
      progressBar: { progress: 1 },
    });
    if (__DEV__) console.log('[LiveActivity] Stopped:', activityId);
  } catch (error) {
    if (__DEV__) console.log('[LiveActivity] Stop not supported:', error);
  }
}
