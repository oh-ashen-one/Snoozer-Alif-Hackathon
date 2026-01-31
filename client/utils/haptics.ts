import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticSeverity = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export type PunishmentLevel = 'none' | 'low' | 'medium' | 'high' | 'extreme';

export function getPunishmentLevel(amount: number, hasShameVideo: boolean): PunishmentLevel {
  if (amount === 0 && !hasShameVideo) return 'none';
  if (amount <= 2 && !hasShameVideo) return 'low';
  if (amount <= 5) return 'medium';
  if (amount <= 10) return 'high';
  return 'extreme';
}

export async function hapticFeedback(severity: HapticSeverity): Promise<void> {
  if (Platform.OS === 'web') return;

  switch (severity) {
    case 'light':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
}

export async function hapticForPunishment(level: PunishmentLevel): Promise<void> {
  if (Platform.OS === 'web') return;

  switch (level) {
    case 'none':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'low':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'medium':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'high':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'extreme':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
}

export async function alarmRingingPattern(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function snoozeWarningPattern(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  await delay(200);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function shameTriggerPattern(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  await delay(150);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await delay(100);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function successDismissPattern(): Promise<void> {
  if (Platform.OS === 'web') return;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await delay(100);
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function alarmCreatedPattern(punishmentLevel: PunishmentLevel): Promise<void> {
  if (Platform.OS === 'web') return;

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
  if (punishmentLevel !== 'none') {
    await delay(150);
    await hapticForPunishment(punishmentLevel);
  }
}

export async function continuousAlarmPulse(
  isActive: { current: boolean },
  interval: number = 2000
): Promise<void> {
  if (Platform.OS === 'web') return;

  while (isActive.current) {
    await alarmRingingPattern();
    await delay(interval);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function buttonPress(type: 'primary' | 'secondary' | 'destructive' = 'primary'): Promise<void> {
  if (Platform.OS === 'web') return;

  switch (type) {
    case 'primary':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'secondary':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'destructive':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
  }
}

export async function toggleSwitch(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function selectionChanged(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Haptics.selectionAsync();
}
