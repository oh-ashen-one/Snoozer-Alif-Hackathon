import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface PunishmentItem {
  emoji: string;
  label: string;
  fullText?: string;
}

interface SmallWidgetProps {
  alarmTime?: string;
  stakeAmount?: number;
}

interface MediumWidgetProps {
  countdown?: string;
  punishments?: PunishmentItem[];
}

interface LargeWidgetProps {
  countdown?: string;
  alarmTime?: string;
  punishments?: PunishmentItem[];
}

// ════════════════════════════════════════════════════════════════
// SMALL WIDGET (155 x 155)
// ════════════════════════════════════════════════════════════════

export function SmallWidget({ alarmTime = '6:00 AM', stakeAmount = 5 }: SmallWidgetProps) {
  return (
    <View style={styles.smallWidget}>
      <Text style={styles.sEmoji}>😴</Text>
      <Text style={styles.sTime}>{alarmTime}</Text>
      <Text style={styles.sStake}>${stakeAmount} at risk</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// MEDIUM WIDGET (329 x 155)
// ════════════════════════════════════════════════════════════════

const DEFAULT_PUNISHMENTS: PunishmentItem[] = [
  { emoji: '👴', label: "Text wife's dad" },
  { emoji: '💔', label: 'Text ex "i miss u"' },
  { emoji: '📧', label: 'Email your boss' },
];

export function MediumWidget({
  countdown = '6:17:42',
  punishments = DEFAULT_PUNISHMENTS
}: MediumWidgetProps) {
  return (
    <View style={styles.mediumWidget}>
      <View style={styles.mMain}>
        <View style={styles.mTimeBlock}>
          <Text style={styles.mTime}>{countdown}</Text>
          <Text style={styles.mUntil}>until punishment</Text>
        </View>
      </View>
      <View style={styles.mPunishments}>
        {punishments.slice(0, 3).map((p, i) => (
          <View key={i} style={styles.mP}>
            <Text style={styles.mPEmoji}>{p.emoji}</Text>
            <Text style={styles.mPText}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// LARGE WIDGET (329 x 345)
// ════════════════════════════════════════════════════════════════

const DEFAULT_LARGE_PUNISHMENTS: PunishmentItem[] = [
  { emoji: '👴', label: "Text wife's dad", fullText: 'Text wife\'s dad "hey bro what are you wearing"' },
  { emoji: '💔', label: 'Text ex', fullText: 'Text your ex "i miss u"' },
  { emoji: '📧', label: 'Email boss', fullText: 'Email boss "running late again sorry"' },
];

export function LargeWidget({
  countdown = '6:17:42',
  alarmTime = '6:00 AM',
  punishments = DEFAULT_LARGE_PUNISHMENTS
}: LargeWidgetProps) {
  const [hours, minutes, seconds] = countdown.split(':');

  return (
    <View style={styles.largeWidget}>
      <View style={styles.lHeader}>
        <Text style={styles.lIcon}>😴</Text>
        <Text style={styles.lTitle}>Snoozer</Text>
      </View>

      <View style={styles.lCountdownSection}>
        <Text style={styles.lNum}>{hours || '6'}</Text>
        <Text style={styles.lColon}>:</Text>
        <Text style={styles.lNum}>{minutes || '17'}</Text>
        <Text style={styles.lColon}>:</Text>
        <Text style={styles.lNum}>{seconds || '42'}</Text>
      </View>

      <Text style={styles.lUntil}>until alarm at {alarmTime}</Text>

      <View style={styles.lDivider} />

      <Text style={styles.lPLabel}>🔥 {punishments.length} punishments armed</Text>

      <View style={styles.lPList}>
        {punishments.slice(0, 3).map((p, i) => (
          <View key={i} style={styles.lPRow}>
            <Text style={styles.lPIcon}>{p.emoji}</Text>
            <Text style={styles.lPText}>{p.fullText || p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════
// WIDGET PREVIEW (for testing all sizes)
// ════════════════════════════════════════════════════════════════

type WidgetSize = 'small' | 'medium' | 'large';

export function WidgetPreview() {
  const [size, setSize] = useState<WidgetSize>('medium');

  return (
    <ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
      {/* Toggle */}
      <View style={styles.toggleWrap}>
        <Pressable
          style={[styles.toggleBtn, size === 'small' && styles.toggleBtnActive]}
          onPress={() => setSize('small')}
        >
          <Text style={[styles.toggleText, size === 'small' && styles.toggleTextActive]}>Small</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, size === 'medium' && styles.toggleBtnActive]}
          onPress={() => setSize('medium')}
        >
          <Text style={[styles.toggleText, size === 'medium' && styles.toggleTextActive]}>Medium</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, size === 'large' && styles.toggleBtnActive]}
          onPress={() => setSize('large')}
        >
          <Text style={[styles.toggleText, size === 'large' && styles.toggleTextActive]}>Large</Text>
        </Pressable>
      </View>

      {/* Preview Area */}
      <View style={styles.previewArea}>
        {size === 'small' && <SmallWidget />}
        {size === 'medium' && <MediumWidget />}
        {size === 'large' && <LargeWidget />}
      </View>

      {/* All Widgets */}
      <View style={styles.allWidgets}>
        <SmallWidget />
        <MediumWidget />
        <LargeWidget />
      </View>
    </ScrollView>
  );
}

// ════════════════════════════════════════════════════════════════
// LEGACY EXPORT (for backward compatibility)
// ════════════════════════════════════════════════════════════════

interface LiveActivityWidgetProps {
  state: 'sleeping' | 'ringing';
  alarmTime?: string;
  timeUntilAlarm?: string;
  stakeAmount?: number;
  punishments?: PunishmentItem[];
}

export function LiveActivityWidget({
  state,
  alarmTime = '6:00 AM',
  timeUntilAlarm = '6:17:42',
  stakeAmount = 5,
  punishments = DEFAULT_PUNISHMENTS,
}: LiveActivityWidgetProps) {
  if (state === 'sleeping') {
    return <MediumWidget countdown={timeUntilAlarm} punishments={punishments} />;
  }
  return <LargeWidget countdown={timeUntilAlarm} alarmTime={alarmTime} punishments={punishments} />;
}

export default LiveActivityWidget;

// ════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ═══════════════════════════════════
  // SMALL WIDGET
  // ═══════════════════════════════════
  smallWidget: {
    width: 155,
    height: 155,
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FB923C',
  },
  sEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  sTime: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  sStake: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // ═══════════════════════════════════
  // MEDIUM WIDGET
  // ═══════════════════════════════════
  mediumWidget: {
    width: 329,
    height: 155,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#0c0a09',
  },
  mMain: {
    marginBottom: 10,
  },
  mTimeBlock: {
    alignItems: 'center',
  },
  mTime: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  mUntil: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  mPunishments: {
    gap: 4,
  },
  mP: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mPEmoji: {
    fontSize: 14,
  },
  mPText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  // ═══════════════════════════════════
  // LARGE WIDGET
  // ═══════════════════════════════════
  largeWidget: {
    width: 329,
    height: 345,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#0c0a09',
  },
  lHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  lIcon: {
    fontSize: 22,
  },
  lTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  lCountdownSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  lNum: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  lColon: {
    fontSize: 40,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.3)',
  },
  lUntil: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 14,
  },
  lDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 14,
  },
  lPLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 12,
  },
  lPList: {
    gap: 10,
  },
  lPRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  lPIcon: {
    fontSize: 18,
  },
  lPText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    flex: 1,
  },

  // ═══════════════════════════════════
  // PREVIEW
  // ═══════════════════════════════════
  previewContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  previewContent: {
    padding: 24,
    alignItems: 'center',
    gap: 24,
  },
  toggleWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  toggleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: Colors.orange,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#000',
  },
  previewArea: {
    padding: 40,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allWidgets: {
    alignItems: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: '#111',
    borderRadius: 20,
  },
});
