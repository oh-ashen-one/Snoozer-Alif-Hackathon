/**
 * SHAME MESSAGE SENT
 * ShameMessageSent.tsx
 *
 * Full-screen modal shown after shame messages are sent to buddies.
 * Features animated contact cards, message previews, stats, and streak lost indicator.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { Svg, Path, Polyline, Line } from 'react-native-svg';

const CheckIcon = ({ size = 14, color = '#0C0A09' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" />
  </Svg>
);

const MessageIcon = ({ size = 18, color = '#22C55E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Svg>
);

const DollarIcon = ({ size = 18, color = '#FB923C' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="12" y1="2" x2="12" y2="22" />
    <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </Svg>
);

const SHAME_MESSAGES: Record<string, (name: string) => string> = {
  buddy: (name) => `🚨 ${name} SNOOZED! They owe you money. Don't let them off the hook. 😤`,
  escalation: (name) => `Hey, just wanted you to know ${name} couldn't get out of bed this morning. Again. 😬`,
  group: (name) => `SHAME ALERT 🚨 ${name} snoozed and owes money. Roast them. 🔥`,
};

interface Contact {
  name: string;
  type: 'buddy' | 'escalation' | 'group';
}

interface ContactItemProps {
  contact: Contact;
  userName: string;
  index: number;
}

function ContactItem({ contact, userName, index }: ContactItemProps) {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 150, useNativeDriver: true }),
    ]).start();
  }, [index, slideAnim, fadeAnim]);

  const message = SHAME_MESSAGES[contact.type]?.(userName) || SHAME_MESSAGES.buddy(userName);

  return (
    <Animated.View style={[styles.contactItem, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contactHeader}>
        <View style={styles.checkCircle}>
          <CheckIcon />
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactType}>{contact.type}</Text>
        </View>
        <MessageIcon />
      </View>
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{message}</Text>
      </View>
    </Animated.View>
  );
}

interface ShameMessageSentProps {
  visible?: boolean;
  contacts?: Contact[];
  amountSent?: number;
  recipientName?: string;
  userName?: string;
  onDismiss: () => void;
}

export default function ShameMessageSent({
  visible = false,
  contacts = [],
  amountSent = 0,
  recipientName = 'Buddy',
  userName = 'You',
  onDismiss,
}: ShameMessageSentProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.emoji}>📱</Text>
            <Text style={styles.title}>Shame sent.</Text>
            <Text style={styles.subtitle}>Everyone knows you failed.</Text>

            <View style={styles.contactsList}>
              {contacts.map((contact, index) => (
                <ContactItem key={index} contact={contact} userName={userName} index={index} />
              ))}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIconRow}>
                  <MessageIcon size={20} />
                  <Text style={styles.statNumber}>{contacts.length}</Text>
                </View>
                <Text style={styles.statLabel}>people notified</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={styles.statIconRow}>
                  <DollarIcon size={20} />
                  <Text style={styles.statNumber}>${amountSent}</Text>
                </View>
                <Text style={styles.statLabel}>sent to {recipientName}</Text>
              </View>
            </View>

            <View style={styles.streakLostCard}>
              <Text style={styles.streakLostEmoji}>💔</Text>
              <View>
                <Text style={styles.streakLostTitle}>Streak lost</Text>
                <Text style={styles.streakLostText}>Back to day 1 tomorrow</Text>
              </View>
            </View>

            <Text style={styles.bottomMessage}>Don't let it happen again.</Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.acceptButton} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.acceptButtonText}>I'll do better tomorrow</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0A09',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FAFAF9',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 32,
  },
  contactsList: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  contactItem: {
    backgroundColor: '#1C1917',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#292524',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FAFAF9',
  },
  contactType: {
    fontSize: 12,
    color: '#78716C',
    textTransform: 'capitalize',
  },
  messageBubble: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    padding: 12,
    marginLeft: 40,
  },
  messageText: {
    fontSize: 14,
    color: '#FAFAF9',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1917',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#292524',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FAFAF9',
  },
  statLabel: {
    fontSize: 12,
    color: '#78716C',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#292524',
    marginHorizontal: 16,
  },
  streakLostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  streakLostEmoji: {
    fontSize: 28,
  },
  streakLostTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  streakLostText: {
    fontSize: 13,
    color: '#A8A29E',
  },
  bottomMessage: {
    fontSize: 15,
    color: '#78716C',
    marginBottom: 16,
  },
  footer: {
    padding: 24,
    paddingTop: 0,
  },
  acceptButton: {
    backgroundColor: '#292524',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FAFAF9',
  },
});
