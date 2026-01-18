import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

const START_VOLUME = 0.5;
const MAX_VOLUME = 1.0;
const STEP_INTERVAL = 30000; // 30 seconds
const STEP_AMOUNT = 0.1;

export function useEscalatingVolume(alarmSoundSource: any) {
  const [volume, setVolume] = useState(START_VOLUME);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const escalateInterval = useRef<NodeJS.Timeout | null>(null);

  const loadSound = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        alarmSoundSource,
        { 
          isLooping: true, 
          volume: START_VOLUME,
          shouldPlay: false,
        }
      );

      soundRef.current = sound;
    } catch (error) {
      if (__DEV__) console.error('Failed to load alarm sound:', error);
    }
  }, [alarmSoundSource]);

  const startAlarm = useCallback(async () => {
    if (!soundRef.current) {
      await loadSound();
    }

    setVolume(START_VOLUME);
    setIsPlaying(true);

    try {
      await soundRef.current?.setVolumeAsync(START_VOLUME);
      await soundRef.current?.playAsync();
    } catch (error) {
      if (__DEV__) console.error('Failed to play alarm:', error);
    }

    escalateInterval.current = setInterval(async () => {
      setVolume((prev) => {
        const newVolume = Math.min(prev + STEP_AMOUNT, MAX_VOLUME);
        
        soundRef.current?.setVolumeAsync(newVolume).catch((e) => {
          if (__DEV__) console.error('Volume set error:', e);
        });
        
        if (newVolume >= MAX_VOLUME && escalateInterval.current) {
          clearInterval(escalateInterval.current);
        }
        
        return newVolume;
      });
    }, STEP_INTERVAL);
  }, [loadSound]);

  const stopAlarm = useCallback(async () => {
    if (escalateInterval.current) {
      clearInterval(escalateInterval.current);
      escalateInterval.current = null;
    }
    setIsPlaying(false);
    setVolume(START_VOLUME);

    try {
      await soundRef.current?.stopAsync();
    } catch (error) {
      if (__DEV__) console.error('Failed to stop alarm:', error);
    }
  }, []);

  useEffect(() => {
    loadSound();

    return () => {
      if (escalateInterval.current) {
        clearInterval(escalateInterval.current);
      }
      soundRef.current?.unloadAsync();
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
