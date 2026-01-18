import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HeaderButton } from '@react-navigation/elements';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import IntroScreen from '@/screens/IntroScreen';
import HomeScreen from '@/screens/HomeScreen';
import { useAuth } from '@/contexts/AuthContext';
import { getOnboardingComplete } from '@/utils/storage';
import AddAlarmScreen from '@/screens/AddAlarmScreen';
import ReferencePhotoScreen from '@/screens/ReferencePhotoScreen';
import RecordShameScreen from '@/screens/RecordShameScreen';
import OnboardingCompleteScreen from '@/screens/OnboardingCompleteScreen';
import AlarmRingingScreen from '@/screens/AlarmRingingScreen';
import ProofCameraScreen from '@/screens/ProofCameraScreen';
import ShamePlaybackScreen from '@/screens/ShamePlaybackScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import StatsScreen from '@/screens/StatsScreen';
import BuddyScreen from '@/screens/BuddyScreen';
import BuddySetupScreen from '@/screens/BuddySetupScreen';
import InviteScreen from '@/screens/InviteScreen';
import WaitingForBuddyScreen from '@/screens/WaitingForBuddyScreen';
import BuddyJoinedScreen from '@/screens/BuddyJoinedScreen';
import HelpScreen from '@/screens/HelpScreen';
import LegalScreen from '@/screens/LegalScreen';
import WakeUpSuccessScreen from '@/screens/WakeUpSuccessScreen';
import { HeaderTitle } from '@/components/HeaderTitle';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { Colors } from '@/constants/theme';

export type RootStackParamList = {
  Intro: undefined;
  Onboarding: undefined;
  Home: undefined;
  Settings: undefined;
  Stats: undefined;
  Buddy: undefined;
  BuddySetup: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity' };
  Invite: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity'; buddyName?: string };
  WaitingForBuddy: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity'; isHost: boolean; code: string; buddyName: string };
  BuddyJoined: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity'; buddyName: string; stakes: string };
  Help: undefined;
  Legal: { type: 'terms' | 'privacy' };
  WakeUpSuccess: undefined;
  AddAlarm: { isOnboarding: boolean };
  ReferencePhoto: {
    alarmTime: string;
    alarmLabel: string;
    isOnboarding: boolean;
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
  };
  RecordShame: {
    alarmTime: string;
    alarmLabel: string;
    referencePhotoUri: string;
    isOnboarding: boolean;
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
  };
  OnboardingComplete: {
    alarmTime: string;
    alarmLabel: string;
    referencePhotoUri: string;
    shameVideoUri: string;
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
  };
  AlarmRinging: {
    alarmId: string;
    alarmLabel: string;
    referencePhotoUri: string;
    shameVideoUri: string;
  };
  ProofCamera: {
    alarmId: string;
    referencePhotoUri: string;
  };
  ShamePlayback: {
    alarmId: string;
    shameVideoUri: string;
    alarmLabel: string;
    referencePhotoUri: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const determineInitialRoute = async () => {
      if (isLoading) return;

      if (!isAuthenticated) {
        // Not signed in - show intro screen
        setInitialRoute('Intro');
      } else {
        // Signed in - check if onboarding is complete
        try {
          const hasOnboarded = await getOnboardingComplete();
          setInitialRoute(hasOnboarded ? 'Home' : 'Onboarding');
        } catch {
          setInitialRoute('Onboarding');
        }
      }
    };

    determineInitialRoute();
  }, [isAuthenticated, isLoading]);

  // Show loading while determining initial route
  if (isLoading || !initialRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        ...screenOptions,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen
        name="Intro"
        component={IntroScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Buddy"
        component={BuddyScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BuddySetup"
        component={BuddySetupScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Invite"
        component={InviteScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="WaitingForBuddy"
        component={WaitingForBuddyScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BuddyJoined"
        component={BuddyJoinedScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddAlarm"
        component={AddAlarmScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ReferencePhoto"
        component={ReferencePhotoScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecordShame"
        component={RecordShameScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OnboardingComplete"
        component={OnboardingCompleteScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AlarmRinging"
        component={AlarmRingingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="ProofCamera"
        component={ProofCameraScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="ShamePlayback"
        component={ShamePlaybackScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="WakeUpSuccess"
        component={WakeUpSuccessScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
});
