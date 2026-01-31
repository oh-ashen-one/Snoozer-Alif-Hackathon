import { Audio } from 'expo-av';

/**
 * SOUND PERMISSION SYSTEM
 * ========================
 * Alarm sounds can ONLY play on whitelisted screens:
 * - AlarmRinging (alarm happening)
 * - ShamePlayback (shame video playing)
 * - Settings (for testing sounds)
 * 
 * HomeScreen and all other screens MUST NOT have sounds playing.
 */

/**
 * Allowed screens where alarm sound can play
 */
export const ALLOWED_SOUND_SCREENS = [
  'AlarmRinging',
  'ProofCamera', // Keep sound while taking proof photo
  'ShamePlayback',
  'Settings', // For testing sounds
] as const;

export type AllowedSoundScreen = typeof ALLOWED_SOUND_SCREENS[number];

// Track current screen globally
let currentScreen: string = 'Unknown';

/**
 * Set the current active screen - call this when navigating
 */
export function setCurrentScreen(screenName: string): void {
  currentScreen = screenName;
  if (__DEV__) console.log('[SoundKiller] Current screen set to:', screenName);
  
  // Auto-kill sounds on non-allowed screens
  if (!canPlaySoundNow()) {
    killAllSounds();
  }
}

/**
 * Get the current screen name
 */
export function getCurrentScreen(): string {
  return currentScreen;
}

/**
 * Check if a screen is allowed to play alarm sounds
 */
export function canPlaySound(screenName: string): boolean {
  return ALLOWED_SOUND_SCREENS.includes(screenName as AllowedSoundScreen);
}

/**
 * Check if sounds can play RIGHT NOW based on current screen
 */
export function canPlaySoundNow(): boolean {
  const allowed = ALLOWED_SOUND_SCREENS.includes(currentScreen as AllowedSoundScreen);
  if (__DEV__ && !allowed) {
    console.log('[SoundKiller] Sound blocked - current screen:', currentScreen, 'not in whitelist');
  }
  return allowed;
}

/**
 * Global sound killer - stops ALL audio playback
 * Call this on screens that should NEVER have alarm sounds playing
 */
export async function killAllSounds(): Promise<void> {
  try {
    // Set audio mode to stop any background audio
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    
    if (__DEV__) console.log('[SoundKiller] All sounds killed on screen:', currentScreen);
  } catch (error) {
    if (__DEV__) console.log('[SoundKiller] Kill failed (expected on web)');
  }
}

/**
 * Reset audio mode to alarm-ready state
 * Call when entering allowed sound screens
 */
export async function enableAlarmAudio(): Promise<void> {
  if (!canPlaySoundNow()) {
    if (__DEV__) console.log('[SoundKiller] Cannot enable alarm audio - not on allowed screen');
    return;
  }
  
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });
    
    if (__DEV__) console.log('[SoundKiller] Alarm audio enabled for screen:', currentScreen);
  } catch (error) {
    if (__DEV__) console.log('[SoundKiller] Enable alarm audio failed');
  }
}
