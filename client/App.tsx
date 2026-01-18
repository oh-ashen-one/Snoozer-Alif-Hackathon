import React, { useEffect, useRef, useCallback } from "react";
import { StyleSheet, Platform } from "react-native";
import { NavigationContainer, NavigationContainerRef, DefaultTheme } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { addNotificationResponseListener } from "@/utils/notifications";
import { ensureDirectories } from "@/utils/fileSystem";

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
  const notificationResponseListener = useRef<Notifications.EventSubscription>();

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
      
      if (data?.alarmId && navigationRef.current) {
        navigationRef.current.navigate('AlarmRinging', {
          alarmId: data.alarmId as string,
          alarmLabel: (data.alarmLabel as string) || 'Alarm',
          referencePhotoUri: (data.referencePhotoUri as string) || '',
          shameVideoUri: (data.shameVideoUri as string) || '',
        });
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

    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <NavigationContainer ref={navigationRef} onReady={onNavigationReady} theme={navTheme}>
                <RootStackNavigator />
              </NavigationContainer>
              <StatusBar style="light" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
