import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
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
import { isAlarmKitAvailable, requestAlarmKitPermission } from '@/utils/alarmKit';

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
      if (__DEV__) console.error('[useAlarms] Failed to load alarms:', e);
      setError('Failed to load alarms');
      setAlarms([]);
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
      // Request AlarmKit permission on iOS 26+ before scheduling first alarm
      if (isAlarmKitAvailable() && newAlarm.enabled) {
        const alarmKitGranted = await requestAlarmKitPermission();
        if (!alarmKitGranted) {
          Alert.alert(
            'Alarm Permission Required',
            'Snoozer needs permission to schedule alarms that ring even when your phone is on silent or Focus mode. Without this, your alarm may not wake you up reliably.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  try {
                    Linking.openSettings();
                  } catch {}
                },
              },
            ]
          );
          // Continue anyway - will fall back to notifications
        }
      }

      let notificationId: string | null = null;
      if (newAlarm.enabled) {
        notificationId = await scheduleAlarm(newAlarm);
        if (!notificationId && Platform.OS !== 'web') {
          Alert.alert(
            'Notification Permission',
            'Please enable notifications to receive alarm alerts.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  if (Platform.OS !== 'web') {
                    try {
                      Linking.openSettings();
                    } catch {}
                  }
                },
              },
            ]
          );
        }
        newAlarm.notificationId = notificationId;
      }

      await addAlarmToStorage(newAlarm);
      setAlarms(prev => [...prev, newAlarm]);
      if (__DEV__) console.log('[useAlarms] Alarm added:', newAlarm.id);
      return newAlarm;
    } catch (e) {
      if (__DEV__) console.error('[useAlarms] Error adding alarm:', e);
      Alert.alert('Error', 'Failed to save alarm. Please try again.');
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
    try {
      // Get fresh alarm from storage to avoid stale closure issues
      const alarm = await getAlarmByIdFromStorage(id);
      if (!alarm) {
        if (__DEV__) console.log('[useAlarms] Toggle failed - alarm not found:', id);
        return;
      }

      const newEnabled = !alarm.enabled;
      if (__DEV__) console.log('[useAlarms] Toggling alarm:', id, 'from', alarm.enabled, 'to', newEnabled);

      if (alarm.notificationId) {
        await cancelAlarm(alarm.notificationId);
      }

      let notificationId: string | null = null;
      if (newEnabled) {
        // Request AlarmKit permission when enabling alarm on iOS 26+
        if (isAlarmKitAvailable()) {
          await requestAlarmKitPermission();
        }
        notificationId = await scheduleAlarm({ ...alarm, enabled: newEnabled });
      }

      // Update in storage
      const updates = { enabled: newEnabled, notificationId };
      await updateAlarmInStorage(id, updates);

      // RELOAD from storage to ensure state is in sync (prevents race conditions)
      const freshAlarms = await getAlarms();
      setAlarms(freshAlarms);

      if (__DEV__) console.log('[useAlarms] Alarm toggled:', id, 'enabled:', newEnabled, 'total alarms:', freshAlarms.length);
    } catch (e) {
      if (__DEV__) console.error('[useAlarms] Error toggling alarm:', e);
      Alert.alert('Error', 'Failed to update alarm. Please try again.');
    }
  }, []);

  const deleteAlarm = useCallback(async (id: string) => {
    try {
      // Get fresh alarm from storage (not from stale closure)
      const alarm = await getAlarmByIdFromStorage(id);
      if (alarm?.notificationId) {
        await cancelAlarm(alarm.notificationId);
      }

      await deleteAlarmFromStorage(id);

      // RELOAD from storage to ensure state is in sync (prevents race conditions)
      const freshAlarms = await getAlarms();
      setAlarms(freshAlarms);

      if (__DEV__) console.log('[useAlarms] Alarm deleted:', id, 'remaining alarms:', freshAlarms.length);
    } catch (e) {
      console.error('Error deleting alarm:', e);
      throw e;
    }
  }, []);

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
