import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const KEYS = {
  ALARMS: '@snoozer/alarms',
  ONBOARDED: '@snoozer/onboarded',
  REFERENCE_PHOTO: '@snoozer/reference_photo',
  SHAME_VIDEO: '@snoozer/shame_video',
  PROOF_ACTIVITY: '@snoozer/proof_activity',
  BUDDY: '@snoozer/buddy',
  SHAME_CONTACTS: '@snoozer/shame_contacts',
  DEFAULT_PUNISHMENTS: '@snoozer/default_punishments',
  DEFAULT_AMOUNT: '@snoozer/default_amount',
  USER_NAME: '@snoozer/user_name',
  PUNISHMENT_CONFIG: '@snoozer/punishment_config',
};

export async function getUserName(): Promise<string> {
  try {
    const name = await AsyncStorage.getItem(KEYS.USER_NAME);
    return name || 'You';
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'You';
  }
}

export async function saveUserName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.USER_NAME, name);
  } catch (error) {
    console.error('Error saving user name:', error);
  }
}

export interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  referencePhotoUri: string | null;
  shameVideoUri: string | null;
  createdAt: number;
  notificationId?: string | null;
  punishment?: number;
  extraPunishments?: string[];
  days?: number[];
  // Proof of Wake settings (per-alarm)
  proofActivityType?: 'photo_activity' | 'steps' | 'math' | 'type_phrase';
  activityName?: string;
  stepGoal?: number;
  // Punishment toggles (per-alarm)
  moneyEnabled?: boolean;
  shameVideoEnabled?: boolean;
  buddyNotifyEnabled?: boolean;
  socialShameEnabled?: boolean;
  antiCharityEnabled?: boolean;
  emailBossEnabled?: boolean;
  tweetBadEnabled?: boolean;
  callBuddyEnabled?: boolean;
  textWifesDadEnabled?: boolean;
  textExEnabled?: boolean;
  // Escalation settings (per-alarm)
  escalatingVolume?: boolean;
  wakeRecheck?: boolean;
}

export async function getAlarms(): Promise<Alarm[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ALARMS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting alarms:', error);
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ALARMS, JSON.stringify(alarms));
  } catch (error) {
    console.error('Error saving alarms:', error);
  }
}

export async function addAlarm(alarm: Alarm): Promise<void> {
  const alarms = await getAlarms();
  alarms.push(alarm);
  await saveAlarms(alarms);
}

export async function updateAlarm(id: string, updates: Partial<Alarm>): Promise<Alarm | null> {
  const alarms = await getAlarms();
  const index = alarms.findIndex(a => a.id === id);
  if (index !== -1) {
    alarms[index] = { ...alarms[index], ...updates };
    await saveAlarms(alarms);
    return alarms[index];
  }
  return null;
}

export async function deleteAlarm(id: string): Promise<void> {
  const alarms = await getAlarms();
  const filtered = alarms.filter(a => a.id !== id);
  await saveAlarms(filtered);
}

export async function getAlarmById(id: string): Promise<Alarm | null> {
  const alarms = await getAlarms();
  return alarms.find(a => a.id === id) || null;
}

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(KEYS.ONBOARDED);
    return data === 'true';
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return false;
  }
}

export async function setOnboardingComplete(complete: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.ONBOARDED, complete ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.clear();
    try {
      const docDir = (FileSystem as any).documentDirectory;
      if (docDir) {
        const files = await FileSystem.readDirectoryAsync(docDir);
        for (const file of files) {
          await FileSystem.deleteAsync(`${docDir}${file}`, { idempotent: true });
        }
      }
    } catch (fileError) {
      // File deletion is optional - AsyncStorage.clear() already clears main data
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

export interface ProofActivity {
  activity: string;
  activityIcon: string;
  createdAt: number;
  isStepOnly?: boolean;
  stepGoal?: number;
}

export async function getProofActivity(): Promise<ProofActivity | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROOF_ACTIVITY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting proof activity:', error);
    return null;
  }
}

export async function saveProofActivity(activity: ProofActivity): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PROOF_ACTIVITY, JSON.stringify(activity));
  } catch (error) {
    console.error('Error saving proof activity:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// BUDDY STORAGE
// ═══════════════════════════════════════════════════════════════

export interface BuddyInfo {
  id?: string;
  name: string;
  phone?: string;
  avatar?: string;
  invitedAt?: number;
  hasApp?: boolean;
  joinedAt?: number;
  linkedAt?: number;
  inviteCode?: string;
  status: 'none' | 'pending_sent' | 'pending_received' | 'linked';
}

export interface BuddyStats {
  totalAlarms: number;
  totalWakes: number;
  totalSnoozes: number;
  currentStreak: number;
  longestStreak: number;
  totalPaid: number;
  totalReceived: number;
}

export interface WakeEvent {
  id: string;
  alarmId: string;
  userId: string;
  scheduledTime: number;
  actualTime: number;
  result: 'woke' | 'snoozed' | 'missed';
  snoozeCount?: number;
  penaltyPaid?: number;
  proofType?: string;
  proofImageUri?: string;
}

export interface BuddyAlarm {
  id: string;
  time: string;
  days: number[];
  label: string;
  stakes: number;
  enabled: boolean;
}

export interface ShameContact {
  name: string;
  phone: string;
  type: 'buddy' | 'escalation' | 'group';
}

export async function getBuddyInfo(): Promise<BuddyInfo | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BUDDY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting buddy info:', error);
    return null;
  }
}

export async function saveBuddyInfo(buddy: BuddyInfo): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.BUDDY, JSON.stringify(buddy));
  } catch (error) {
    console.error('Error saving buddy info:', error);
  }
}

export async function clearBuddyInfo(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.BUDDY);
  } catch (error) {
    console.error('Error clearing buddy info:', error);
  }
}

export async function getBuddyStats(): Promise<BuddyStats | null> {
  try {
    const data = await AsyncStorage.getItem('@snoozer/buddy_stats');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting buddy stats:', error);
    return null;
  }
}

export async function saveBuddyStats(stats: BuddyStats): Promise<void> {
  try {
    await AsyncStorage.setItem('@snoozer/buddy_stats', JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving buddy stats:', error);
  }
}

export async function getBuddyWakeEvents(): Promise<WakeEvent[]> {
  try {
    const data = await AsyncStorage.getItem('@snoozer/buddy_wake_events');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting buddy wake events:', error);
    return [];
  }
}

export async function getBuddyAlarms(): Promise<BuddyAlarm[]> {
  try {
    const data = await AsyncStorage.getItem('@snoozer/buddy_alarms');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting buddy alarms:', error);
    return [];
  }
}

export async function getShameContacts(): Promise<ShameContact[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SHAME_CONTACTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting shame contacts:', error);
    return [];
  }
}

export async function saveShameContacts(contacts: ShameContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SHAME_CONTACTS, JSON.stringify(contacts));
  } catch (error) {
    console.error('Error saving shame contacts:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT PUNISHMENT SETTINGS
// ═══════════════════════════════════════════════════════════════

export async function getDefaultPunishments(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.DEFAULT_PUNISHMENTS);
    return data ? JSON.parse(data) : ['shame_video'];
  } catch (error) {
    console.error('Error getting default punishments:', error);
    return ['shame_video'];
  }
}

export async function saveDefaultPunishments(punishments: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DEFAULT_PUNISHMENTS, JSON.stringify(punishments));
  } catch (error) {
    console.error('Error saving default punishments:', error);
  }
}

// Punishment configuration for punishments that need setup
export interface PunishmentConfig {
  email_boss?: {
    bossEmail: string;
  };
  // Future punishments can add their config here
}

export async function getPunishmentConfig(): Promise<PunishmentConfig> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PUNISHMENT_CONFIG);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting punishment config:', error);
    return {};
  }
}

export async function savePunishmentConfig(config: PunishmentConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.PUNISHMENT_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving punishment config:', error);
  }
}

export async function getDefaultAmount(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(KEYS.DEFAULT_AMOUNT);
    return data ? parseInt(data, 10) : 5;
  } catch (error) {
    console.error('Error getting default amount:', error);
    return 5;
  }
}

export async function saveDefaultAmount(amount: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DEFAULT_AMOUNT, amount.toString());
  } catch (error) {
    console.error('Error saving default amount:', error);
  }
}

export { KEYS };
