import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddAlarm'>;

export default function AddAlarmScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const isOnboarding = route.params?.isOnboarding ?? true;

  const [time, setTime] = useState(new Date());
  const [label, setLabel] = useState('');
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setTime(selectedDate);
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    navigation.navigate('ReferencePhoto', {
      alarmTime: timeString,
      alarmLabel: label || 'Wake up',
      isOnboarding,
    });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing['3xl'],
        },
      ]}
    >
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Set Alarm Time</ThemedText>
        
        {Platform.OS === 'android' && !showPicker ? (
          <Button 
            onPress={() => setShowPicker(true)} 
            style={styles.timeButton}
          >
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Button>
        ) : null}

        {showPicker ? (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              textColor={Colors.text}
              themeVariant="dark"
              style={styles.picker}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Label</ThemedText>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="Wake up"
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.orange}
        />
      </View>

      <View style={styles.infoSection}>
        <ThemedText style={styles.infoText}>
          Next, you'll take a reference photo and record a shame video.
        </ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        <Button onPress={handleNext} style={styles.nextButton}>
          Next
        </Button>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerContainer: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 180,
  },
  timeButton: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    fontSize: 16,
    color: Colors.text,
  },
  infoSection: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  infoText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  nextButton: {
    backgroundColor: Colors.orange,
  },
});
