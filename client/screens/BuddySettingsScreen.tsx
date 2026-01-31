import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getBuddyInfo,
  clearBuddyInfo,
  BuddyInfo,
} from '@/utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingToggle {
  id: string;
  label: string;
  description: string;
  icon: string;
  value: boolean;
}

export default function BuddySettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const headerHeight = useHeaderHeight();

  const [buddy, setBuddy] = useState<BuddyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<SettingToggle[]>([
    {
      id: 'show_alarms',
      label: 'Share My Alarms',
      description: 'Let your buddy see your alarm schedule',
      icon: '🔔',
      value: true,
    },
    {
      id: 'show_wakes',
      label: 'Share Wake Events',
      description: 'Notify buddy when you wake up or snooze',
      icon: '☀️',
      value: true,
    },
    {
      id: 'allow_pokes',
      label: 'Allow Pokes',
      description: 'Receive poke notifications from buddy',
      icon: '⚡',
      value: true,
    },
    {
      id: 'show_stats',
      label: 'Share Stats',
      description: 'Let buddy see your streak and history',
      icon: '📊',
      value: true,
    },
  ]);

  useEffect(() => {
    loadBuddyInfo();
  }, []);

  const loadBuddyInfo = async () => {
    try {
      const info = await getBuddyInfo();
      setBuddy(info);
    } catch (error) {
      console.error('[BuddySettings] Error loading buddy info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, value: !s.value } : s
    ));
  };

  const handleUnlink = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Unlink Buddy',
      `Are you sure you want to unlink from ${buddy?.name || 'your buddy'}? This will end your accountability partnership.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearBuddyInfo();
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              );
            } catch (error) {
              console.error('[BuddySettings] Error unlinking:', error);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!buddy) {
    return (
      <View style={[styles.container, { paddingTop: headerHeight }]}>
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48 }}>👤</Text>
          <ThemedText style={styles.emptyText}>No buddy linked</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.buddyCard}>
        <View style={styles.avatar}>
          <ThemedText style={styles.avatarText}>
            {buddy.avatar || buddy.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.buddyInfo}>
          <ThemedText style={styles.buddyName}>{buddy.name}</ThemedText>
          <ThemedText style={styles.buddyPhone}>{buddy.phone}</ThemedText>
          <ThemedText style={styles.linkedDate}>
            Linked since {formatDate(buddy.joinedAt)}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.sectionTitle}>PRIVACY SETTINGS</ThemedText>
      {settings.map((setting) => (
        <View key={setting.id} style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Text style={{ fontSize: 20 }}>{setting.icon}</Text>
          </View>
          <View style={styles.settingContent}>
            <ThemedText style={styles.settingLabel}>{setting.label}</ThemedText>
            <ThemedText style={styles.settingDescription}>{setting.description}</ThemedText>
          </View>
          <Switch
            value={setting.value}
            onValueChange={() => handleToggle(setting.id)}
            trackColor={{ false: Colors.border, true: Colors.green }}
            thumbColor={Colors.text}
          />
        </View>
      ))}

      <ThemedText style={styles.sectionTitle}>DANGER ZONE</ThemedText>
      <Pressable style={styles.unlinkButton} onPress={handleUnlink}>
        <Text style={{ fontSize: 20 }}>👋</Text>
        <ThemedText style={styles.unlinkText}>Unlink Buddy</ThemedText>
      </Pressable>
      <ThemedText style={styles.unlinkWarning}>
        This will end your accountability partnership. You can always link with someone new later.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  buddyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  buddyInfo: {
    flex: 1,
  },
  buddyName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  buddyPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  linkedDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  unlinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.red,
  },
  unlinkWarning: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
});
