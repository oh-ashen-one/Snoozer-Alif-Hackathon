/**
 * PAYMENT SETTINGS SCREEN
 * PaymentSettingsScreen.tsx
 *
 * Comprehensive payment settings with payment method selection,
 * default amount, recipient info, and how it works explanation.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Polyline, Circle, Line } from 'react-native-svg';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import Header from '@/components/Header';
import { useIMessage } from '@/hooks/useIMessage';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  PaymentMethod,
  PaymentInfo,
  savePaymentInfo,
  getPaymentInfo,
} from '@/utils/payments';
import { getDefaultAmount, saveDefaultAmount, getBuddyInfo, saveBuddyInfo, BuddyInfo } from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ════════════════════════════════════════════════════════════════
// ICONS
// ════════════════════════════════════════════════════════════════

const CheckIcon = ({ size = 14, color = '#0C0A09' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

const AppleIcon = ({ size = 22, color = '#FAFAF9' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
  </Svg>
);

const SparkleIcon = ({ size = 14, color = '#22C55E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2L9.5 9.5L2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
  </Svg>
);

const InfoIcon = ({ size = 18, color = '#78716C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10} />
    <Line x1={12} y1={16} x2={12} y2={12} />
    <Line x1={12} y1={8} x2={12.01} y2={8} />
  </Svg>
);

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  subtitle: string;
  color: string;
  disabled?: boolean;
  badges?: string[];
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'apple_cash',
    label: 'Apple Cash',
    subtitle: 'via iMessage',
    color: '#22C55E',
    badges: ['Instant', 'No fees'],
  },
  {
    id: 'venmo',
    label: 'Venmo',
    subtitle: 'Coming soon',
    color: '#008CFF',
    disabled: true,
  },
  {
    id: 'paypal',
    label: 'PayPal',
    subtitle: 'Coming soon',
    color: '#003087',
    disabled: true,
  },
];

const AMOUNT_OPTIONS = [1, 5, 10, 20];

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function PaymentSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  // State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('apple_cash');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [buddy, setBuddy] = useState<BuddyInfo | null>(null);

  const { sendAppleCash } = useIMessage();

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load payment info
        const paymentInfo = await getPaymentInfo();
        if (paymentInfo?.method) {
          setSelectedMethod(paymentInfo.method);
        }

        // Load default amount
        const amount = await getDefaultAmount();
        if (AMOUNT_OPTIONS.includes(amount)) {
          setSelectedAmount(amount);
        } else if (amount > 0) {
          setShowCustomInput(true);
          setCustomAmount(amount.toString());
          setSelectedAmount(null);
        }

        // Load buddy info
        const buddyInfo = await getBuddyInfo();
        setBuddy(buddyInfo);
      } catch (error) {
        // Use defaults
      }
    };
    loadData();
  }, []);

  // Handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleSelectMethod = useCallback(async (method: PaymentMethod) => {
    if (PAYMENT_OPTIONS.find(o => o.id === method)?.disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMethod(method);
    // Save immediately
    const currentInfo = await getPaymentInfo();
    await savePaymentInfo({ ...currentInfo, method } as PaymentInfo);
  }, []);

  const handleSelectAmount = useCallback(async (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAmount(amount);
    setShowCustomInput(false);
    setCustomAmount('');
    await saveDefaultAmount(amount);
  }, []);

  const handleCustomClick = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowCustomInput(true);
    setSelectedAmount(null);
  }, []);

  const handleCustomAmountChange = useCallback(async (text: string) => {
    setCustomAmount(text);
    const amount = parseInt(text, 10);
    if (!isNaN(amount) && amount > 0) {
      await saveDefaultAmount(amount);
    }
  }, []);

  const handleEditBuddy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('InviteBuddyiMessage', {});
  }, [navigation]);

  const handleLearnMore = useCallback(() => {
    Linking.openURL('https://support.apple.com/apple-cash');
  }, []);

  const handleAccessContacts = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Contacts Access Required',
          'Please enable contacts access in Settings to select a buddy.'
        );
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;

      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Buddy';
      const phone = contact.phoneNumbers?.[0]?.number || '';

      if (!phone) {
        Alert.alert('No Phone Number', 'Selected contact has no phone number.');
        return;
      }

      const buddyInfo: BuddyInfo = {
        name,
        phone,
        invitedAt: new Date().toISOString(),
        hasApp: false,
      };
      await saveBuddyInfo(buddyInfo);
      setBuddy(buddyInfo);
    } catch (error) {
      Alert.alert('Error', 'Unable to access contacts.');
    }
  }, []);

  // Test Apple Cash handler
  const handleTestPayment = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!buddy?.phone) {
      Alert.alert(
        'Buddy Not Configured',
        'You need to add a buddy before testing Apple Cash.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Buddy', onPress: handleEditBuddy },
        ]
      );
      return;
    }

    const amount = selectedAmount || parseInt(customAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert(
        'Amount Not Set',
        'Please select a payment amount before testing.'
      );
      return;
    }

    const result = await sendAppleCash(buddy.phone, amount);
    if (!result.success && result.error) {
      Alert.alert('Error', result.error);
    }
  }, [buddy, selectedAmount, customAmount, handleEditBuddy, sendAppleCash]);

  const displayAmount = selectedAmount || parseInt(customAmount, 10) || 5;

  return (
    <View style={styles.container}>
      <BackgroundGlow color="orange" />

      {/* Header */}
      <View style={{ paddingTop: insets.top + Spacing.sm, paddingHorizontal: Spacing.lg }}>
        <Header type="nav" title="Payment Methods" emoji={'\uD83D\uDCB3'} onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Text */}
        <ThemedText style={styles.introText}>
          When you snooze, we send money to your buddy automatically.
        </ThemedText>

        {/* Payment Methods Section */}
        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>PAYMENT METHOD</ThemedText>

            {PAYMENT_OPTIONS.map((option) => {
              const isSelected = selectedMethod === option.id;
              const isAppleCash = option.id === 'apple_cash';

              return (
                <View key={option.id}>
                  <Pressable
                    style={[
                      styles.methodCard,
                      isSelected && styles.methodCardSelected,
                      option.disabled && styles.methodCardDisabled,
                    ]}
                    onPress={() => handleSelectMethod(option.id)}
                    disabled={option.disabled}
                  >
                    <View style={styles.methodLeft}>
                      <View style={[
                        styles.methodIcon,
                        { backgroundColor: isSelected ? option.color : Colors.border },
                      ]}>
                        {isAppleCash ? (
                          <AppleIcon color={isSelected ? Colors.bg : Colors.text} />
                        ) : (
                          <Text style={{ fontSize: 20 }}>
                            {option.id === 'venmo' ? '💵' : '💳'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.methodInfo}>
                        <ThemedText style={styles.methodName}>{option.label}</ThemedText>
                        <ThemedText style={styles.methodSub}>{option.subtitle}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.methodRight}>
                      {isSelected && !option.disabled && (
                        <View style={[styles.checkCircle, { backgroundColor: option.color }]}>
                          <CheckIcon size={14} />
                        </View>
                      )}
                      {option.badges && isSelected && (
                        <View style={styles.badgesRow}>
                          {option.badges.map((badge) => (
                            <View key={badge} style={styles.badge}>
                              <ThemedText style={styles.badgeText}>{badge}</ThemedText>
                            </View>
                          ))}
                        </View>
                      )}
                      {option.disabled && (
                        <View style={styles.comingSoonBadge}>
                          <ThemedText style={styles.comingSoonText}>Soon</ThemedText>
                        </View>
                      )}
                    </View>
                  </Pressable>

                  {/* Recommended tag for Apple Cash */}
                  {isAppleCash && isSelected && (
                    <View style={styles.recommendedTag}>
                      <SparkleIcon size={14} />
                      <ThemedText style={styles.recommendedText}>
                        Recommended for iPhone users
                      </ThemedText>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </FadeInView>

        <View style={styles.divider} />

        {/* Default Amount Section */}
        <FadeInView delay={200} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>DEFAULT AMOUNT</ThemedText>
            <ThemedText style={styles.sectionSub}>
              How much you lose when you snooze
            </ThemedText>

            <View style={styles.amountGrid}>
              {AMOUNT_OPTIONS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[
                    styles.amountButton,
                    selectedAmount === amount && styles.amountButtonSelected,
                  ]}
                  onPress={() => handleSelectAmount(amount)}
                >
                  <ThemedText style={[
                    styles.amountText,
                    selectedAmount === amount && styles.amountTextSelected,
                  ]}>
                    ${amount}
                  </ThemedText>
                </Pressable>
              ))}
              <Pressable
                style={[
                  styles.amountButton,
                  showCustomInput && styles.amountButtonSelected,
                ]}
                onPress={handleCustomClick}
              >
                <ThemedText style={[
                  styles.amountText,
                  showCustomInput && styles.amountTextSelected,
                ]}>
                  Custom
                </ThemedText>
              </Pressable>
            </View>

            {showCustomInput && (
              <View style={styles.customInputWrapper}>
                <ThemedText style={styles.customDollar}>$</ThemedText>
                <TextInput
                  style={styles.customInput}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  keyboardType="number-pad"
                  autoFocus
                />
              </View>
            )}

            {/* Stakes reminder */}
            <View style={styles.stakesCard}>
              <ThemedText style={styles.stakesIcon}>💸</ThemedText>
              <View style={styles.stakesContent}>
                <ThemedText style={styles.stakesTitle}>
                  Higher stakes = better results.
                </ThemedText>
                <ThemedText style={styles.stakesText}>
                  Users who set $10+ wake up 3x more consistently.
                </ThemedText>
              </View>
            </View>
          </View>
        </FadeInView>

        <View style={styles.divider} />

        {/* Recipient Section */}
        <FadeInView delay={300} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>RECIPIENT</ThemedText>
            <ThemedText style={styles.sectionSub}>
              Who gets your money when you fail
            </ThemedText>

            <Pressable style={styles.recipientCard} onPress={handleEditBuddy}>
              <View style={styles.recipientAvatar}>
                <ThemedText style={styles.recipientAvatarText}>
                  {buddy?.name?.charAt(0) || 'B'}
                </ThemedText>
              </View>
              <View style={styles.recipientInfo}>
                <ThemedText style={styles.recipientName}>
                  {buddy?.name || 'Add a buddy'}
                </ThemedText>
                <ThemedText style={styles.recipientPhone}>
                  {buddy?.phone || 'Tap to add phone number'}
                </ThemedText>
              </View>
              <View style={styles.editButton}>
                <ThemedText style={styles.editButtonText}>Edit</ThemedText>
                <Text style={{ fontSize: 16, color: Colors.textMuted }}>›</Text>
              </View>
            </Pressable>
          </View>
        </FadeInView>

        <View style={styles.divider} />

        {/* Test Apple Cash Section */}
        <FadeInView delay={500} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>TEST YOUR SETUP</ThemedText>
            <ThemedText style={styles.sectionSub}>
              Make sure Apple Cash is working before your first alarm
            </ThemedText>

            <Pressable style={styles.testButton} onPress={handleTestPayment}>
              <Text style={{ fontSize: 20 }}>🧪</Text>
              <ThemedText style={styles.testButtonText}>
                Test Apple Cash
              </ThemedText>
            </Pressable>

            <ThemedText style={styles.testNote}>
              Opens iMessage with payment ready. Tap Send to complete Apple Cash transfer.
            </ThemedText>
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  // Intro
  introText: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },

  // Section
  section: {
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  sectionSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
  },

  // Method Cards
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  methodCardSelected: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    gap: 2,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  methodSub: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  methodRight: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.green,
  },
  comingSoonBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  recommendedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  recommendedText: {
    fontSize: 13,
    color: Colors.green,
  },

  // Amount Selector
  amountGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  amountButton: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  amountButtonSelected: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  amountTextSelected: {
    color: Colors.bg,
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  customDollar: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.orange,
    marginRight: 4,
  },
  customInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
  },

  // Stakes Card
  stakesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  stakesIcon: {
    fontSize: 24,
  },
  stakesContent: {
    flex: 1,
  },
  stakesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  stakesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Recipient Card
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  recipientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  recipientAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.bg,
  },
  recipientInfo: {
    flex: 1,
    gap: 2,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  recipientPhone: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: Colors.textMuted,
  },

  // Steps
  stepsContainer: {
    marginTop: Spacing.lg,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 13,
  },

  // Note Card
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xl,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  noteLink: {
    color: Colors.orange,
  },

  // Test Button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.orange,
    borderRadius: BorderRadius.md,
    paddingVertical: 18,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.bg,
  },
  testNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
