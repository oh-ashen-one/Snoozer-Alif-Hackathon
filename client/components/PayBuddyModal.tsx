import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, BorderRadius } from '@/constants/theme';
import {
  PaymentInfo,
  getPaymentInfo,
  openPaymentLink,
  getPaymentMethodLabel,
} from '@/utils/payments';

interface PayBuddyModalProps {
  visible: boolean;
  onClose: () => void;
  buddyName: string;
  amount: number;
  reason: string;
  onPaid?: () => void;
}

export function PayBuddyModal({
  visible,
  onClose,
  buddyName,
  amount,
  reason,
  onPaid,
}: PayBuddyModalProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPaymentInfo();
    }
  }, [visible]);

  const loadPaymentInfo = async () => {
    const info = await getPaymentInfo();
    setPaymentInfo(info);
  };

  const handleSendPayment = useCallback(async () => {
    if (!paymentInfo) {
      Alert.alert(
        'No Payment Method',
        'Please set up a payment method in Settings first.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const success = await openPaymentLink(
      paymentInfo.method,
      paymentInfo,
      amount,
      reason
    );

    setSending(false);

    if (!success) {
      Alert.alert(
        'Could not open payment app',
        'Make sure you have the app installed and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [paymentInfo, amount, reason]);

  const handleMarkAsPaid = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPaid?.();
    onClose();
  }, [onPaid, onClose]);

  const getButtonLabel = () => {
    if (!paymentInfo) return 'Set Up Payment';
    
    switch (paymentInfo.method) {
      case 'apple_cash':
        return 'Send via iMessage';
      case 'venmo':
        return 'Open Venmo';
      case 'paypal':
        return 'Open PayPal';
      case 'cashapp':
        return 'Open Cash App';
      default:
        return 'Send Payment';
    }
  };

  const getButtonEmoji = (): string => {
    if (!paymentInfo) return '⚙️';

    switch (paymentInfo.method) {
      case 'apple_cash':
        return '💬';
      default:
        return '🔗';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={{ fontSize: 28 }}>💵</Text>
            </View>
            <ThemedText style={styles.title}>
              You owe {buddyName}
            </ThemedText>
            <ThemedText style={styles.amount}>
              ${amount}
            </ThemedText>
            <ThemedText style={styles.reason}>
              {reason}
            </ThemedText>
          </View>

          {/* Payment method info */}
          {paymentInfo && (
            <View style={styles.methodInfo}>
              <Text style={{ fontSize: 16 }}>✓</Text>
              <ThemedText style={styles.methodText}>
                Using {getPaymentMethodLabel(paymentInfo.method)}
              </ThemedText>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.payButton, sending && styles.payButtonDisabled]}
              onPress={handleSendPayment}
              disabled={sending}
            >
              <Text style={{ fontSize: 20 }}>{getButtonEmoji()}</Text>
              <ThemedText style={styles.payButtonText}>
                {sending ? 'Opening...' : getButtonLabel()}
              </ThemedText>
            </Pressable>

            <Pressable
              style={styles.markPaidButton}
              onPress={handleMarkAsPaid}
            >
              <ThemedText style={styles.markPaidText}>
                Mark as paid
              </ThemedText>
            </Pressable>
          </View>

          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={{ fontSize: 20 }}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modal: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 24,
    padding: 24,
    margin: 24,
    width: '90%',
    maxWidth: 360,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.red}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.red,
    marginBottom: 8,
  },
  reason: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: `${Colors.green}10`,
    borderRadius: 20,
  },
  methodText: {
    fontSize: 14,
    color: Colors.green,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  markPaidButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  markPaidText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
