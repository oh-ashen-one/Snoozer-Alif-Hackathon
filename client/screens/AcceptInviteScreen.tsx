import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { parseInviteFromCode, clearPendingInvite } from '@/utils/invites';
import { saveBuddyInfo, BuddyInfo } from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AcceptInvite'>;

export default function AcceptInviteScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [inviterName, setInviterName] = useState<string>('');

  useEffect(() => {
    const code = route.params?.code;
    if (code) {
      setInviteCode(code);
      const invite = parseInviteFromCode(code);
      setInviterName(invite.fromName);
      if (__DEV__) console.log('[AcceptInvite] Received invite code:', code);
    }
  }, [route.params?.code]);

  const handleAccept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsLoading(true);

    try {
      const buddyInfo: BuddyInfo = {
        id: `buddy_${Date.now()}`,
        name: inviterName,
        status: 'linked',
        linkedAt: Date.now(),
        inviteCode: inviteCode,
      };

      await saveBuddyInfo(buddyInfo);
      await clearPendingInvite();

      if (__DEV__) console.log('[AcceptInvite] Buddy linked:', buddyInfo);

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'Home' },
            { name: 'BuddyDashboard' },
          ],
        })
      );
    } catch (error) {
      if (__DEV__) console.log('[AcceptInvite] Error accepting invite:', error);
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await clearPendingInvite();
    navigation.goBack();
  };

  if (!inviteCode) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorState}>
          <View style={styles.errorIcon}>
            <Feather name="alert-circle" size={48} color={Colors.red} />
          </View>
          <ThemedText style={styles.errorTitle}>Invalid Invite</ThemedText>
          <ThemedText style={styles.errorDescription}>
            This invite link appears to be broken or expired.
          </ThemedText>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <ThemedText style={styles.secondaryButtonText}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="users" size={48} color={Colors.orange} />
          </View>
          <ThemedText style={styles.title}>Buddy Invite</ThemedText>
          <ThemedText style={styles.subtitle}>
            {inviterName} wants to be your accountability buddy
          </ThemedText>
        </View>

        <View style={styles.inviteCard}>
          <View style={styles.inviteRow}>
            <Feather name="user" size={20} color={Colors.textSecondary} />
            <View style={styles.inviteInfo}>
              <ThemedText style={styles.inviteLabel}>From</ThemedText>
              <ThemedText style={styles.inviteValue}>{inviterName}</ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inviteRow}>
            <Feather name="link" size={20} color={Colors.textSecondary} />
            <View style={styles.inviteInfo}>
              <ThemedText style={styles.inviteLabel}>Invite Code</ThemedText>
              <ThemedText style={styles.inviteValue}>{inviteCode}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.features}>
          <ThemedText style={styles.featuresTitle}>As buddies, you can:</ThemedText>
          <View style={styles.featureItem}>
            <Feather name="eye" size={18} color={Colors.green} />
            <ThemedText style={styles.featureText}>See each other's alarm schedules</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="bell" size={18} color={Colors.green} />
            <ThemedText style={styles.featureText}>Get notified when they snooze or wake</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="dollar-sign" size={18} color={Colors.green} />
            <ThemedText style={styles.featureText}>Receive payments when they hit snooze</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="award" size={18} color={Colors.green} />
            <ThemedText style={styles.featureText}>Compete on the leaderboard</ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.bg} />
          ) : (
            <>
              <Feather name="check" size={20} color={Colors.bg} />
              <ThemedText style={styles.primaryButtonText}>Accept Invite</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable style={styles.declineButton} onPress={handleDecline} disabled={isLoading}>
          <ThemedText style={styles.declineButtonText}>Decline</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  inviteCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  inviteValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  features: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
    borderRadius: 14,
    paddingVertical: 18,
    gap: Spacing.sm,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.bg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  declineButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  declineButtonText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  secondaryButton: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorIcon: {
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  errorDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
