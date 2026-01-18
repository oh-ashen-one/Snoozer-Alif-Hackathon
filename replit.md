# REPLIT.md — Snoozer Development Rules

## PROJECT CONTEXT
Accountability alarm app. Core loop: alarm rings → take proof photo in bathroom → dismiss. If snooze → shame video plays at max volume.

Tech: Expo (React Native), speed > perfection.

---

## DESIGN TOKENS — USE EXACTLY

```
bg: #0C0A09
bgCard: #141211
bgElevated: #1C1917
border: #292524
text: #FAFAF9
textSecondary: #A8A29E
textMuted: #78716C
orange: #FB923C
green: #22C55E
red: #EF4444
spacing: 4/8/12/16/24/32/48
radius: 6/10/14/16/20/100(pill)
```

---

## UI DO's ✅

### Screen Structure
- SafeAreaView wrapper on every screen
- backgroundColor: #0C0A09
- 24px horizontal padding
- Bottom CTA: 24px padding, 48px paddingBottom

### Cards
- backgroundColor: #1C1917
- borderRadius: 16
- borderWidth: 1
- borderColor: #292524
- padding: 16

### Primary Buttons (MUST HAVE GLOW)
- backgroundColor: #FB923C (or #22C55E for confirm)
- borderRadius: 14
- paddingVertical: 18
- paddingHorizontal: 24
- shadowColor: same as bg color
- shadowOffset: { width: 0, height: 4 }
- shadowOpacity: 0.3
- shadowRadius: 24
- elevation: 8

### Secondary Buttons
- backgroundColor: transparent
- borderRadius: 14
- borderWidth: 1
- borderColor: #292524
- paddingVertical: 16

### Toggle Switch
- width: 52, height: 32, borderRadius: 16
- ON: backgroundColor #22C55E
- OFF: backgroundColor #292524
- Knob: 26x26, white, animated translateX

### Day Pills
- Unselected: #141211 bg, #57534E text
- Selected: rgba(251,146,60,0.15) bg, rgba(251,146,60,0.3) border, #FB923C text

### Active Badge
- Pill shape with green dot
- rgba(34,197,94,0.1) bg
- 8px pulsing green dot
- "Active" in #22C55E

### Visual Hierarchy
- ONE primary action per screen
- Primary button at bottom, big and glowing
- Secondary actions: outlined or smaller
- Destructive actions: small, require confirmation

### Touch Targets
- Minimum 44x44 for all interactive elements
- Buttons: 48-56px height

---

## UI DON'Ts ❌

### Colors
- ❌ Pure black #000000 — use #0C0A09
- ❌ Pure white backgrounds
- ❌ Blue/purple gradients
- ❌ More than 3 accent colors per screen
- ❌ Evenly distributed colors

### Typography
- ❌ Inter, Roboto, Arial fonts
- ❌ More than 2 font weights per screen
- ❌ Centered body text
- ❌ Line height under 1.4

### Layout
- ❌ Buttons touching screen edges
- ❌ Buttons without glow on primary actions
- ❌ Touch targets under 44x44
- ❌ Nested ScrollViews
- ❌ No padding on cards

### Code
- ❌ Inline styles repeated — use StyleSheet.create
- ❌ Hardcoded colors — use constants
- ❌ Magic numbers — use spacing scale
- ❌ Anonymous functions as props

---

## CODE DO's ✅

### File Structure
```
client/
  /screens
  /components
  /hooks
  /utils
  /constants
```

### StyleSheet Pattern
Always use StyleSheet.create, never inline:
```jsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A09',
  },
});
```

### Storage Keys
```jsx
const KEYS = {
  ALARMS: '@snoozer/alarms',
  ONBOARDED: '@snoozer/onboarded',
  REFERENCE_PHOTO: '@snoozer/reference_photo',
  SHAME_VIDEO: '@snoozer/shame_video',
};
```

### Camera Pattern
```jsx
const cameraRef = useRef(null);
const photo = await cameraRef.current.takePictureAsync({
  quality: 0.7,
  base64: false,
  skipProcessing: true,
});
```

### Audio (MUST PLAY IN SILENT MODE)
```jsx
await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
});
```

---

## CODE DON'Ts ❌

- ❌ console.log in production
- ❌ Hardcoded storage keys
- ❌ Missing try/catch on async
- ❌ Components over 200 lines
- ❌ useEffect without dependency array
- ❌ FlatList without keyExtractor
- ❌ Anonymous functions as props

---

## DEBUGGING RULES

When running into an issue or trying to fix something:

**Enable forensic-level logging for this issue, and anything adjacent to it. We will no longer guess; we will use verbose logs to isolate the issue and make a targeted fix.**

### Debugging Protocol
1. Add `if (__DEV__) console.log('[ComponentName] action:', data)` at every relevant step
2. Log inputs, outputs, and state changes
3. Log before AND after async operations
4. Include timestamps for timing-sensitive issues
5. Never remove debug logs until the issue is confirmed fixed
6. Use descriptive prefixes: `[AlarmRinging]`, `[ProofCamera]`, `[Storage]`, etc.

---

## SCREEN SPECS

### HomeScreen
- Header: greeting left, settings button right
- Next alarm card: big time, countdown in orange, stakes preview
- Alarm list: time, label, day pills, toggle
- Empty state with icon and CTA

### AddAlarmScreen
- Progress indicator
- Title + subtitle
- Time picker: native DateTimePicker
- Label input
- Continue button with orange glow

### ReferencePhotoScreen
- Progress indicator
- Title + subtitle
- Camera with guide overlay
- Capture button (orange)
- Preview with retake option

### RecordShameScreen
- Front camera (selfie mode)
- Red record button when recording
- Timer display
- Preview → Retake/Use This

### AlarmRingingScreen
- Full screen takeover
- Time huge (72px)
- Green dismiss button (requires proof)
- Small red snooze button (triggers shame video)

### ProofCameraScreen
- Camera with reference photo overlay
- Capture button (green)
- Dismisses alarm on capture

### ShamePlaybackScreen
- Full screen video
- Max volume, can't skip
- Returns to AlarmRinging after

### OnboardingCompleteScreen
- Success animation
- "You're All Set" message
- Done button to home

---

## NAVIGATION FLOW

1. First launch: AddAlarm → ReferencePhoto → RecordShame → OnboardingComplete → Home
2. Normal launch: Home (alarm list)
3. Alarm fires: AlarmRinging → ProofCamera (dismiss) OR ShamePlayback (snooze) → AlarmRinging

---

## V1 SCOPE

**IN:** alarm, reference photo, shame video, proof dismiss, snooze punishment, data persistence

**OUT:** buddy system, payments, external integrations, stats, streaks, AI matching

---

## PRIORITY

1. Alarm fires
2. Camera works
3. Video plays
4. Data persists
5. Looks good

**Working ugly > Beautiful broken**

---

## RUNNING THE APP

- **Frontend**: `npm run expo:dev` (port 8081)
- **Backend**: `npm run server:dev` (port 5000)

## DEPENDENCIES

- expo-camera (photos and video)
- expo-av (video playback)
- expo-notifications (alarm scheduling)
- expo-file-system (file storage)
- @react-native-async-storage/async-storage (data persistence)
- @react-navigation/native-stack (navigation)
- @react-native-community/datetimepicker (time picker)
