/**
 * PUNISHMENTS SCREEN
 * PunishmentsScreen.tsx
 *
 * Settings page for managing default punishments.
 * Users can toggle which punishments are enabled by default.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';

import { ThemedText } from '@/components/ThemedText';
import { BackgroundGlow } from '@/components/BackgroundGlow';
import { FadeInView } from '@/components/FadeInView';
import Header from '@/components/Header';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import {
  getDefaultPunishments,
  saveDefaultPunishments,
  getPunishmentConfig,
  savePunishmentConfig,
  PunishmentConfig,
} from '@/utils/storage';
import { openURL } from '@/utils/linking';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PunishmentOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  comingSoon?: boolean;
  configurable?: boolean;
}

const PUNISHMENT_OPTIONS: PunishmentOption[] = [
  { id: 'shame_video', label: 'Shame video plays', description: 'At max volume', icon: '🎬', color: '#EF4444' },
  { id: 'buddy_call', label: 'Auto-call your buddy', description: 'Jake gets woken up too', icon: '📞', color: '#FB923C' },
  { id: 'group_chat', label: 'Text the group chat', description: '"The boys" on iMessage', icon: '💬', color: '#7C3AED' },
  { id: 'wife_dad', label: "Text your wife's dad", description: '"Hey Robert, quick question"', icon: '👴', color: '#EF4444', configurable: true },
  { id: 'mom', label: 'Auto-call your mom', description: "At 6am. She'll be worried.", icon: '👩', color: '#EC4899', configurable: true },
  { id: 'twitter', label: 'Tweet something bad', description: '"I overslept again lol"', icon: '🐦', color: '#1DA1F2' },
  { id: 'text_ex', label: 'Text friend something embarrassing', description: 'Random cringe message sent', icon: '😳', color: '#EF4444', configurable: true },
  { id: 'email_boss', label: 'Email your boss', description: '"Running late again, sorry"', icon: '📧', color: '#EA4335', configurable: true },
  { id: 'grandma_call', label: 'Auto-call your grandma', description: 'She WILL answer at 6am', icon: '👵', color: '#EC4899', configurable: true },
  { id: 'tinder_bio', label: 'Update Tinder bio', description: '"Can\'t even wake up on time"', icon: '🔥', color: '#FE3C72', comingSoon: true },
  { id: 'like_ex_photo', label: "Like your ex's old photo", description: "From 2019. They'll know.", icon: '📸', color: '#E4405F', comingSoon: true },
  { id: 'venmo_ex', label: 'Venmo your ex $1', description: 'With memo: "thinking of u"', icon: '💸', color: '#008CFF', comingSoon: true },
  { id: 'donate_enemy', label: 'Donate to a party you hate', description: 'Opposite of your politics', icon: '🗳️', color: '#EF4444', comingSoon: true },
  { id: 'thermostat', label: 'Drop thermostat to 55°F', description: 'Smart home integration', icon: '🥶', color: '#22C55E', comingSoon: true },
];

// Embarrassing email templates for boss punishment
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
  { subject: "I got chased by a goose for 2 miles", body: "Hi,\n\nThat goose is still outside my house. It's been 3 hours. It knows what it did. I know what I did.\n\nWe're at a standoff." },
  { subject: "I cried during a commercial and can't stop", body: "Hi,\n\nIt was the one with the dog waiting for its owner. I'm still crying. I've gone through 3 tissue boxes.\n\nI'm not okay." },
  { subject: "I wore my shirt inside out all day yesterday", body: "Hi,\n\nNobody told me. Not one person. I trusted you all. I'm taking a mental health day to recover from this betrayal.\n\nHow could you." },
  { subject: "I thought today was Saturday", body: "Hi,\n\nI'm at brunch. I ordered mimosas. It's Wednesday. I'm in my pajamas. Everyone is staring.\n\nShould I just stay?" },
  { subject: "I got scared by my own reflection", body: "Hi,\n\nI screamed so loud my neighbors called the police. I had to explain. They laughed. I'm hiding now.\n\nI hate mirrors." },
  { subject: "I accidentally joined a flash mob", body: "Hi,\n\nI didn't know the dance. Everyone knew the dance. I panicked. I did the Macarena. It was not the Macarena.\n\nI'm never going outside again." },
  { subject: "I locked myself in the bathroom at home", body: "Hi,\n\nThe lock is jammed. I've been in here for 6 hours. I've named the spiders. We're friends now.\n\nSend a locksmith." },
  { subject: "My pants ripped in public", body: "Hi,\n\nBig rip. Very visible. Very embarrassing location. I'm currently hiding behind a dumpster.\n\nCan someone bring me pants?" },
  { subject: "I sleep-texted my ex 47 times", body: "Hi,\n\nI woke up to responses. So many responses. I can never show my face again. I'm changing my identity.\n\nCall me Steve now." },
  { subject: "I challenged a teenager to a dance battle and lost", body: "Hi,\n\nIt was at the mall. There were witnesses. Someone filmed it. It might go viral. I need to leave the country.\n\nI did the worm. Badly." },
];

const getRandomEmail = () => EMBARRASSING_EMAILS[Math.floor(Math.random() * EMBARRASSING_EMAILS.length)];

// Embarrassing text messages for friend punishment
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

const getRandomEmbarrassingText = () => EMBARRASSING_TEXTS[Math.floor(Math.random() * EMBARRASSING_TEXTS.length)];

// Embarrassing tweets for Twitter punishment
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
  "i eat cereal for dinner 5 nights a week",
  "i once lied on my resume and got the job and i still dont know what im doing",
  "i practice conversations in the mirror before social events",
  "i flinch at my own reflection sometimes",
  "just realized ive been pronouncing 'quinoa' wrong for 6 years",
  "i clapped when the plane landed last week",
  "i wave back at people who werent waving at me on a daily basis",
  "my screen time report made me question my life choices",
  "i sniff my clothes to check if theyre clean enough to rewear",
  "i still dont know the difference between affect and effect",
];

const getRandomEmbarrassingTweet = () => EMBARRASSING_TWEETS[Math.floor(Math.random() * EMBARRASSING_TWEETS.length)];

// Toggle Component
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

// Punishment Row Component
interface PunishmentRowProps {
  punishment: PunishmentOption;
  enabled: boolean;
  onToggle: () => void;
  isLast: boolean;
  expanded: boolean;
  config: PunishmentConfig;
  onSaveConfig: (config: PunishmentConfig) => void;
  onExpand: () => void;
}

function PunishmentRow({ punishment, enabled, onToggle, isLast, expanded, config, onSaveConfig, onExpand }: PunishmentRowProps) {
  const [bossEmail, setBossEmail] = useState(config.email_boss?.bossEmail || '');
  const [exPhoneNumber, setExPhoneNumber] = useState(config.text_ex?.exPhoneNumber || '');
  const [wifesDadPhone, setWifesDadPhone] = useState(config.wife_dad?.phoneNumber || '');
  const [momPhone, setMomPhone] = useState(config.mom?.phoneNumber || '');
  const [grandmaPhone, setGrandmaPhone] = useState(config.grandma?.phoneNumber || '');

  // Sync local state when config changes
  useEffect(() => {
    if (punishment.id === 'email_boss') {
      setBossEmail(config.email_boss?.bossEmail || '');
    }
    if (punishment.id === 'text_ex') {
      setExPhoneNumber(config.text_ex?.exPhoneNumber || '');
    }
    if (punishment.id === 'wife_dad') {
      setWifesDadPhone(config.wife_dad?.phoneNumber || '');
    }
    if (punishment.id === 'mom') {
      setMomPhone(config.mom?.phoneNumber || '');
    }
    if (punishment.id === 'grandma_call') {
      setGrandmaPhone(config.grandma?.phoneNumber || '');
    }
  }, [config, punishment.id]);

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
      const randomMessage = getRandomEmbarrassingText();
      await SMS.sendSMSAsync([exPhoneNumber], randomMessage);
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
      "Robert, I need advice. How did you raise such an early riser? Asking because I clearly wasn't.",
      "Hey! Random thought at 6am - do you think I'm good enough for your daughter? I can't even wake up.",
      "Morning! I'm supposed to be at work but I'm still in bed. Life advice?",
      "Hi Robert! Quick poll: is hitting snooze 7 times a red flag?",
      "Hey, hypothetically, if someone snoozed their alarm 5 times, would that be grounds for disappointment?",
      "Good morning sir. I have failed. Again. The alarm won.",
      "Robert, I'm texting you from bed at 6am because I can't adult properly.",
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
        <ThemedText style={[styles.punishmentLabel, punishment.comingSoon && styles.comingSoonLabel]}>{punishment.label}</ThemedText>
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

      {/* Show saved email when configured and not expanded */}
      {enabled && punishment.id === 'email_boss' && config.email_boss?.bossEmail && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            📧 {config.email_boss.bossEmail}
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

      {/* Email Boss Configuration */}
      {expanded && punishment.id === 'email_boss' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your boss's email?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="boss@company.com"
            placeholderTextColor={Colors.textMuted}
            value={bossEmail}
            onChangeText={setBossEmail}
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

      {/* Show saved phone number when configured and not expanded */}
      {enabled && punishment.id === 'text_ex' && config.text_ex?.exPhoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            📱 {config.text_ex.exPhoneNumber}
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

      {/* Text Friend Something Embarrassing Configuration */}
      {expanded && punishment.id === 'text_ex' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>Enter your friend's number</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={exPhoneNumber}
            onChangeText={setExPhoneNumber}
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

      {/* Show saved wife's dad number when configured and not expanded */}
      {enabled && punishment.id === 'wife_dad' && config.wife_dad?.phoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigTextGreen}>
            📱 {config.wife_dad.phoneNumber}
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

      {/* Wife's Dad Configuration */}
      {expanded && punishment.id === 'wife_dad' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your wife's dad's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={wifesDadPhone}
            onChangeText={setWifesDadPhone}
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

      {/* Show saved mom's number when configured and not expanded */}
      {enabled && punishment.id === 'mom' && config.mom?.phoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigTextGreen}>
            📞 {config.mom.phoneNumber}
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

      {/* Mom Configuration */}
      {expanded && punishment.id === 'mom' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your mom's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={momPhone}
            onChangeText={setMomPhone}
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

      {/* Show saved grandma's number when configured and not expanded */}
      {enabled && punishment.id === 'grandma_call' && config.grandma?.phoneNumber && !expanded && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigTextGreen}>
            📞 {config.grandma.phoneNumber}
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

      {/* Grandma Configuration */}
      {expanded && punishment.id === 'grandma_call' && (
        <View style={styles.configSection}>
          <ThemedText style={styles.configLabel}>What is your grandma's number?</ThemedText>
          <TextInput
            style={styles.configInput}
            placeholder="+1 555 123 4567"
            placeholderTextColor={Colors.textMuted}
            value={grandmaPhone}
            onChangeText={setGrandmaPhone}
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

      {/* Twitter Test row - no config needed, just Test button */}
      {enabled && punishment.id === 'twitter' && (
        <View style={styles.savedConfigRow}>
          <ThemedText style={styles.savedConfigText}>
            🐦 Random embarrassing tweet
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

export default function PunishmentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [enabledPunishments, setEnabledPunishments] = useState<string[]>(['shame_video']);
  const [punishmentConfig, setPunishmentConfig] = useState<PunishmentConfig>({});
  const [expandedPunishment, setExpandedPunishment] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [punishments, config] = await Promise.all([
          getDefaultPunishments(),
          getPunishmentConfig(),
        ]);
        setEnabledPunishments(punishments);
        setPunishmentConfig(config);
      } catch {
        // Use defaults
      }
    };
    loadSettings();
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  }, [navigation]);

  const handleTogglePunishment = useCallback((id: string) => {
    const punishment = PUNISHMENT_OPTIONS.find(p => p.id === id);
    const isCurrentlyEnabled = enabledPunishments.includes(id);

    setEnabledPunishments(prev => {
      const newPunishments = isCurrentlyEnabled
        ? prev.filter(p => p !== id)
        : [...prev, id];

      // Save to storage
      saveDefaultPunishments(newPunishments);

      return newPunishments;
    });

    // If toggling ON a configurable punishment, expand it
    if (!isCurrentlyEnabled && punishment?.configurable) {
      setExpandedPunishment(id);
    } else if (isCurrentlyEnabled) {
      // If toggling OFF, collapse
      setExpandedPunishment(null);
    }
  }, [enabledPunishments]);

  const handleSaveConfig = useCallback(async (config: PunishmentConfig) => {
    setPunishmentConfig(config);
    await savePunishmentConfig(config);
    // Collapse after saving
    setExpandedPunishment(null);
  }, []);

  return (
    <View style={styles.container}>
      <BackgroundGlow color="orange" />

      {/* Header */}
      <View style={{ paddingTop: insets.top + Spacing.sm, paddingHorizontal: Spacing.lg }}>
        <Header type="nav" title="Punishments" onBackPress={handleBack} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing['2xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Punishments List */}
        <FadeInView delay={100} direction="up">
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>ENABLED PUNISHMENTS</ThemedText>
            <ThemedText style={styles.sectionHint}>
              These will be selected by default when creating new alarms
            </ThemedText>
            <View style={styles.card}>
              {PUNISHMENT_OPTIONS.map((punishment, index) => (
                <PunishmentRow
                  key={punishment.id}
                  punishment={punishment}
                  enabled={enabledPunishments.includes(punishment.id)}
                  onToggle={() => handleTogglePunishment(punishment.id)}
                  isLast={index === PUNISHMENT_OPTIONS.length - 1}
                  expanded={expandedPunishment === punishment.id}
                  config={punishmentConfig}
                  onSaveConfig={handleSaveConfig}
                  onExpand={() => setExpandedPunishment(punishment.id)}
                />
              ))}
            </View>
          </View>
        </FadeInView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },

  // Section
  section: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  // Card
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Punishment Row
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
  punishmentLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  punishmentDescription: {
    fontSize: 13,
    color: Colors.textMuted,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg + 24 + Spacing.md, // icon width + margin
  },

  // Toggle
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

  // Coming Soon
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

  // Configuration Section
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

  // Saved config display
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
});
