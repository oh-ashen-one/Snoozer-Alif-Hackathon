import AsyncStorage from '@react-native-async-storage/async-storage';

const WAKE_LOG_KEY = '@snoozer/wake_log';
const PUNISHMENT_AMOUNT = 2; // Default $2 per snooze

export interface WakeLogEntry {
  date: string;
  alarmId: string;
  wokeAt: string;
  snoozed: boolean;
  snoozeCount?: number;
}

export interface MonthStats {
  wakeUps: number;
  snoozes: number;
  savedMoney: number;
  lostMoney: number;
}

export interface DayStatus {
  date: string;
  dayOfWeek: string;
  status: 'success' | 'fail' | 'none';
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

async function getWakeLog(): Promise<WakeLogEntry[]> {
  try {
    const data = await AsyncStorage.getItem(WAKE_LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[Tracking] Error reading wake log:', error);
    return [];
  }
}

async function saveWakeLog(log: WakeLogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(WAKE_LOG_KEY, JSON.stringify(log));
  } catch (error) {
    console.error('[Tracking] Error saving wake log:', error);
  }
}

export async function logWakeUp(
  alarmId: string,
  timestamp: Date,
  snoozed: boolean,
  snoozeCount: number = 0
): Promise<void> {
  const log = await getWakeLog();
  const dateStr = formatDate(timestamp);
  
  const existingIndex = log.findIndex(entry => entry.date === dateStr && entry.alarmId === alarmId);
  
  const entry: WakeLogEntry = {
    date: dateStr,
    alarmId,
    wokeAt: formatTime(timestamp),
    snoozed,
    snoozeCount: snoozed ? (snoozeCount || 1) : 0,
  };

  if (existingIndex >= 0) {
    log[existingIndex] = entry;
  } else {
    log.unshift(entry);
  }

  await saveWakeLog(log);
}

export async function getWakeUpHistory(days: number): Promise<WakeLogEntry[]> {
  const log = await getWakeLog();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = formatDate(cutoffDate);
  
  return log.filter(entry => entry.date >= cutoffStr);
}

export async function getCurrentStreak(): Promise<number> {
  const log = await getWakeLog();
  if (log.length === 0) return 0;

  const sortedLog = [...log].sort((a, b) => b.date.localeCompare(a.date));
  
  let streak = 0;
  const today = new Date();
  let currentDate = new Date(today);
  
  for (let i = 0; i < 365; i++) {
    const dateStr = formatDate(currentDate);
    const dayEntry = sortedLog.find(entry => entry.date === dateStr);
    
    if (dayEntry) {
      if (dayEntry.snoozed) {
        break;
      }
      streak++;
    } else if (i > 0) {
      break;
    }
    
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
}

export async function getBestStreak(): Promise<number> {
  const log = await getWakeLog();
  if (log.length === 0) return 0;

  const sortedLog = [...log].sort((a, b) => a.date.localeCompare(b.date));
  
  let bestStreak = 0;
  let currentStreak = 0;
  
  for (const entry of sortedLog) {
    if (!entry.snoozed) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return bestStreak;
}

export async function getMonthStats(): Promise<MonthStats> {
  const log = await getWakeLog();
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffStr = formatDate(thirtyDaysAgo);
  
  const monthLog = log.filter(entry => entry.date >= cutoffStr);
  
  let wakeUps = 0;
  let snoozes = 0;
  let totalSnoozeCount = 0;
  
  for (const entry of monthLog) {
    if (entry.snoozed) {
      snoozes++;
      totalSnoozeCount += entry.snoozeCount || 1;
    } else {
      wakeUps++;
    }
  }
  
  return {
    wakeUps,
    snoozes,
    savedMoney: wakeUps * PUNISHMENT_AMOUNT,
    lostMoney: totalSnoozeCount * PUNISHMENT_AMOUNT,
  };
}

export async function getWeekData(): Promise<DayStatus[]> {
  const log = await getWakeLog();
  const weekData: DayStatus[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    const dayOfWeek = dayNames[date.getDay()];
    
    const dayEntry = log.find(entry => entry.date === dateStr);
    
    let status: 'success' | 'fail' | 'none' = 'none';
    if (dayEntry) {
      status = dayEntry.snoozed ? 'fail' : 'success';
    }
    
    weekData.push({
      date: dateStr,
      dayOfWeek,
      status,
    });
  }
  
  return weekData;
}

export async function clearTrackingData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WAKE_LOG_KEY);
  } catch (error) {
    console.error('[Tracking] Error clearing tracking data:', error);
  }
}

export async function getWeekStats(): Promise<MonthStats> {
  const log = await getWakeLog();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffStr = formatDate(sevenDaysAgo);
  
  const weekLog = log.filter(entry => entry.date >= cutoffStr);
  
  let wakeUps = 0;
  let snoozes = 0;
  let totalSnoozeCount = 0;
  
  for (const entry of weekLog) {
    if (entry.snoozed) {
      snoozes++;
      totalSnoozeCount += entry.snoozeCount || 1;
    } else {
      wakeUps++;
    }
  }
  
  return {
    wakeUps,
    snoozes,
    savedMoney: wakeUps * PUNISHMENT_AMOUNT,
    lostMoney: totalSnoozeCount * PUNISHMENT_AMOUNT,
  };
}

export async function getYearStats(): Promise<MonthStats> {
  const log = await getWakeLog();
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const cutoffStr = formatDate(yearAgo);
  
  const yearLog = log.filter(entry => entry.date >= cutoffStr);
  
  let wakeUps = 0;
  let snoozes = 0;
  let totalSnoozeCount = 0;
  
  for (const entry of yearLog) {
    if (entry.snoozed) {
      snoozes++;
      totalSnoozeCount += entry.snoozeCount || 1;
    } else {
      wakeUps++;
    }
  }
  
  return {
    wakeUps,
    snoozes,
    savedMoney: wakeUps * PUNISHMENT_AMOUNT,
    lostMoney: totalSnoozeCount * PUNISHMENT_AMOUNT,
  };
}
