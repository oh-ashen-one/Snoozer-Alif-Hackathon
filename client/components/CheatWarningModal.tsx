import React from 'react';
import { View, StyleSheet, Modal, Pressable, Text } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import type { CheatType } from '@/hooks/useAntiCheat';

interface CheatMessage {
  emoji: string;
  title: string;
  message: string;
}

const CHEAT_MESSAGES: Record<CheatType, CheatMessage> = {
  photo_too_old: {
    emoji: '📷',
    title: 'Nice try, time traveler',
    message: 'That photo is too old. Take a fresh one.',
  },
  time_manipulation: {
    emoji: '⏰',
    title: 'Clock manipulation detected',
    message: "Changing your phone's time won't work here.",
  },
  app_killed: {
    emoji: '⚠️',
    title: 'App killed? Really?',
    message: "Your alarm doesn't care. It's back.",
  },
  shake_detected: {
    emoji: '🏃',
    title: 'Shaking detected',
    message: "Walk, don't shake. Those steps don't count.",
  },
  clock_drift: {
    emoji: '⏰',
    title: 'Clock out of sync',
    message: "Your device time doesn't match. Nice try.",
  },
};

interface CheatWarningModalProps {
  visible: boolean;
  cheatType: CheatType | null;
  onDismiss: () => void;
}

export function CheatWarningModal({ visible, cheatType, onDismiss }: CheatWarningModalProps) {
  const content = cheatType ? CHEAT_MESSAGES[cheatType] : CHEAT_MESSAGES.app_killed;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={{ fontSize: 48 }}>{content.emoji}</Text>
          </View>
          <ThemedText style={styles.title}>{content.title}</ThemedText>
          <ThemedText style={styles.message}>{content.message}</ThemedText>
          
          <Pressable style={styles.button} onPress={onDismiss}>
            <ThemedText style={styles.buttonText}>Fine. I'll do it properly.</ThemedText>
          </Pressable>
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
    padding: Spacing.xl,
  },
  container: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.red,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.red,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    lineHeight: 24,
  },
  button: {
    backgroundColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
