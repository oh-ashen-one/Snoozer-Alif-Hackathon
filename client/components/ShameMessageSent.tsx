/**
 * SHAME MESSAGE SENT
 * ShameMessageSent.tsx
 *
 * Confirmation component shown after shame messages are sent to buddies.
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';

interface ShameContact {
  name: string;
  type: string;
}

interface ShameMessageSentProps {
  contacts: ShameContact[];
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function ShameMessageSent({
  contacts,
  onDismiss,
  autoDismissMs = 3000,
}: ShameMessageSentProps) {
  const checkmarkScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate checkmark
    checkmarkScale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 })
    );

    // Fade in content
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    // Auto dismiss
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss, checkmarkScale, contentOpacity]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.checkmarkContainer, checkmarkStyle]}>
        <Feather name="check" size={48} color={Colors.text} />
      </Animated.View>

      <ThemedText style={styles.title}>Shame sent.</ThemedText>

      <Animated.View style={[styles.contactsList, contentStyle]}>
        {contacts.map((contact, index) => (
          <View key={index} style={styles.contactRow}>
            <View style={styles.checkmark}>
              <Feather name="check" size={14} color={Colors.text} />
            </View>
            <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
            <ThemedText style={styles.contactType}>{contact.type}</ThemedText>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={contentStyle}>
        <ThemedText style={styles.message}>
          They know you failed. Don't let it happen again.
        </ThemedText>
      </Animated.View>

      <Pressable style={styles.button} onPress={onDismiss}>
        <ThemedText style={styles.buttonText}>I'll do better</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  contactsList: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 24,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  contactType: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  message: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});
