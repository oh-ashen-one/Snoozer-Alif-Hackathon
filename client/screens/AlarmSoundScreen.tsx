import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import Header from '@/components/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ALARM_SOUND_KEY = '@snoozer/alarm_sound';

const ALARM_SOUNDS = [
  { id: 'nuclear', name: 'Nuclear Alarm', description: 'Intense warning siren', file: require('@/assets/sounds/nuclear-alarm.wav') },
  { id: 'mosquito', name: 'Mosquito Swarm', description: 'Annoying buzzing chaos', file: require('@/assets/sounds/mosquito-swarm.wav') },
  { id: 'emp', name: 'EMP Blast', description: 'Electronic pulse shock', file: require('@/assets/sounds/emp-blast.wav') },
  { id: 'siren', name: 'Siren From Hell', description: 'Demonic emergency alert', file: require('@/assets/sounds/siren-from-hell.wav') },
  { id: 'chaos', name: 'Chaos Engine', description: 'Pure auditory mayhem', file: require('@/assets/sounds/chaos-engine.wav') },
  { id: 'escalator', name: 'The Escalator', description: 'Builds up intensity', file: require('@/assets/sounds/the-escalator.wav') },
  { id: 'ear-shatter', name: 'Ear Shatter', description: 'Piercing wake-up call', file: require('@/assets/sounds/ear-shatter.wav') },
  { id: 'high-pitch', name: 'High Pitch', description: 'Sharp frequency blast', file: require('@/assets/sounds/high-pitch.wav') },
  { id: 'angry-goose', name: 'Angry Goose', description: 'Honking goose rampage', file: require('@/assets/sounds/angry-goose.wav') },
  { id: 'air-horn', name: 'Air Horn Blasts', description: 'Stadium-level noise', file: require('@/assets/sounds/air-horn.wav') },
  { id: 'screaming-goat', name: 'Screaming Goat', description: 'Viral goat screams', file: require('@/assets/sounds/screaming-goat.wav') },
  { id: 'smoke-detector', name: 'Smoke Detector', description: 'Urgent beeping alert', file: require('@/assets/sounds/smoke-detector.wav') },
  { id: 'car-alarm', name: 'Car Alarm', description: 'Parking lot nightmare', file: require('@/assets/sounds/car-alarm.wav') },
  { id: 'baby-crying', name: 'Baby Crying', description: 'Impossible to ignore', file: require('@/assets/sounds/baby-crying.wav') },
  { id: 'dog-barking', name: 'Dog Barking', description: 'Frantic barking frenzy', file: require('@/assets/sounds/dog-barking.wav') },
  { id: 'drill-sergeant', name: 'Drill Sergeant', description: 'GET UP MAGGOT!', file: require('@/assets/sounds/drill-sergeant.wav') },
  { id: 'submarine-alarm', name: 'Submarine Dive', description: 'Emergency dive klaxon', file: require('@/assets/sounds/submarine-alarm.wav') },
  { id: 'chainsaw', name: 'Chainsaw', description: 'Revving chainsaw terror', file: require('@/assets/sounds/chainsaw.wav') },
  { id: 'motorcycle', name: 'Loud Motorcycle', description: 'Harley engine roar', file: require('@/assets/sounds/motorcycle.wav') },
  { id: 'rooster', name: 'Aggressive Rooster', description: 'Non-stop crowing', file: require('@/assets/sounds/rooster.wav') },
  { id: 'police-siren', name: 'Police Siren', description: 'Cop car chase mode', file: require('@/assets/sounds/police-siren.wav') },
  { id: 'broken-glass', name: 'Broken Glass', description: 'Shattering crash sounds', file: require('@/assets/sounds/broken-glass.wav') },
] as const;

type AlarmSoundId = typeof ALARM_SOUNDS[number]['id'];

export default function AlarmSoundScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const [selectedSound, setSelectedSound] = useState<AlarmSoundId>('nuclear');
  const [playingSound, setPlayingSound] = useState<AlarmSoundId | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSelectedSound = async () => {
      try {
        const saved = await AsyncStorage.getItem(ALARM_SOUND_KEY);
        if (saved) {
          setSelectedSound(saved as AlarmSoundId);
        }
      } catch {
        // Use default
      }
    };
    loadSelectedSound();

    return () => {
      stopSound();
    };
  }, []);

  const stopSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // Ignore errors
      }
      soundRef.current = null;
    }
    setPlayingSound(null);
  };

  const handlePlaySound = useCallback(async (soundId: AlarmSoundId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If already playing this sound, stop it
    if (playingSound === soundId) {
      await stopSound();
      return;
    }

    // Stop any currently playing sound
    await stopSound();

    // Find the sound file
    const soundData = ALARM_SOUNDS.find(s => s.id === soundId);
    if (!soundData) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        soundData.file,
        { shouldPlay: true, volume: 0.7, isLooping: true }
      );
      soundRef.current = sound;
      setPlayingSound(soundId);
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  }, [playingSound]);

  const handleSelectSound = useCallback(async (soundId: AlarmSoundId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSound(soundId);
    try {
      await AsyncStorage.setItem(ALARM_SOUND_KEY, soundId);
    } catch {
      // Silently fail
    }
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopSound();
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <Header type="nav" title="Alarm Sound" emoji={'\uD83D\uDD0A'} onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={50} direction="up">
          <ThemedText style={styles.subtitle}>
            Tap the play button to preview, tap a sound to select it
          </ThemedText>
        </FadeInView>

        <View style={styles.soundsList}>
          {ALARM_SOUNDS.map((sound, index) => {
            const isSelected = selectedSound === sound.id;
            const isPlaying = playingSound === sound.id;

            return (
              <FadeInView key={sound.id} delay={100 + index * 50} direction="up">
                <Pressable
                  style={[
                    styles.soundCard,
                    isSelected && styles.soundCardSelected,
                  ]}
                  onPress={() => handleSelectSound(sound.id)}
                >
                  <View style={styles.soundInfo}>
                    <View style={styles.soundHeader}>
                      <ThemedText style={[styles.soundName, isSelected && styles.soundNameSelected]}>
                        {sound.name}
                      </ThemedText>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Text style={{ fontSize: 12 }}>✓</Text>
                          <ThemedText style={styles.selectedText}>Selected</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={styles.soundDescription}>{sound.description}</ThemedText>
                  </View>

                  <Pressable
                    style={[styles.playButton, isPlaying && styles.playButtonActive]}
                    onPress={() => handlePlaySound(sound.id)}
                    hitSlop={8}
                  >
                    <Text style={{ fontSize: 20, color: isPlaying ? Colors.bg : Colors.orange }}>
                      {isPlaying ? '⏸' : '▶'}
                    </Text>
                  </Pressable>
                </Pressable>
              </FadeInView>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  soundsList: {
    gap: Spacing.sm,
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  soundCardSelected: {
    borderColor: Colors.orange,
    backgroundColor: 'rgba(251,146,60,0.08)',
  },
  soundInfo: {
    flex: 1,
  },
  soundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  soundNameSelected: {
    color: Colors.orange,
  },
  soundDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  selectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.green,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(251,146,60,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: Colors.orange,
  },
});
