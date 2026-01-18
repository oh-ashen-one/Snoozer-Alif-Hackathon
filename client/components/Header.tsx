/**
 * HEADER - P3 GLASS CAPSULE
 * 
 * Frosted glass full-width header component
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';

interface HeaderProps {
  type?: 'home' | 'stats' | 'buddy' | 'settings' | 'nav' | 'edit';
  greeting?: string;
  name?: string;
  title?: string;
  emoji?: string;
  filter?: 'week' | 'month' | 'year';
  onBackPress?: () => void;
  onAddPress?: () => void;
  onFilterChange?: (filter: 'week' | 'month' | 'year') => void;
  onCancelPress?: () => void;
  onSavePress?: () => void;
  saveDisabled?: boolean;
}

export default function Header({
  type = 'home',
  greeting = 'Good morning',
  name = '',
  title = '',
  emoji,
  filter = 'week',
  onBackPress,
  onAddPress,
  onFilterChange,
  onCancelPress,
  onSavePress,
  saveDisabled = false,
}: HeaderProps) {
  switch (type) {
    case 'home':
      return (
        <HomeHeader
          greeting={greeting}
          name={name}
        />
      );
    case 'stats':
      return (
        <StatsHeader
          filter={filter}
          onFilterChange={onFilterChange}
        />
      );
    case 'buddy':
      return (
        <BuddyHeader
          onAddPress={onAddPress}
        />
      );
    case 'settings':
      return (
        <SettingsHeader />
      );
    case 'nav':
      return (
        <NavHeader
          title={title || 'Back'}
          emoji={emoji}
          onBackPress={onBackPress}
        />
      );
    case 'edit':
      return (
        <EditHeader
          title={title || 'Edit Alarm'}
          onCancelPress={onCancelPress}
          onSavePress={onSavePress}
          saveDisabled={saveDisabled}
        />
      );
    default:
      return null;
  }
}

function HomeHeader({
  greeting,
  name,
}: {
  greeting: string;
  name: string;
}) {
  const emoji = getTimeEmoji();

  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
      </View>
    </View>
  );
}

function StatsHeader({ 
  filter, 
  onFilterChange 
}: { 
  filter: 'week' | 'month' | 'year'; 
  onFilterChange?: (f: 'week' | 'month' | 'year') => void;
}) {
  const filters: Array<'week' | 'month' | 'year'> = ['week', 'month', 'year'];
  const labels = { week: 'Week', month: 'Month', year: 'Year' };
  
  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>{'\u{1F4CA}'}</Text>
        </View>
        <Text style={styles.title}>Stats</Text>
      </View>
      <View style={styles.chipGroup}>
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[
              styles.chip,
              filter === f && styles.chipActive,
            ]}
            onPress={() => onFilterChange?.(f)}
          >
            <Text style={[
              styles.chipText,
              filter === f && styles.chipTextActive,
            ]}>
              {labels[f]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function BuddyHeader({ 
  onAddPress 
}: { 
  onAddPress?: () => void;
}) {
  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>{'\u{1F465}'}</Text>
        </View>
        <Text style={styles.title}>Buddy</Text>
      </View>
      <Pressable 
        style={styles.addBtn} 
        onPress={onAddPress}
      >
        <Text style={styles.addBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function SettingsHeader() {
  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>{'\u2699\uFE0F'}</Text>
        </View>
        <Text style={styles.title}>Settings</Text>
      </View>
    </View>
  );
}

function NavHeader({
  title,
  emoji,
  onBackPress
}: {
  title: string;
  emoji?: string;
  onBackPress?: () => void;
}) {
  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>{emoji || '\u2699\uFE0F'}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Pressable
        style={styles.backBtn}
        onPress={onBackPress}
      >
        <Text style={styles.backBtnText}>{'\u2190'}</Text>
      </Pressable>
    </View>
  );
}

function EditHeader({ 
  title, 
  onCancelPress, 
  onSavePress,
  saveDisabled = false,
}: { 
  title: string; 
  onCancelPress?: () => void; 
  onSavePress?: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <View style={styles.capsuleNav}>
      <Pressable 
        style={styles.cancelBtn} 
        onPress={onCancelPress}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
      <Text style={styles.titleCenter}>{title}</Text>
      <Pressable 
        style={[styles.saveBtn, saveDisabled && styles.saveBtnDisabled]} 
        onPress={onSavePress}
        disabled={saveDisabled}
      >
        <Text style={styles.saveBtnText}>Save</Text>
      </Pressable>
    </View>
  );
}

function getTimeEmoji() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '\u2600\uFE0F';
  if (hour >= 12 && hour < 17) return '\u{1F324}\uFE0F';
  if (hour >= 17 && hour < 21) return '\u{1F305}';
  return '\u{1F319}';
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  
  capsuleNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 20,
  },

  textBlock: {
    flexDirection: 'column',
  },

  greeting: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
  },

  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },

  titleCenter: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },

  chipGroup: {
    flexDirection: 'row',
    gap: 6,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },

  chipActive: {
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  chipTextActive: {
    color: Colors.orange,
  },

  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.bg,
    marginTop: -2,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(28, 25, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtnText: {
    fontSize: 18,
    color: Colors.text,
  },

  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  cancelBtnText: {
    fontSize: 15,
    color: Colors.textMuted,
  },

  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: Colors.orange,
    borderRadius: 10,
  },

  saveBtnDisabled: {
    opacity: 0.5,
  },

  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },

  placeholder: {
    width: 36,
  },
});
