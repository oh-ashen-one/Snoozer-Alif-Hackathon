/**
 * HEADER - P3 GLASS CAPSULE
 * 
 * Frosted glass full-width header component
 * 
 * Usage:
 * <Header
 *   type="home"
 *   greeting="Good morning"
 *   name="Sarah"
 *   onSettingsPress={() => {}}
 * />
 * 
 * <Header
 *   type="stats"
 *   filter="week"
 *   onFilterChange={(f) => {}}
 * />
 * 
 * <Header
 *   type="buddy"
 *   onAddPress={() => {}}
 * />
 * 
 * <Header
 *   type="settings"
 *   onBackPress={() => {}}
 * />
 * 
 * <Header
 *   type="edit"
 *   title="Edit Alarm"
 *   onCancelPress={() => {}}
 *   onSavePress={() => {}}
 * />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

// ════════════════════════════════════════════════════════════════
// MAIN HEADER COMPONENT
// ════════════════════════════════════════════════════════════════

export default function Header({
  type = 'home',
  greeting = 'Good morning',
  name = '',
  title = '',
  filter = 'week',
  onSettingsPress,
  onBackPress,
  onAddPress,
  onFilterChange,
  onCancelPress,
  onSavePress,
}) {
  switch (type) {
    case 'home':
      return (
        <HomeHeader
          greeting={greeting}
          name={name}
          onSettingsPress={onSettingsPress}
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
        <NavHeader
          title="Settings"
          onBackPress={onBackPress}
        />
      );
    case 'edit':
      return (
        <EditHeader
          title={title || 'Edit Alarm'}
          onCancelPress={onCancelPress}
          onSavePress={onSavePress}
        />
      );
    default:
      return null;
  }
}

// ════════════════════════════════════════════════════════════════
// HOME HEADER
// ════════════════════════════════════════════════════════════════

function HomeHeader({ greeting, name, onSettingsPress }) {
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
      <TouchableOpacity 
        style={styles.iconBtn} 
        onPress={onSettingsPress}
        activeOpacity={0.7}
      >
        <Text style={styles.iconText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// STATS HEADER
// ════════════════════════════════════════════════════════════════

function StatsHeader({ filter, onFilterChange }) {
  const filters = ['week', 'month', 'year'];
  const labels = { week: 'Week', month: 'Month', year: 'Year' };
  
  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>📊</Text>
        </View>
        <Text style={styles.title}>Stats</Text>
      </View>
      <View style={styles.chipGroup}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.chip,
              filter === f && styles.chipActive,
            ]}
            onPress={() => onFilterChange?.(f)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.chipText,
              filter === f && styles.chipTextActive,
            ]}>
              {labels[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// BUDDY HEADER
// ════════════════════════════════════════════════════════════════

function BuddyHeader({ onAddPress }) {
  return (
    <View style={styles.capsule}>
      <View style={styles.left}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>👥</Text>
        </View>
        <Text style={styles.title}>Buddy</Text>
      </View>
      <TouchableOpacity 
        style={styles.addBtn} 
        onPress={onAddPress}
        activeOpacity={0.7}
      >
        <Text style={styles.addBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// NAV HEADER (Settings, etc.)
// ════════════════════════════════════════════════════════════════

function NavHeader({ title, onBackPress }) {
  return (
    <View style={styles.capsuleNav}>
      <TouchableOpacity 
        style={styles.backBtn} 
        onPress={onBackPress}
        activeOpacity={0.7}
      >
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.titleCenter}>{title}</Text>
      <View style={styles.placeholder} />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// EDIT HEADER (Cancel / Save)
// ════════════════════════════════════════════════════════════════

function EditHeader({ title, onCancelPress, onSavePress }) {
  return (
    <View style={styles.capsuleNav}>
      <TouchableOpacity 
        style={styles.cancelBtn} 
        onPress={onCancelPress}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.titleCenter}>{title}</Text>
      <TouchableOpacity 
        style={styles.saveBtn} 
        onPress={onSavePress}
        activeOpacity={0.8}
      >
        <Text style={styles.saveBtnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function getTimeEmoji() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '☀️';
  if (hour >= 12 && hour < 17) return '🌤️';
  if (hour >= 17 && hour < 21) return '🌅';
  return '🌙';
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Main capsule
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

  // Left section
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
    color: '#78716C',
    lineHeight: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAF9',
    lineHeight: 22,
  },

  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAF9',
  },

  titleCenter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAF9',
  },

  // Icon button
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(28, 25, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconText: {
    fontSize: 18,
  },

  // Filter chips
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
    color: '#57534E',
  },

  chipTextActive: {
    color: '#FB923C',
  },

  // Add button
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FB923C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0C0A09',
    marginTop: -2,
  },

  // Back button
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
    color: '#FAFAF9',
  },

  // Cancel button
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  cancelBtnText: {
    fontSize: 15,
    color: '#78716C',
  },

  // Save button
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: '#FB923C',
    borderRadius: 10,
  },

  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0C0A09',
  },

  // Placeholder for centering
  placeholder: {
    width: 36,
  },
});
