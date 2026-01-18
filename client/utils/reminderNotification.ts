import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getAlarms } from './storage';

const REMINDER_NOTIFICATION_ID = 'keep-app-open-reminder';

/**
 * Sends a persistent reminder notification when the app goes to background.
 * This reminds users to keep the app open overnight for reliable alarms.
 */
export async function sendKeepOpenReminder(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // Check if user has any enabled alarms
    const alarms = await getAlarms();
    const hasEnabledAlarms = alarms.some((alarm) => alarm.enabled);

    if (!hasEnabledAlarms) {
      return;
    }

    // Cancel any existing reminder first
    await cancelKeepOpenReminder();

    // Schedule immediate notification that persists
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Keep Snoozer Open',
        body: 'For reliable alarms, keep the app open overnight. Tap to return.',
        data: { type: 'keep-open-reminder' },
        sound: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
        sticky: true, // Android: notification persists until dismissed
      },
      trigger: null, // Immediate delivery
      identifier: REMINDER_NOTIFICATION_ID,
    });

    if (__DEV__) console.log('[Reminder] Keep-open notification sent');
  } catch (error) {
    if (__DEV__) console.error('[Reminder] Error sending reminder:', error);
  }
}

/**
 * Cancels the keep-open reminder notification when app returns to foreground.
 */
export async function cancelKeepOpenReminder(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.dismissNotificationAsync(REMINDER_NOTIFICATION_ID);
    await Notifications.cancelScheduledNotificationAsync(REMINDER_NOTIFICATION_ID);
    if (__DEV__) console.log('[Reminder] Keep-open notification cancelled');
  } catch (error) {
    // Notification may not exist, which is fine
    if (__DEV__) console.log('[Reminder] No notification to cancel');
  }
}
