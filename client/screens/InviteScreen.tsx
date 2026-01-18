import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Share,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { useInvite } from '@/hooks/useInvite';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;
type NavigationProp = NativeStackScreenProps<RootStackParamList, 'Invite'>['navigation'];

function validateCode(code: string): boolean {
  const validChars = /^[A-Z0-9]{6}$/;
  return validChars.test(code.toUpperCase());
}

export default function InviteScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { mode, buddyName } = route.params;

  const [friendCode, setFriendCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const {
    code: inviteCode,
    isLoading,
    error: inviteError,
    createInvite,
    joinInvite,
  } = useInvite(mode);

  const inviteLink = inviteCode ? `https://snoozer.replit.app/join/${inviteCode}` : '';

  // Create invite when screen loads
  useEffect(() => {
    if (!inviteCode && !isLoading) {
      createInvite();
    }
  }, [inviteCode, isLoading, createInvite]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCopyCode = useCallback(async () => {
    await Clipboard.setStringAsync(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteCode]);

  const handleShareMessages = useCallback(async () => {
    try {
      await Share.share({
        message: `Join me on Snoozer! Use my invite code: ${inviteCode}\n\n${inviteLink}`,
      });
    } catch (e) {}
  }, [inviteCode, inviteLink]);

  const handleShareWhatsApp = useCallback(async () => {
    const message = encodeURIComponent(
      `Join me on Snoozer! Use my invite code: ${inviteCode}\n\n${inviteLink}`
    );
    const url = `whatsapp://send?text=${message}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        handleShareMessages();
      }
    } catch (e) {
      handleShareMessages();
    }
  }, [inviteCode, inviteLink, handleShareMessages]);

  const handleCopyLink = useCallback(async () => {
    await Clipboard.setStringAsync(inviteLink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteLink]);

  const handleFriendCodeChange = useCallback((text: string) => {
    const formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setFriendCode(formatted);
    setLocalError('');
  }, []);

  const handleJoinWithCode = useCallback(async () => {
    if (!friendCode) {
      setLocalError('Please enter a code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    if (!validateCode(friendCode)) {
      setLocalError('Invalid code format. Codes are 6 characters.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinInvite(friendCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate directly to BuddyJoined since we successfully joined
      navigation.navigate('BuddyJoined', {
        mode: result.mode,
        buddyName: result.buddyName,
        stakes: result.mode === 'accountability' ? 'Free' : '$10/week',
      });
    } catch (err: any) {
      setLocalError(err.message || 'Failed to join. Check the code and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsJoining(false);
    }
  }, [friendCode, navigation, joinInvite]);

  const handleShareAndWait = useCallback(async () => {
    if (!inviteCode) {
      // Create invite first if we don't have one
      const code = await createInvite();
      if (!code) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('WaitingForBuddy', {
        mode,
        isHost: true,
        code,
        buddyName: buddyName || 'Buddy',
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('WaitingForBuddy', {
        mode,
        isHost: true,
        code: inviteCode,
        buddyName: buddyName || 'Buddy',
      });
    }
  }, [navigation, mode, inviteCode, buddyName, createInvite]);

  if (isLoading || (!inviteCode && !inviteError)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FB923C" />
          <ThemedText style={styles.loadingText}>Creating invite...</ThemedText>
        </View>
      </View>
    );
  }

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
        <ThemedText style={styles.headerTitle}>Invite a Buddy</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.codeSection}>
          <ThemedText style={styles.sectionLabel}>Your invite code</ThemedText>
          <View style={styles.codeCard}>
            <Pressable style={styles.codeDisplay} onPress={handleCopyCode} testID="button-copy-code">
              <ThemedText style={styles.codeText}>{inviteCode || '------'}</ThemedText>
              <View style={[styles.copyBadge, copied && styles.copyBadgeSuccess]}>
                <Text style={{ fontSize: 16 }}>{copied ? '✓' : '📋'}</Text>
              </View>
            </Pressable>
            <ThemedText style={styles.tapHint}>Tap to copy</ThemedText>
          </View>
        </View>

        <View style={styles.shareSection}>
          <ThemedText style={styles.sectionLabel}>Share your code</ThemedText>
          <View style={styles.shareButtons}>
            <Pressable
              style={styles.shareButton}
              onPress={handleShareMessages}
              testID="button-share-messages"
            >
              <View style={[styles.shareIconCircle, { backgroundColor: '#22C55E20' }]}>
                <Text style={{ fontSize: 22 }}>💬</Text>
              </View>
              <ThemedText style={styles.shareButtonText}>Messages</ThemedText>
            </Pressable>

            <Pressable
              style={styles.shareButton}
              onPress={handleShareWhatsApp}
              testID="button-share-whatsapp"
            >
              <View style={[styles.shareIconCircle, { backgroundColor: '#25D36620' }]}>
                <Text style={{ fontSize: 22 }}>📞</Text>
              </View>
              <ThemedText style={styles.shareButtonText}>WhatsApp</ThemedText>
            </Pressable>

            <Pressable
              style={styles.shareButton}
              onPress={handleCopyLink}
              testID="button-copy-link"
            >
              <View style={[styles.shareIconCircle, { backgroundColor: '#FB923C20' }]}>
                <Text style={{ fontSize: 22 }}>🔗</Text>
              </View>
              <ThemedText style={styles.shareButtonText}>Copy Link</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>or</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.joinSection}>
          <ThemedText style={styles.sectionLabel}>Enter friend's code</ThemedText>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.codeInput, localError ? styles.codeInputError : null]}
              value={friendCode}
              onChangeText={handleFriendCodeChange}
              placeholder="ABC123"
              placeholderTextColor="#57534E"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              testID="input-friend-code"
            />
            <Pressable
              style={[
                styles.joinButton,
                friendCode.length === 6 && !isJoining && styles.joinButtonActive,
              ]}
              onPress={handleJoinWithCode}
              disabled={friendCode.length !== 6 || isJoining}
              testID="button-join"
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#FAFAF9" />
              ) : (
                <Text style={{ fontSize: 20, color: friendCode.length === 6 ? '#FAFAF9' : '#57534E' }}>→</Text>
              )}
            </Pressable>
          </View>
          {localError ? <ThemedText style={styles.errorText}>{localError}</ThemedText> : null}
        </View>
      </View>

      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={styles.primaryButton}
          onPress={handleShareAndWait}
          testID="button-share-wait"
        >
          <ThemedText style={styles.primaryButtonText}>Share & Wait for Buddy</ThemedText>
          <Text style={{ fontSize: 18 }}>⏰</Text>
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

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textMuted,
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
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#57534E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  codeSection: {
    marginBottom: 32,
  },
  codeCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
  },
  codeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 4,
  },
  copyBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBadgeSuccess: {
    backgroundColor: '#22C55E',
  },
  tapHint: {
    fontSize: 12,
    color: '#57534E',
    marginTop: 8,
  },

  shareSection: {
    marginBottom: 32,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: '#57534E',
    paddingHorizontal: 16,
  },

  joinSection: {},
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
  },
  codeInputError: {
    borderColor: '#EF4444',
  },
  joinButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonActive: {
    backgroundColor: '#FB923C',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 8,
  },

  bottomCta: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    backgroundColor: 'rgba(12, 10, 9, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.bgElevated,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 18,
    backgroundColor: '#FB923C',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAF9',
  },
});
