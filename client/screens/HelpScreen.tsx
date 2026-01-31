import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import Header from '@/components/Header';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'How does proof photo work?',
    answer:
      'When your alarm goes off, you need to take a photo that matches your reference location (like your bathroom). The app compares the photos to verify you actually got out of bed. No matching photo means the alarm keeps ringing!',
  },
  {
    question: 'Is my photo data saved?',
    answer:
      'We only save your initial reference photo so it can be used to verify your wake-up location. Proof photos taken when dismissing alarms are never saved or stored - they are only used momentarily for comparison and then discarded.',
  },
  {
    question: 'What happens if I snooze?',
    answer:
      'If you snooze, your selected punishments will occur - your shame video plays at maximum volume, and any other punishments you set up (like buddy notifications or donations) will be triggered. The alarm will continue ringing after the snooze period.',
  },
  {
    question: 'How do I change my alarm?',
    answer:
      'From the home screen, tap on any alarm to edit its time, label, or days. You can also toggle alarms on/off using the switch, or swipe left to delete an alarm.',
  },
  {
    question: 'Can I change my shame video?',
    answer:
      'Yes! Go to Settings > Re-record shame video to record a new one. Make it something that will really motivate you to avoid snoozing!',
  },
];

function AccordionItem({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useSharedValue(0);
  const height = useSharedValue(0);

  const toggleAccordion = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen((prev) => !prev);
    rotation.value = withTiming(isOpen ? 0 : 1, { duration: 200 });
    height.value = withTiming(isOpen ? 0 : 1, { duration: 200 });
  }, [isOpen, rotation, height]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: height.value,
    maxHeight: interpolate(height.value, [0, 1], [0, 200]),
  }));

  return (
    <View style={styles.accordionItem}>
      <Pressable style={styles.accordionHeader} onPress={toggleAccordion}>
        <ThemedText style={styles.questionText}>{item.question}</ThemedText>
        <Animated.View style={chevronStyle}>
          <Text style={{ fontSize: 20, color: Colors.textMuted }}>▼</Text>
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.accordionContent, contentStyle]}>
        <ThemedText style={styles.answerText}>{item.answer}</ThemedText>
      </Animated.View>
    </View>
  );
}

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      {/* Header */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <Header type="nav" title="FAQs" emoji={'\u2753'} onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>
            FREQUENTLY ASKED QUESTIONS
          </ThemedText>
          <View style={styles.card}>
            {FAQ_DATA.map((item, index) => (
              <React.Fragment key={item.question}>
                <AccordionItem item={item} />
                {index < FAQ_DATA.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Still need help */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>STILL NEED HELP?</ThemedText>
          <View style={styles.card}>
            <View style={styles.helpCard}>
              <ThemedText style={styles.helpText}>
                Can't find what you're looking for? Reach out to our support
                team and we'll get back to you as soon as possible.
              </ThemedText>
              <ThemedText style={styles.twitterText}>
                DM us at @ashen_one on Twitter
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },

  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Accordion
  accordionItem: {
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  accordionContent: {
    overflow: 'hidden',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.md,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg,
  },

  // Help card
  helpCard: {
    padding: Spacing.lg,
  },
  helpText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  twitterText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.orange,
  },
});
