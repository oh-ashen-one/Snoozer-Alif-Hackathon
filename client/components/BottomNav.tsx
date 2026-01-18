import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type TabId = 'alarms' | 'stats' | 'buddy' | 'settings';

interface BottomNavProps {
  activeTab: TabId;
}

const tabs: { key: TabId; icon: string; label: string; screen: keyof RootStackParamList | null }[] = [
  { key: 'alarms', icon: 'clock', label: 'Alarms', screen: 'Home' },
  { key: 'stats', icon: 'bar-chart-2', label: 'Stats', screen: 'Stats' },
  { key: 'buddy', icon: 'users', label: 'Buddy', screen: 'Buddy' },
  { key: 'settings', icon: 'sliders', label: 'Settings', screen: 'Settings' },
];

export function BottomNav({ activeTab }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleTabPress = useCallback((tab: typeof tabs[number]) => {
    if (tab.key === activeTab) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (tab.screen) {
      navigation.navigate(tab.screen as any);
    }
  }, [activeTab, navigation]);

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 28) }]}>
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.navTab} onPress={() => handleTabPress(tab)}>
            <Feather
              name={tab.icon as any}
              size={24}
              color={isActive ? Colors.text : '#78716C'}
              style={{ opacity: isActive ? 1 : 0.4 }}
            />
            <ThemedText style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 10, 9, 0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.bgElevated,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navTab: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78716C',
  },
  navLabelActive: {
    color: '#FAFAF9',
  },
});
