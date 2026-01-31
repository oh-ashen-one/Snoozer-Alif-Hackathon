import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type TabId = 'alarms' | 'stats' | 'buddy' | 'settings';

interface BottomNavProps {
  activeTab: TabId;
}

interface IconProps {
  color?: string;
  size?: number;
}

// SVG Icons
const AlarmIcon = ({ color = '#FAFAF9', size = 20 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="13" r="8" />
    <Path d="M12 9v4l2 2" />
    <Path d="M5 3L2 6" />
    <Path d="M22 6l-3-3" />
  </Svg>
);

const StatsIcon = ({ color = '#FAFAF9', size = 20 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 20V10" />
    <Path d="M12 20V4" />
    <Path d="M6 20v-6" />
  </Svg>
);

const BuddyIcon = ({ color = '#FAFAF9', size = 20 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

const SettingsIcon = ({ color = '#FAFAF9', size = 20 }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const Icons: Record<TabId, React.FC<IconProps>> = {
  alarms: AlarmIcon,
  stats: StatsIcon,
  buddy: BuddyIcon,
  settings: SettingsIcon,
};

const tabs: { key: TabId; label: string; screen: keyof RootStackParamList }[] = [
  { key: 'alarms', label: 'Alarms', screen: 'Home' },
  { key: 'stats', label: 'Stats', screen: 'Stats' },
  { key: 'buddy', label: 'Buddy', screen: 'Buddy' },
  { key: 'settings', label: 'Settings', screen: 'Settings' },
];

export function BottomNav({ activeTab }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleTabPress = useCallback((tab: typeof tabs[number]) => {
    if (tab.key === activeTab) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(tab.screen as any);
  }, [activeTab, navigation]);

  const getIcon = (iconKey: TabId, isActive: boolean) => {
    const IconComponent = Icons[iconKey];
    const color = isActive ? '#FB923C' : '#57534E';
    return <IconComponent color={color} size={20} />;
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 20) }]}>
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        <View style={styles.tabsWrapper}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                onPress={() => handleTabPress(tab)}
                style={styles.tabButton}
              >
                <View style={[
                  styles.iconContainer,
                  isActive && styles.iconContainerActive,
                ]}>
                  {getIcon(tab.key, isActive)}
                </View>
                <Text style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(41, 37, 36, 0.5)',
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 18, 17, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
    borderColor: 'rgba(251, 146, 60, 0.4)',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#57534E',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: '#FB923C',
  },
});
