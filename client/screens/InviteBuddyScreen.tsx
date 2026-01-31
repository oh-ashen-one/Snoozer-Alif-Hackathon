/**
 * INVITE BUDDY SCREEN
 * InviteBuddyScreen.tsx
 *
 * Screen for inviting an accountability buddy via iMessage.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useIMessage } from '@/hooks/useIMessage';
import { getUserName } from '@/utils/storage';
import { hapticFeedback } from '@/utils/haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'InviteBuddyiMessage'>;

export default function InviteBuddyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { returnTo } = route.params || {};

  const [phone, setPhone] = useState('');
  const [buddyName, setBuddyName] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('');

  const { inviteBuddy, saveBuddyInfo, isSMSAvailable } = useIMessage();

  useEffect(() => {
    const loadName = async () => {
      const name = await getUserName();
      setUserName(name);
    };
    loadName();
  }, []);

  const formatPhone = (text: string): string => {
    // Basic US phone formatting
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const parts = [match[1], match[2], match[3]].filter(Boolean);
      if (parts.length === 0) return '';
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return `(${parts[0]}) ${parts[1]}`;
      return `(${parts[0]}) ${parts[1]}-${parts[2]}`;
    }
    return text;
  };

  const handleSendInvite = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    if (!isSMSAvailable) {
      Alert.alert('SMS Unavailable', 'SMS is not available on this device');
      return;
    }

    hapticFeedback('medium');
    setSending(true);

    try {
      const cleanPhone = '+1' + phone.replace(/\D/g, '');
      await inviteBuddy(cleanPhone, buddyName || 'Your friend');

      // Save buddy info
      await saveBuddyInfo({
        name: buddyName || 'Buddy',
        phone: cleanPhone,
        invitedAt: Date.now(),
        hasApp: false,
      });

      // Navigate back to home
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Could not send invite. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    hapticFeedback('light');
    navigation.navigate('Home');
  };

  const handleBack = () => {
    hapticFeedback('light');
    navigation.goBack();
  };

  const isValid = phone.replace(/\D/g, '').length >= 10;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={{ fontSize: 24 }}>←</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.title}>
            Add your{'\n'}accountability buddy
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            When you snooze, they get paid. When they snooze, you get paid. 💰
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Their name</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Jake"
              placeholderTextColor={Colors.textMuted}
              value={buddyName}
              onChangeText={setBuddyName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Their phone number</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="(555) 123-4567"
              placeholderTextColor={Colors.textMuted}
              value={phone}
              onChangeText={(text) => setPhone(formatPhone(text))}
              keyboardType="phone-pad"
            />
          </View>

          {/* Message Preview */}
          <View style={styles.previewCard}>
            <ThemedText style={styles.previewLabel}>They'll receive:</ThemedText>
            <View style={styles.messagePreview}>
              <ThemedText style={styles.messageText}>
                {userName} invited you to Snoozer! 😴💰{'\n\n'}
                If they snooze, YOU get paid. Hold them accountable.{'\n\n'}
                Download: snoozer.app/invite
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.sendButton,
              !isValid && styles.buttonDisabled,
            ]}
            onPress={handleSendInvite}
            disabled={!isValid || sending}
          >
            <Text style={{ fontSize: 20 }}>💬</Text>
            <ThemedText style={[
              styles.sendButtonText,
              !isValid && styles.sendButtonTextDisabled,
            ]}>
              {sending ? 'Opening iMessage...' : 'Send iMessage Invite'}
            </ThemedText>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <ThemedText style={styles.skipText}>Skip for now (solo mode)</ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 32,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    color: Colors.text,
  },
  previewCard: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  messagePreview: {
    backgroundColor: Colors.green,
    borderRadius: 12,
    padding: 12,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },
  sendButton: {
    backgroundColor: Colors.orange,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    // Glow effect
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.bg,
  },
  sendButtonTextDisabled: {
    color: Colors.textMuted,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
});
