import { useState, useEffect, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { Platform, Linking } from 'react-native';

export interface Contact {
  id: string;
  name: string;
  phoneNumbers?: string[];
  emails?: string[];
  imageUri?: string;
}

interface UseContactsResult {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  hasPermission: boolean | null;
  canAskAgain: boolean;
  requestPermission: () => Promise<boolean>;
  refreshContacts: () => Promise<void>;
  openSettings: () => Promise<void>;
}

export function useContacts(): UseContactsResult {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Image,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      const formattedContacts: Contact[] = data
        .filter(contact => contact.name)
        .map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          phoneNumbers: contact.phoneNumbers?.map(p => p.number || '').filter(Boolean),
          emails: contact.emails?.map(e => e.email || '').filter(Boolean),
          imageUri: contact.image?.uri,
        }));

      setContacts(formattedContacts);
      if (__DEV__) console.log('[useContacts] Loaded', formattedContacts.length, 'contacts');
    } catch (err) {
      if (__DEV__) console.error('[useContacts] Error fetching contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      const { status, canAskAgain: canAsk } = await Contacts.getPermissionsAsync();
      setHasPermission(status === 'granted');
      setCanAskAgain(canAsk);
      
      if (status === 'granted') {
        await fetchContacts();
      }
    } catch (err) {
      if (__DEV__) console.error('[useContacts] Error checking permission:', err);
    }
  }, [fetchContacts]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain: canAsk } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';
      
      setHasPermission(granted);
      setCanAskAgain(canAsk);

      if (granted) {
        await fetchContacts();
      }

      return granted;
    } catch (err) {
      if (__DEV__) console.error('[useContacts] Error requesting permission:', err);
      return false;
    }
  }, [fetchContacts]);

  const openSettings = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        await Linking.openSettings();
      }
    } catch (err) {
      if (__DEV__) console.error('[useContacts] Error opening settings:', err);
    }
  }, []);

  const refreshContacts = useCallback(async () => {
    if (hasPermission) {
      await fetchContacts();
    }
  }, [hasPermission, fetchContacts]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    contacts,
    loading,
    error,
    hasPermission,
    canAskAgain,
    requestPermission,
    refreshContacts,
    openSettings,
  };
}
