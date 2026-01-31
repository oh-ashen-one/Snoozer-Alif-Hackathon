# Snoozer Design Guidelines

## Brand Identity
**Concept**: A brutally honest alarm app that uses accountability (reference photos) and social pressure (shame videos) to combat snoozing. The aesthetic is stark, unapologetic, and slightly intimidating—this app means business about waking you up.

**Visual Direction**: Dark brutalist with aggressive orange accents. High contrast, maximum legibility, zero comfort. The UI should feel like it won't let you off easy.

**Memorable Element**: The shame video playback at MAX volume when you snooze—unforgiving and impossible to ignore.

## Navigation Architecture
**Type**: Stack-only navigation (linear onboarding, then home-based stack)

**Screens**:
1. **Onboarding Flow** (first launch only):
   - AddAlarmScreen → ReferencePhotoScreen → RecordShameScreen → OnboardingCompleteScreen → HomeScreen
2. **Normal Launch**: HomeScreen (list of alarms)
3. **Alarm Triggered**: AlarmRingingScreen → ProofCameraScreen (dismiss) OR ShamePlaybackScreen (snooze) → back to AlarmRingingScreen

## Color Palette
Use EXACT values from theme.js:
- **Background**: `#0C0A09` (near-black)
- **Card Background**: `#141211` (elevated black)
- **Elevated Surface**: `#1C1917` (lighter elevated)
- **Border**: `#292524` (subtle divider)
- **Text Primary**: `#FAFAF9` (off-white)
- **Text Secondary**: `#A8A29E` (muted gray)
- **Text Muted**: `#78716C` (de-emphasized)
- **Primary/Action**: `#FB923C` (orange—urgent, attention-grabbing)
- **Success**: `#22C55E` (green—alarm dismissed)
- **Danger**: `#EF4444` (red—snooze warning)

## Typography
- **Font**: System default (SF Pro iOS, Roboto Android)
- **Scale**:
  - Heading 1: 32px, Bold, text color
  - Heading 2: 24px, Bold, text color
  - Body: 16px, Regular, text color
  - Caption: 14px, Regular, textSecondary
  - Label: 12px, Medium, textMuted

## Screen Specifications

### HomeScreen
- **Purpose**: View and manage all alarms
- **Header**: Custom transparent, title "Snoozer", right button "+" (orange) to add alarm
- **Layout**: 
  - Safe area: top: headerHeight + 24px, bottom: insets.bottom + 24px
  - ScrollView if alarms exist, centered empty state if none
- **Empty State**: "No alarms set" message with "Create Your First Alarm" button (orange, full-width)
- **Alarm Cards** (if exists): bgCard background, each shows time (Heading 1), toggle (green when active), label (textSecondary)

### AddAlarmScreen (Onboarding & standalone)
- **Purpose**: Set alarm time and label
- **Header**: Default, title "Set Alarm", left: "Cancel" (if not onboarding), right: "Next" (orange, disabled until time set)
- **Layout**: Scrollable form, safe area: top: 24px, bottom: insets.bottom + 24px
- **Components**: Time picker (native), text input for label (placeholder: "Wake up"), explainer text (textMuted): "You'll take a reference photo and record a shame video next"

### ReferencePhotoScreen
- **Purpose**: Capture reference photo for proof verification
- **Header**: Title "Reference Photo", right: "Next" (orange, disabled until photo taken)
- **Layout**: Camera preview full-screen, capture button centered bottom (70px circle, orange background)
- **Safe Area**: Top: insets.top + 24px, bottom: insets.bottom + 100px
- **Instructions** (overlay top): "Take a photo of where you'll dismiss the alarm" (text, semi-transparent bgCard background)
- **Preview**: After capture, show thumbnail top-right with "Retake" option

### RecordShameScreen
- **Purpose**: Record shame video played when snoozed
- **Header**: Title "Shame Video", right: "Next" (orange, disabled until recorded)
- **Layout**: Camera preview (selfie mode), record button centered bottom (70px circle, red when recording, orange when idle)
- **Instructions**: "Record what you'll see if you snooze. Make it embarrassing." (textMuted)
- **Timer**: Show recording duration (Caption, orange) during recording
- **Preview**: After recording, show playback controls to review/retake

### OnboardingCompleteScreen
- **Purpose**: Confirm setup complete
- **Header**: None
- **Layout**: Centered content, safe area: top/bottom: insets + 48px
- **Content**: "You're All Set" (Heading 1), "Your alarm is active. Don't snooze." (Body, textSecondary), "Done" button (orange, full-width) to navigate to Home

### AlarmRingingScreen
- **Purpose**: Triggered when alarm fires
- **Header**: None
- **Layout**: Full-screen, safe area: all edges insets + 24px
- **Content**: 
  - Current time (Heading 1, centered)
  - Alarm label (Body, textSecondary, centered)
  - "Dismiss" button (green, large, full-width)
  - "Snooze" button (red, smaller, full-width, below dismiss, Warning text: "This will play your shame video")

### ProofCameraScreen
- **Purpose**: Take photo matching reference to dismiss alarm
- **Header**: Title "Prove You're Awake"
- **Layout**: Split screen—top: reference photo thumbnail, bottom: live camera preview
- **Safe Area**: Top: headerHeight + 24px, bottom: insets.bottom + 100px
- **Capture Button**: Centered bottom (70px, green)
- **Instructions**: "Match your reference photo" (textMuted)

### ShamePlaybackScreen
- **Purpose**: Play shame video at max volume (punishment for snoozing)
- **Header**: None
- **Layout**: Full-screen video player, no controls, auto-plays at MAX volume
- **Safe Area**: None (immersive)
- **Dismiss**: Video plays once, then auto-returns to AlarmRingingScreen
- **Overlay**: "You Snoozed" (Heading 2, red, top center) during playback

## Components

### Button
- **Default**: bgElevated background, text color, 16px padding vertical, 24px horizontal, 12px border radius
- **Primary**: orange background, bgCard text (inverted)
- **Danger**: red background, bgCard text
- **Success**: green background, bgCard text
- **Pressed State**: Reduce opacity to 0.7

### Card
- **Style**: bgCard background, border color 1px border, 16px border radius, 16px padding
- **Pressed**: bgElevated background

### Toggle
- **Inactive**: border background, textMuted thumb
- **Active**: green background, text (white) thumb

## Assets to Generate

1. **icon.png** - App icon showing stylized alarm clock with orange accent, dark background. WHERE USED: Device home screen
2. **splash-icon.png** - Simplified alarm icon on dark background. WHERE USED: App launch screen
3. **empty-alarms.png** - Minimalist illustration of sleeping person with crossed-out snooze button (orange accent). WHERE USED: HomeScreen empty state
4. **onboarding-reference.png** - Simple icon of camera with checkmark. WHERE USED: ReferencePhotoScreen instructions
5. **onboarding-shame.png** - Simple icon of video camera with warning symbol. WHERE USED: RecordShameScreen instructions

## Visual Design Principles
- **Touchable Feedback**: All buttons reduce opacity to 0.7 when pressed
- **Icons**: Use Feather icons from @expo/vector-icons (no emojis)
- **Shadows**: Only on floating action buttons (capture/record buttons): shadowOffset {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2
- **Borders**: Use border color for all dividers and card outlines
- **Contrast**: Maintain high contrast for accessibility—this app needs to be legible when you're groggy