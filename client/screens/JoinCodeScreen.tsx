import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { useInvite } from '@/hooks/useInvite';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinCode'>;
type NavigationProp = NativeStackScreenProps<RootStackParamList, 'JoinCode'>['navigation'];

function validateCode(code: string): boolean {
  const validChars = /^[A-Z0-9]{6}$/;
  return validChars.test(code.toUpperCase());
}

export default function JoinCodeScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const { joinInvite } = useInvite();

  // Auto-focus the input
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCodeChange = useCallback((text: string) => {
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(formatted);
    setError('');
  }, []);

  const handleJoin = useCallback(async () => {
    if (!code) {
      setError('Please enter a code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!validateCode(code)) {
      setError('Invalid code. Codes are 6 characters.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinInvite(code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('BuddyJoined', {
        mode: result.mode as any,
        buddyName: result.buddyName,
        stakes: result.mode === 'accountability' ? 'Free' : '$10/week',
      });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Check and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsJoining(false);
    }
  }, [code, navigation, joinInvite]);

  const isCodeComplete = code.length === 6;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BackgroundGlow color="orange" />

      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack} testID="button-back">
          <Text style={{ fontSize: 24 }}>←</Text>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Join with Code</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
        </View>

        <ThemedText style={styles.title}>Enter invite code</ThemedText>
        <ThemedText style={styles.subtitle}>
          Ask your buddy for their 6-character code
        </ThemedText>

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.codeInput, error ? styles.codeInputError : null]}
            value={code}
            onChangeText={handleCodeChange}
            placeholder="ABC123"
            placeholderTextColor="#57534E"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            keyboardType="default"
            returnKeyType="join"
            onSubmitEditing={handleJoin}
            testID="input-code"
          />
          {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
        </View>

        <View style={styles.hintCard}>
          <Text style={{ fontSize: 16 }}>ℹ️</Text>
          <ThemedText style={styles.hintText}>
            Codes are case-insensitive and expire after 24 hours
          </ThemedText>
        </View>
      </View>

      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[
            styles.joinButton,
            isCodeComplete && !isJoining && styles.joinButtonActive,
          ]}
          onPress={handleJoin}
          disabled={!isCodeComplete || isJoining}
          testID="button-join"
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#FAFAF9" />
          ) : (
            <>
              <ThemedText
                style={[
                  styles.joinButtonText,
                  isCodeComplete && styles.joinButtonTextActive,
                ]}
              >
                Join Buddy
              </ThemedText>
              <Text style={{ fontSize: 20, color: isCodeComplete ? '#FAFAF9' : '#57534E' }}>→</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    paddingTop: 40,
  },

  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
  },

  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
  },
  codeInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },

  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },

  bottomCta: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    backgroundColor: 'rgba(12, 10, 9, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.bgElevated,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    backgroundColor: '#292524',
  },
  joinButtonActive: {
    backgroundColor: '#FB923C',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#57534E',
  },
  joinButtonTextActive: {
    color: '#FAFAF9',
  },
});
