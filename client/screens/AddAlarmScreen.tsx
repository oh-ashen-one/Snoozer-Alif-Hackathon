import React, { useState, useCallback } from 'react';
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
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';

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
  },
  {
    id: 'steps',
    name: 'Walk Steps',
    description: 'Get moving to dismiss',
    emoji: '🚶',
    ctaText: () => 'Walk 10 Steps',
  },
  {
    id: 'math',
    name: 'Math Problems',
    description: 'Solve problems to wake your brain',
    emoji: '🧮',
    ctaText: () => 'Solve Math',
  },
];

const ACTIVITY_SUGGESTIONS = ['Brush teeth', 'Make coffee', 'At gym', 'Outside'];

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

interface PunishmentCardProps {
  emoji: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

function PunishmentCard({ emoji, title, description, enabled, onToggle, children }: PunishmentCardProps) {
  return (
    <View style={styles.punishmentCard}>
      <View style={styles.punishmentHeader}>
        <View style={styles.punishmentIconContainer}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View style={styles.punishmentInfo}>
          <Text style={styles.punishmentTitle}>{title}</Text>
          <Text style={styles.punishmentDesc}>{description}</Text>
        </View>
        <Toggle value={enabled} onToggle={onToggle} />
      </View>
      {enabled && children ? (
        <View style={styles.punishmentExpanded}>{children}</View>
      ) : null}
    </View>
  );
}

export default function AddAlarmScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isOnboarding = route.params?.isOnboarding ?? true;
  const { addAlarm } = useAlarms();

  const [hour, setHour] = useState(6);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [selectedProof, setSelectedProof] = useState('photo_activity');
  const [activityName, setActivityName] = useState('Brush teeth');
  const [showProofPicker, setShowProofPicker] = useState(false);

  const [moneyEnabled, setMoneyEnabled] = useState(true);
  const [amount, setAmount] = useState(5);
  const [shameVideo, setShameVideo] = useState(true);
  const [buddyNotify, setBuddyNotify] = useState(true);
  const [socialShame, setSocialShame] = useState(false);
  const [antiCharity, setAntiCharity] = useState(false);

  const [escalatingVolume, setEscalatingVolume] = useState(true);
  const [wakeRecheck, setWakeRecheck] = useState(true);

  const buddy = { name: 'Jake', phone: '+1 (555) 123-4567' };

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

  const handleSave = async () => {
    const hasShameVideo = shameVideo;
    const level = getPunishmentLevel(amount, hasShameVideo);
    alarmCreatedPattern(level);

    const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    const timeString = `${hour24.toString().padStart(2, '0')}:${formatMinute(minute)}`;

    const extraPunishments: string[] = [];
    if (shameVideo) extraPunishments.push('shame_video');
    if (buddyNotify) extraPunishments.push('buddy_call');
    if (socialShame) extraPunishments.push('group_chat');
    if (antiCharity) extraPunishments.push('donate_enemy');

    try {
      await addAlarm({
        time: timeString,
        label: activityName || 'Wake up',
        enabled: true,
        referencePhotoUri: null,
        shameVideoUri: null,
        punishment: moneyEnabled ? amount : 0,
        extraPunishments,
        days: selectedDays,
      });

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

  const punishmentCount = [moneyEnabled, shameVideo, buddyNotify, socialShame, antiCharity].filter(Boolean).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />

      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Alarm</Text>
        <Pressable style={styles.headerButton} onPress={handleSave}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
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

              <Text style={styles.timeColon}>:</Text>

              <View style={styles.timeColumn}>
                <Pressable style={styles.timeArrow} onPress={incrementMinute}>
                  <ChevronUp />
                </Pressable>
                <Text style={styles.timeDigit}>{formatMinute(minute)}</Text>
                <Pressable style={styles.timeArrow} onPress={decrementMinute}>
                  <ChevronDown />
                </Pressable>
              </View>

              <View style={styles.periodColumn}>
                <Pressable
                  style={[styles.periodOption, !isPM && styles.periodOptionActive]}
                  onPress={() => { selectionChanged(); setIsPM(false); }}
                >
                  <Text style={[styles.periodText, !isPM && styles.periodTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  style={[styles.periodOption, isPM && styles.periodOptionActive]}
                  onPress={() => { selectionChanged(); setIsPM(true); }}
                >
                  <Text style={[styles.periodText, isPM && styles.periodTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.repeatSection}>
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
          </View>
        </FadeInView>

        <View style={styles.divider} />

        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROOF OF WAKE</Text>
            <Text style={styles.sectionSub}>What you must do to dismiss</Text>

            <Pressable
              style={styles.proofSelector}
              onPress={() => setShowProofPicker(!showProofPicker)}
            >
              <View style={styles.proofIconContainer}>
                <Text style={{ fontSize: 22 }}>{selectedProofData?.emoji}</Text>
              </View>
              <View style={styles.proofSelectorInfo}>
                <Text style={styles.proofSelectorName}>{selectedProofData?.name}</Text>
                <Text style={styles.proofSelectorDesc}>{selectedProofData?.description}</Text>
              </View>
              <Text style={{ fontSize: 20, color: Colors.textMuted }}>{showProofPicker ? '▲' : '›'}</Text>
            </Pressable>

            {showProofPicker ? (
              <View style={styles.proofOptions}>
                {PROOF_ACTIVITIES.map((proof) => (
                  <Pressable
                    key={proof.id}
                    style={[styles.proofOption, selectedProof === proof.id && styles.proofOptionActive]}
                    onPress={() => {
                      setSelectedProof(proof.id);
                      setShowProofPicker(false);
                      selectionChanged();
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{proof.emoji}</Text>
                    <Text style={[styles.proofOptionName, selectedProof === proof.id && styles.proofOptionNameActive]}>
                      {proof.name}
                    </Text>
                    {selectedProof === proof.id ? (
                      <Text style={{ fontSize: 18, color: Colors.orange }}>✓</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {selectedProof === 'photo_activity' ? (
              <View style={styles.activityInput}>
                <Text style={styles.inputLabel}>Activity name</Text>
                <TextInput
                  style={styles.textInput}
                  value={activityName}
                  onChangeText={setActivityName}
                  placeholder="Brush teeth"
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

            <PunishmentCard
              emoji="💵"
              title="Money Stakes"
              description="Pay your buddy via Apple Cash"
              enabled={moneyEnabled}
              onToggle={() => {
                hapticForPunishment(getPunishmentLevel(amount, shameVideo));
                setMoneyEnabled(!moneyEnabled);
              }}
            >
              <View style={styles.amountRow}>
                {AMOUNTS.map((amt) => (
                  <Pressable
                    key={amt}
                    style={[styles.amountButton, amount === amt && styles.amountButtonActive]}
                    onPress={() => {
                      hapticForPunishment(getPunishmentLevel(amt, shameVideo));
                      setAmount(amt);
                    }}
                  >
                    <Text style={[styles.amountText, amount === amt && styles.amountTextActive]}>
                      ${amt}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.recipientCard}>
                <View style={styles.recipientAvatar}>
                  <Text style={styles.recipientAvatarText}>{buddy.name[0]}</Text>
                </View>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientLabel}>Paid to</Text>
                  <Text style={styles.recipientName}>{buddy.name}</Text>
                </View>
                <Pressable style={styles.changeBtn}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </Pressable>
              </View>
            </PunishmentCard>

            <PunishmentCard
              emoji="🎥"
              title="Shame Video"
              description="Plays embarrassing video at MAX volume"
              enabled={shameVideo}
              onToggle={() => {
                hapticForPunishment(getPunishmentLevel(amount, !shameVideo));
                setShameVideo(!shameVideo);
              }}
            >
              <Pressable style={styles.recordVideoBtn}>
                <Text style={{ fontSize: 18 }}>🎬</Text>
                <Text style={styles.recordVideoBtnText}>Record Shame Video</Text>
                <Text style={{ fontSize: 18, color: Colors.textMuted }}>›</Text>
              </Pressable>
            </PunishmentCard>

            <PunishmentCard
              emoji="💬"
              title="Buddy Notification"
              description="Text your buddy that you failed"
              enabled={buddyNotify}
              onToggle={() => {
                buttonPress('secondary');
                setBuddyNotify(!buddyNotify);
              }}
            >
              <View style={styles.messagePreview}>
                <Text style={styles.messagePreviewLabel}>They'll receive:</Text>
                <View style={styles.messagePreviewBubble}>
                  <Text style={styles.messagePreviewText}>
                    {buddy.name}, your buddy snoozed at {hour}:{formatMinute(minute)} {isPM ? 'PM' : 'AM'}! They owe you.
                  </Text>
                </View>
              </View>
            </PunishmentCard>

            <PunishmentCard
              emoji="👥"
              title="Social Shame"
              description="Post to group chat or social media"
              enabled={socialShame}
              onToggle={() => {
                buttonPress('secondary');
                setSocialShame(!socialShame);
              }}
            >
              <Pressable style={styles.selectGroupBtn}>
                <Text style={{ fontSize: 18 }}>💬</Text>
                <Text style={styles.selectGroupBtnText}>Select Group Chat</Text>
                <Text style={{ fontSize: 18, color: Colors.textMuted }}>›</Text>
              </Pressable>
            </PunishmentCard>

            <PunishmentCard
              emoji="😈"
              title="Anti-Charity"
              description="Donate to a cause you hate"
              enabled={antiCharity}
              onToggle={() => {
                buttonPress('secondary');
                setAntiCharity(!antiCharity);
              }}
            >
              <Pressable style={styles.selectCharityBtn}>
                <Text style={styles.selectCharityBtnText}>Choose organization...</Text>
                <Text style={{ fontSize: 18, color: Colors.textMuted }}>›</Text>
              </Pressable>
            </PunishmentCard>

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
              <Text style={styles.summaryLabel}>Dismiss</Text>
              <Text style={styles.summaryValue}>{selectedProofData?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Penalty</Text>
              <Text style={styles.summaryValue}>
                {[
                  moneyEnabled && `$${amount}`,
                  shameVideo && 'Video',
                  buddyNotify && 'Text',
                  socialShame && 'Social',
                  antiCharity && 'Charity',
                ].filter(Boolean).join(' + ') || 'None'}
              </Text>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: 100 }} />
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orange,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  timeSection: {
    marginBottom: Spacing.lg,
  },
  timePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  timeColumn: {
    alignItems: 'center',
  },
  timeArrow: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDigit: {
    fontSize: 56,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 80,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 48,
    fontWeight: '300',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  periodColumn: {
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  periodOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  periodOptionActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodTextActive: {
    color: Colors.bg,
  },
  repeatSection: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
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
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  proofSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  proofIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofSelectorInfo: {
    flex: 1,
  },
  proofSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  proofSelectorDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  proofOptions: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  proofOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  proofOptionActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
  },
  proofOptionName: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  proofOptionNameActive: {
    color: Colors.orange,
    fontWeight: '600',
  },
  activityInput: {
    marginTop: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionChipActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
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
    marginTop: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ctaPreviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  ctaPreviewButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  ctaPreviewText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.bg,
  },
  punishmentCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  punishmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  punishmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punishmentInfo: {
    flex: 1,
  },
  punishmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  punishmentDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  punishmentExpanded: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
  },
  amountRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  amountButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  amountButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  amountTextActive: {
    color: Colors.red,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  recipientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  changeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.sm,
  },
  changeBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  recordVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  recordVideoBtnText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  messagePreview: {
    gap: Spacing.sm,
  },
  messagePreviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  messagePreviewBubble: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  messagePreviewText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  selectGroupBtnText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  selectCharityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  selectCharityBtnText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textMuted,
  },
  stakesHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  stakesHintText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stakesHintBold: {
    fontWeight: '700',
  },
  noPunishmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.orange,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
