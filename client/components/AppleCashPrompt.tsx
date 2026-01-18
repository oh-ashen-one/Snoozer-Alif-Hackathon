/**
 * APPLE CASH PROMPT
 * AppleCashPrompt.tsx
 *
 * Modal shown after snooze to prompt Apple Cash payment to buddy.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Alert,
  Text,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/theme';
import { useIMessage } from '@/hooks/useIMessage';

interface AppleCashPromptProps {
  visible: boolean;
  amount: number;
  recipientName: string;
  recipientPhone: string;
  onPaymentSent: () => void;
  onDismiss: () => void;
}

export function AppleCashPrompt({
  visible,
  amount,
  recipientName,
  recipientPhone,
  onPaymentSent,
  onDismiss,
}: AppleCashPromptProps) {
  const [sending, setSending] = useState(false);
  const { sendAppleCash } = useIMessage();

  const handleSendPayment = async () => {
    if (!recipientPhone) {
      Alert.alert('Error', 'No buddy phone number set');
      return;
    }

    setSending(true);
    try {
      await sendAppleCash(recipientPhone, amount);
      onPaymentSent();
    } catch (error) {
      Alert.alert('Error', 'Could not open Apple Cash. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ThemedText style={styles.emoji}>😤</ThemedText>
          <ThemedText style={styles.title}>You snoozed.</ThemedText>
          <ThemedText style={styles.subtitle}>Time to pay up.</ThemedText>

          <View style={styles.amountCard}>
            <ThemedText style={styles.amountLabel}>
              Send to {recipientName}
            </ThemedText>
            <ThemedText style={styles.amount}>${amount}</ThemedText>
            <View style={styles.methodRow}>
              <Text style={{ fontSize: 14 }}>💬</Text>
              <ThemedText style={styles.method}>via Apple Cash</ThemedText>
            </View>
          </View>

          <Pressable
            style={styles.payButton}
            onPress={handleSendPayment}
            disabled={sending}
          >
            <Text style={{ fontSize: 18 }}>📤</Text>
            <ThemedText style={styles.payButtonText}>
              {sending ? 'Opening...' : `Send $${amount} via iMessage`}
            </ThemedText>
          </Pressable>

          <Pressable style={styles.laterButton} onPress={onDismiss}>
            <ThemedText style={styles.laterButtonText}>I'll pay later</ThemedText>
          </Pressable>

          <ThemedText style={styles.warning}>
            Alarm keeps ringing until you pay 🔊
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.red,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  amountCard: {
    backgroundColor: Colors.bg,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  amount: {
    fontSize: 56,
    fontWeight: '800',
    color: Colors.red,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  method: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  payButton: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    // Glow effect
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  payButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  laterButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  laterButtonText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  warning: {
    fontSize: 13,
    color: Colors.red,
    marginTop: 8,
  },
});
