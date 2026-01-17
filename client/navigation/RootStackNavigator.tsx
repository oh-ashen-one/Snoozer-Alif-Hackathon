import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HeaderButton } from '@react-navigation/elements';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import HomeScreen from '@/screens/HomeScreen';
import AddAlarmScreen from '@/screens/AddAlarmScreen';
import ReferencePhotoScreen from '@/screens/ReferencePhotoScreen';
import RecordShameScreen from '@/screens/RecordShameScreen';
import OnboardingCompleteScreen from '@/screens/OnboardingCompleteScreen';
import AlarmRingingScreen from '@/screens/AlarmRingingScreen';
import ProofCameraScreen from '@/screens/ProofCameraScreen';
import ShamePlaybackScreen from '@/screens/ShamePlaybackScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { HeaderTitle } from '@/components/HeaderTitle';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { getOnboardingComplete } from '@/utils/storage';
import { Colors } from '@/constants/theme';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  AddAlarm: { isOnboarding: boolean };
  ReferencePhoto: {
    alarmTime: string;
    alarmLabel: string;
    isOnboarding: boolean;
  };
  RecordShame: {
    alarmTime: string;
    alarmLabel: string;
    referencePhotoUri: string;
    isOnboarding: boolean;
  };
  OnboardingComplete: {
    alarmTime: string;
    alarmLabel: string;
    referencePhotoUri: string;
    shameVideoUri: string;
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
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Always start at Home for now - onboarding can be triggered from there
      setInitialRoute('Home');
    };
    checkOnboarding();
  }, []);

  if (!initialRoute) {
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
        name="AddAlarm"
        component={AddAlarmScreen}
        options={({ route }) => ({
          headerTitle: 'Set Alarm',
          headerBackVisible: !route.params?.isOnboarding,
        })}
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
