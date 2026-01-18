/**
 * ALARM CARD USAGE EXAMPLE
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import AlarmCard from './AlarmCard';

export default function AlarmsScreen() {
  const [alarms, setAlarms] = useState([
    {
      id: '1',
      time: '6:00',
      amPm: 'AM',
      days: [1, 2, 3, 4, 5], // Mon-Fri
      stake: 5,
      buddyName: 'Jake',
      proofType: 'Brush teeth',
      enabled: true,
    },
    {
      id: '2',
      time: '7:30',
      amPm: 'AM',
      days: [0, 6], // Sat, Sun
      stake: 0,
      buddyName: '',
      proofType: '',
      enabled: false,
    },
    {
      id: '3',
      time: '5:30',
      amPm: 'AM',
      days: [1, 2, 3, 4, 5],
      stake: 10,
      buddyName: 'Mom',
      proofType: 'At gym',
      enabled: true,
    },
  ]);

  const toggleAlarm = (id) => {
    setAlarms(alarms.map(alarm => 
      alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm
    ));
  };

  const testAlarm = (id) => {
    console.log('Testing alarm:', id);
    // Trigger test alarm sound/vibration
  };

  const editAlarm = (id) => {
    console.log('Editing alarm:', id);
    // Navigate to edit screen
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(alarm => alarm.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Your Alarms</Text>

        {alarms.map(alarm => (
          <AlarmCard
            key={alarm.id}
            time={alarm.time}
            amPm={alarm.amPm}
            days={alarm.days}
            stake={alarm.stake}
            buddyName={alarm.buddyName}
            proofType={alarm.proofType}
            enabled={alarm.enabled}
            onToggle={() => toggleAlarm(alarm.id)}
            onTest={() => testAlarm(alarm.id)}
            onEdit={() => editAlarm(alarm.id)}
            onDelete={() => deleteAlarm(alarm.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A09',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAF9',
    marginBottom: 16,
  },
});
