import { Platform } from 'react-native';

// AlarmKit has been temporarily removed due to iOS 26 SDK requirement
// This stub provides fallback behavior using expo-notifications
// Re-add @raphckrman/react-native-alarm-kit when iOS 26 SDK is available on EAS

export function isAlarmKitAvailable(): boolean {
  return false;
}

export type AlarmKitPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getAlarmKitPermissionStatus(): Promise<AlarmKitPermissionStatus> {
  return 'undetermined';
}

export async function requestAlarmKitPermission(): Promise<boolean> {
  return false;
}

export interface ScheduleAlarmParams {
  id: string;
  hour: number;
  minute: number;
  days?: number[];
  label: string;
}

export async function scheduleAlarmKitAlarm(params: ScheduleAlarmParams): Promise<boolean> {
  // Return false to trigger notification fallback
  return false;
}

export async function cancelAlarmKitAlarm(alarmId: string): Promise<boolean> {
  return false;
}

export type AlarmEventCallback = (event: {
  alarmId: string;
  action: 'stop' | 'snooze';
}) => void;

export async function addAlarmKitListener(
  callback: AlarmEventCallback
): Promise<(() => void) | null> {
  return null;
}
