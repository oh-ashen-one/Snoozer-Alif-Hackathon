# Snoozer - Alarm App

## Overview
Snoozer is a React Native alarm app that combats snoozing through accountability. Users set alarms with reference photos (proof locations) and shame videos that play at max volume if they snooze.

## Project Structure
```
client/
├── App.tsx                           # Main entry point
├── components/
│   ├── Button.tsx                    # Animated button component
│   ├── Card.tsx                      # Card component
│   ├── Toggle.tsx                    # Toggle switch
│   ├── HeaderTitle.tsx               # Custom header with icon
│   ├── ThemedText.tsx                # Themed text component
│   ├── ThemedView.tsx                # Themed view component
│   ├── ErrorBoundary.tsx             # Error boundary
│   └── KeyboardAwareScrollViewCompat.tsx
├── constants/
│   └── theme.ts                      # Design tokens (colors, spacing, typography)
├── hooks/
│   ├── useAlarms.ts                  # Alarm state management
│   ├── useTheme.ts                   # Theme hook
│   └── useScreenOptions.ts           # Navigation screen options
├── navigation/
│   └── RootStackNavigator.tsx        # Main navigation
├── screens/
│   ├── HomeScreen.tsx                # Alarm list
│   ├── AddAlarmScreen.tsx            # Create alarm
│   ├── ReferencePhotoScreen.tsx      # Take reference photo
│   ├── RecordShameScreen.tsx         # Record shame video
│   ├── OnboardingCompleteScreen.tsx  # Setup complete
│   ├── AlarmRingingScreen.tsx        # When alarm fires
│   ├── ProofCameraScreen.tsx         # Take proof photo
│   └── ShamePlaybackScreen.tsx       # Play shame video
├── utils/
│   ├── storage.ts                    # AsyncStorage helpers
│   ├── notifications.ts              # Alarm scheduling
│   └── fileSystem.ts                 # Photo/video storage
└── lib/
    └── query-client.ts               # React Query setup
```

## Navigation Flow
1. **First launch**: AddAlarm → ReferencePhoto → RecordShame → OnboardingComplete → Home
2. **Normal launch**: Home (alarm list)
3. **Alarm fires**: AlarmRinging → ProofCamera (dismiss) OR ShamePlayback (snooze) → AlarmRinging

## Key Features
- Create alarms with time and label
- Take reference photo for proof location
- Record shame video (max 30s)
- Local notifications for alarm scheduling
- Proof photo required to dismiss alarm
- Shame video plays at max volume on snooze

## Design System
- **Background**: `#0C0A09` (near-black)
- **Card**: `#141211` (elevated black)
- **Elevated**: `#1C1917` (lighter elevated)
- **Border**: `#292524` (subtle divider)
- **Text**: `#FAFAF9` (off-white)
- **Orange**: `#FB923C` (primary action)
- **Green**: `#22C55E` (success/dismiss)
- **Red**: `#EF4444` (danger/snooze)

## Running the App
- **Frontend**: `npm run expo:dev` (port 8081)
- **Backend**: `npm run server:dev` (port 5000) - not required for core functionality

## Dependencies
- expo-camera (photos and video)
- expo-av (video playback)
- expo-notifications (alarm scheduling)
- expo-file-system (file storage)
- @react-native-async-storage/async-storage (data persistence)
- @react-navigation/native-stack (navigation)

## User Preferences
- Dark theme only (forced dark mode)
- No emojis in UI
- Feather icons from @expo/vector-icons
