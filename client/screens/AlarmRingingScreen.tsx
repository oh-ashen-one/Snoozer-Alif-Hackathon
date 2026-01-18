import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  Vibration,
  BackHandler,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
  alarmRingingPattern,
  snoozeWarningPattern,
  shameTriggerPattern,
  successDismissPattern,
  buttonPress,
  continuousAlarmPulse,
} from '@/utils/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { VolumeIndicator } from '@/components/VolumeIndicator';
import { CheatWarningModal } from '@/components/CheatWarningModal';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { getAlarms, getProofActivity, ProofActivity } from '@/utils/storage';
import { logWakeUp, getCurrentStreak } from '@/utils/tracking';
import { useEscalatingVolume } from '@/hooks/useEscalatingVolume';
import { useAntiCheat, CheatType } from '@/hooks/useAntiCheat';

// Import local alarm sounds
const ALARM_SOUND_FILES: Record<string, any> = {
  nuclear: require('@/assets/sounds/nuclear-alarm.wav'),
  mosquito: require('@/assets/sounds/mosquito-swarm.wav'),
  emp: require('@/assets/sounds/emp-blast.wav'),
  siren: require('@/assets/sounds/siren-from-hell.wav'),
  chaos: require('@/assets/sounds/chaos-engine.wav'),
  escalator: require('@/assets/sounds/the-escalator.wav'),
  'ear-shatter': require('@/assets/sounds/ear-shatter.wav'),
  'high-pitch': require('@/assets/sounds/high-pitch.wav'),
};

const ALARM_SOUND_IDS = Object.keys(ALARM_SOUND_FILES);
const ALARM_SOUND_KEY = '@snoozer/alarm_sound';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AlarmRinging'>;

type SnoozeStep = 0 | 1 | 2;

const SNOOZE_CONFIRMATION = "im fuch a fat chud";
const VIBRATION_PATTERN = [500, 500, 500, 500];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BUDDY_QUOTES = [
  "Don't make me come over there.",
  "I can see you're still in bed...",
  "Get up or I'm sending screenshots.",
  "You promised you'd wake up.",
  "Your shame video is ready to go.",
];

export default function AlarmRingingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const params = route.params || {};

  const [alarmData, setAlarmData] = useState({
    alarmId: params.alarmId || '',
    alarmLabel: params.alarmLabel || 'Alarm',
    referencePhotoUri: params.referencePhotoUri || '',
    shameVideoUri: params.shameVideoUri || '',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [snoozeStep, setSnoozeStep] = useState<SnoozeStep>(0);
  const [snoozeText, setSnoozeText] = useState('');
  const [streak, setStreak] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [buddyQuote] = useState(BUDDY_QUOTES[Math.floor(Math.random() * BUDDY_QUOTES.length)]);
  const [proofActivity, setProofActivity] = useState<ProofActivity | null>(null);
  const [alarmSoundSource, setAlarmSoundSource] = useState<any>(null);
  const [cheatModalVisible, setCheatModalVisible] = useState(false);
  const [detectedCheat, setDetectedCheat] = useState<CheatType | null>(null);

  const { startAlarm: startEscalatingAlarm, stopAlarm: stopEscalatingAlarm, volumePercent, isPlaying } = useEscalatingVolume(alarmSoundSource);
  
  const { 
    startHeartbeat, 
    stopHeartbeat, 
    scheduleBackupNotification,
    cancelBackupNotification,
    validateTimeIntegrity 
  } = useAntiCheat({
    onCheatDetected: (cheatType) => {
      setDetectedCheat(cheatType);
      setCheatModalVisible(true);
    },
    onAlarmInterrupted: (alarmState) => {
      if (__DEV__) console.log('[AntiCheat] Alarm was interrupted:', alarmState);
      setDetectedCheat('app_killed');
      setCheatModalVisible(true);
    },
  });

  const breatheValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);

    breatheValue.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    getCurrentStreak().then(s => setStreak(s));
    getProofActivity().then(setProofActivity);
  }, []);

  useEffect(() => {
    if (__DEV__) console.log('ALARM: Ringing screen mounted');
    
    const loadFallbackAlarm = async () => {
      if (!alarmData.alarmId) {
        try {
          const alarms = await getAlarms();
          const enabledAlarm = alarms.find(a => a.enabled);
          if (enabledAlarm) {
            setAlarmData({
              alarmId: enabledAlarm.id,
              alarmLabel: enabledAlarm.label || 'Alarm',
              referencePhotoUri: enabledAlarm.referencePhotoUri || '',
              shameVideoUri: enabledAlarm.shameVideoUri || '',
            });
            if (__DEV__) console.log('[AlarmRinging] Loaded fallback alarm:', enabledAlarm.id);
          } else {
            if (__DEV__) console.log('[AlarmRinging] No alarms found, navigating home');
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            );
          }
        } catch (error) {
          if (__DEV__) console.error('[AlarmRinging] Error loading fallback alarm:', error);
        }
      }
    };
    loadFallbackAlarm();
  }, [alarmData.alarmId, navigation]);

  const stopAlarm = async () => {
    try {
      Vibration.cancel();
      await stopEscalatingAlarm();
    } catch (error) {
      if (__DEV__) console.log('[AlarmRinging] Error stopping alarm:', error);
    }
  };

  // Load alarm sound source on mount
  useEffect(() => {
    const loadAlarmSound = async () => {
      let soundId = ALARM_SOUND_IDS[Math.floor(Math.random() * ALARM_SOUND_IDS.length)];
      try {
        const savedSound = await AsyncStorage.getItem(ALARM_SOUND_KEY);
        if (savedSound && ALARM_SOUND_FILES[savedSound]) {
          soundId = savedSound;
        }
      } catch {
        // Use random default if error
      }
      setAlarmSoundSource(ALARM_SOUND_FILES[soundId]);
    };
    loadAlarmSound();
  }, []);

  // Start alarm when sound source is loaded
  useEffect(() => {
    if (!alarmSoundSource) return;

    startEscalatingAlarm();
    alarmRingingPattern();

    // Start anti-cheat heartbeat
    startHeartbeat({
      alarmId: alarmData.alarmId,
      alarmLabel: alarmData.alarmLabel,
      referencePhotoUri: alarmData.referencePhotoUri,
      shameVideoUri: alarmData.shameVideoUri,
    });
    scheduleBackupNotification();

    if (Platform.OS !== 'web') {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });

    return () => {
      clearInterval(interval);
      backHandler.remove();
      stopAlarm();
      stopHeartbeat();
      cancelBackupNotification();
    };
  }, [alarmSoundSource]);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getPeriod = (date: Date) => {
    return date.getHours() >= 12 ? 'PM' : 'AM';
  };

  const handleDismiss = async () => {
    buttonPress('primary');
    await stopAlarm();
    navigation.navigate('StepMission', {
      alarmId: alarmData.alarmId,
      referencePhotoUri: alarmData.referencePhotoUri,
      onComplete: 'ProofCamera',
    });
  };

  const handleSnoozePress = () => {
    snoozeWarningPattern();
    setSnoozeStep(1);
  };

  const handleAreYouSure = () => {
    snoozeWarningPattern();
    setSnoozeStep(2);
  };

  const handleNevermind = () => {
    buttonPress('secondary');
    setSnoozeStep(0);
    setSnoozeText('');
  };

  const handleSnoozeConfirm = async () => {
    if (snoozeText.toLowerCase() === SNOOZE_CONFIRMATION.toLowerCase()) {
      if (__DEV__) console.log('ALARM: User chose snooze');
      shameTriggerPattern();
      await stopAlarm();
      
      try {
        await logWakeUp(alarmData.alarmId, new Date(), true, 1);
        if (__DEV__) console.log('[AlarmRinging] Logged snooze');
      } catch (error) {
        if (__DEV__) console.log('[AlarmRinging] Error logging snooze:', error);
      }
      
      navigation.navigate('ShamePlayback', {
        alarmId: alarmData.alarmId,
        shameVideoUri: alarmData.shameVideoUri,
        alarmLabel: alarmData.alarmLabel,
        referencePhotoUri: alarmData.referencePhotoUri,
      });
    }
  };

  const gradientAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(breatheValue.value, [0, 1], [0.06, 0.14]);
    return { opacity };
  });

  const ringAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(breatheValue.value, [0, 1], [200, 240]);
    const opacity = interpolate(breatheValue.value, [0, 1], [0.1, 0.2]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity,
    };
  });

  const timeAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(breatheValue.value, [0, 1], [1, 1.02]);
    return { transform: [{ scale }] };
  });

  const buddyRingAnimatedStyle = useAnimatedStyle(() => {
    const size = interpolate(breatheValue.value, [0, 1], [120, 140]);
    const opacity = interpolate(breatheValue.value, [0, 1], [0.05, 0.15]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity,
    };
  });

  const onlinePulseStyle = useAnimatedStyle(() => {
    return { transform: [{ scale: pulseValue.value }] };
  });

  const penaltyAmount = 1;
  const buddyName = "Your Buddy";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View style={[styles.gradientOverlay, gradientAnimatedStyle]} />
      
      <Animated.View style={[styles.breathingRing, ringAnimatedStyle]} />

      <View style={[styles.topSection, { opacity: loaded ? 1 : 0 }]}>
        {streak > 0 && (
          <View style={styles.streakPill}>
            <Feather name="zap" size={14} color="#FB923C" />
            <ThemedText style={styles.streakText}>{streak} days strong</ThemedText>
          </View>
        )}

        <View style={styles.volumeRow}>
          <VolumeIndicator volumePercent={volumePercent} />
        </View>

        <View style={styles.timeContainer}>
          <Animated.Text style={[styles.timeText, timeAnimatedStyle]}>
            {formatTime(currentTime)}
          </Animated.Text>
          <ThemedText style={styles.periodText}>{getPeriod(currentTime)}</ThemedText>
        </View>
        
        <ThemedText style={styles.wakeUpLabel}>Time to get up</ThemedText>
      </View>

      <View style={[styles.buddySection, { opacity: loaded ? 1 : 0 }]}>
        <View style={styles.buddyAvatarContainer}>
          <Animated.View style={[styles.buddyPulseRing, buddyRingAnimatedStyle]} />
          <View style={styles.buddyAvatar}>
            <Feather name="user" size={40} color="#78716C" />
          </View>
          <Animated.View style={[styles.onlineIndicator, onlinePulseStyle]} />
        </View>
        
        <ThemedText style={styles.buddyName}>{buddyName} is watching</ThemedText>
        <ThemedText style={styles.buddyQuote}>"{buddyQuote}"</ThemedText>
      </View>

      <View style={[styles.bottomSection, { opacity: loaded ? 1 : 0 }]}>
        <View style={styles.proofCard}>
          <View style={styles.proofHeader}>
            <Feather name="camera" size={24} color="#FAFAF9" />
            <ThemedText style={styles.proofTitle}>Prove you're up</ThemedText>
          </View>
          
          <ThemedText style={styles.proofDescription}>
            {proofActivity 
              ? <>Show yourself <Text style={styles.greenText}>{proofActivity.activity.toLowerCase()}</Text> to dismiss the alarm. No proof, no escape.</>
              : <>Take a photo at your <Text style={styles.greenText}>wake-up spot</Text> to dismiss the alarm. No photo, no escape.</>
            }
          </ThemedText>
          
          <Pressable
            style={styles.dismissButton}
            onPress={handleDismiss}
            testID="button-dismiss-alarm"
          >
            <Feather name="camera" size={20} color="#ffffff" />
            <ThemedText style={styles.dismissButtonText}>Take Photo & Dismiss</ThemedText>
          </Pressable>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>or face the consequences</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        {snoozeStep === 0 && (
          <Pressable
            style={styles.snoozeButton}
            onPress={handleSnoozePress}
            testID="button-snooze"
          >
            <ThemedText style={styles.snoozeButtonText}>Snooze (-${penaltyAmount})</ThemedText>
          </Pressable>
        )}

        {snoozeStep === 1 && (
          <View style={styles.confirmCard}>
            <ThemedText style={styles.confirmTitle}>Are you sure?</ThemedText>
            <ThemedText style={styles.confirmDescription}>
              You'll lose <Text style={styles.redText}>${penaltyAmount}</Text>, your shame video will play, and {buddyName} gets notified.
            </ThemedText>
            
            <View style={styles.confirmButtons}>
              <Pressable style={styles.nevermindButton} onPress={handleNevermind}>
                <ThemedText style={styles.nevermindButtonText}>Nevermind, I'm up</ThemedText>
              </Pressable>
              <Pressable style={styles.sureButton} onPress={handleAreYouSure}>
                <ThemedText style={styles.sureButtonText}>I'm sure</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {snoozeStep === 2 && (
          <View style={styles.inputCard}>
            <ThemedText style={styles.inputLabel}>
              Type <Text style={styles.redText}>"{SNOOZE_CONFIRMATION}"</Text> to confirm
            </ThemedText>
            
            <TextInput
              style={styles.snoozeInput}
              value={snoozeText}
              onChangeText={setSnoozeText}
              placeholder="Type here..."
              placeholderTextColor="#57534E"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              testID="input-snooze-confirmation"
            />
            
            <View style={styles.confirmButtons}>
              <Pressable style={styles.goBackButton} onPress={handleNevermind}>
                <ThemedText style={styles.goBackButtonText}>Go back</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmSnoozeButton,
                  snoozeText.toLowerCase() === SNOOZE_CONFIRMATION.toLowerCase() && styles.confirmSnoozeButtonActive,
                ]}
                onPress={handleSnoozeConfirm}
                disabled={snoozeText.toLowerCase() !== SNOOZE_CONFIRMATION.toLowerCase()}
                testID="button-confirm-snooze"
              >
                <ThemedText
                  style={[
                    styles.confirmSnoozeButtonText,
                    snoozeText.toLowerCase() === SNOOZE_CONFIRMATION.toLowerCase() && styles.confirmSnoozeButtonTextActive,
                  ]}
                >
                  Confirm
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <CheatWarningModal
        visible={cheatModalVisible}
        cheatType={detectedCheat}
        onDismiss={() => setCheatModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    top: '-20%',
    left: '-20%',
    width: '140%',
    height: '70%',
    backgroundColor: '#FB923C',
    borderRadius: 1000,
  },
  breathingRing: {
    position: 'absolute',
    top: '12%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
  },

  topSection: {
    alignItems: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
    borderRadius: 100,
    marginBottom: 32,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FB923C',
  },
  volumeRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  timeText: {
    fontSize: 96,
    fontWeight: '600',
    color: '#FAFAF9',
    letterSpacing: -6,
    lineHeight: 96,
  },
  periodText: {
    fontSize: 24,
    fontWeight: '400',
    color: '#78716C',
    marginLeft: 4,
  },
  wakeUpLabel: {
    marginTop: 12,
    fontSize: 15,
    color: '#A8A29E',
  },

  buddySection: {
    alignItems: 'center',
  },
  buddyAvatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyPulseRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(250, 250, 249, 0.1)',
  },
  buddyAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#292524',
    borderWidth: 2,
    borderColor: '#3F3A36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    backgroundColor: '#22C55E',
    borderRadius: 7,
    borderWidth: 3,
    borderColor: Colors.bgElevated,
  },
  buddyName: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '500',
    color: '#FAFAF9',
  },
  buddyQuote: {
    marginTop: 6,
    fontSize: 14,
    color: '#78716C',
    fontStyle: 'italic',
  },

  bottomSection: {
    width: '100%',
    maxWidth: 340,
    gap: 12,
  },
  proofCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 4,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  proofTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FAFAF9',
  },
  proofDescription: {
    fontSize: 14,
    color: '#A8A29E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
  greenText: {
    color: '#22C55E',
    fontWeight: '500',
  },
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dismissButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#292524',
  },
  dividerText: {
    fontSize: 11,
    color: '#57534E',
  },

  snoozeButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#292524',
    borderRadius: 8,
  },
  snoozeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#78716C',
  },

  confirmCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FAFAF9',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmDescription: {
    fontSize: 13,
    color: '#A8A29E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19.5,
  },
  redText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  nevermindButton: {
    flex: 1,
    backgroundColor: '#292524',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  nevermindButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAF9',
  },
  sureButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sureButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },

  inputCard: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#FAFAF9',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
  snoozeInput: {
    backgroundColor: '#292524',
    borderWidth: 1,
    borderColor: '#3F3A36',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FAFAF9',
    textAlign: 'center',
  },
  goBackButton: {
    flex: 1,
    backgroundColor: '#292524',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  goBackButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FAFAF9',
  },
  confirmSnoozeButton: {
    flex: 1,
    backgroundColor: '#292524',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmSnoozeButtonActive: {
    backgroundColor: '#EF4444',
  },
  confirmSnoozeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#57534E',
  },
  confirmSnoozeButtonTextActive: {
    color: '#ffffff',
  },
});
