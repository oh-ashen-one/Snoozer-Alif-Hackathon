import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  hapticForPunishment,
  getPunishmentLevel,
  selectionChanged,
  buttonPress,
  alarmCreatedPattern,
} from '@/utils/haptics';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useAlarms } from '@/hooks/useAlarms';
import { getAlarmById, getDefaultPunishments, getPunishmentConfig, savePunishmentConfig, PunishmentConfig } from '@/utils/storage';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import Header from '@/components/Header';
import { PunishmentList, PUNISHMENT_OPTIONS } from '@/components/PunishmentList';
import { getShameVideo } from '@/utils/fileSystem';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddAlarm'>;

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const AMOUNTS = [1, 5, 10, 20];

const PROOF_ACTIVITIES = [
  {
    id: 'photo_activity',
    name: 'Photo of Activity',
    description: 'Take a pic doing your morning task',
    emoji: '📷',
    ctaText: (activity: string) => `${activity} Photo`,
    defaultActivity: 'Brush teeth',
  },
  {
    id: 'steps',
    name: 'Walk Steps',
    description: 'Get moving to dismiss',
    emoji: '🚶',
    ctaText: () => 'Walk 10 Steps',
    defaultActivity: 'Walk outside',
  },
  {
    id: 'math',
    name: 'Math Problems',
    description: 'Solve problems to wake your brain',
    emoji: '🧮',
    ctaText: () => 'Solve Math',
    defaultActivity: 'Solve 3 problems',
  },
  {
    id: 'type_phrase',
    name: 'Type Phrase',
    description: 'Type a motivational phrase to dismiss',
    emoji: '⌨️',
    ctaText: () => 'Type Phrase',
    defaultActivity: 'Type to wake up',
  },
];

const ACTIVITY_SUGGESTIONS = ['Brush teeth', 'Make coffee', 'At gym', 'Outside', 'Stretch'];

const ChevronUp = ({ color = '#78716C' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 15L12 9L6 15" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDown = ({ color = '#78716C' }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
}

function Toggle({ value, onToggle }: ToggleProps) {
  const translateX = useSharedValue(value ? 20 : 0);
  
  React.useEffect(() => {
    translateX.value = withSpring(value ? 20 : 0, { damping: 15 });
  }, [value]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      style={[styles.toggle, { backgroundColor: value ? Colors.green : Colors.border }]}
      onPress={onToggle}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </Pressable>
  );
}

export default function AddAlarmScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isOnboarding = route.params?.isOnboarding ?? true;
  const editAlarmId = route.params?.editAlarmId;
  const isEditing = !!editAlarmId;
  const { addAlarm, updateAlarm } = useAlarms();

  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [existingAlarmData, setExistingAlarmData] = useState<{
    referencePhotoUri: string | null;
    shameVideoUri: string | null;
    enabled: boolean;
  } | null>(null);

  const [selectedProof, setSelectedProof] = useState('photo_activity');
  const [activityName, setActivityName] = useState('Brush teeth');
  const [showProofPicker, setShowProofPicker] = useState(false);

  const [moneyEnabled, setMoneyEnabled] = useState(false);
  const [amount, setAmount] = useState(5);

  const [escalatingVolume, setEscalatingVolume] = useState(true);
  const [wakeRecheck, setWakeRecheck] = useState(true);

  const [enabledPunishments, setEnabledPunishments] = useState<string[]>(['shame_video']);
  const [punishmentConfig, setPunishmentConfig] = useState<PunishmentConfig>({});
  const [expandedPunishment, setExpandedPunishment] = useState<string | null>(null);
  const [showMaxLimitCard, setShowMaxLimitCard] = useState(false);
  const [globalShameVideoUri, setGlobalShameVideoUri] = useState<string | null>(null);

  useEffect(() => {
    if (editAlarmId) return;

    const loadGlobalDefaults = async () => {
      try {
        const [defaultPunishments, config, shameVideo] = await Promise.all([
          getDefaultPunishments(),
          getPunishmentConfig(),
          getShameVideo(),
        ]);

        setEnabledPunishments(defaultPunishments);
        setPunishmentConfig(config);
        setGlobalShameVideoUri(shameVideo);

        if (__DEV__) console.log('[AddAlarm] Loaded global punishment defaults:', defaultPunishments);
      } catch (error) {
        if (__DEV__) console.error('[AddAlarm] Error loading global defaults:', error);
      }
    };

    loadGlobalDefaults();
  }, [editAlarmId]);

  useEffect(() => {
    if (!editAlarmId) return;

    const loadAlarm = async () => {
      const config = await getPunishmentConfig();
      setPunishmentConfig(config);

      const alarm = await getAlarmById(editAlarmId);
      if (!alarm) return;

      const [hours24, mins] = alarm.time.split(':').map(Number);
      const isPMValue = hours24 >= 12;
      const hour12 = hours24 % 12 || 12;

      setHour(hour12);
      setMinute(mins);
      setIsPM(isPMValue);
      setSelectedDays(alarm.days ?? [1, 2, 3, 4, 5]);
      setActivityName(alarm.label || 'Brush teeth');
      setAmount(alarm.punishment ?? 5);
      setMoneyEnabled((alarm.punishment ?? 0) > 0);

      const enabled: string[] = [];
      if (alarm.shameVideoEnabled) enabled.push('shame_video');
      if (alarm.callBuddyEnabled) enabled.push('buddy_call');
      if (alarm.socialShameEnabled) enabled.push('group_chat');
      if (alarm.textWifesDadEnabled) enabled.push('wife_dad');
      if (alarm.emailBossEnabled) enabled.push('email_boss');
      if (alarm.tweetBadEnabled) enabled.push('twitter');
      if (alarm.textExEnabled) enabled.push('text_ex');
      if (alarm.momEnabled) enabled.push('mom');
      if (alarm.grandmaEnabled) enabled.push('grandma_call');
      setEnabledPunishments(enabled);

      if (alarm.proofActivityType) {
        setSelectedProof(alarm.proofActivityType);
      }

      setExistingAlarmData({
        referencePhotoUri: alarm.referencePhotoUri,
        shameVideoUri: alarm.shameVideoUri,
        enabled: alarm.enabled,
      });

      if (__DEV__) console.log('[AddAlarm] Loaded alarm for editing:', alarm.id);
    };

    loadAlarm();
  }, [editAlarmId]);

  const toggleDay = useCallback((index: number) => {
    buttonPress('secondary');
    setSelectedDays(prev => {
      if (prev.includes(index)) {
        if (prev.length > 1) {
          return prev.filter(d => d !== index);
        }
        return prev;
      }
      return [...prev, index].sort();
    });
  }, []);

  const getRepeatLabel = () => {
    if (selectedDays.length === 0) return 'Once';
    if (selectedDays.length === 7) return 'Every day';
    if (JSON.stringify(selectedDays) === JSON.stringify([1, 2, 3, 4, 5])) return 'Weekdays';
    if (JSON.stringify(selectedDays) === JSON.stringify([0, 6])) return 'Weekends';
    return selectedDays.map(d => DAY_NAMES[d]).join(', ');
  };

  const incrementHour = useCallback(() => {
    selectionChanged();
    setHour(h => (h >= 12 ? 1 : h + 1));
  }, []);

  const decrementHour = useCallback(() => {
    selectionChanged();
    setHour(h => (h <= 1 ? 12 : h - 1));
  }, []);

  const incrementMinute = useCallback(() => {
    selectionChanged();
    setMinute(m => (m >= 55 ? 0 : m + 5));
  }, []);

  const decrementMinute = useCallback(() => {
    selectionChanged();
    setMinute(m => (m <= 0 ? 55 : m - 5));
  }, []);

  const selectedProofData = PROOF_ACTIVITIES.find(p => p.id === selectedProof);
  const ctaPreview = selectedProofData?.ctaText(activityName) || 'Dismiss';

  const formatMinute = (m: number) => m.toString().padStart(2, '0');

  const handleTogglePunishment = useCallback((id: string) => {
    const MAX_PUNISHMENTS = 4;

    // If disabling, always allow
    if (enabledPunishments.includes(id)) {
      setEnabledPunishments(prev => prev.filter(p => p !== id));
      setShowMaxLimitCard(false);
      return;
    }

    // Check max limit when enabling
    if (enabledPunishments.length >= MAX_PUNISHMENTS) {
      setShowMaxLimitCard(true);
      return;
    }

    setShowMaxLimitCard(false);
    setEnabledPunishments(prev => [...prev, id]);
  }, [enabledPunishments]);

  const handleSaveConfig = useCallback(async (config: PunishmentConfig) => {
    setPunishmentConfig(config);
    await savePunishmentConfig(config);
    setExpandedPunishment(null);
  }, []);

  const handleSave = async () => {
    const hasShameVideo = enabledPunishments.includes('shame_video');
    const level = getPunishmentLevel(amount, hasShameVideo);
    alarmCreatedPattern(level);

    const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const timeString = `${hour24.toString().padStart(2, '0')}:${formatMinute(minute)}`;

    const extraPunishments = enabledPunishments.filter(p => !PUNISHMENT_OPTIONS.find(o => o.id === p)?.comingSoon);

    try {
      if (isEditing && editAlarmId) {
        await updateAlarm(editAlarmId, {
          time: timeString,
          label: activityName || 'Wake up',
          punishment: moneyEnabled ? amount : 0,
          extraPunishments,
          days: selectedDays,
          proofActivityType: selectedProof as 'photo_activity' | 'steps' | 'math' | 'type_phrase',
          stepGoal: selectedProof === 'steps' ? 10 : undefined,
          activityName: activityName,
          moneyEnabled: moneyEnabled,
          shameVideoEnabled: enabledPunishments.includes('shame_video'),
          buddyNotifyEnabled: enabledPunishments.includes('buddy_call'),
          socialShameEnabled: enabledPunishments.includes('group_chat'),
          antiCharityEnabled: enabledPunishments.includes('donate_enemy'),
          emailBossEnabled: enabledPunishments.includes('email_boss'),
          tweetBadEnabled: enabledPunishments.includes('twitter'),
          callBuddyEnabled: enabledPunishments.includes('buddy_call'),
          textWifesDadEnabled: enabledPunishments.includes('wife_dad'),
          textExEnabled: enabledPunishments.includes('text_ex'),
          momEnabled: enabledPunishments.includes('mom'),
          grandmaEnabled: enabledPunishments.includes('grandma_call'),
          referencePhotoUri: existingAlarmData?.referencePhotoUri ?? null,
          shameVideoUri: existingAlarmData?.shameVideoUri ?? null,
          enabled: existingAlarmData?.enabled ?? true,
        });
        if (__DEV__) console.log('[AddAlarm] Alarm updated:', editAlarmId, 'proofType:', selectedProof);
      } else {
        await addAlarm({
          time: timeString,
          label: activityName || 'Wake up',
          enabled: true,
          referencePhotoUri: null,
          shameVideoUri: null,
          punishment: moneyEnabled ? amount : 0,
          extraPunishments,
          days: selectedDays,
          proofActivityType: selectedProof as 'photo_activity' | 'steps' | 'math' | 'type_phrase',
          stepGoal: selectedProof === 'steps' ? 10 : undefined,
          activityName: activityName,
          moneyEnabled: moneyEnabled,
          shameVideoEnabled: enabledPunishments.includes('shame_video'),
          buddyNotifyEnabled: enabledPunishments.includes('buddy_call'),
          socialShameEnabled: enabledPunishments.includes('group_chat'),
          antiCharityEnabled: enabledPunishments.includes('donate_enemy'),
          emailBossEnabled: enabledPunishments.includes('email_boss'),
          tweetBadEnabled: enabledPunishments.includes('twitter'),
          callBuddyEnabled: enabledPunishments.includes('buddy_call'),
          textWifesDadEnabled: enabledPunishments.includes('wife_dad'),
          textExEnabled: enabledPunishments.includes('text_ex'),
          momEnabled: enabledPunishments.includes('mom'),
          grandmaEnabled: enabledPunishments.includes('grandma_call'),
        });
        if (__DEV__) console.log('[AddAlarm] Alarm created with proofType:', selectedProof);
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    } catch (error) {
      // Error already handled by useAlarms hook with Alert
    }
  };

  const punishmentCount = [moneyEnabled, ...enabledPunishments.filter(p => !PUNISHMENT_OPTIONS.find(o => o.id === p)?.comingSoon)].filter(Boolean).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />

      <View style={styles.headerContainer}>
        <Header
          type="edit"
          title={isEditing ? 'Edit Alarm' : 'New Alarm'}
          onCancelPress={() => navigation.goBack()}
          onSavePress={handleSave}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={50} direction="up">
          <View style={styles.timeSection}>
            <View style={styles.timePickerCard}>
              <View style={styles.timeColumn}>
                <Pressable style={styles.timeArrow} onPress={incrementHour}>
                  <ChevronUp />
                </Pressable>
                <Text style={styles.timeDigit}>{hour.toString().padStart(2, '0')}</Text>
                <Pressable style={styles.timeArrow} onPress={decrementHour}>
                  <ChevronDown />
                </Pressable>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timeColumn}>
                <Pressable style={styles.timeArrow} onPress={incrementMinute}>
                  <ChevronUp />
                </Pressable>
                <Text style={styles.timeDigit}>{formatMinute(minute)}</Text>
                <Pressable style={styles.timeArrow} onPress={decrementMinute}>
                  <ChevronDown />
                </Pressable>
              </View>

              <View style={styles.amPmContainer}>
                <Pressable
                  style={[styles.amPmButton, !isPM && styles.amPmButtonActive]}
                  onPress={() => {
                    selectionChanged();
                    setIsPM(false);
                  }}
                >
                  <Text style={[styles.amPmText, !isPM && styles.amPmTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  style={[styles.amPmButton, isPM && styles.amPmButtonActive]}
                  onPress={() => {
                    selectionChanged();
                    setIsPM(true);
                  }}
                >
                  <Text style={[styles.amPmText, isPM && styles.amPmTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={75} direction="up">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REPEAT</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day, index) => (
                <Pressable
                  key={index}
                  style={[styles.dayButton, selectedDays.includes(index) && styles.dayButtonActive]}
                  onPress={() => toggleDay(index)}
                >
                  <Text style={[styles.dayText, selectedDays.includes(index) && styles.dayTextActive]}>
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.repeatLabel}>{getRepeatLabel()}</Text>
          </View>
        </FadeInView>

        <View style={styles.divider} />

        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROOF ACTIVITY</Text>
            <Text style={styles.sectionSub}>What you'll do to dismiss the alarm</Text>

            <Pressable
              style={styles.proofSelector}
              onPress={() => setShowProofPicker(!showProofPicker)}
            >
              <View style={styles.proofSelectorLeft}>
                <Text style={{ fontSize: 24 }}>{selectedProofData?.emoji}</Text>
                <View style={styles.proofSelectorInfo}>
                  <Text style={styles.proofSelectorName}>{selectedProofData?.name}</Text>
                  <Text style={styles.proofSelectorDesc}>{selectedProofData?.description}</Text>
                </View>
              </View>
              {showProofPicker ? <ChevronUp color={Colors.orange} /> : <ChevronDown />}
            </Pressable>

            {showProofPicker ? (
              <View style={styles.proofOptions}>
                {PROOF_ACTIVITIES.map(proof => (
                  <Pressable
                    key={proof.id}
                    style={[
                      styles.proofOption,
                      selectedProof === proof.id && styles.proofOptionActive,
                    ]}
                    onPress={() => {
                      selectionChanged();
                      setSelectedProof(proof.id);
                      if (proof.defaultActivity) {
                        setActivityName(proof.defaultActivity);
                      }
                      setShowProofPicker(false);
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{proof.emoji}</Text>
                    <View style={styles.proofOptionInfo}>
                      <Text style={styles.proofOptionName}>{proof.name}</Text>
                      <Text style={styles.proofOptionDesc}>{proof.description}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {selectedProof === 'photo_activity' ? (
              <View style={styles.activitySection}>
                <Text style={styles.activityLabel}>What activity?</Text>
                <TextInput
                  style={styles.activityInput}
                  value={activityName}
                  onChangeText={setActivityName}
                  placeholder="e.g., Brush teeth"
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={styles.suggestions}>
                  {ACTIVITY_SUGGESTIONS.map(s => (
                    <Pressable
                      key={s}
                      style={[styles.suggestionChip, activityName === s && styles.suggestionChipActive]}
                      onPress={() => setActivityName(s)}
                    >
                      <Text style={[styles.suggestionText, activityName === s && styles.suggestionTextActive]}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.ctaPreviewBox}>
              <Text style={styles.ctaPreviewLabel}>Dismiss button:</Text>
              <View style={styles.ctaPreviewButton}>
                <Text style={styles.ctaPreviewText}>I'M UP - {ctaPreview}</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        <View style={styles.divider} />

        <FadeInView delay={150} direction="up">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PUNISHMENT</Text>
            <Text style={styles.sectionSub}>What happens when you snooze</Text>

            <View style={styles.moneyCard}>
              <View style={styles.moneyHeader}>
                <View style={styles.moneyIconContainer}>
                  <Text style={{ fontSize: 20 }}>💵</Text>
                </View>
                <View style={styles.moneyInfo}>
                  <Text style={styles.moneyTitle}>Money Stakes</Text>
                </View>
                <Toggle value={moneyEnabled} onToggle={() => {
                  hapticForPunishment(getPunishmentLevel(amount, enabledPunishments.includes('shame_video')));
                  if (!moneyEnabled) {
                    // Enabling money - clear all other punishments
                    setEnabledPunishments([]);
                    setShowMaxLimitCard(false);
                  }
                  setMoneyEnabled(!moneyEnabled);
                }} />
              </View>
              {moneyEnabled ? (
                <View style={styles.moneyExpanded}>
                  <View style={styles.amountRow}>
                    {AMOUNTS.map((amt) => (
                      <Pressable
                        key={amt}
                        style={[styles.amountButton, amount === amt && styles.amountButtonActive]}
                        onPress={() => {
                          hapticForPunishment(getPunishmentLevel(amt, enabledPunishments.includes('shame_video')));
                          setAmount(amt);
                        }}
                      >
                        <Text style={[styles.amountText, amount === amt && styles.amountTextActive]}>
                          ${amt}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    style={styles.recipientCard}
                    onPress={() => navigation.navigate('Settings')}
                  >
                    <View style={[styles.recipientAvatar, { backgroundColor: Colors.border }]}>
                      <Text style={{ fontSize: 18 }}>⚙️</Text>
                    </View>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientLabel}>Recipient</Text>
                      <Text style={styles.recipientName}>Set up in settings</Text>
                    </View>
                    <Text style={{ fontSize: 18, color: Colors.textMuted }}>›</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.punishmentListWrapper}>
              <PunishmentList
                enabledPunishments={enabledPunishments}
                onTogglePunishment={handleTogglePunishment}
                punishmentConfig={punishmentConfig}
                onSaveConfig={handleSaveConfig}
                expandedPunishment={expandedPunishment}
                onExpandPunishment={setExpandedPunishment}
                shameVideoUri={globalShameVideoUri}
              />
            </View>

            {showMaxLimitCard && (
              <View style={styles.maxLimitCard}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text style={styles.maxLimitText}>
                  Maximum 4 punishments. Disable one to add another.
                </Text>
              </View>
            )}

            <View style={styles.stakesHint}>
              <Text style={{ fontSize: 16 }}>💡</Text>
              <Text style={styles.stakesHintText}>
                <Text style={styles.stakesHintBold}>More punishments = more motivation.</Text> Users with 3+ punishments enabled wake up 4x more consistently.
              </Text>
            </View>

            {punishmentCount === 0 ? (
              <View style={styles.noPunishmentWarning}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text style={styles.warningText}>
                  No punishments? You might as well use the default alarm app
                </Text>
              </View>
            ) : null}
          </View>
        </FadeInView>

        <View style={styles.divider} />

        <FadeInView delay={200} direction="up">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ESCALATION</Text>
            <Text style={styles.sectionSub}>Extra pressure to wake up</Text>

            <View style={styles.toggleRow}>
              <Text style={{ fontSize: 20 }}>🔊</Text>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Escalating Volume</Text>
                <Text style={styles.toggleSubtitle}>Starts soft, gets louder over time</Text>
              </View>
              <Toggle value={escalatingVolume} onToggle={() => setEscalatingVolume(!escalatingVolume)} />
            </View>

            <View style={styles.toggleRow}>
              <Text style={{ fontSize: 20 }}>⏰</Text>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>5-Min Recheck</Text>
                <Text style={styles.toggleSubtitle}>Verify you're still awake after 5 min</Text>
              </View>
              <Toggle value={wakeRecheck} onToggle={() => setWakeRecheck(!wakeRecheck)} />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={250} direction="up">
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>
                {hour}:{formatMinute(minute)} {isPM ? 'PM' : 'AM'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Repeat</Text>
              <Text style={styles.summaryValue}>{getRepeatLabel()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Proof</Text>
              <Text style={styles.summaryValue}>{selectedProofData?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Punishments</Text>
              <Text style={styles.summaryValue}>{punishmentCount} active</Text>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeArrow: {
    padding: Spacing.sm,
  },
  timeDigit: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  amPmContainer: {
    marginLeft: Spacing.lg,
    gap: Spacing.xs,
  },
  amPmButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
  },
  amPmButtonActive: {
    backgroundColor: Colors.orange,
  },
  amPmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  amPmTextActive: {
    color: Colors.bg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
  },
  dayButtonActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dayTextActive: {
    color: Colors.orange,
  },
  repeatLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  proofSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  proofSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  proofSelectorInfo: {
    gap: 2,
  },
  proofSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  proofSelectorDesc: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  proofOptions: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  proofOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  proofOptionActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  proofOptionInfo: {
    flex: 1,
    gap: 2,
  },
  proofOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  proofOptionDesc: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  activitySection: {
    marginBottom: Spacing.md,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  activityInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.full,
  },
  suggestionChipActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  suggestionTextActive: {
    color: Colors.orange,
  },
  ctaPreviewBox: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  ctaPreviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  ctaPreviewButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaPreviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.bg,
  },
  moneyCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  moneyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  moneyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  moneyInfo: {
    flex: 1,
  },
  moneyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  moneyExpanded: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  amountButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  amountButtonActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  amountTextActive: {
    color: Colors.orange,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  punishmentListWrapper: {
    marginTop: Spacing.sm,
  },
  stakesHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  stakesHintText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stakesHintBold: {
    fontWeight: '600',
    color: Colors.text,
  },
  noPunishmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.red,
    lineHeight: 18,
  },
  maxLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  maxLimitText: {
    flex: 1,
    fontSize: 14,
    color: Colors.red,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
  },
  summaryCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
});
