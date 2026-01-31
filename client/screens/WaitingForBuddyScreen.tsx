import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
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

type Props = NativeStackScreenProps<RootStackParamList, 'WaitingForBuddy'>;
type NavigationProp = NativeStackScreenProps<RootStackParamList, 'WaitingForBuddy'>['navigation'];

function PulsingCircle({ delay = 0 }: { delay?: number }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 2.5,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    startAnimation();
  }, [scaleAnim, opacityAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.pulseCircle,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

export default function WaitingForBuddyScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { mode, isHost, code, buddyName } = route.params;

  const [waitTime, setWaitTime] = useState(0);
  const [expired, setExpired] = useState(false);
  const dotAnim = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);

  const {
    status,
    buddyName: joinedBuddyName,
    startPolling,
    stopPolling,
    cancelInvite,
  } = useInvite(mode);

  // Start polling when screen mounts (only if host)
  useEffect(() => {
    if (isHost && code) {
      startPolling(code);
    }
    return () => stopPolling();
  }, [isHost, code, startPolling, stopPolling]);

  // Navigate to BuddyJoined when buddy joins
  useEffect(() => {
    if (status === 'accepted' && !hasNavigated.current) {
      hasNavigated.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('BuddyJoined', {
        mode,
        buddyName: joinedBuddyName || buddyName || 'Buddy',
        stakes: mode === 'accountability' ? 'Free' : '$10/week',
      });
    } else if (status === 'expired') {
      setExpired(true);
    }
  }, [status, navigation, mode, joinedBuddyName, buddyName]);

  // Wait time counter
  useEffect(() => {
    const timer = setInterval(() => {
      setWaitTime(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dot animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [dotAnim]);

  const handleCancel = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopPolling();
    if (isHost) {
      await cancelInvite();
    }
    navigation.goBack();
  }, [navigation, stopPolling, cancelInvite, isHost]);

  const formatWaitTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <ThemedText style={styles.headerTitle}>Waiting</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.pulseContainer}>
          <PulsingCircle delay={0} />
          <PulsingCircle delay={600} />
          <PulsingCircle delay={1200} />
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 32 }}>👤</Text>
          </View>
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.waitingTitle}>
            Waiting for {buddyName || 'buddy'}...
          </ThemedText>
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[
                styles.dot,
                { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dotAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.3, 1],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { opacity: dotAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
              ]}
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Text style={{ fontSize: 16 }}>#️⃣</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <ThemedText style={styles.infoLabel}>Invite Code</ThemedText>
              <ThemedText style={styles.infoValue}>{code}</ThemedText>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Text style={{ fontSize: 16 }}>⏰</Text>
            </View>
            <View style={styles.infoTextContainer}>
              <ThemedText style={styles.infoLabel}>Waiting for</ThemedText>
              <ThemedText style={styles.infoValue}>{formatWaitTime(waitTime)}</ThemedText>
            </View>
          </View>
        </View>

        <ThemedText style={styles.hintText}>
          {expired
            ? 'Invite expired. Please create a new one.'
            : isHost
            ? "We'll notify you when they join"
            : 'Connecting to your buddy...'}
        </ThemedText>
      </View>

      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.cancelButton} onPress={handleCancel} testID="button-cancel">
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </Pressable>
      </View>
    </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 80,
  },

  pulseContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#FB923C',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FB923C',
  },

  infoCard: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#57534E',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },

  hintText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  bottomCta: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 16,
    backgroundColor: 'rgba(12, 10, 9, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.bgElevated,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
