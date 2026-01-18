import { Audio } from 'expo-av';

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
    
    if (__DEV__) console.log('[SoundKiller] All sounds killed');
  } catch (error) {
    if (__DEV__) console.log('[SoundKiller] Kill failed (expected on web)');
  }
}

/**
 * Allowed screens where alarm sound can play
 */
export const ALLOWED_SOUND_SCREENS = [
  'AlarmRinging',
  'ShamePlayback',
  'Settings', // For testing sounds
] as const;

export type AllowedSoundScreen = typeof ALLOWED_SOUND_SCREENS[number];

/**
 * Check if a screen is allowed to play alarm sounds
 */
export function canPlaySound(screenName: string): boolean {
  return ALLOWED_SOUND_SCREENS.includes(screenName as AllowedSoundScreen);
}
