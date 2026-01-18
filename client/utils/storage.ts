import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const KEYS = {
  ALARMS: '@snoozer/alarms',
  ONBOARDED: '@snoozer/onboarded',
  REFERENCE_PHOTO: '@snoozer/reference_photo',
  SHAME_VIDEO: '@snoozer/shame_video',
  PROOF_ACTIVITY: '@snoozer/proof_activity',
};

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

export { KEYS };
