/**
 * HEADER USAGE EXAMPLES
 */

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import Header, { getGreeting } from './Header';

export default function App() {
  const [statsFilter, setStatsFilter] = useState('week');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        
        {/* HOME SCREEN */}
        <Header
          type="home"
          greeting={getGreeting()}
          name="Sarah"
          onSettingsPress={() => console.log('Settings')}
        />
        <View style={styles.spacer} />

        {/* STATS SCREEN */}
        <Header
          type="stats"
          filter={statsFilter}
          onFilterChange={setStatsFilter}
        />
        <View style={styles.spacer} />

        {/* BUDDY SCREEN */}
        <Header
          type="buddy"
          onAddPress={() => console.log('Add buddy')}
        />
        <View style={styles.spacer} />

        {/* SETTINGS SCREEN */}
        <Header
          type="settings"
          onBackPress={() => console.log('Go back')}
        />
        <View style={styles.spacer} />

        {/* EDIT ALARM SCREEN */}
        <Header
          type="edit"
          title="Edit Alarm"
          onCancelPress={() => console.log('Cancel')}
          onSavePress={() => console.log('Save')}
        />
        <View style={styles.spacer} />

        {/* NEW ALARM SCREEN */}
        <Header
          type="edit"
          title="New Alarm"
          onCancelPress={() => console.log('Cancel')}
          onSavePress={() => console.log('Create')}
        />

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
  content: {
    padding: 20,
    paddingTop: 40,
  },
  spacer: {
    height: 24,
  },
});
