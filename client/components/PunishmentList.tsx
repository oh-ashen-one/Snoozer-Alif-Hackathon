/**
 * SHARED PUNISHMENT LIST COMPONENT
 * Used by both PunishmentsScreen and AddAlarmScreen
 * Single source of truth for punishment UI
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { PunishmentConfig, saveDefaultPunishments, savePunishmentConfig } from '@/utils/storage';
import { openURL } from '@/utils/linking';

export interface PunishmentOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
  configurable?: boolean;
}

export const PUNISHMENT_OPTIONS: PunishmentOption[] = [
  { id: 'shame_video', label: 'Shame video plays', description: 'At max volume', icon: '🎬', color: '#EF4444' },
  { id: 'buddy_call', label: 'Auto-call your buddy', description: 'Jake gets woken up too', icon: '📞', color: '#FB923C' },
  { id: 'group_chat', label: 'Text the group chat', description: '"The boys" on iMessage', icon: '💬', color: '#7C3AED', comingSoon: true },
  { id: 'wife_dad', label: "Text your wife's dad", description: '"Hey Robert, quick question"', icon: '👴', color: '#EF4444', configurable: true },
  { id: 'mom', label: 'Auto-call your mom', description: "At 6am. She'll be worried.", icon: '👩', color: '#EC4899', configurable: true },
  { id: 'twitter', label: 'Tweet something bad', description: '"I overslept again lol"', icon: '🐦', color: '#1DA1F2' },
  { id: 'text_ex', label: 'Text your ex you miss her', description: '"imysm"', icon: '💔', color: '#EF4444', configurable: true },
  { id: 'email_boss', label: 'Email your boss', description: '"Running late again, sorry"', icon: '📧', color: '#EA4335', configurable: true },
  { id: 'grandma_call', label: 'Auto-call your grandma', description: 'She WILL answer at 6am', icon: '👵', color: '#EC4899', configurable: true },
  { id: 'tinder_bio', label: 'Update Tinder bio', description: '"Can\'t even wake up on time"', icon: '🔥', color: '#FE3C72', comingSoon: true },
  { id: 'like_ex_photo', label: "Like your ex's old photo", description: "From 2019. They'll know.", icon: '📸', color: '#E4405F', comingSoon: true },
  { id: 'venmo_ex', label: 'Venmo your ex $1', description: 'With memo: "thinking of u"', icon: '💸', color: '#008CFF', comingSoon: true },
  { id: 'donate_enemy', label: 'Donate to a party you hate', description: 'Opposite of your politics', icon: '🗳️', color: '#EF4444', comingSoon: true },
  { id: 'thermostat', label: 'Drop thermostat to 55°F', description: 'Smart home integration', icon: '🥶', color: '#22C55E', comingSoon: true },
];

const EMBARRASSING_EMAILS = [
  { subject: "I pooped my pants this morning", body: "Hi,\n\nI'm running late because I had a bit of an accident. The less said the better.\n\nPlease don't bring this up." },
  { subject: "A raccoon is living in my car", body: "Hi,\n\nI can't come in because there's a raccoon in my car and it won't leave. It hissed at me. I'm scared.\n\nSend help." },
  { subject: "I stayed up until 4am playing Fortnite", body: "Hi,\n\nI made some bad decisions last night. I was SO close to a Victory Royale. I didn't get it. And now I'm exhausted.\n\nWorth it though." },
  { subject: "I got my head stuck in a fence", body: "Hi,\n\nLong story. Fire department is on the way. I'll explain later but please don't ask.\n\nThis is not a joke." },
  { subject: "I accidentally dyed myself blue", body: "Hi,\n\nI look like a Smurf. I can't come in like this. People will laugh. I'm already crying.\n\nBlue tears." },
  { subject: "I'm stuck in a children's playground swing", body: "Hi,\n\nI wanted to see if I still fit. I don't. Can't feel my legs. Might need the fire department again.\n\nPlease don't tell anyone." },
  { subject: "I followed a dog home and got lost", body: "Hi,\n\nI saw a really cute dog and followed it. I have no idea where I am now. My phone is at 3%.\n\nTell my family I love th" },
  { subject: "My pet ferret escaped into my walls", body: "Hi,\n\nMr. Noodles is somewhere in my walls. I can hear him. I can't leave until I find him. He's my best friend.\n\nThis could take days." },
  { subject: "I superglued my hand to my face", body: "Hi,\n\nI was trying to fix something and now my hand is permanently on my cheek. I look ridiculous. The ER is packed.\n\nThis hurts." },
  { subject: "I ate a whole cake and I feel sick", body: "Hi,\n\nIt was my birthday cake. I was supposed to share it with the office. I ate it all at 2am. No regrets. Many regrets.\n\nSend Tums." },
];

const EMBARRASSING_TEXTS = [
  "I just shit myself at work",
  "I still sleep with a stuffed animal",
  "I cried watching a dog food commercial",
  "I just googled 'how to make friends'",
  "I practiced my smile in the mirror for 20 mins today",
  "I named my houseplant and talk to it daily",
  "I have a crush on a cartoon character",
  "I just ate cereal for dinner. The third night in a row.",
  "I accidentally liked my ex's photo from 2019",
  "I still don't know left from right without thinking",
  "I waved back at someone who wasn't waving at me",
  "I just fell UP the stairs in public",
  "I've been wearing my shirt inside out all day",
  "I just called my teacher 'mom' in a work meeting",
  "I forgot how old I am and had to do math",
  "I peed a little when I sneezed",
  "I clog the toilet every time I visit my parents",
  "I rehearse conversations in the shower",
  "I got scared by my own fart",
  "I still can't whistle and I'm devastated about it",
];

const EMBARRASSING_TWEETS = [
  "im gay",
  "i like butt",
  "i just mass sharted myself at work",
  "does anyone know how to get poop stains out of khakis asking for myself",
  "i still sleep with a stuffed animal im 28",
  "just googled 'how to make friends' at 2am",
  "i cry during pixar movies every single time",
  "my mom still does my laundry",
  "i talk to my plants and they dont even respond",
  "just got rejected by a bot on a dating app",
];

const getRandomEmail = () => EMBARRASSING_EMAILS[Math.floor(Math.random() * EMBARRASSING_EMAILS.length)];
const getRandomEmbarrassingText = () => EMBARRASSING_TEXTS[Math.floor(Math.random() * EMBARRASSING_TEXTS.length)];
const getRandomEmbarrassingTweet = () => EMBARRASSING_TWEETS[Math.floor(Math.random() * EMBARRASSING_TWEETS.length)];

function Toggle({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  const translateX = useSharedValue(value ? 23 : 3);

  useEffect(() => {
    translateX.value = withTiming(value ? 23 : 3, { duration: 200 });
  }, [value, translateX]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Pressable
      onPress={onValueChange}
      style={[styles.toggle, { backgroundColor: value ? Colors.green : Colors.border }]}
    >
      <Animated.View style={[styles.toggleKnob, knobStyle]} />
    </Pressable>
  );
}

interface PunishmentRowProps {
  punishment: PunishmentOption;
  enabled: boolean;
  onToggle: () => void;
  isLast: boolean;
  expanded: boolean;
  config: PunishmentConfig;
  onSaveConfig: (config: PunishmentConfig) => void;
  onExpand: () => void;
  isConfigured?: boolean;
  shameVideoUri?: string | null;
  onRecordShameVideo?: () => void;
  onViewShameVideo?: () => void;
}

export function PunishmentRow({ punishment, enabled, onToggle, isLast, expanded, config, onSaveConfig, onExpand, isConfigured, shameVideoUri, onRecordShameVideo, onViewShameVideo }: PunishmentRowProps) {
  const [bossEmail, setBossEmail] = useState(config.email_boss?.bossEmail || '');
  const [exPhoneNumber, setExPhoneNumber] = useState(config.text_ex?.exPhoneNumber || '');
  const [wifesDadPhone, setWifesDadPhone] = useState(config.wife_dad?.phoneNumber || '');
  const [momPhone, setMomPhone] = useState(config.mom?.phoneNumber || '');
  const [grandmaPhone, setGrandmaPhone] = useState(config.grandma?.phoneNumber || '');

  // Removed useEffect that was resetting inputs on config prop change
  // Inputs now save immediately on change to prevent data loss

  const handleToggle = useCallback(() => {
    if (punishment.comingSoon) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  }, [onToggle, punishment.comingSoon]);

  const handleTestEmail = useCallback(async () => {
    if (!bossEmail) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const email = getRandomEmail();
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(email.body);
    const mailtoUrl = `mailto:${bossEmail}?subject=${subject}&body=${body}`;
    await openURL(mailtoUrl);
  }, [bossEmail]);

  const handleSaveEmailConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      email_boss: { bossEmail },
    });
  }, [bossEmail, config, onSaveConfig]);

  const handleTestTextEx = useCallback(async () => {
    if (!exPhoneNumber) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([exPhoneNumber], 'imysm');
    }
  }, [exPhoneNumber]);

  const handleSaveTextExConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      text_ex: { exPhoneNumber },
    });
  }, [exPhoneNumber, config, onSaveConfig]);

  const handleTestWifesDad = useCallback(async () => {
    if (!wifesDadPhone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const messages = [
      "Hey Robert, quick question - is it normal for grown adults to hit snooze 5 times? Asking for a friend (me).",
      "Good morning! Just wanted you to know your daughter married someone who can't wake up on time.",
      "Hi, it's me. I overslept again. Please don't tell her.",
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([wifesDadPhone], randomMessage);
    }
  }, [wifesDadPhone]);

  const handleSaveWifesDadConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      wife_dad: { phoneNumber: wifesDadPhone },
    });
  }, [wifesDadPhone, config, onSaveConfig]);

  const handleTestMom = useCallback(async () => {
    if (!momPhone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const telUrl = `tel:${momPhone}`;
    const canOpen = await Linking.canOpenURL(telUrl);
    if (canOpen) {
      await Linking.openURL(telUrl);
    }
  }, [momPhone]);

  const handleSaveMomConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      mom: { phoneNumber: momPhone },
    });
  }, [momPhone, config, onSaveConfig]);

  const handleTestGrandma = useCallback(async () => {
    if (!grandmaPhone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const telUrl = `tel:${grandmaPhone}`;
    const canOpen = await Linking.canOpenURL(telUrl);
    if (canOpen) {
      await Linking.openURL(telUrl);
    }
  }, [grandmaPhone]);

  const handleSaveGrandmaConfig = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSaveConfig({
      ...config,
      grandma: { phoneNumber: grandmaPhone },
    });
  }, [grandmaPhone, config, onSaveConfig]);

  const handleTestTweet = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const randomTweet = getRandomEmbarrassingTweet();
    const tweetUrl = `https://twitter.com/intent/post?text=${encodeURIComponent(randomTweet)}`;
    await Linking.openURL(tweetUrl);
  }, []);

  const content = (
    <View style={styles.punishmentLeft}>
      <ThemedText style={[styles.punishmentIcon, punishment.comingSoon && styles.comingSoonIcon]}>{punishment.icon}</ThemedText>
      <View style={styles.punishmentInfo}>
        <View style={styles.labelRow}>
          <ThemedText style={[styles.punishmentLabel, punishment.comingSoon && styles.comingSoonLabel]}>{punishment.label}</ThemedText>
          {isConfigured ? (
            <View style={styles.configuredBadge}>
              <ThemedText style={styles.configuredBadgeText}>Set up</ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText style={styles.punishmentDescription}>{punishment.description}</ThemedText>
      </View>
    </View>
  );

  return (
    <>
      {punishment.comingSoon ? (
        <View style={styles.punishmentRow}>
          {content}
          <View style={styles.comingSoonBadge}>
            <ThemedText style={styles.comingSoonText}>Coming Soon</ThemedText>
          </View>
        </View>
      ) : (
        <Pressable style={styles.punishmentRow} onPress={handleToggle}>
          {content}
          <Toggle value={enabled} onValueChange={handleToggle} />
        </Pressable>
      )}

      {enabled && punishment.id === 'shame_video' && (
        <View style={styles.shameVideoSection}>
          <View style={styles.shameVideoButtons}>
            {shameVideoUri && (
              <Pressable
                style={[styles.shameVideoButton, styles.shameVideoButtonFlex]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onViewShameVideo?.();
                }}
              >
                <Text style={{ fontSize: 14 }}>▶️</Text>
                <ThemedText style={styles.shameVideoButtonText}>Play Video</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.recordVideoButton, shameVideoUri && styles.recordVideoButtonFlex]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRecordShameVideo?.();
              }}
            >
              <Text style={{ fontSize: 16 }}>🎥</Text>
              <ThemedText style={styles.recordVideoButtonText}>Record Video</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {enabled && punishment.id === 'email_boss' && config.email_boss?.bossEmail && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            {config.email_boss.bossEmail}
          </ThemedText>
          <View style={styles.savedConfigButtons}>
            <Pressable style={styles.savedConfigButton} onPress={handleTestEmail}>
              <ThemedText style={styles.testLinkText}>Test</ThemedText>
            </Pressable>
            <Pressable style={styles.savedConfigButton} onPress={onExpand}>
              <ThemedText style={styles.editText}>Edit</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {expanded && punishment.id === 'email_boss' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your boss's email?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="boss@company.com"
            placeholderTextColor={Colors.textMuted}
            value={bossEmail}
            onChangeText={setBossEmail}
            onBlur={() => {
              if (bossEmail) {
                onSaveConfig({ ...config, email_boss: { bossEmail } });
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !bossEmail && styles.buttonDisabled]}
              onPress={handleTestEmail}
              disabled={!bossEmail}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !bossEmail && styles.buttonDisabled]}
              onPress={handleSaveEmailConfig}
              disabled={!bossEmail}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {enabled && punishment.id === 'text_ex' && config.text_ex?.exPhoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            {config.text_ex.exPhoneNumber}
          </ThemedText>
          <View style={styles.savedConfigButtons}>
            <Pressable onPress={handleTestTextEx}>
              <ThemedText style={styles.testLinkText}>Test</ThemedText>
            </Pressable>
            <Pressable onPress={onExpand}>
              <ThemedText style={styles.editText}>Edit</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {expanded && punishment.id === 'text_ex' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>Enter your ex's number</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={exPhoneNumber}
            onChangeText={setExPhoneNumber}
            onBlur={() => {
              if (exPhoneNumber) {
                onSaveConfig({ ...config, text_ex: { exPhoneNumber } });
              }
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !exPhoneNumber && styles.buttonDisabled]}
              onPress={handleTestTextEx}
              disabled={!exPhoneNumber}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !exPhoneNumber && styles.buttonDisabled]}
              onPress={handleSaveTextExConfig}
              disabled={!exPhoneNumber}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {enabled && punishment.id === 'wife_dad' && config.wife_dad?.phoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigTextGreen}>
            {config.wife_dad.phoneNumber}
          </ThemedText>
          <View style={styles.savedConfigButtons}>
            <Pressable style={styles.savedConfigButton} onPress={handleTestWifesDad}>
              <ThemedText style={styles.testLinkText}>Test</ThemedText>
            </Pressable>
            <Pressable style={styles.savedConfigButton} onPress={onExpand}>
              <ThemedText style={styles.editText}>Edit</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {expanded && punishment.id === 'wife_dad' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your wife's dad's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={wifesDadPhone}
            onChangeText={setWifesDadPhone}
            onBlur={() => {
              if (wifesDadPhone) {
                onSaveConfig({ ...config, wife_dad: { phoneNumber: wifesDadPhone } });
              }
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !wifesDadPhone && styles.buttonDisabled]}
              onPress={handleTestWifesDad}
              disabled={!wifesDadPhone}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !wifesDadPhone && styles.buttonDisabled]}
              onPress={handleSaveWifesDadConfig}
              disabled={!wifesDadPhone}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {enabled && punishment.id === 'mom' && config.mom?.phoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigTextGreen}>
            {config.mom.phoneNumber}
          </ThemedText>
          <View style={styles.savedConfigButtons}>
            <Pressable style={styles.savedConfigButton} onPress={handleTestMom}>
              <ThemedText style={styles.testLinkText}>Test</ThemedText>
            </Pressable>
            <Pressable style={styles.savedConfigButton} onPress={onExpand}>
              <ThemedText style={styles.editText}>Edit</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {expanded && punishment.id === 'mom' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your mom's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={momPhone}
            onChangeText={setMomPhone}
            onBlur={() => {
              if (momPhone) {
                onSaveConfig({ ...config, mom: { phoneNumber: momPhone } });
              }
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !momPhone && styles.buttonDisabled]}
              onPress={handleTestMom}
              disabled={!momPhone}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !momPhone && styles.buttonDisabled]}
              onPress={handleSaveMomConfig}
              disabled={!momPhone}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {enabled && punishment.id === 'grandma_call' && config.grandma?.phoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigTextGreen}>
            {config.grandma.phoneNumber}
          </ThemedText>
          <View style={styles.savedConfigButtons}>
            <Pressable style={styles.savedConfigButton} onPress={handleTestGrandma}>
              <ThemedText style={styles.testLinkText}>Test</ThemedText>
            </Pressable>
            <Pressable style={styles.savedConfigButton} onPress={onExpand}>
              <ThemedText style={styles.editText}>Edit</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {expanded && punishment.id === 'grandma_call' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your grandma's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={grandmaPhone}
            onChangeText={setGrandmaPhone}
            onBlur={() => {
              if (grandmaPhone) {
                onSaveConfig({ ...config, grandma: { phoneNumber: grandmaPhone } });
              }
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.configButtons}>
            <Pressable
              style={[styles.testButton, !grandmaPhone && styles.buttonDisabled]}
              onPress={handleTestGrandma}
              disabled={!grandmaPhone}
            >
              <ThemedText style={styles.testButtonText}>Test</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, !grandmaPhone && styles.buttonDisabled]}
              onPress={handleSaveGrandmaConfig}
              disabled={!grandmaPhone}
            >
              <ThemedText style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {enabled && punishment.id === 'twitter' && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            Random embarrassing tweet
          </ThemedText>
          <Pressable style={styles.savedConfigButton} onPress={handleTestTweet}>
            <ThemedText style={styles.testLinkText}>Test</ThemedText>
          </Pressable>
        </View>
      )}

      {!isLast && <View style={styles.divider} />}
    </>
  );
}

interface PunishmentListProps {
  enabledPunishments: string[];
  onTogglePunishment: (id: string) => void;
  punishmentConfig: PunishmentConfig;
  onSaveConfig: (config: PunishmentConfig) => void;
  expandedPunishment: string | null;
  onExpandPunishment: (id: string | null) => void;
  shameVideoUri?: string | null;
  onRecordShameVideo?: () => void;
  onViewShameVideo?: () => void;
}

function hasConfigData(id: string, config: PunishmentConfig): boolean {
  switch (id) {
    case 'email_boss':
      return !!config.email_boss?.bossEmail;
    case 'text_ex':
      return !!config.text_ex?.exPhoneNumber;
    case 'wife_dad':
      return !!config.wife_dad?.phoneNumber;
    case 'mom':
      return !!config.mom?.phoneNumber;
    case 'grandma_call':
      return !!config.grandma?.phoneNumber;
    default:
      return false;
  }
}

export function PunishmentList({
  enabledPunishments,
  onTogglePunishment,
  punishmentConfig,
  onSaveConfig,
  expandedPunishment,
  onExpandPunishment,
  shameVideoUri,
  onRecordShameVideo,
  onViewShameVideo,
}: PunishmentListProps) {
  const handleToggle = useCallback((id: string) => {
    const punishment = PUNISHMENT_OPTIONS.find(p => p.id === id);
    const isCurrentlyEnabled = enabledPunishments.includes(id);
    
    onTogglePunishment(id);

    if (!isCurrentlyEnabled && punishment?.configurable) {
      onExpandPunishment(id);
    } else if (isCurrentlyEnabled) {
      onExpandPunishment(null);
    }
  }, [enabledPunishments, onTogglePunishment, onExpandPunishment]);

  const sortedPunishments = React.useMemo(() => {
    const configured: PunishmentOption[] = [];
    const regular: PunishmentOption[] = [];
    const comingSoon: PunishmentOption[] = [];

    PUNISHMENT_OPTIONS.forEach(punishment => {
      if (punishment.comingSoon) {
        comingSoon.push(punishment);
      } else if (hasConfigData(punishment.id, punishmentConfig)) {
        configured.push(punishment);
      } else {
        regular.push(punishment);
      }
    });

    return [...configured, ...regular, ...comingSoon];
  }, [punishmentConfig]);

  return (
    <View style={styles.card}>
      {sortedPunishments.map((punishment, index) => {
        const isConfigured = hasConfigData(punishment.id, punishmentConfig);
        return (
          <PunishmentRow
            key={punishment.id}
            punishment={punishment}
            enabled={enabledPunishments.includes(punishment.id)}
            onToggle={() => handleToggle(punishment.id)}
            isLast={index === sortedPunishments.length - 1}
            expanded={expandedPunishment === punishment.id}
            config={punishmentConfig}
            onSaveConfig={onSaveConfig}
            onExpand={() => onExpandPunishment(punishment.id)}
            isConfigured={isConfigured}
            shameVideoUri={punishment.id === 'shame_video' ? shameVideoUri : undefined}
            onRecordShameVideo={punishment.id === 'shame_video' ? onRecordShameVideo : undefined}
            onViewShameVideo={punishment.id === 'shame_video' ? onViewShameVideo : undefined}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  punishmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  punishmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  punishmentIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  punishmentInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 2,
  },
  punishmentLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  configuredBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  configuredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.green,
  },
  punishmentDescription: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 24 + Spacing.md,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(120, 113, 108, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  comingSoonIcon: {
    opacity: 0.5,
  },
  comingSoonLabel: {
    color: Colors.textMuted,
  },
  configSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  configInput: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  configButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  testButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.green,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.bg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  savedConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(234, 67, 53, 0.05)',
  },
  savedConfigText: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  savedConfigTextGreen: {
    fontSize: 13,
    color: Colors.green,
    flex: 1,
    fontWeight: '500',
  },
  savedConfigButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  savedConfigButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  testLinkText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '500',
  },
  editText: {
    fontSize: 13,
    color: Colors.orange,
    fontWeight: '500',
  },
  shameVideoSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  shameVideoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  shameVideoStatusText: {
    fontSize: 14,
    color: Colors.green,
    fontWeight: '500',
  },
  shameVideoButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  shameVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shameVideoButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  shameVideoButtonFlex: {
    flex: 1,
  },
  recordVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.red,
    borderRadius: BorderRadius.md,
  },
  recordVideoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  recordVideoButtonFlex: {
    flex: 1,
  },
});
