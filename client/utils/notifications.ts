import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from './storage';

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
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    const [hours, minutes] = alarm.time.split(':').map(Number);
    
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(hours, minutes, 0, 0);
    
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Wake Up!',
        body: alarm.label || 'Time to get up!',
        data: { 
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          referencePhotoUri: alarm.referencePhotoUri,
          shameVideoUri: alarm.shameVideoUri,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling alarm:', error);
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
        title: 'Wake Up! (Snoozed)',
        body: alarm.label || 'Time to get up! No more snoozing!',
        data: { 
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          referencePhotoUri: alarm.referencePhotoUri,
          shameVideoUri: alarm.shameVideoUri,
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling snooze alarm:', error);
    return null;
  }
}

export async function cancelAlarm(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling alarm:', error);
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
