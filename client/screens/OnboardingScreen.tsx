import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GOALS = [
  {
    id: 'discipline',
    icon: 'target',
    title: 'Build discipline',
    subtitle: 'Be more consistent every day',
  },
  {
    id: 'productivity',
    icon: 'zap',
    title: 'Be more productive',
    subtitle: 'Get more done in the morning',
  },
  {
    id: 'health',
    icon: 'heart',
    title: 'Improve health',
    subtitle: 'Better sleep, better mornings',
  },
  {
    id: 'time',
    icon: 'clock',
    title: 'Stop wasting time',
    subtitle: 'No more snoozing away hours',
  },
];

const HABITS = [
  {
    id: 'wakeup',
    icon: 'sunrise',
    title: 'Wake up on time',
    subtitle: 'Build a morning routine',
    available: true,
  },
  {
    id: 'gym',
    icon: 'activity',
    title: 'Go to the gym',
    subtitle: 'Stay fit and healthy',
    available: false,
  },
  {
    id: 'pray',
    icon: 'moon',
    title: 'Pray consistently',
    subtitle: 'Never miss a prayer',
    available: false,
  },
  {
    id: 'touch',
    icon: 'phone',
    title: 'Stay in touch',
    subtitle: 'Call loved ones regularly',
    available: false,
  },
];

interface ProgressDotsProps {
  total: number;
  active: number;
}

const ProgressDots = ({ total, active }: ProgressDotsProps) => {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index <= active ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

interface GoalCardProps {
  goal: typeof GOALS[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const GoalCard = ({ goal, isSelected, onSelect }: GoalCardProps) => {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(goal.id);
  }, [goal.id, onSelect]);

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
        <Feather name={goal.icon as any} size={24} color={isSelected ? Colors.orange : Colors.textSecondary} />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{goal.title}</Text>
        <Text style={styles.cardSubtitle}>{goal.subtitle}</Text>
      </View>

      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected ? (
          <Feather name="check" size={16} color={Colors.text} />
        ) : null}
      </View>
    </Pressable>
  );
};

interface HabitCardProps {
  habit: typeof HABITS[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const HabitCard = ({ habit, isSelected, onSelect }: HabitCardProps) => {
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
      <View style={[styles.iconBox, isSelected && styles.iconBoxSelected]}>
        <Feather 
          name={habit.icon as any} 
          size={24} 
          color={isSelected ? Colors.orange : habit.available ? Colors.textSecondary : Colors.textMuted} 
        />
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, !habit.available && styles.cardTitleDisabled]}>
          {habit.title}
        </Text>
        <Text style={styles.cardSubtitle}>{habit.subtitle}</Text>
      </View>

      {habit.available ? (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected ? <Feather name="check" size={16} color={Colors.text} /> : null}
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
  const navigation = useNavigation<NavigationProp>();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

  const handleGoalSelect = useCallback((goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  }, []);

  const handleHabitSelect = useCallback((habitId: string) => {
    setSelectedHabit(prev => (prev === habitId ? null : habitId));
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(prev => prev - 1);
  }, []);

  const handleContinue = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (step < 2) {
      setStep(prev => prev + 1);
    } else {
      // Save user data
      try {
        await AsyncStorage.setItem('@snoozer/user_name', name);
        await AsyncStorage.setItem('@snoozer/user_goals', JSON.stringify(selectedGoals));
      } catch (error) {
        console.log('Error saving user data:', error);
      }
      
      // Navigate to alarm setup
      navigation.navigate('AddAlarm', { isOnboarding: true });
    }
  }, [step, name, selectedGoals, navigation]);

  const isButtonEnabled = 
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && selectedGoals.length > 0) ||
    (step === 2 && selectedHabit !== null);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <KeyboardAvoidingView 
            style={styles.stepContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.header}>
              <View style={styles.pillBadge}>
                <Feather name="user" size={14} color={Colors.orange} />
                <Text style={styles.pillText}>Let's get to know you</Text>
              </View>
              <Text style={styles.title}>What's your name?</Text>
              <Text style={styles.subtitle}>We'll use this to personalize your experience</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                autoFocus
              />
            </View>
          </KeyboardAvoidingView>
        );

      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <View style={styles.pillBadge}>
                <Feather name="target" size={14} color={Colors.orange} />
                <Text style={styles.pillText}>Your motivation</Text>
              </View>
              <Text style={styles.title}>What are your goals?</Text>
              <Text style={styles.subtitle}>Select all that apply</Text>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.optionsList}>
                {GOALS.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    isSelected={selectedGoals.includes(goal.id)}
                    onSelect={handleGoalSelect}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.header}>
              <View style={styles.pillBadge}>
                <Feather name="check-circle" size={14} color={Colors.orange} />
                <Text style={styles.pillText}>Almost done</Text>
              </View>
              <Text style={styles.title}>What do you want to be consistent with?</Text>
              <Text style={styles.subtitle}>Start with one habit</Text>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.optionsList}>
                {HABITS.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    isSelected={selectedHabit === habit.id}
                    onSelect={handleHabitSelect}
                  />
                ))}
              </View>
              <Text style={styles.helperText}>More habits coming soon!</Text>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <BackgroundGlow color="orange" />
      <View style={styles.topRow}>
        {step > 0 ? (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={20} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <ProgressDots total={3} active={step} />
        <View style={styles.backButton} />
      </View>

      {renderStep()}

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 24) + 24 }]}>
        <Pressable
          testID="button-onboarding-continue"
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
            {step === 2 ? 'Set Up Alarm' : 'Continue'}
          </Text>
          <Feather 
            name="arrow-right" 
            size={20} 
            color={isButtonEnabled ? Colors.bg : Colors.textMuted} 
          />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
  stepContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,146,60,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.pill,
    marginBottom: Spacing.lg,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.orange,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  textInput: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  optionsList: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardSelected: {
    borderColor: Colors.orange,
    backgroundColor: 'rgba(251,146,60,0.05)',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(251,146,60,0.15)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  cardTitleDisabled: {
    color: Colors.textMuted,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orange,
  },
  soonPill: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  soonText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 18,
    borderRadius: BorderRadius.lg,
  },
  continueButtonEnabled: {
    backgroundColor: Colors.orange,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.bg,
  },
  continueButtonTextDisabled: {
    color: Colors.textMuted,
  },
});
