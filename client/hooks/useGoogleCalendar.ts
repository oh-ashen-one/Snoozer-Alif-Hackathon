import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEYS = {
  CALENDAR_ACCESS_TOKEN: '@snoozer/calendar_access_token',
  CALENDAR_REFRESH_TOKEN: '@snoozer/calendar_refresh_token',
  CALENDAR_EXPIRY: '@snoozer/calendar_expiry',
  CALENDAR_CONNECTED: '@snoozer/calendar_connected',
};

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
}

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'snoozer',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code);
    } else if (response?.type === 'error') {
      setError('Failed to connect to Google Calendar');
      if (__DEV__) console.log('[GoogleCalendar] Auth error:', response.error);
    }
  }, [response]);

  const checkConnectionStatus = async () => {
    try {
      const connected = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_CONNECTED);
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_ACCESS_TOKEN);
      const expiry = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_EXPIRY);

      if (connected === 'true' && accessToken) {
        const expiryTime = expiry ? parseInt(expiry, 10) : 0;
        if (Date.now() < expiryTime) {
          setIsConnected(true);
          await fetchTodayEvents(accessToken);
        } else {
          await refreshAccessToken();
        }
      }
    } catch (err) {
      if (__DEV__) console.log('[GoogleCalendar] Error checking status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      setIsLoading(true);
      
      if (!GOOGLE_CLIENT_ID) {
        setError('Google Calendar not configured');
        setIsLoading(false);
        return;
      }

      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: request?.codeVerifier || '',
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        const expiryTime = Date.now() + (tokenData.expires_in * 1000);
        
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.CALENDAR_ACCESS_TOKEN, tokenData.access_token],
          [STORAGE_KEYS.CALENDAR_REFRESH_TOKEN, tokenData.refresh_token || ''],
          [STORAGE_KEYS.CALENDAR_EXPIRY, expiryTime.toString()],
          [STORAGE_KEYS.CALENDAR_CONNECTED, 'true'],
        ]);

        setIsConnected(true);
        await fetchTodayEvents(tokenData.access_token);
        if (__DEV__) console.log('[GoogleCalendar] Connected successfully');
      } else {
        setError('Failed to get access token');
        if (__DEV__) console.log('[GoogleCalendar] Token error:', tokenData);
      }
    } catch (err) {
      setError('Failed to connect');
      if (__DEV__) console.log('[GoogleCalendar] Exchange error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_REFRESH_TOKEN);
      
      if (!refreshToken || !GOOGLE_CLIENT_ID) {
        await disconnect();
        return;
      }

      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.access_token) {
        const expiryTime = Date.now() + (tokenData.expires_in * 1000);
        
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.CALENDAR_ACCESS_TOKEN, tokenData.access_token],
          [STORAGE_KEYS.CALENDAR_EXPIRY, expiryTime.toString()],
        ]);

        setIsConnected(true);
        await fetchTodayEvents(tokenData.access_token);
      } else {
        await disconnect();
      }
    } catch (err) {
      if (__DEV__) console.log('[GoogleCalendar] Refresh error:', err);
      await disconnect();
    }
  };

  const fetchTodayEvents = async (accessToken: string) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const params = new URLSearchParams({
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '5',
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (data.items) {
        const formattedEvents: CalendarEvent[] = data.items.map((item: any) => ({
          id: item.id,
          summary: item.summary || 'Untitled Event',
          start: item.start?.dateTime || item.start?.date || '',
          end: item.end?.dateTime || item.end?.date || '',
          location: item.location,
        }));
        setEvents(formattedEvents);
        if (__DEV__) console.log('[GoogleCalendar] Fetched events:', formattedEvents.length);
      }
    } catch (err) {
      if (__DEV__) console.log('[GoogleCalendar] Fetch events error:', err);
    }
  };

  const connect = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Calendar not configured. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
      return;
    }
    
    setError(null);
    await promptAsync();
  }, [promptAsync]);

  const disconnect = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_ACCESS_TOKEN);
      
      if (accessToken) {
        try {
          await fetch(`${discovery.revocationEndpoint}?token=${accessToken}`, {
            method: 'POST',
          });
        } catch {
          // Revocation might fail, continue with local cleanup
        }
      }

      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CALENDAR_ACCESS_TOKEN,
        STORAGE_KEYS.CALENDAR_REFRESH_TOKEN,
        STORAGE_KEYS.CALENDAR_EXPIRY,
        STORAGE_KEYS.CALENDAR_CONNECTED,
      ]);

      setIsConnected(false);
      setEvents([]);
      setError(null);
      if (__DEV__) console.log('[GoogleCalendar] Disconnected');
    } catch (err) {
      if (__DEV__) console.log('[GoogleCalendar] Disconnect error:', err);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_ACCESS_TOKEN);
      if (accessToken) {
        await fetchTodayEvents(accessToken);
      }
    } catch (err) {
      if (__DEV__) console.log('[GoogleCalendar] Refresh events error:', err);
    }
  }, []);

  return {
    isConnected,
    isLoading,
    events,
    error,
    connect,
    disconnect,
    refreshEvents,
    isConfigured: !!GOOGLE_CLIENT_ID,
  };
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const connected = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_CONNECTED);
    const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_ACCESS_TOKEN);
    
    if (connected !== 'true' || !accessToken) {
      return [];
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const params = new URLSearchParams({
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '3',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (data.items) {
      return data.items.map((item: any) => ({
        id: item.id,
        summary: item.summary || 'Untitled Event',
        start: item.start?.dateTime || item.start?.date || '',
        end: item.end?.dateTime || item.end?.date || '',
        location: item.location,
      }));
    }
  } catch (err) {
    if (__DEV__) console.log('[GoogleCalendar] getCalendarEvents error:', err);
  }
  return [];
}
