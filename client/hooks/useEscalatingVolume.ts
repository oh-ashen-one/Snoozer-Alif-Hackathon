import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

const START_VOLUME = 0.5;
const MAX_VOLUME = 1.0;
const STEP_INTERVAL = 10000; // 10 seconds for faster escalation
const STEP_AMOUNT = 0.1;

export function useEscalatingVolume(alarmSoundSource: any) {
  const [volume, setVolume] = useState(START_VOLUME);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const escalateInterval = useRef<NodeJS.Timeout | null>(null);
  const currentVolumeRef = useRef(START_VOLUME);

  const loadSound = useCallback(async () => {
    if (__DEV__) console.log('[EscalatingVolume] loadSound called, source:', alarmSoundSource ? 'exists' : 'null');
    
    if (!alarmSoundSource) {
      if (__DEV__) console.log('[EscalatingVolume] No sound source provided, skipping load');
      return;
    }

    try {
      if (__DEV__) console.log('[EscalatingVolume] Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      if (soundRef.current) {
        if (__DEV__) console.log('[EscalatingVolume] Unloading previous sound');
        await soundRef.current.unloadAsync();
      }

      if (__DEV__) console.log('[EscalatingVolume] Creating sound with START_VOLUME:', START_VOLUME);
      const { sound } = await Audio.Sound.createAsync(
        alarmSoundSource,
        { 
          isLooping: true, 
          volume: START_VOLUME,
          shouldPlay: false,
        }
      );

      soundRef.current = sound;
      if (__DEV__) console.log('[EscalatingVolume] Sound loaded successfully');
    } catch (error) {
      if (__DEV__) console.error('[EscalatingVolume] Failed to load alarm sound:', error);
    }
  }, [alarmSoundSource]);

  const startAlarm = useCallback(async () => {
    if (__DEV__) console.log('[EscalatingVolume] startAlarm called');
    
    if (!soundRef.current) {
      if (__DEV__) console.log('[EscalatingVolume] No sound ref, loading sound first');
      await loadSound();
    }

    currentVolumeRef.current = START_VOLUME;
    setVolume(START_VOLUME);
    setIsPlaying(true);

    try {
      if (__DEV__) console.log('[EscalatingVolume] Setting initial volume to:', START_VOLUME);
      await soundRef.current?.setVolumeAsync(START_VOLUME);
      if (__DEV__) console.log('[EscalatingVolume] Playing sound...');
      await soundRef.current?.playAsync();
      if (__DEV__) console.log('[EscalatingVolume] Sound playing at volume:', START_VOLUME);
    } catch (error) {
      if (__DEV__) console.error('[EscalatingVolume] Failed to play alarm:', error);
    }

    if (__DEV__) console.log('[EscalatingVolume] Starting escalation interval (every', STEP_INTERVAL, 'ms)');
    
    escalateInterval.current = setInterval(async () => {
      const newVolume = Math.min(currentVolumeRef.current + STEP_AMOUNT, MAX_VOLUME);
      currentVolumeRef.current = newVolume;
      
      if (__DEV__) console.log('[EscalatingVolume] Escalating volume:', Math.round(newVolume * 100) + '%');
      
      try {
        await soundRef.current?.setVolumeAsync(newVolume);
        if (__DEV__) console.log('[EscalatingVolume] Volume set successfully to:', newVolume);
      } catch (e) {
        if (__DEV__) console.error('[EscalatingVolume] Volume set error:', e);
      }
      
      setVolume(newVolume);
      
      if (newVolume >= MAX_VOLUME && escalateInterval.current) {
        if (__DEV__) console.log('[EscalatingVolume] Max volume reached, stopping escalation');
        clearInterval(escalateInterval.current);
        escalateInterval.current = null;
      }
    }, STEP_INTERVAL);
  }, [loadSound]);

  const stopAlarm = useCallback(async () => {
    if (__DEV__) console.log('[EscalatingVolume] stopAlarm called');
    
    if (escalateInterval.current) {
      if (__DEV__) console.log('[EscalatingVolume] Clearing escalation interval');
      clearInterval(escalateInterval.current);
      escalateInterval.current = null;
    }
    setIsPlaying(false);
    setVolume(START_VOLUME);
    currentVolumeRef.current = START_VOLUME;

    if (!soundRef.current) {
      if (__DEV__) console.log('[EscalatingVolume] No sound to stop');
      return;
    }

    try {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.stopAsync();
        if (__DEV__) console.log('[EscalatingVolume] Sound stopped');
      } else {
        if (__DEV__) console.log('[EscalatingVolume] Sound not loaded, nothing to stop');
      }
    } catch (error) {
      // Ignore errors when stopping - sound may already be stopped
      if (__DEV__) console.log('[EscalatingVolume] Stop skipped (sound not ready)');
    }
  }, []);

  useEffect(() => {
    if (__DEV__) console.log('[EscalatingVolume] useEffect triggered, loading sound');
    loadSound();

    return () => {
      if (__DEV__) console.log('[EscalatingVolume] Cleanup: clearing interval and unloading sound');
      if (escalateInterval.current) {
        clearInterval(escalateInterval.current);
      }
      if (soundRef.current) {
        soundRef.current.getStatusAsync().then(status => {
          if (status.isLoaded) {
            soundRef.current?.unloadAsync().catch(() => {});
          }
        }).catch(() => {});
      }
    };
  }, [loadSound]);

  return {
    startAlarm,
    stopAlarm,
    volume,
    isPlaying,
    volumePercent: Math.round(volume * 100),
  };
}
