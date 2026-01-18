import { Platform } from 'react-native';

// AlarmKit is only available on iOS 26+ with native build (not Expo Go)
const ALARMKIT_MIN_VERSION = 26;

// Check if AlarmKit is available
export function isAlarmKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  const version = parseInt(Platform.Version as string, 10);
  return version >= ALARMKIT_MIN_VERSION;
}

// Dynamically import to avoid crashes on unsupported platforms
let AlarmKit: typeof import('@raphckrman/react-native-alarm-kit') | null = null;

async function getAlarmKit() {
  if (!isAlarmKitAvailable()) {
    return null;
  }

  if (!AlarmKit) {
    try {
      AlarmKit = await import('@raphckrman/react-native-alarm-kit');
    } catch (error) {
      if (__DEV__) console.log('[AlarmKit] Not available in Expo Go');
      return null;
    }
  }
  return AlarmKit;
}

// Check if a function exists and is callable
function isFunctionAvailable(obj: any, funcName: string): boolean {
  return obj && typeof obj[funcName] === 'function';
}

export type AlarmKitPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Get the current AlarmKit permission status without prompting.
 */
export async function getAlarmKitPermissionStatus(): Promise<AlarmKitPermissionStatus> {
  const kit = await getAlarmKit();
  if (!kit) return 'undetermined';

  try {
    // Check if getAuthorizationStatus exists
    if (isFunctionAvailable(kit, 'getAuthorizationStatus')) {
      const status = await (kit as any).getAuthorizationStatus();
      if (status === 'authorized' || status === true) return 'granted';
      if (status === 'denied' || status === false) return 'denied';
      return 'undetermined';
    }

    // Check if requestAlarmPermission exists
    if (isFunctionAvailable(kit, 'requestAlarmPermission')) {
      const granted = await kit.requestAlarmPermission();
      return granted ? 'granted' : 'undetermined';
    }

    // Functions not available (Expo Go)
    if (__DEV__) console.log('[AlarmKit] Permission functions not available');
    return 'undetermined';
  } catch (error) {
    if (__DEV__) console.log('[AlarmKit] Not supported in this environment');
    return 'undetermined';
  }
}

/**
 * Request AlarmKit permission from the user.
 * Shows the system prompt: "Allow [App] to schedule alarms and timers?"
 */
export async function requestAlarmKitPermission(): Promise<boolean> {
  const kit = await getAlarmKit();
  if (!kit) return false;

  try {
    if (!isFunctionAvailable(kit, 'requestAlarmPermission')) {
      if (__DEV__) console.log('[AlarmKit] requestAlarmPermission not available');
      return false;
    }

    const granted = await kit.requestAlarmPermission();
    if (__DEV__) console.log('[AlarmKit] Permission granted:', granted);
    return granted;
  } catch (error) {
    if (__DEV__) console.log('[AlarmKit] Permission not supported');
    return false;
  }
}

export interface ScheduleAlarmParams {
  id: string;
  hour: number;
  minute: number;
  days?: number[]; // [0-6] for Sun-Sat, undefined for one-time
  label: string;
}

type AlarmWeekday = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

// Convert numeric day (0=Sun, 1=Mon, etc.) to AlarmWeekday string
function dayToWeekday(day: number): AlarmWeekday {
  const weekdays: AlarmWeekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return weekdays[day] || 'monday';
}

/**
 * Schedule an alarm using AlarmKit.
 * Provides native-level alarm with full-screen UI on lock screen.
 */
export async function scheduleAlarmKitAlarm(params: ScheduleAlarmParams): Promise<boolean> {
  const kit = await getAlarmKit();
  if (!kit) {
    if (__DEV__) console.log('[AlarmKit] Not available, falling back to notifications');
    return false;
  }

  try {
    // Check if required functions are available
    if (!isFunctionAvailable(kit, 'createAlarmButton') || !isFunctionAvailable(kit, 'scheduleRelativeAlarm')) {
      if (__DEV__) console.log('[AlarmKit] Schedule functions not available');
      return false;
    }

    // Create Stop button (red)
    const stopButton = await kit.createAlarmButton(
      'Stop',
      '#EF4444',
      'stop.circle.fill'
    );

    // Create Snooze button (orange)
    const snoozeButton = await kit.createAlarmButton(
      'Snooze',
      '#FB923C',
      'clock.arrow.circlepath'
    );

    // Convert numeric days to weekday strings
    const repeats: AlarmWeekday[] = params.days && params.days.length > 0
      ? params.days.map(dayToWeekday)
      : [];

    // Schedule the alarm (title is used as the display label)
    await kit.scheduleRelativeAlarm(
      params.label, // title shown on alarm UI
      stopButton,
      '#FB923C', // Snoozer orange theme
      params.hour,
      params.minute,
      repeats,
      snoozeButton // secondary button
    );

    if (__DEV__) {
      console.log(
        '[AlarmKit] Alarm scheduled:',
        params.id,
        `at ${params.hour}:${params.minute.toString().padStart(2, '0')}`
      );
    }
    return true;
  } catch (error) {
    if (__DEV__) console.log('[AlarmKit] Schedule not supported');
    return false;
  }
}

/**
 * Cancel an AlarmKit alarm by ID.
 * Note: The current AlarmKit API doesn't support cancellation,
 * so this is a no-op placeholder for future API updates.
 */
export async function cancelAlarmKitAlarm(alarmId: string): Promise<boolean> {
  // AlarmKit doesn't currently expose a cancel method
  // Alarms will fire but can be dismissed by the user
  if (__DEV__) {
    console.log('[AlarmKit] Cancel not supported, alarm will still fire:', alarmId);
  }
  return false;
}

export type AlarmEventCallback = (event: {
  alarmId: string;
  action: 'stop' | 'snooze';
}) => void;

/**
 * Listen for AlarmKit events (stop/snooze button presses).
 * Returns an unsubscribe function.
 */
export async function addAlarmKitListener(
  callback: AlarmEventCallback
): Promise<(() => void) | null> {
  const kit = await getAlarmKit();
  if (!kit) return null;

  try {
    if (isFunctionAvailable(kit, 'addAlarmListener')) {
      const subscription = (kit as any).addAlarmListener(callback);
      return () => subscription?.remove?.();
    }
    return null;
  } catch (error) {
    if (__DEV__) console.log('[AlarmKit] Listener not supported');
    return null;
  }
}
