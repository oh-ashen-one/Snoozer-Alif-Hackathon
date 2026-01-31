import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, Platform, AppState, AppStateStatus } from "react-native";
import { NavigationContainer, NavigationContainerRef, DefaultTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { addNotificationResponseListener, triggerAlarmWithCallKit } from "@/utils/notifications";
import { sendKeepOpenReminder, cancelKeepOpenReminder } from "@/utils/reminderNotification";
import { isAlarmKitAvailable, addAlarmKitListener } from "@/utils/alarmKit";
import { setupCallKit, addCallKitListeners, isCallKitAvailable } from "@/utils/callKitAlarm";
import { getAlarmById } from "@/utils/storage";
import { ensureDirectories } from "@/utils/fileSystem";
import { AuthProvider } from "@/contexts/AuthContext";
import { AlarmProvider } from "@/contexts/AlarmContext";
import { linkingConfig } from "@/utils/linking";

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    primary: '#FB923C',
    background: '#0C0A09',
    card: '#1C1917',
    text: '#FAFAF9',
    border: '#292524',
    notification: '#EF4444',
  },
};

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);
  const notificationReceivedListener = useRef<Notifications.EventSubscription | null>(null);

  const onNavigationReady = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    ensureDirectories();
    
    if (Platform.OS === 'web') {
      return;
    }

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const actionId = response.actionIdentifier;

      if (data?.alarmId && navigationRef.current) {
        const alarmId = data.alarmId as string;
        const alarmLabel = (data.alarmLabel as string) || 'Alarm';

        // Handle notification action buttons
        if (actionId === 'WAKE_UP') {
          // User pressed "I'm Up" - go to proof camera
          navigationRef.current.navigate('ProofCamera', {
            alarmId,
            referencePhotoUri: (data.referencePhotoUri as string) || '',
          });
          return;
        } else if (actionId === 'SNOOZE') {
          // User pressed Snooze - go to alarm ringing (triggers punishment flow)
          navigationRef.current.navigate('AlarmRinging', {
            alarmId,
            alarmLabel,
            referencePhotoUri: (data.referencePhotoUri as string) || '',
            shameVideoUri: (data.shameVideoUri as string) || '',
          });
          return;
        }

        // Default: User tapped the notification body - go to alarm ringing screen
        // Try to trigger CallKit for full-screen UI on iOS
        const callKitTriggered = triggerAlarmWithCallKit(alarmId, alarmLabel);

        // If CallKit not available (Android or fallback), navigate directly
        if (!callKitTriggered) {
          navigationRef.current.navigate('AlarmRinging', {
            alarmId,
            alarmLabel,
            referencePhotoUri: (data.referencePhotoUri as string) || '',
            shameVideoUri: (data.shameVideoUri as string) || '',
          });
        }
      }
    };

    const checkLastNotification = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          handleNotificationResponse(response);
        }
      } catch (error) {
        console.log('getLastNotificationResponse not available on this platform');
      }
    };

    checkLastNotification();

    notificationResponseListener.current = addNotificationResponseListener(handleNotificationResponse);

    // Listen for notifications received while app is in foreground
    // This triggers CallKit for full-screen alarm UI (iOS) or navigates directly (Android/fallback)
    notificationReceivedListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;

      if (data?.alarmId && navigationRef.current) {
        const alarmId = data.alarmId as string;
        const alarmLabel = (data.alarmLabel as string) || 'Alarm';

        // Try to trigger CallKit for full-screen UI on iOS
        const callKitTriggered = triggerAlarmWithCallKit(alarmId, alarmLabel);

        // If CallKit not available (Android or fallback), navigate directly
        if (!callKitTriggered) {
          navigationRef.current.navigate('AlarmRinging', {
            alarmId,
            alarmLabel,
            referencePhotoUri: (data.referencePhotoUri as string) || '',
            shameVideoUri: (data.shameVideoUri as string) || '',
          });
        }
        // If CallKit triggered, the CallKit listener will handle navigation
      }
    });

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
      if (notificationReceivedListener.current) {
        notificationReceivedListener.current.remove();
      }
    };
  }, []);

  // AppState listener for background/foreground reminder notification
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let backgroundTimer: NodeJS.Timeout | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Delay notification to avoid triggering on brief transitions (sign-in, share sheets, etc.)
        backgroundTimer = setTimeout(() => {
          sendKeepOpenReminder();
        }, 5000); // 5 second delay
      } else if (nextAppState === 'active') {
        // App returning to foreground - cancel pending reminder and dismiss any shown
        if (backgroundTimer) {
          clearTimeout(backgroundTimer);
          backgroundTimer = null;
        }
        cancelKeepOpenReminder();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
    };
  }, []);

  // AlarmKit event listener for iOS 26+ native alarms
  useEffect(() => {
    if (!isAlarmKitAvailable()) return;

    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
      unsubscribe = await addAlarmKitListener(async (event) => {
        if (!navigationRef.current) return;

        // Get alarm data from storage
        const alarm = await getAlarmById(event.alarmId);
        if (!alarm) {
          if (__DEV__) console.warn('[AlarmKit] Alarm not found:', event.alarmId);
          return;
        }

        if (event.action === 'stop') {
          // User tapped Stop - navigate to proof camera
          navigationRef.current.navigate('ProofCamera', {
            alarmId: event.alarmId,
            referencePhotoUri: alarm.referencePhotoUri || '',
          });
        } else if (event.action === 'snooze') {
          // User tapped Snooze - navigate to shame playback
          navigationRef.current.navigate('ShamePlayback', {
            alarmId: event.alarmId,
            shameVideoUri: alarm.shameVideoUri || '',
            alarmLabel: alarm.label || 'Alarm',
            referencePhotoUri: alarm.referencePhotoUri || '',
          });
        }
      });
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // CallKit setup and listeners for full-screen alarm UI
  useEffect(() => {
    if (!isCallKitAvailable()) return;

    // Initialize CallKit
    setupCallKit();

    // Add event listeners for user interaction with CallKit UI
    const unsubscribe = addCallKitListeners({
      // User tapped "Accept" on the incoming call UI
      onAnswer: async (alarmId: string) => {
        if (!navigationRef.current) return;

        // Get alarm data from storage
        const alarm = await getAlarmById(alarmId);

        // Navigate to AlarmRinging screen
        navigationRef.current.navigate('AlarmRinging', {
          alarmId,
          alarmLabel: alarm?.label || 'Alarm',
          referencePhotoUri: alarm?.referencePhotoUri || '',
          shameVideoUri: alarm?.shameVideoUri || '',
        });
      },
      // User tapped "Decline" on the incoming call UI - treat as snooze/punishment
      onDecline: async (alarmId: string) => {
        if (!navigationRef.current) return;

        // Get alarm data from storage
        const alarm = await getAlarmById(alarmId);

        // Navigate to ShamePlayback (punishment)
        navigationRef.current.navigate('ShamePlayback', {
          alarmId,
          shameVideoUri: alarm?.shameVideoUri || '',
          alarmLabel: alarm?.label || 'Alarm',
          referencePhotoUri: alarm?.referencePhotoUri || '',
        });
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AlarmProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={styles.root}>
                <KeyboardProvider>
                  <NavigationContainer ref={navigationRef} onReady={onNavigationReady} theme={navTheme} linking={linkingConfig}>
                    <RootStackNavigator />
                  </NavigationContainer>
                  <StatusBar style="light" />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </AlarmProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
