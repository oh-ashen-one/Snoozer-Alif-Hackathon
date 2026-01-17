import AsyncStorage from '@react-native-async-storage/async-storage';

const ALARMS_KEY = '@snoozer_alarms';
const ONBOARDING_KEY = '@snoozer_onboarding_complete';

export interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  referencePhotoUri: string | null;
  shameVideoUri: string | null;
  createdAt: number;
}

export async function getAlarms(): Promise<Alarm[]> {
  try {
    const data = await AsyncStorage.getItem(ALARMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting alarms:', error);
    return [];
  }
}

export async function saveAlarms(alarms: Alarm[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
  } catch (error) {
    console.error('Error saving alarms:', error);
  }
}

export async function addAlarm(alarm: Alarm): Promise<void> {
  const alarms = await getAlarms();
  alarms.push(alarm);
  await saveAlarms(alarms);
}

export async function updateAlarm(id: string, updates: Partial<Alarm>): Promise<void> {
  const alarms = await getAlarms();
  const index = alarms.findIndex(a => a.id === id);
  if (index !== -1) {
    alarms[index] = { ...alarms[index], ...updates };
    await saveAlarms(alarms);
  }
}

export async function deleteAlarm(id: string): Promise<void> {
  const alarms = await getAlarms();
  const filtered = alarms.filter(a => a.id !== id);
  await saveAlarms(filtered);
}

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_KEY);
    return data === 'true';
  } catch (error) {
    console.error('Error getting onboarding state:', error);
    return false;
  }
}

export async function setOnboardingComplete(complete: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, complete ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving onboarding state:', error);
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([ALARMS_KEY, ONBOARDING_KEY]);
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}
