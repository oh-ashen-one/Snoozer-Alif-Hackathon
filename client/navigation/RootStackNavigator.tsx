import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import IntroScreen from '@/screens/IntroScreen';
import HomeScreen from '@/screens/HomeScreen';
import AddAlarmScreen from '@/screens/AddAlarmScreen';
import ReferencePhotoScreen from '@/screens/ReferencePhotoScreen';
import ProofSetupScreen from '@/screens/ProofSetupScreen';
import RecordShameScreen from '@/screens/RecordShameScreen';
import OnboardingCompleteScreen from '@/screens/OnboardingCompleteScreen';
import AlarmRingingScreen from '@/screens/AlarmRingingScreen';
import ProofCameraScreen from '@/screens/ProofCameraScreen';
import StepMissionScreen from '@/screens/StepMissionScreen';
import MathProofScreen from '@/screens/MathProofScreen';
import StretchProofScreen from '@/screens/StretchProofScreen';
import ShamePlaybackScreen from '@/screens/ShamePlaybackScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import StatsScreen from '@/screens/StatsScreen';
import BuddyScreen from '@/screens/BuddyScreen';
import BuddySetupScreen from '@/screens/BuddySetupScreen';
import InviteScreen from '@/screens/InviteScreen';
import WaitingForBuddyScreen from '@/screens/WaitingForBuddyScreen';
import BuddyJoinedScreen from '@/screens/BuddyJoinedScreen';
import BuddyDashboardScreen from '@/screens/BuddyDashboardScreen';
import BuddyLeaderboardScreen from '@/screens/BuddyLeaderboardScreen';
import BuddySettingsScreen from '@/screens/BuddySettingsScreen';
import HelpScreen from '@/screens/HelpScreen';
import NotificationSetupScreen from '@/screens/NotificationSetupScreen';
import LegalScreen from '@/screens/LegalScreen';
import WakeUpSuccessScreen from '@/screens/WakeUpSuccessScreen';
import PaymentSettingsScreen from '@/screens/PaymentSettingsScreen';
import SplashLoadingScreen from '@/screens/SplashLoadingScreen';
import ShameSentScreen from '@/screens/ShameSentScreen';
import AlarmSoundScreen from '@/screens/AlarmSoundScreen';
import JoinCodeScreen from '@/screens/JoinCodeScreen';
import InviteBuddyScreen from '@/screens/InviteBuddyScreen';
import PunishmentsScreen from '@/screens/PunishmentsScreen';
import AcceptInviteScreen from '@/screens/AcceptInviteScreen';
import PunishmentExecutionScreen from '@/screens/PunishmentExecutionScreen';
import { HeaderTitle } from '@/components/HeaderTitle';
import { useScreenOptions } from '@/hooks/useScreenOptions';
import { Colors } from '@/constants/theme';

export type RootStackParamList = {
  SplashLoading: undefined;
  Intro: undefined;
  Onboarding: { shameVideoUri?: string } | undefined;
  Home: undefined;
  Settings: undefined;
  Stats: undefined;
  Buddy: undefined;
  BuddySetup: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity' };
  Invite: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity'; buddyName?: string };
  WaitingForBuddy: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity'; isHost: boolean; code: string; buddyName: string };
  BuddyJoined: { mode: '1v1' | 'group' | 'survivor' | 'accountability' | 'charity'; buddyName: string; stakes: string };
  BuddyDashboard: undefined;
  BuddyLeaderboard: undefined;
  BuddySettings: undefined;
  AcceptInvite: { code: string };
  JoinCode: undefined;
  InviteBuddyiMessage: {
    returnTo?: string;
  };
  Punishments: undefined;
  Help: undefined;
  NotificationSetup: undefined;
  Legal: { type: 'terms' | 'privacy' };
  PaymentMethod: undefined;
  AlarmSound: undefined;
  WakeUpSuccess: {
    streak: number;
    moneySaved: number;
    wakeUpRate: number;
    wakeTime: string;
    targetTime: string;
  };
  AddAlarm: { isOnboarding: boolean; editAlarmId?: string };
  ReferencePhoto: {
    alarmTime: string;
    alarmLabel: string;
    isOnboarding: boolean;
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
  };
  ProofSetup: {
    alarmTime: string;
    alarmLabel: string;
    isOnboarding: boolean;
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
    // New per-alarm settings
    proofActivityType?: 'photo_activity' | 'steps' | 'math' | 'type_phrase' | 'stretch';
    activityName?: string;
    moneyEnabled?: boolean;
    shameVideoEnabled?: boolean;
    buddyNotifyEnabled?: boolean;
    socialShameEnabled?: boolean;
    antiCharityEnabled?: boolean;
    escalatingVolume?: boolean;
    wakeRecheck?: boolean;
  };
  RecordShame: {
    alarmTime: string;
    alarmLabel: string;
    referencePhotoUri: string;
    isOnboarding: boolean;
    returnTo?: 'Onboarding';  // Return to onboarding after recording
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
    // New per-alarm settings
    proofActivityType?: 'photo_activity' | 'steps' | 'math' | 'type_phrase' | 'stretch';
    activityName?: string;
    moneyEnabled?: boolean;
    shameVideoEnabled?: boolean;
    buddyNotifyEnabled?: boolean;
    socialShameEnabled?: boolean;
    antiCharityEnabled?: boolean;
    escalatingVolume?: boolean;
    wakeRecheck?: boolean;
  };
  OnboardingComplete: {
    alarmTime: string;
    alarmLabel: string;
    referencePhotoUri: string;
    shameVideoUri: string;
    punishment?: number;
    extraPunishments?: string[];
    days?: number[];
    // New per-alarm settings
    proofActivityType?: 'photo_activity' | 'steps' | 'math' | 'type_phrase' | 'stretch';
    activityName?: string;
    moneyEnabled?: boolean;
    shameVideoEnabled?: boolean;
    buddyNotifyEnabled?: boolean;
    socialShameEnabled?: boolean;
    antiCharityEnabled?: boolean;
    escalatingVolume?: boolean;
    wakeRecheck?: boolean;
  };
  AlarmRinging: {
    alarmId: string;
    alarmLabel: string;
    referencePhotoUri: string;
    shameVideoUri: string;
    showPaymentPrompt?: boolean;
  };
  ProofCamera: {
    alarmId: string;
    referencePhotoUri: string;
    activityName?: string;
  };
  StepMission: {
    alarmId: string;
    referencePhotoUri: string;
    onComplete: 'ProofCamera' | 'Home';
    stepGoal?: number;
  };
  MathProof: {
    alarmId: string;
  };
  StretchProof: {
    alarmId: string;
  };
  ShamePlayback: {
    alarmId: string;
    shameVideoUri: string;
    alarmLabel: string;
    referencePhotoUri: string;
    showPaymentAfter?: boolean;
    buddyPhone?: string;
  };
  ShameSent: {
    buddyName: string;
    amount: number;
    currentTime: string;
    previousStreak: number;
    executedPunishments: string[];
    moneyEnabled: boolean;
  };
  PunishmentExecution: {
    alarmId: string;
    alarmLabel: string;
    punishmentTypes: string[];
    moneyEnabled: boolean;
    moneyAmount: number;
    shameVideoUri?: string;
    config?: {
      bossEmail?: string;
      momPhone?: string;
      grandmaPhone?: string;
      buddyPhone?: string;
      wifesDadPhone?: string;
      exPhone?: string;
    };
    wasForceClose?: boolean; // True if user force-closed app during alarm
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      initialRouteName="SplashLoading"
      screenOptions={{
        ...screenOptions,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'fade_from_bottom',
        animationDuration: 250,
      }}
    >
      <Stack.Screen
        name="SplashLoading"
        component={SplashLoadingScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
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
        name="BuddyDashboard"
        component={BuddyDashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Your Buddy" />,
        }}
      />
      <Stack.Screen
        name="BuddyLeaderboard"
        component={BuddyLeaderboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Leaderboard" />,
        }}
      />
      <Stack.Screen
        name="BuddySettings"
        component={BuddySettingsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Buddy Settings" />,
        }}
      />
      <Stack.Screen
        name="AcceptInvite"
        component={AcceptInviteScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="JoinCode"
        component={JoinCodeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="InviteBuddyiMessage"
        component={InviteBuddyScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Punishments"
        component={PunishmentsScreen}
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
        name="ProofSetup"
        component={ProofSetupScreen}
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
        name="StepMission"
        component={StepMissionScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="MathProof"
        component={MathProofScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="StretchProof"
        component={StretchProofScreen}
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
        name="ShameSent"
        component={ShameSentScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="PunishmentExecution"
        component={PunishmentExecutionScreen}
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
        name="NotificationSetup"
        component={NotificationSetupScreen}
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
      <Stack.Screen
        name="PaymentMethod"
        component={PaymentSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AlarmSound"
        component={AlarmSoundScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
