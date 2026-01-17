import { useState, useEffect, useCallback } from 'react';
import { 
  Alarm, 
  getAlarms, 
  saveAlarms, 
  addAlarm as addAlarmToStorage, 
  updateAlarm as updateAlarmInStorage, 
  deleteAlarm as deleteAlarmFromStorage,
  getAlarmById as getAlarmByIdFromStorage,
} from '@/utils/storage';
import { scheduleAlarm, cancelAlarm } from '@/utils/notifications';

export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlarms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedAlarms = await getAlarms();
      setAlarms(loadedAlarms);
    } catch (e) {
      setError('Failed to load alarms');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  const addAlarm = useCallback(async (alarm: Omit<Alarm, 'id' | 'createdAt' | 'notificationId'>) => {
    const newAlarm: Alarm = {
      ...alarm,
      id: Date.now().toString(),
      createdAt: Date.now(),
      notificationId: null,
    };

    try {
      let notificationId: string | null = null;
      if (newAlarm.enabled) {
        notificationId = await scheduleAlarm(newAlarm);
        newAlarm.notificationId = notificationId;
      }
      
      await addAlarmToStorage(newAlarm);
      setAlarms(prev => [...prev, newAlarm]);
      return newAlarm;
    } catch (e) {
      console.error('Error adding alarm:', e);
      throw e;
    }
  }, []);

  const updateAlarm = useCallback(async (id: string, updates: Partial<Alarm>) => {
    try {
      const updatedAlarm = await updateAlarmInStorage(id, updates);
      if (updatedAlarm) {
        setAlarms(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
      }
      return updatedAlarm;
    } catch (e) {
      console.error('Error updating alarm:', e);
      throw e;
    }
  }, []);

  const toggleAlarm = useCallback(async (id: string) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;

    const newEnabled = !alarm.enabled;
    
    try {
      if (alarm.notificationId) {
        await cancelAlarm(alarm.notificationId);
      }

      let notificationId: string | null = null;
      if (newEnabled) {
        notificationId = await scheduleAlarm({ ...alarm, enabled: newEnabled });
      }

      await updateAlarm(id, { enabled: newEnabled, notificationId });
    } catch (e) {
      console.error('Error toggling alarm:', e);
      throw e;
    }
  }, [alarms, updateAlarm]);

  const deleteAlarm = useCallback(async (id: string) => {
    try {
      const alarm = alarms.find(a => a.id === id);
      if (alarm?.notificationId) {
        await cancelAlarm(alarm.notificationId);
      }
      
      await deleteAlarmFromStorage(id);
      setAlarms(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error('Error deleting alarm:', e);
      throw e;
    }
  }, [alarms]);

  const getAlarmById = useCallback((id: string) => {
    return alarms.find(a => a.id === id);
  }, [alarms]);

  return {
    alarms,
    loading,
    error,
    loadAlarms,
    addAlarm,
    updateAlarm,
    toggleAlarm,
    deleteAlarm,
    getAlarmById,
  };
}
