import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from './storage';
import { isAlarmKitAvailable, scheduleAlarmKitAlarm, cancelAlarmKitAlarm } from './alarmKit';
import { isCallKitAvailable, displayAlarmCall } from './callKitAlarm';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function scheduleAlarm(alarm: Alarm): Promise<string | null> {
  try {
    const [hours, minutes] = alarm.time.split(':').map(Number);

    // Calculate the alarm trigger time for Live Activity
    const now = new Date();
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    // Use AlarmKit on iOS 26+ for native-level alarm reliability
    if (isAlarmKitAvailable()) {
      const success = await scheduleAlarmKitAlarm({
        id: alarm.id,
        hour: hours,
        minute: minutes,
        days: alarm.days,
        label: alarm.label || 'Wake Up!',
      });

      if (success) {
        if (__DEV__) console.log('[Notifications] Alarm scheduled via AlarmKit:', alarm.id);
        return alarm.id;
      }
      // Fall through to notification-based alarm if AlarmKit fails
      if (__DEV__) console.warn('[Notifications] AlarmKit failed, falling back to notifications');
    }

    // Fallback: Use expo-notifications for older iOS / Android
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      if (__DEV__) console.warn('[Notifications] Permission not granted');
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'WAKE UP!',
        body: alarm.label || 'Time to get up!',
        data: {
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          referencePhotoUri: alarm.referencePhotoUri,
          shameVideoUri: alarm.shameVideoUri,
        },
        sound: 'default',
        categoryIdentifier: 'ALARM',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        // iOS 15+ critical/time-sensitive notification - breaks through Focus modes
        ...(Platform.OS === 'ios' && { interruptionLevel: 'critical' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alarmTime,
      },
    });

    if (__DEV__) console.log('[Notifications] Alarm scheduled:', alarm.id, 'at', alarmTime.toLocaleTimeString());
    return identifier;
  } catch (error) {
    if (__DEV__) console.error('[Notifications] Error scheduling alarm:', error);
    return null;
  }
}

export async function scheduleSnoozeAlarm(alarm: Alarm, snoozeMinutes: number = 5): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    const trigger = new Date();
    trigger.setMinutes(trigger.getMinutes() + snoozeMinutes);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Still awake?',
        body: 'Just checking if you went back to sleep. You have 30 seconds to confirm or the alarm goes off!',
        data: {
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          referencePhotoUri: alarm.referencePhotoUri,
          shameVideoUri: alarm.shameVideoUri,
          isRecheck: true,
        },
        sound: 'default',
        categoryIdentifier: 'ALARM',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        // iOS 15+ critical notification - breaks through Focus modes
        ...(Platform.OS === 'ios' && { interruptionLevel: 'critical' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });

    if (__DEV__) console.log('[Notifications] Snooze alarm scheduled:', alarm.id, 'at', trigger.toLocaleTimeString());
    return identifier;
  } catch (error) {
    if (__DEV__) console.error('[Notifications] Error scheduling snooze alarm:', error);
    return null;
  }
}

export async function cancelAlarm(notificationId: string): Promise<void> {
  try {
    // Try AlarmKit first if available
    if (isAlarmKitAvailable()) {
      await cancelAlarmKitAlarm(notificationId);
    }
    // Always try to cancel notification too (belt and suspenders)
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    if (__DEV__) console.error('Error canceling alarm:', error);
  }
}

export async function cancelAllAlarms(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all alarms:', error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// Trigger CallKit full-screen alarm UI (iOS only)
// Returns true if CallKit was triggered, false if fallback is needed
export function triggerAlarmWithCallKit(alarmId: string, label: string): boolean {
  if (!isCallKitAvailable()) {
    return false;
  }

  const callUUID = displayAlarmCall(alarmId, label);
  if (callUUID) {
    if (__DEV__) console.log('[Notifications] Triggered CallKit alarm:', alarmId);
    return true;
  }

  return false;
}
