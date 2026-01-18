import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import Header from '@/components/Header';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LegalRouteProp = RouteProp<RootStackParamList, 'Legal'>;

const TERMS_CONTENT = `Terms of Service

Last updated: January 2025

1. Acceptance of Terms

By downloading, installing, or using Snoozer ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the App.

2. Description of Service

Snoozer is an alarm application designed to help users wake up by requiring proof photos and using accountability mechanisms including shame videos.

3. User Responsibilities

You are responsible for:
- Recording your own shame video content
- Taking your own reference and proof photos
- Ensuring your alarm settings are appropriate
- Any content you create within the App

4. Privacy and Data

Your photos and videos are stored locally on your device. We do not upload or access your media files. See our Privacy Policy for more details.

5. Disclaimer

The App is provided "as is" without warranties of any kind. We are not responsible for:
- Missed alarms or oversleeping
- Embarrassment from shame videos
- Any damages resulting from use of the App

6. Changes to Terms

We reserve the right to modify these terms at any time. Continued use of the App constitutes acceptance of modified terms.

7. Contact

For questions about these terms, DM us at @ashen_one on Twitter.`;

const PRIVACY_CONTENT = `Privacy Policy

Last updated: January 2025

1. Information We Collect

Snoozer collects minimal information to provide our service:

Local Data (stored on your device only):
- Alarm settings and schedules
- Reference photos for location verification
- Shame videos you record
- Proof photos you take
- App preferences and settings

2. How We Use Your Information

All your data is stored locally on your device. We use this information solely to:
- Trigger alarms at scheduled times
- Verify proof photos against reference photos
- Play shame videos when you snooze

3. Data Sharing

We do not share, sell, or transmit your personal data to third parties. Your photos and videos never leave your device.

4. Data Storage and Security

All data is stored locally using your device's secure storage mechanisms. We recommend keeping your device secured with a passcode or biometric lock.

5. Data Deletion

You can delete all your data at any time through Settings > Sign out. This will remove all alarms, photos, videos, and preferences from your device.

6. Children's Privacy

Snoozer is not intended for children under 13. We do not knowingly collect information from children.

7. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date.

8. Contact Us

If you have questions about this Privacy Policy, DM us at @ashen_one on Twitter.`;

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LegalRouteProp>();

  const { type } = route.params;
  const isTerms = type === 'terms';

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <BackgroundGlow color="orange" />
      {/* Header */}
      <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md }}>
        <Header type="nav" title={isTerms ? 'Terms of Service' : 'Privacy Policy'} emoji={'\uD83D\uDCC4'} onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <ThemedText style={styles.contentText}>
            {isTerms ? TERMS_CONTENT : PRIVACY_CONTENT}
          </ThemedText>
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
    fontSize: 20,
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

  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },

  // Content
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
});
