import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';

const HABITS = [
  {
    id: 'wakeup',
    emoji: '\u23F0',
    title: 'Wake up on time',
    subtitle: 'Build a morning routine',
    iconBg: 'rgba(251,146,60,0.15)',
    available: true,
  },
  {
    id: 'gym',
    emoji: '\uD83C\uDFCB\uFE0F',
    title: 'Go to the gym',
    subtitle: 'Stay fit and healthy',
    iconBg: 'rgba(34,197,94,0.15)',
    available: false,
  },
  {
    id: 'pray',
    emoji: '\uD83E\uDD32',
    title: 'Pray consistently',
    subtitle: 'Never miss a prayer',
    iconBg: 'rgba(147,51,234,0.15)',
    available: false,
  },
  {
    id: 'touch',
    emoji: '\u2764\uFE0F',
    title: 'Stay in touch',
    subtitle: 'Call loved ones regularly',
    iconBg: 'rgba(239,68,68,0.15)',
    available: false,
  },
  {
    id: 'custom',
    emoji: '\u2728',
    title: 'Something else',
    subtitle: 'Custom habit',
    iconBg: 'rgba(120,113,108,0.15)',
    available: false,
  },
];

const ProgressDots = ({ total, active }) => {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

const HabitCard = ({ habit, isSelected, onSelect }) => {
  const handlePress = useCallback(() => {
    if (habit.available) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(habit.id);
    }
  }, [habit.available, habit.id, onSelect]);

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.card,
        !habit.available && styles.cardDisabled,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: habit.iconBg }]}>
        <Text style={styles.emoji}>{habit.emoji}</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{habit.title}</Text>
        <Text style={styles.cardSubtitle}>{habit.subtitle}</Text>
      </View>

      {habit.available ? (
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={16} color={Colors.text} />
          )}
        </View>
      ) : (
        <View style={styles.soonPill}>
          <Text style={styles.soonText}>SOON</Text>
        </View>
      )}
    </Pressable>
  );
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedHabit, setSelectedHabit] = useState(null);

  const handleSelect = useCallback((habitId) => {
    setSelectedHabit((prev) => (prev === habitId ? null : habitId));
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedHabit) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate('AddAlarm', { isOnboarding: true });
    }
  }, [selectedHabit, navigation]);

  const isButtonEnabled = selectedHabit !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressDots total={4} active={0} />

      <View style={styles.header}>
        <View style={styles.pillBadge}>
          <Text style={styles.pillText}>{'\uD83D\uDD25'} Let's get started</Text>
        </View>
        <Text style={styles.title}>What do you want to be consistent with?</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionsList}>
          {HABITS.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isSelected={selectedHabit === habit.id}
              onSelect={handleSelect}
            />
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 48) }]}>
        <Text style={styles.helperText}>More habits coming soon!</Text>
        <Pressable
          onPress={handleContinue}
          disabled={!isButtonEnabled}
          style={[
            styles.continueButton,
            isButtonEnabled ? styles.continueButtonEnabled : styles.continueButtonDisabled,
          ]}
        >
          <Text
            style={[
              styles.continueButtonText,
              !isButtonEnabled && styles.continueButtonTextDisabled,
            ]}
          >
            Continue {'\u2192'}
          </Text>
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
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.orange,
  },
  dotInactive: {
    backgroundColor: Colors.border,
  },
  header: {
    marginTop: 32,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  pillBadge: {
    backgroundColor: 'rgba(251,146,60,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.pill,
  },
  pillText: {
    color: Colors.orange,
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  optionsList: {
    marginTop: 32,
    paddingHorizontal: Spacing.xl,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardSelected: {
    borderColor: Colors.orange,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  soonPill: {
    backgroundColor: Colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.pill,
  },
  soonText: {
    color: '#57534E',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.xl,
    backgroundColor: Colors.bg,
  },
  helperText: {
    color: '#57534E',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonEnabled: {
    backgroundColor: Colors.orange,
    ...Platform.select({
      ios: {
        shadowColor: Colors.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonDisabled: {
    backgroundColor: Colors.border,
  },
  continueButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#57534E',
  },
});
