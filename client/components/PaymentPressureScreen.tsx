import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/theme';
import { useIMessage } from '@/hooks/useIMessage';

interface PaymentPressureScreenProps {
  visible: boolean;
  amount: number;
  recipientName: string;
  recipientPhone: string;
  onPaymentSent: () => void;
  onShameTriggered: () => void;
}

export function PaymentPressureScreen({
  visible,
  amount,
  recipientName,
  recipientPhone,
  onPaymentSent,
  onShameTriggered,
}: PaymentPressureScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [volumeLevel, setVolumeLevel] = useState(70);
  const [shameStage, setShameStage] = useState(0);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { sendAppleCash } = useIMessage();

  const pulseAnim = useSharedValue(0);
  const shakeAnim = useSharedValue(0);
  const countdownScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setSecondsLeft(30);
      setVolumeLevel(70);
      setShameStage(0);

      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1
      );

      shakeAnim.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 100 }),
          withTiming(4, { duration: 100 }),
          withTiming(-4, { duration: 100 }),
          withTiming(0, { duration: 100 })
        ),
        -1
      );
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (secondsLeft <= 0) {
      setShameStage(2);
      onShameTriggered();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(s => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, visible]);

  useEffect(() => {
    if (!visible) return;
    const volumeTimer = setInterval(() => {
      setVolumeLevel(v => Math.min(v + 2, 100));
    }, 2000);
    return () => clearInterval(volumeTimer);
  }, [visible]);

  useEffect(() => {
    if (secondsLeft <= 20 && shameStage === 0) {
      setShameStage(1);
    }
  }, [secondsLeft, shameStage]);

  useEffect(() => {
    if (secondsLeft <= 10) {
      countdownScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 150 }),
          withTiming(1, { duration: 150 })
        ),
        -1
      );
    }
  }, [secondsLeft]);

  const getUrgencyColor = () => {
    if (secondsLeft <= 10) return '#DC2626';
    if (secondsLeft <= 20) return '#EF4444';
    return '#F97316';
  };

  const getUrgencyMessage = () => {
    if (secondsLeft <= 5) return "SHAME VIDEO IMMINENT";
    if (secondsLeft <= 10) return "LAST CHANCE";
    if (secondsLeft <= 20) return `${recipientName.toUpperCase()} IS BEING NOTIFIED`;
    return "PAY NOW TO STOP ALARM";
  };

  const containerAnimStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pulseAnim.value,
      [0, 1],
      ['#0C0A09', '#1A0505']
    ),
  }));

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value * 0.15 + 0.05,
  }));

  const urgencyAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  const countdownAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
  }));

  const handlePayPress = async () => {
    if (!recipientPhone) {
      setErrorMessage('No buddy phone number configured');
      return;
    }
    setSending(true);
    setErrorMessage(null);

    const result = await sendAppleCash(recipientPhone, amount);

    if (result.success) {
      onPaymentSent();
    } else if (result.error) {
      setErrorMessage(result.error);
    }
    setSending(false);
  };

  if (!visible) return null;

  const urgencyColor = getUrgencyColor();

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <Animated.View style={[styles.container, containerAnimStyle]}>
        <Animated.View style={[styles.redOverlay, overlayAnimStyle]} />

        <View style={styles.alarmBar}>
          <View style={styles.alarmDot} />
          <ThemedText style={styles.alarmText}>ALARM RINGING</ThemedText>
          <View style={styles.alarmDot} />
        </View>

        <View style={styles.content}>
          <View style={styles.countdownSection}>
            <ThemedText style={styles.countdownLabel}>Shame video plays in</ThemedText>
            <Animated.View style={countdownAnimStyle}>
              <ThemedText style={[styles.countdownNumber, { color: urgencyColor }]}>
                {secondsLeft}
              </ThemedText>
            </Animated.View>
            <ThemedText style={styles.countdownUnit}>seconds</ThemedText>
          </View>

          <Animated.View style={[
            styles.urgencyBanner,
            { backgroundColor: `${urgencyColor}20`, borderColor: `${urgencyColor}50` },
            urgencyAnimStyle
          ]}>
            <ThemedText style={[styles.urgencyText, { color: urgencyColor }]}>
              {getUrgencyMessage()}
            </ThemedText>
          </Animated.View>

          <View style={styles.volumeSection}>
            <View style={styles.volumeHeader}>
              <Text style={{ fontSize: 20 }}>🔊</Text>
              <ThemedText style={[
                styles.volumeLabel,
                { color: volumeLevel >= 90 ? '#EF4444' : '#FB923C' }
              ]}>
                {volumeLevel >= 100 ? 'MAX VOLUME' : `Volume: ${volumeLevel}%`}
              </ThemedText>
            </View>
            <View style={styles.volumeBarBg}>
              <View style={[
                styles.volumeBarFill,
                { 
                  width: `${volumeLevel}%`,
                  backgroundColor: volumeLevel >= 90 ? '#EF4444' : '#FB923C'
                }
              ]} />
            </View>
          </View>

          <View style={styles.paymentCard}>
            <ThemedText style={styles.paymentLabel}>SEND NOW</ThemedText>
            
            <View style={styles.paymentAmount}>
              <ThemedText style={styles.dollarSign}>$</ThemedText>
              <ThemedText style={styles.amount}>{amount}</ThemedText>
            </View>
            
            <View style={styles.recipientRow}>
              <ThemedText style={styles.recipientLabel}>to</ThemedText>
              <ThemedText style={styles.recipientName}>{recipientName}</ThemedText>
            </View>

            <View style={styles.appleCashBadge}>
              <Text style={{ fontSize: 14 }}>📱</Text>
              <ThemedText style={styles.appleCashText}>Apple Cash</ThemedText>
            </View>
          </View>

          {shameStage >= 1 ? (
            <View style={styles.shameStatus}>
              <View style={styles.shameItem}>
                <View style={[
                  styles.shameDot,
                  { backgroundColor: shameStage >= 2 ? '#EF4444' : '#FB923C' }
                ]} />
                <ThemedText style={styles.shameText}>
                  {shameStage >= 2 
                    ? `${recipientName} notified of your failure` 
                    : `Notifying ${recipientName}...`}
                </ThemedText>
              </View>
              {shameStage >= 2 ? (
                <View style={styles.shameItem}>
                  <View style={[styles.shameDot, { backgroundColor: '#EF4444' }]} />
                  <ThemedText style={styles.shameText}>Shame video playing at max volume</ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.consequencesList}>
            <View style={styles.consequenceItem}>
              <Text style={{ fontSize: 18 }}>✓</Text>
              <ThemedText style={styles.consequenceText}>Alarm will stop</ThemedText>
            </View>
            <View style={styles.consequenceItem}>
              <Text style={{ fontSize: 18 }}>✓</Text>
              <ThemedText style={styles.consequenceText}>Shame video cancelled</ThemedText>
            </View>
            <View style={styles.consequenceItem}>
              <Text style={{ fontSize: 18 }}>✓</Text>
              <ThemedText style={styles.consequenceText}>{recipientName} gets ${amount}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable 
            style={styles.payButton} 
            onPress={handlePayPress}
            disabled={sending}
          >
            <Text style={{ fontSize: 22 }}>💬</Text>
            <ThemedText style={styles.payButtonText}>
              {sending ? 'Opening...' : 'Open iMessage to Pay'}
            </ThemedText>
          </Pressable>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            </View>
          )}

          <View style={styles.instructions}>
            <View style={styles.instructionStep}>
              <View style={styles.stepNum}>
                <ThemedText style={styles.stepNumText}>1</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>Tap send in iMessage</ThemedText>
            </View>
            <ThemedText style={styles.instructionArrow}>→</ThemedText>
            <View style={styles.instructionStep}>
              <View style={styles.stepNum}>
                <ThemedText style={styles.stepNumText}>2</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>Double-tap for Face ID</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.footerWarning}>
            This is the only way to stop the alarm
          </ThemedText>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  redOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EF4444',
  },

  alarmBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  alarmDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FAFAF9',
  },
  alarmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAF9',
    letterSpacing: 2,
  },

  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },

  countdownSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#78716C',
    marginBottom: 4,
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: '800',
    lineHeight: 100,
  },
  countdownUnit: {
    fontSize: 16,
    color: '#78716C',
    marginTop: 4,
  },

  urgencyBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },

  volumeSection: {
    width: '100%',
    marginBottom: 20,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  volumeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  volumeBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#292524',
    borderRadius: 4,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  paymentCard: {
    width: '100%',
    backgroundColor: '#1C1917',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 2,
    marginBottom: 8,
  },
  paymentAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dollarSign: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.text,
    marginRight: 2,
  },
  amount: {
    fontSize: 72,
    fontWeight: '800',
    color: Colors.text,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  recipientLabel: {
    fontSize: 18,
    color: '#78716C',
  },
  recipientName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  appleCashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#292524',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  appleCashText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 0,
  },

  shameStatus: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  shameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shameDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  shameText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  consequencesList: {
    width: '100%',
    gap: 10,
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  consequenceText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0C0A09',
  },

  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  stepText: {
    fontSize: 13,
    color: '#A8A29E',
  },
  instructionArrow: {
    fontSize: 16,
    color: '#57534E',
  },

  footerWarning: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },

  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
  },
});
