import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { useInvite } from '@/hooks/useInvite';

type Props = NativeStackScreenProps<RootStackParamList, 'BuddySetup'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ModeId = '1v1' | 'group' | 'survivor' | 'accountability' | 'charity';

interface ModeInfo {
  id: ModeId;
  title: string;
  color: string;
  icon: string;
}

const MODE_INFO: Record<ModeId, ModeInfo> = {
  '1v1': { id: '1v1', title: '1v1 Battle', color: '#FB923C', icon: '\u26A1' },
  group: { id: 'group', title: 'Group Pool', color: '#22C55E', icon: '\uD83D\uDC65' },
  survivor: { id: 'survivor', title: 'Survivor Mode', color: '#EF4444', icon: '\uD83C\uDFAF' },
  accountability: { id: 'accountability', title: 'Accountability Partner', color: '#7C3AED', icon: '\u2764\uFE0F' },
  charity: { id: 'charity', title: 'Charity Stakes', color: '#EC4899', icon: '\uD83C\uDF81' },
};

const CHARITIES = [
  { id: 'nra', name: 'National Rifle Association', emoji: '' },
  { id: 'peta', name: 'PETA', emoji: '' },
  { id: 'greenpeace', name: 'Greenpeace', emoji: '' },
  { id: 'trump', name: 'Trump Campaign', emoji: '' },
  { id: 'dnc', name: 'Democratic Party', emoji: '' },
  { id: 'custom', name: 'Custom charity...', emoji: '' },
];

function PulsingDot({ color }: { color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.pulsingDot,
        { backgroundColor: color, transform: [{ scale: pulseAnim }] },
      ]}
    />
  );
}

function AmountPill({
  amount,
  isSelected,
  onSelect,
  color,
}: {
  amount: number;
  isSelected: boolean;
  onSelect: () => void;
  color: string;
}) {
  return (
    <Pressable
      style={[
        styles.amountPill,
        isSelected && {
          backgroundColor: `${color}20`,
          borderColor: `${color}50`,
        },
      ]}
      onPress={onSelect}
    >
      <ThemedText
        style={[styles.amountPillText, isSelected && { color }]}
      >
        ${amount}
      </ThemedText>
    </Pressable>
  );
}

function Toggle({
  value,
  onToggle,
  color,
}: {
  value: boolean;
  onToggle: () => void;
  color: string;
}) {
  const translateX = useRef(new Animated.Value(value ? 22 : 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 22 : 2,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [value, translateX]);

  return (
    <Pressable
      style={[styles.toggle, { backgroundColor: value ? color : '#292524' }]}
      onPress={onToggle}
    >
      <Animated.View
        style={[styles.toggleKnob, { transform: [{ translateX }] }]}
      />
    </Pressable>
  );
}

export default function BuddySetupScreen({ route }: Props) {
  const { mode } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const modeInfo = MODE_INFO[mode];

  const [step, setStep] = useState(1);
  const [isWaiting, setIsWaiting] = useState(false);
  const [buddyName, setBuddyName] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    code: inviteCode,
    isLoading: isCreatingInvite,
    createInvite,
  } = useInvite(mode);

  // Create invite when component mounts
  useEffect(() => {
    if (!inviteCode && !isCreatingInvite) {
      createInvite();
    }
  }, [inviteCode, isCreatingInvite, createInvite]);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [groupName, setGroupName] = useState('');
  const [pendingMembers, setPendingMembers] = useState<string[]>([]);

  const [notifyOnSnooze, setNotifyOnSnooze] = useState(true);
  const [shareStreak, setShareStreak] = useState(true);
  const [allowNudges, setAllowNudges] = useState(true);

  const [selectedCharity, setSelectedCharity] = useState<string | null>(null);
  const [amountPerSnooze, setAmountPerSnooze] = useState<number | null>(null);

  const totalSteps = 3;
  const inviteLink = inviteCode ? `https://snoozer.replit.app/join/${inviteCode}` : '';

  const handleBack = useCallback(() => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(s => s - 1);
    }
  }, [step, navigation]);

  const handleCopyLink = useCallback(async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteLink]);

  const handleShareMessages = useCallback(async () => {
    try {
      await Share.share({
        message: `Join me on Snoozer! Use my invite code: ${inviteCode}\n\n${inviteLink}`,
      });
    } catch (error) {
    }
  }, [inviteCode, inviteLink]);

  const handleShareWhatsApp = useCallback(async () => {
    const message = encodeURIComponent(`Join me on Snoozer! Use my invite code: ${inviteCode}\n\n${inviteLink}`);
    const url = `whatsapp://send?text=${message}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        handleShareMessages();
      }
    } catch (error) {
      handleShareMessages();
    }
  }, [inviteCode, inviteLink, handleShareMessages]);

  const handleSkipToCode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('JoinCode');
  }, [navigation]);

  const handleWaitForBuddy = useCallback(async () => {
    if (!inviteCode) {
      // Create invite first if we don't have one
      const code = await createInvite();
      if (!code) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('WaitingForBuddy', {
        mode,
        isHost: true,
        code,
        buddyName: 'Buddy',
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('WaitingForBuddy', {
        mode,
        isHost: true,
        code: inviteCode,
        buddyName: 'Buddy',
      });
    }
  }, [inviteCode, createInvite, navigation, mode]);

  const handleStep2Continue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(3);
  }, []);

  const handleFinish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

  const canContinueStep2 = (): boolean => {
    switch (mode) {
      case '1v1':
        return selectedAmount !== null;
      case 'group':
        return groupName.trim().length > 0 && selectedAmount !== null;
      case 'survivor':
        return selectedAmount !== null;
      case 'accountability':
        return true;
      case 'charity':
        return selectedCharity !== null && amountPerSnooze !== null;
      default:
        return false;
    }
  };

  const getStep1Title = (): string => {
    if (mode === 'group' || mode === 'survivor') {
      return 'Create your group';
    }
    return 'Invite your buddy';
  };

  const getAmounts = (): number[] => {
    switch (mode) {
      case '1v1':
        return [5, 10, 15, 20];
      case 'group':
        return [5, 10, 15];
      case 'survivor':
        return [10, 25, 50];
      case 'charity':
        return [1, 2, 5];
      default:
        return [];
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>{getStep1Title()}</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Share your invite link to get started
        </ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardLabel}>Your invite link</ThemedText>
        <View style={styles.linkRow}>
          <ThemedText style={styles.linkText}>{inviteLink || 'Creating link...'}</ThemedText>
          <Pressable
            style={[styles.copyButton, copied && { backgroundColor: '#22C55E' }]}
            onPress={handleCopyLink}
            testID="button-copy-link"
          >
            <Text style={{ fontSize: 16 }}>{copied ? '\u2713' : '\uD83D\uDCCB'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.shareRow}>
        <Pressable
          style={styles.shareButton}
          onPress={handleShareMessages}
          testID="button-share-messages"
        >
          <Text style={{ fontSize: 20 }}>{'\uD83D\uDCAC'}</Text>
          <ThemedText style={styles.shareButtonText}>Messages</ThemedText>
        </Pressable>
        <Pressable
          style={styles.shareButton}
          onPress={handleShareWhatsApp}
          testID="button-share-whatsapp"
        >
          <Text style={{ fontSize: 20 }}>{'\uD83D\uDCDE'}</Text>
          <ThemedText style={styles.shareButtonText}>WhatsApp</ThemedText>
        </Pressable>
        <Pressable
          style={styles.shareButton}
          onPress={handleCopyLink}
          testID="button-share-copy"
        >
          <Text style={{ fontSize: 20 }}>{'\uD83D\uDD17'}</Text>
          <ThemedText style={styles.shareButtonText}>Copy Link</ThemedText>
        </Pressable>
      </View>

      <View style={styles.qrSection}>
        <View style={styles.qrPlaceholder}>
          <Text style={{ fontSize: 48 }}>{'\uD83D\uDD32'}</Text>
          <ThemedText style={styles.qrText}>QR Code</ThemedText>
        </View>
        <ThemedText style={styles.qrLabel}>Scan for in-person</ThemedText>
      </View>

      {isCreatingInvite ? (
        <View style={styles.waitingCard}>
          <PulsingDot color={modeInfo.color} />
          <ThemedText style={styles.waitingText}>Creating invite...</ThemedText>
        </View>
      ) : (
        <Pressable
          style={[styles.primaryButton, { backgroundColor: modeInfo.color, shadowColor: modeInfo.color }]}
          onPress={handleWaitForBuddy}
          testID="button-wait-for-buddy"
        >
          <ThemedText style={styles.primaryButtonText}>
            {mode === 'group' || mode === 'survivor' ? 'Start waiting for members' : 'Wait for buddy to join'}
          </ThemedText>
        </Pressable>
      )}

      <Pressable style={styles.skipButton} onPress={handleSkipToCode} testID="button-enter-code">
        <ThemedText style={styles.skipButtonText}>Already have a code? </ThemedText>
        <ThemedText style={[styles.skipButtonLink, { color: modeInfo.color }]}>Enter it here</ThemedText>
      </Pressable>
    </View>
  );

  const renderStep2_1v1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Set your weekly stake</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Loser pays winner every Sunday
        </ThemedText>
      </View>

      <View style={styles.amountSelector}>
        {getAmounts().map(amount => (
          <AmountPill
            key={amount}
            amount={amount}
            isSelected={selectedAmount === amount}
            onSelect={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedAmount(amount);
            }}
            color={modeInfo.color}
          />
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardIconCircle}>
            <Text style={{ fontSize: 20 }}>{'\uD83D\uDCB3'}</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <ThemedText style={styles.cardRowTitle}>Add payment method</ThemedText>
            <ThemedText style={styles.cardRowSubtitle}>Required to participate</ThemedText>
          </View>
          <Text style={{ fontSize: 20, color: '#57534E' }}>{'\u203A'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.cardIconCircle, { backgroundColor: '#7C3AED20' }]}>
            <ThemedText style={styles.venmoText}>V</ThemedText>
          </View>
          <View style={styles.cardTextContainer}>
            <ThemedText style={styles.cardRowTitle}>Connect Venmo</ThemedText>
            <ThemedText style={styles.cardRowSubtitle}>Instant payouts</ThemedText>
          </View>
          <Text style={{ fontSize: 20, color: '#57534E' }}>{'\u203A'}</Text>
        </View>
      </View>
    </View>
  );

  const renderStep2_Group = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Group settings</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Winner takes all each week
        </ThemedText>
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.inputLabel}>Group name</ThemedText>
        <TextInput
          style={styles.textInput}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g., Early Birds Club"
          placeholderTextColor="#57534E"
        />
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.inputLabel}>Weekly buy-in</ThemedText>
        <View style={styles.amountSelector}>
          {getAmounts().map(amount => (
            <AmountPill
              key={amount}
              amount={amount}
              isSelected={selectedAmount === amount}
              onSelect={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedAmount(amount);
              }}
              color={modeInfo.color}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardLabel}>Pending members</ThemedText>
        {pendingMembers.length > 0 ? (
          pendingMembers.map((member, i) => (
            <View key={i} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <ThemedText style={styles.memberInitial}>{member.charAt(0)}</ThemedText>
              </View>
              <ThemedText style={styles.memberName}>{member}</ThemedText>
            </View>
          ))
        ) : (
          <View style={styles.emptyMembers}>
            <PulsingDot color={modeInfo.color} />
            <ThemedText style={styles.emptyMembersText}>Waiting for members to join...</ThemedText>
          </View>
        )}
      </View>

      <ThemedText style={styles.minPlayersNote}>Minimum 3 people to start</ThemedText>
    </View>
  );

  const renderStep2_Survivor = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Tournament setup</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Miss one wake-up = eliminated
        </ThemedText>
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.inputLabel}>Buy-in amount</ThemedText>
        <View style={styles.amountSelector}>
          {getAmounts().map(amount => (
            <AmountPill
              key={amount}
              amount={amount}
              isSelected={selectedAmount === amount}
              onSelect={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedAmount(amount);
              }}
              color={modeInfo.color}
            />
          ))}
        </View>
      </View>

      <View style={styles.prizePoolCard}>
        <ThemedText style={styles.prizePoolLabel}>Current prize pool</ThemedText>
        <ThemedText style={[styles.prizePoolAmount, { color: modeInfo.color }]}>
          ${selectedAmount ? selectedAmount * (pendingMembers.length + 1) : 0}
        </ThemedText>
        <ThemedText style={styles.prizePoolPlayers}>
          {pendingMembers.length + 1} player{pendingMembers.length > 0 ? 's' : ''} joined
        </ThemedText>
      </View>

      <ThemedText style={styles.minPlayersNote}>Minimum 4 people to start tournament</ThemedText>
    </View>
  );

  const renderStep2_Accountability = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Partnership preferences</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Customize your accountability experience
        </ThemedText>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText style={styles.toggleTitle}>Get notified when they snooze</ThemedText>
            <ThemedText style={styles.toggleSubtitle}>Know when your partner struggles</ThemedText>
          </View>
          <Toggle
            value={notifyOnSnooze}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNotifyOnSnooze(!notifyOnSnooze);
            }}
            color={modeInfo.color}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText style={styles.toggleTitle}>Share your streak with them</ThemedText>
            <ThemedText style={styles.toggleSubtitle}>Celebrate wins together</ThemedText>
          </View>
          <Toggle
            value={shareStreak}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShareStreak(!shareStreak);
            }}
            color={modeInfo.color}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <ThemedText style={styles.toggleTitle}>Allow nudges</ThemedText>
            <ThemedText style={styles.toggleSubtitle}>Let them send you wake-up reminders</ThemedText>
          </View>
          <Toggle
            value={allowNudges}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAllowNudges(!allowNudges);
            }}
            color={modeInfo.color}
          />
        </View>
      </View>

      <View style={styles.noPaymentBadge}>
        <Text style={{ fontSize: 16 }}>{'\u2764\uFE0F'}</Text>
        <ThemedText style={styles.noPaymentText}>No payment required for this mode</ThemedText>
      </View>
    </View>
  );

  const renderStep2_Charity = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <ThemedText style={styles.stepTitle}>Charity setup</ThemedText>
        <ThemedText style={styles.stepSubtitle}>
          Pick one you hate for extra motivation
        </ThemedText>
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.inputLabel}>Pick a charity</ThemedText>
        <View style={styles.charityList}>
          {CHARITIES.map(charity => (
            <Pressable
              key={charity.id}
              style={[
                styles.charityPill,
                selectedCharity === charity.id && {
                  backgroundColor: `${modeInfo.color}20`,
                  borderColor: `${modeInfo.color}50`,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCharity(charity.id);
              }}
            >
              <ThemedText
                style={[
                  styles.charityPillText,
                  selectedCharity === charity.id && { color: modeInfo.color },
                ]}
              >
                {charity.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.inputLabel}>Amount per snooze</ThemedText>
        <View style={styles.amountSelector}>
          {getAmounts().map(amount => (
            <AmountPill
              key={amount}
              amount={amount}
              isSelected={amountPerSnooze === amount}
              onSelect={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAmountPerSnooze(amount);
              }}
              color={modeInfo.color}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={{ fontSize: 18 }}>{'\uD83D\uDC41\uFE0F'}</Text>
          <ThemedText style={styles.verifyText}>Your buddy will verify your wake-ups</ThemedText>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardIconCircle}>
            <Text style={{ fontSize: 20 }}>{'\uD83D\uDCB3'}</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <ThemedText style={styles.cardRowTitle}>Connect payment method</ThemedText>
            <ThemedText style={styles.cardRowSubtitle}>Required for auto-donations</ThemedText>
          </View>
          <Text style={{ fontSize: 20, color: '#57534E' }}>{'\u203A'}</Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => {
    switch (mode) {
      case '1v1':
        return renderStep2_1v1();
      case 'group':
        return renderStep2_Group();
      case 'survivor':
        return renderStep2_Survivor();
      case 'accountability':
        return renderStep2_Accountability();
      case 'charity':
        return renderStep2_Charity();
      default:
        return null;
    }
  };

  const renderStep3 = () => {
    const getStakesLabel = (): string => {
      switch (mode) {
        case '1v1':
          return `$${selectedAmount}/week`;
        case 'group':
          return `$${selectedAmount} buy-in`;
        case 'survivor':
          return `$${selectedAmount} buy-in`;
        case 'accountability':
          return 'Free';
        case 'charity':
          return `$${amountPerSnooze}/snooze`;
        default:
          return '';
      }
    };

    return (
      <View style={styles.stepContent}>
        <View style={styles.successContainer}>
          <View style={[styles.successCircle, { backgroundColor: `${modeInfo.color}20` }]}>
            <Text style={{ fontSize: 48 }}>{'\u2713'}</Text>
          </View>
          <ThemedText style={styles.successTitle}>You're all set!</ThemedText>
          <ThemedText style={styles.successSubtitle}>
            Your competition starts tomorrow morning
          </ThemedText>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Mode</ThemedText>
            <View style={styles.summaryValue}>
              <View style={[styles.summaryIcon, { backgroundColor: `${modeInfo.color}20` }]}>
                <Text style={{ fontSize: 14 }}>{modeInfo.icon}</Text>
              </View>
              <ThemedText style={styles.summaryValueText}>{modeInfo.title}</ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Stakes</ThemedText>
            <ThemedText style={[styles.summaryValueText, { color: modeInfo.color }]}>
              {getStakesLabel()}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Buddy</ThemedText>
            <View style={styles.summaryValue}>
              <View style={styles.buddyAvatar}>
                <ThemedText style={styles.buddyInitial}>{buddyName.charAt(0)}</ThemedText>
              </View>
              <ThemedText style={styles.summaryValueText}>{buddyName}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} testID="button-back">
          <Text style={{ fontSize: 24, color: Colors.text }}>{'\u2190'}</Text>
        </Pressable>
        <View style={styles.progressContainer}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i + 1 === step && { backgroundColor: modeInfo.color },
                i + 1 < step && { backgroundColor: `${modeInfo.color}50` },
              ]}
            />
          ))}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {step === 2 && (
        <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: canContinueStep2() ? modeInfo.color : '#292524',
                shadowColor: canContinueStep2() ? modeInfo.color : 'transparent',
                shadowOpacity: canContinueStep2() ? 0.4 : 0,
              },
            ]}
            onPress={handleStep2Continue}
            disabled={!canContinueStep2()}
            testID="button-continue-step2"
          >
            <ThemedText
              style={[
                styles.primaryButtonText,
                { color: canContinueStep2() ? '#FAFAF9' : '#57534E' },
              ]}
            >
              {mode === 'accountability' ? 'Start partnership' : 'Continue'}
            </ThemedText>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: modeInfo.color, shadowColor: modeInfo.color },
            ]}
            onPress={handleFinish}
            testID="button-finish"
          >
            <ThemedText style={styles.primaryButtonText}>Let's go!</ThemedText>
            <Text style={{ fontSize: 20, color: '#FAFAF9' }}>{'\u2192'}</Text>
          </Pressable>
        </View>
      )}
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#292524',
  },
  headerSpacer: {
    width: 44,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  stepContent: {
    flex: 1,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },

  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shareRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#1C1917',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },

  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1C1917',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qrText: {
    fontSize: 11,
    color: '#57534E',
    marginTop: 4,
  },
  qrLabel: {
    fontSize: 12,
    color: '#57534E',
  },

  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: '#1C1917',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  waitingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAF9',
  },

  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  skipButtonText: {
    fontSize: 13,
    color: '#57534E',
  },
  skipButtonLink: {
    fontSize: 13,
    fontWeight: '500',
  },

  amountSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  amountPill: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#141211',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  amountPillText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardRowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  cardRowSubtitle: {
    fontSize: 13,
    color: '#57534E',
  },
  venmoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7C3AED',
  },

  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1C1917',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  memberName: {
    fontSize: 15,
    color: Colors.text,
  },
  emptyMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  emptyMembersText: {
    fontSize: 14,
    color: '#57534E',
  },
  minPlayersNote: {
    fontSize: 13,
    color: '#57534E',
    textAlign: 'center',
    marginTop: 8,
  },

  prizePoolCard: {
    backgroundColor: '#1C1917',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  prizePoolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  prizePoolAmount: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 4,
  },
  prizePoolPlayers: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#57534E',
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  noPaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  noPaymentText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  charityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  charityPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#141211',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charityPillText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  verifyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  summaryCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#57534E',
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryValueText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },

  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    backgroundColor: 'rgba(12, 10, 9, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.bgElevated,
  },
});
