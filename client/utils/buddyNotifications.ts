import * as Notifications from 'expo-notifications';
import { getBuddyInfo, BuddyInfo } from './storage';

export type BuddyNotificationType = 
  | 'BUDDY_SNOOZED'
  | 'BUDDY_WOKE'
  | 'BUDDY_MISSED'
  | 'BUDDY_ALARM_SOON'
  | 'PAYMENT_RECEIVED'
  | 'BUDDY_POKED';

interface NotificationTemplate {
  title: string;
  body: string;
  action: string;
}

const NOTIFICATION_TEMPLATES: Record<BuddyNotificationType, NotificationTemplate> = {
  BUDDY_SNOOZED: {
    title: "YOU FAILED!",
    body: "You snoozed and owe ${amount}. Time to pay up.",
    action: "open_buddy_dashboard",
  },
  BUDDY_WOKE: {
    title: "{name} woke up!",
    body: "{time} — {streak} day streak",
    action: "open_buddy_dashboard",
  },
  BUDDY_MISSED: {
    title: "{name} slept through!",
    body: "They missed their {time} alarm entirely.",
    action: "open_buddy_dashboard",
  },
  BUDDY_ALARM_SOON: {
    title: "{buddy} wakes in 10 min",
    body: "Their {time} alarm is coming up",
    action: "open_buddy_dashboard",
  },
  PAYMENT_RECEIVED: {
    title: "${amount} received!",
    body: "{buddy} paid their snooze penalty",
    action: "open_payments",
  },
  BUDDY_POKED: {
    title: "{buddy} poked you!",
    body: "They're checking if you're awake",
    action: "open_app",
  },
};

interface NotificationData {
  name?: string;
  buddy?: string;
  amount?: number;
  time?: string;
  streak?: number;
}

function interpolateTemplate(template: string, data: NotificationData): string {
  let result = template;
  
  if (data.name) {
    result = result.replace('{name}', data.name);
  }
  if (data.buddy) {
    result = result.replace('{buddy}', data.buddy);
  }
  if (data.amount !== undefined) {
    result = result.replace('{amount}', data.amount.toString());
    result = result.replace('${amount}', `$${data.amount}`);
  }
  if (data.time) {
    result = result.replace('{time}', data.time);
  }
  if (data.streak !== undefined) {
    result = result.replace('{streak}', data.streak.toString());
  }
  
  return result;
}

export async function sendBuddyNotification(
  type: BuddyNotificationType,
  data: NotificationData
): Promise<string | null> {
  // PAUSED: Buddy notifications disabled for now
  if (__DEV__) {
    console.log(`[BuddyNotification] PAUSED - would send ${type}:`, data);
  }
  return null;
}

export async function scheduleBuddyAlarmReminder(
  buddyName: string,
  alarmTime: string,
  minutesBefore: number = 10
): Promise<string | null> {
  // PAUSED: Buddy notifications disabled for now
  if (__DEV__) {
    console.log(`[BuddyNotification] PAUSED - would schedule reminder for ${buddyName} at ${alarmTime}`);
  }
  return null;
}

export async function notifyBuddySnoozed(
  userName: string,
  penaltyAmount: number
): Promise<string | null> {
  return sendBuddyNotification('BUDDY_SNOOZED', {
    name: userName,
    amount: penaltyAmount,
  });
}

export async function notifyBuddyWoke(
  userName: string,
  wakeTime: string,
  streak: number
): Promise<string | null> {
  return sendBuddyNotification('BUDDY_WOKE', {
    name: userName,
    time: wakeTime,
    streak,
  });
}

export async function notifyBuddyMissed(
  userName: string,
  alarmTime: string
): Promise<string | null> {
  return sendBuddyNotification('BUDDY_MISSED', {
    name: userName,
    time: alarmTime,
  });
}

export async function notifyPaymentReceived(
  buddyName: string,
  amount: number
): Promise<string | null> {
  return sendBuddyNotification('PAYMENT_RECEIVED', {
    buddy: buddyName,
    amount,
  });
}

export async function notifyBuddyPoked(
  buddyName: string
): Promise<string | null> {
  return sendBuddyNotification('BUDDY_POKED', {
    buddy: buddyName,
  });
}

export async function sendPokeNotification(): Promise<boolean> {
  try {
    const buddy = await getBuddyInfo();
    if (!buddy) {
      if (__DEV__) {
        console.log('[BuddyNotification] No buddy to poke');
      }
      return false;
    }
    
    if (__DEV__) {
      console.log('[BuddyNotification] Sending poke to:', buddy.name);
    }
    
    return true;
  } catch (error) {
    console.error('[BuddyNotification] Failed to send poke:', error);
    return false;
  }
}

export async function cancelAllBuddyNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    const buddyNotificationIds = scheduledNotifications
      .filter(n => {
        const data = n.content.data as Record<string, unknown>;
        return data?.type && Object.keys(NOTIFICATION_TEMPLATES).includes(data.type as string);
      })
      .map(n => n.identifier);
    
    for (const id of buddyNotificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    
    if (__DEV__) {
      console.log(`[BuddyNotification] Cancelled ${buddyNotificationIds.length} buddy notifications`);
    }
  } catch (error) {
    console.error('[BuddyNotification] Failed to cancel notifications:', error);
  }
}
