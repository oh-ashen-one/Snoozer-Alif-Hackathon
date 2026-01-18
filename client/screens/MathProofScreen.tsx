import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TextInput, Pressable, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp, CommonActions, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { logWakeUp, getCurrentStreak } from '@/utils/tracking';
import { setCurrentScreen, killAllSounds } from '@/utils/soundKiller';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'MathProof'>;

interface MathProblem {
  num1: number;
  num2: number;
  operator: '+' | '-';
  answer: number;
}

function generateProblem(): MathProblem {
  const num1 = Math.floor(Math.random() * 90) + 10;
  const num2 = Math.floor(Math.random() * 90) + 10;
  const operator = Math.random() > 0.5 ? '+' : '-';
  
  if (operator === '+') {
    return { num1, num2, operator, answer: num1 + num2 };
  } else {
    const larger = Math.max(num1, num2);
    const smaller = Math.min(num1, num2);
    return { num1: larger, num2: smaller, operator, answer: larger - smaller };
  }
}

const PROBLEMS_TO_SOLVE = 3;

export default function MathProofScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { alarmId } = route.params;

  const [problem, setProblem] = useState<MathProblem>(generateProblem);
  const [userAnswer, setUserAnswer] = useState('');
  const [problemsSolved, setProblemsSolved] = useState(0);
  const [isWrong, setIsWrong] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('MathProof');
      // Don't kill sounds here - alarm should keep playing until all problems solved
    }, [])
  );

  useEffect(() => {
    progressWidth.value = withTiming((problemsSolved / PROBLEMS_TO_SOLVE) * 100, { duration: 300 });
  }, [problemsSolved, progressWidth]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleSubmit = useCallback(async () => {
    const parsed = parseInt(userAnswer, 10);
    
    if (isNaN(parsed)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (parsed === problem.answer) {
      setIsCorrect(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSequence(
        withSpring(1.1, { damping: 10 }),
        withSpring(1, { damping: 15 })
      );

      const newSolvedCount = problemsSolved + 1;
      setProblemsSolved(newSolvedCount);

      if (newSolvedCount >= PROBLEMS_TO_SOLVE) {
        // All problems solved - NOW we can kill the alarm
        killAllSounds();
        
        await logWakeUp(alarmId, new Date(), false, 0);
        const streak = await getCurrentStreak();
        
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{
                name: 'WakeUpSuccess',
                params: {
                  streak,
                  moneySaved: 0,
                  wakeUpRate: 100,
                  wakeTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                  targetTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                },
              }],
            })
          );
        }, 500);
      } else {
        setTimeout(() => {
          setProblem(generateProblem());
          setUserAnswer('');
          setIsCorrect(false);
        }, 400);
      }
    } else {
      setIsWrong(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      
      setTimeout(() => {
        setIsWrong(false);
        setUserAnswer('');
      }, 500);
    }
  }, [userAnswer, problem, problemsSolved, navigation, shakeX, scale]);

  const handleKeyPress = useCallback(({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <BackgroundGlow color={isWrong ? 'red' : isCorrect ? 'green' : 'orange'} />

      <View style={styles.header}>
        <ThemedText style={styles.title}>Wake Up Your Brain</ThemedText>
        <ThemedText style={styles.subtitle}>
          Solve {PROBLEMS_TO_SOLVE} math problems to dismiss
        </ThemedText>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <ThemedText style={styles.progressText}>
          {problemsSolved} / {PROBLEMS_TO_SOLVE}
        </ThemedText>
      </View>

      <Animated.View style={[styles.problemCard, shakeStyle, scaleStyle]}>
        <View style={styles.problemRow}>
          <ThemedText style={styles.number}>{problem.num1}</ThemedText>
          <ThemedText style={styles.operator}>{problem.operator}</ThemedText>
          <ThemedText style={styles.number}>{problem.num2}</ThemedText>
          <ThemedText style={styles.equals}>=</ThemedText>
          <ThemedText style={styles.questionMark}>?</ThemedText>
        </View>
      </Animated.View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            isWrong && styles.inputWrong,
            isCorrect && styles.inputCorrect,
          ]}
          value={userAnswer}
          onChangeText={setUserAnswer}
          keyboardType="number-pad"
          placeholder="Your answer"
          placeholderTextColor={Colors.textMuted}
          autoFocus
          onKeyPress={handleKeyPress}
          onSubmitEditing={handleSubmit}
          returnKeyType="done"
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={[
            styles.submitButton,
            !userAnswer.trim() && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!userAnswer.trim()}
        >
          <ThemedText style={styles.submitButtonText}>
            {problemsSolved === PROBLEMS_TO_SOLVE - 1 ? 'DISMISS ALARM' : 'CHECK ANSWER'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  problemCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  problemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  number: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 1,
  },
  operator: {
    fontSize: 40,
    fontWeight: '600',
    color: Colors.orange,
    letterSpacing: 1,
  },
  equals: {
    fontSize: 40,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  questionMark: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.orange,
    letterSpacing: 1,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.lg,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 2,
  },
  inputWrong: {
    borderColor: Colors.red,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  inputCorrect: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  footer: {
    marginTop: 'auto',
  },
  submitButton: {
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.bg,
    letterSpacing: 1,
  },
});
