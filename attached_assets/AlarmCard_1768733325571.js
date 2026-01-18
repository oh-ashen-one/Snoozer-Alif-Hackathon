/**
 * ALARM CARD - A1 STYLE
 * 
 * Clean rows + pill chips + action buttons
 * 
 * Usage:
 * <AlarmCard
 *   time="6:00"
 *   amPm="AM"
 *   days={[1,2,3,4,5]}
 *   stake={5}
 *   buddyName="Jake"
 *   proofType="Brush teeth"
 *   enabled={true}
 *   onToggle={() => {}}
 *   onTest={() => {}}
 *   onEdit={() => {}}
 *   onDelete={() => {}}
 * />
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function AlarmCard({
  time = '6:00',
  amPm = 'AM',
  days = [],
  stake = 0,
  buddyName = '',
  proofType = '',
  enabled = true,
  onToggle,
  onTest,
  onEdit,
  onDelete,
}) {
  const hasStakes = stake > 0 && buddyName;
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format days display
  const getDaysDisplay = () => {
    if (days.length === 0) return 'No days';
    if (days.length === 7) return 'Every day';
    if (JSON.stringify(days.sort()) === JSON.stringify([1,2,3,4,5])) return 'Mon - Fri';
    if (JSON.stringify(days.sort()) === JSON.stringify([0,6])) return 'Sat, Sun';
    return days.map(d => dayLabels[d]).join(', ');
  };

  return (
    <View style={[
      styles.card,
      { 
        opacity: enabled ? 1 : 0.5,
        borderColor: enabled && hasStakes ? 'rgba(251, 146, 60, 0.2)' : '#292524',
      }
    ]}>
      {/* Row 1: Time + Toggle */}
      <View style={styles.row1}>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.amPm}>{amPm}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.toggle,
            { backgroundColor: enabled ? '#22C55E' : '#292524' }
          ]}
          onPress={onToggle}
          activeOpacity={0.8}
        >
          <View style={[
            styles.toggleKnob,
            { transform: [{ translateX: enabled ? 20 : 0 }] }
          ]} />
        </TouchableOpacity>
      </View>

      {/* Row 2: Info chips */}
      <View style={styles.row2}>
        {hasStakes ? (
          <>
            <View style={styles.chipDays}>
              <Text style={styles.chipDaysText}>{getDaysDisplay()}</Text>
            </View>
            <View style={styles.chipStake}>
              <Text style={styles.chipStakeText}>💸 ${stake} → {buddyName}</Text>
            </View>
            {proofType && (
              <View style={styles.chipProof}>
                <Text style={styles.chipProofText}>📸 {proofType}</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.chipMuted}>
              <Text style={styles.chipMutedText}>{getDaysDisplay()}</Text>
            </View>
            <View style={styles.chipMuted}>
              <Text style={styles.chipMutedText}>No stakes</Text>
            </View>
          </>
        )}
      </View>

      {/* Row 3: Actions */}
      <View style={styles.row3}>
        <TouchableOpacity style={styles.actionPill} onPress={onTest} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>⚡</Text>
          <Text style={styles.actionText}>Test</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPill} onPress={onEdit} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPillDanger} onPress={onDelete} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={styles.actionTextDanger}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(28, 25, 23, 0.8)',
    borderWidth: 1,
    borderColor: '#292524',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },

  // Row 1 - Time + Toggle
  row1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  time: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FAFAF9',
    lineHeight: 42,
  },
  amPm: {
    fontSize: 18,
    fontWeight: '500',
    color: '#78716C',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FAFAF9',
  },

  // Row 2 - Info chips
  row2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chipDays: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    borderRadius: 8,
  },
  chipDaysText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FB923C',
  },
  chipStake: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
  },
  chipStakeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  chipProof: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 37, 36, 0.8)',
    borderRadius: 8,
  },
  chipProofText: {
    fontSize: 13,
    color: '#A8A29E',
  },
  chipMuted: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    borderRadius: 8,
  },
  chipMutedText: {
    fontSize: 13,
    color: '#57534E',
  },

  // Row 3 - Actions
  row3: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(41, 37, 36, 0.6)',
    borderWidth: 1,
    borderColor: '#3a3533',
    borderRadius: 10,
  },
  actionPillDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A8A29E',
  },
  actionTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
});
