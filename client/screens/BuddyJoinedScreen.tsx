import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';

type Props = NativeStackScreenProps<RootStackParamList, 'BuddyJoined'>;
type NavigationProp = NativeStackScreenProps<RootStackParamList, 'BuddyJoined'>['navigation'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  size: number;
}

function ConfettiPieceView({ piece }: { piece: ConfettiPiece }) {
  const fallAnim = useRef(new Animated.Value(-50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const horizontalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(fallAnim, {
            toValue: 800,
            duration: 3000 + Math.random() * 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.loop(
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 1000 + Math.random() * 500,
              useNativeDriver: true,
            })
          ),
        ]),
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(horizontalAnim, {
                toValue: 1,
                duration: 500 + Math.random() * 500,
                useNativeDriver: true,
              }),
              Animated.timing(horizontalAnim, {
                toValue: -1,
                duration: 500 + Math.random() * 500,
                useNativeDriver: true,
              }),
            ])
          ),
        ]),
      ]).start();
    };
    startAnimation();
  }, [fallAnim, rotateAnim, horizontalAnim, piece.delay]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const horizontal = horizontalAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-20, 20],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: piece.x,
          width: piece.size,
          height: piece.size * 1.5,
          backgroundColor: piece.color,
          transform: [
            { translateY: fallAnim },
            { translateX: horizontal },
            { rotate: rotation },
          ],
        },
      ]}
    />
  );
}

function Confetti() {
  const colors = ['#FB923C', '#22C55E', '#7C3AED', '#EC4899', '#FBBF24', '#3B82F6'];
  const pieces: ConfettiPiece[] = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_WIDTH,
    delay: Math.random() * 1000,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
  }));

  return (
    <View style={styles.confettiContainer}>
      {pieces.map(piece => (
        <ConfettiPieceView key={piece.id} piece={piece} />
      ))}
    </View>
  );
}

export default function BuddyJoinedScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { mode, buddyName, stakes } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  const handleStartCompeting = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

  const getModeInfo = () => {
    switch (mode) {
      case '1v1':
        return { title: '1v1 Battle', color: '#FB923C', icon: '⚡' };
      case 'group':
        return { title: 'Group Pool', color: '#22C55E', icon: '👥' };
      case 'survivor':
        return { title: 'Survivor Mode', color: '#EF4444', icon: '🎯' };
      case 'accountability':
        return { title: 'Accountability', color: '#7C3AED', icon: '❤️' };
      case 'charity':
        return { title: 'Charity Stakes', color: '#EC4899', icon: '🎁' };
      default:
        return { title: 'Challenge', color: '#FB923C', icon: '⚡' };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      <Confetti />

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.celebrationContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.avatarsRow}>
            <View style={styles.avatarCircle}>
              <Text style={{ fontSize: 28 }}>👤</Text>
            </View>
            <View style={styles.connectLine}>
              <View style={[styles.connectDot, { backgroundColor: modeInfo.color }]} />
              <View style={[styles.connectDot, { backgroundColor: modeInfo.color }]} />
              <View style={[styles.connectDot, { backgroundColor: modeInfo.color }]} />
            </View>
            <View style={[styles.avatarCircle, { backgroundColor: `${modeInfo.color}20` }]}>
              <ThemedText style={[styles.avatarInitial, { color: modeInfo.color }]}>
                {buddyName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          </View>

          <View style={styles.successBadge}>
            <Text style={{ fontSize: 20 }}>✅</Text>
          </View>
        </Animated.View>

        <ThemedText style={styles.title}>You're connected!</ThemedText>
        <ThemedText style={styles.subtitle}>
          You and {buddyName} are now accountability partners
        </ThemedText>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Mode</ThemedText>
            <View style={styles.summaryValue}>
              <View style={[styles.modeIconCircle, { backgroundColor: `${modeInfo.color}20` }]}>
                <Text style={{ fontSize: 14 }}>{modeInfo.icon}</Text>
              </View>
              <ThemedText style={styles.summaryValueText}>{modeInfo.title}</ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Stakes</ThemedText>
            <ThemedText style={[styles.summaryValueText, { color: modeInfo.color }]}>
              {stakes}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Partner</ThemedText>
            <View style={styles.summaryValue}>
              <View style={styles.buddyMiniAvatar}>
                <ThemedText style={styles.buddyMiniInitial}>
                  {buddyName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText style={styles.summaryValueText}>{buddyName}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.startInfoCard}>
          <Text style={{ fontSize: 20 }}>🌅</Text>
          <ThemedText style={styles.startInfoText}>
            Your competition starts tomorrow morning
          </ThemedText>
        </View>
      </View>

      <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: modeInfo.color, shadowColor: modeInfo.color }]}
          onPress={handleStartCompeting}
          testID="button-start-competing"
        >
          <ThemedText style={styles.primaryButtonText}>Start Competing</ThemedText>
          <Text style={{ fontSize: 18 }}>→</Text>
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

  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 80,
  },

  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
  },
  connectLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  successBadge: {
    position: 'absolute',
    bottom: 8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#57534E',
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryValueText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  modeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#292524',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buddyMiniInitial: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },

  startInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  startInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#FB923C',
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
