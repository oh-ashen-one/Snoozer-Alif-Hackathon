import { Audio } from 'expo-av';

// ═══════════════════════════════════════════════════════════════
// UNSTOPPABLE BACKGROUND AUDIO
// Simple module for playing audio that:
// - Keeps playing when app is backgrounded
// - Plays even on silent mode (iOS)
// - Loops forever until explicitly stopped
// ═══════════════════════════════════════════════════════════════

let alarmSound: Audio.Sound | null = null;

// 1. SETUP - Call once on app start
async function setupAudio(): Promise<void> {
  await Audio.setAudioModeAsync({
    staysActiveInBackground: true,   // Keeps playing when app backgrounded
    playsInSilentModeIOS: true,      // Plays even on silent mode
    allowsRecordingIOS: false,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
}

// 2. START - Loops forever until you stop it
async function startAlarm(soundSource: any): Promise<void> {
  await setupAudio();

  // Stop any existing alarm first
  if (alarmSound) {
    await stopAlarm();
  }

  const { sound } = await Audio.Sound.createAsync(
    soundSource,
    {
      isLooping: true,    // Loops forever
      volume: 1.0,        // Max volume
      shouldPlay: true,   // Starts immediately
    }
  );

  alarmSound = sound;
}

// 3. STOP - Only way to stop it (call when mission complete)
async function stopAlarm(): Promise<void> {
  if (alarmSound) {
    try {
      await alarmSound.stopAsync();
      await alarmSound.unloadAsync();
    } catch (e) {
      // Ignore errors - sound may already be stopped
    }
    alarmSound = null;
  }
}

// 4. CHECK - Is alarm currently playing?
function isAlarmPlaying(): boolean {
  return alarmSound !== null;
}

export { setupAudio, startAlarm, stopAlarm, isAlarmPlaying };
