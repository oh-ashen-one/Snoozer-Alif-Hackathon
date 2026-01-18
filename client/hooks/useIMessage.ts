/**
 * iMESSAGE INTEGRATION HOOK
 * useIMessage.ts
 *
 * Provides functions for:
 * - Inviting buddies via iMessage
 * - Sending Apple Cash payments
 * - Sending shame messages/videos
 * - Managing buddy state
 */

import { useCallback, useState, useEffect } from 'react';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyInviteCode, getInviteMessage } from '@/utils/invites';
import { getInviteLink } from '@/utils/linking';

const APP_LINK = 'https://snoozer.app/invite';

const STORAGE_KEYS = {
  buddy: '@snoozer/buddy',
  shameContacts: '@snoozer/shame_contacts',
  paymentSettings: '@snoozer/payment_settings',
};

export interface BuddyInfo {
  name: string;
  phone: string;
  invitedAt: number;
  hasApp: boolean;
  joinedAt?: number;
}

export interface ShameContact {
  name: string;
  phone: string;
  type: 'buddy' | 'escalation' | 'group';
}

export interface PaymentSettings {
  amount: number;
  recipient: 'buddy' | 'friend' | 'charity';
  recipientPhone: string;
  method: 'apple_cash' | 'venmo' | 'crypto';
}

export function useIMessage() {
  const [buddy, setBuddy] = useState<BuddyInfo | null>(null);
  const [isSMSAvailable, setIsSMSAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check SMS availability and load buddy on mount
  useEffect(() => {
    const init = async () => {
      try {
        const available = await SMS.isAvailableAsync();
        setIsSMSAvailable(available);

        const storedBuddy = await AsyncStorage.getItem(STORAGE_KEYS.buddy);
        if (storedBuddy) {
          setBuddy(JSON.parse(storedBuddy));
        }
      } catch (error) {
        if (__DEV__) console.error('[useIMessage] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // INVITE BUDDY
  // ═══════════════════════════════════════════════════════════════

  const inviteBuddy = useCallback(async (phoneNumber: string, userName: string): Promise<string> => {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      throw new Error('SMS not available on this device');
    }

    const inviteCode = await getMyInviteCode(userName);
    const inviteLink = getInviteLink(inviteCode);
    const message = `${userName} invited you to Snoozer!\n\nIf they snooze, YOU get paid. Hold them accountable.\n\nTap to accept: ${inviteLink}`;

    const { result } = await SMS.sendSMSAsync([phoneNumber], message);

    if (result === 'sent' || result === 'unknown') {
      const buddyInfo: BuddyInfo = {
        name: '',
        phone: phoneNumber,
        invitedAt: Date.now(),
        hasApp: false,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.buddy, JSON.stringify(buddyInfo));
      setBuddy(buddyInfo);
    }

    return result;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SEND APPLE CASH
  // Opens iMessage with $ amount (Apple auto-detects Apple Cash)
  // ═══════════════════════════════════════════════════════════════

  const sendAppleCash = useCallback(async (
    phoneNumber: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> => {
    // Validate phone number
    if (!phoneNumber) {
      return { success: false, error: 'No phone number provided' };
    }

    // Apple Cash is triggered by sending a message with just "$X"
    // iMessage auto-converts this to a payment request
    const message = `$${amount}`;

    try {
      // Method 1: Use SMS API
      const isAvailable = await SMS.isAvailableAsync();

      if (isAvailable) {
        const { result } = await SMS.sendSMSAsync([phoneNumber], message);
        if (result === 'cancelled') {
          return { success: false, error: 'Message was cancelled' };
        }
        return { success: true };
      }

      // Method 2: Fallback to URL scheme
      const smsUrl = `sms:${phoneNumber}&body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);

      if (canOpen) {
        await Linking.openURL(smsUrl);
        return { success: true };
      }

      return { success: false, error: 'Messages app not available' };
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] sendAppleCash error:', error);
      return { success: false, error: 'Failed to open Messages' };
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SEND SHAME MESSAGE
  // ═══════════════════════════════════════════════════════════════

  const sendShameMessage = useCallback(async (
    contact: ShameContact,
    snoozedUserName: string,
    amount: number
  ): Promise<string> => {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      throw new Error('SMS not available');
    }

    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const messages: Record<string, string> = {
      buddy: `🚨 ${snoozedUserName} SNOOZED at ${timeStr}.\n\nThey owe you $${amount}. Don't let them off the hook. 😤`,
      escalation: `Hey, just wanted you to know ${snoozedUserName} couldn't get out of bed this morning. Again. 😬`,
      group: `SHAME ALERT 🚨\n\n${snoozedUserName} snoozed and owes $${amount}. Roast them. 🔥`,
    };

    const message = messages[contact.type] || messages.buddy;

    const { result } = await SMS.sendSMSAsync([contact.phone], message);

    return result;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // SEND SHAME VIDEO
  // Uses native share sheet since expo-sms doesn't support attachments
  // ═══════════════════════════════════════════════════════════════

  const sendShameVideo = useCallback(async (videoUri: string): Promise<string> => {
    try {
      await Share.share({
        url: videoUri,
        title: 'Shame video',
        message: 'Watch this shame video 😬',
      });
      return 'shared';
    } catch (error) {
      throw new Error('Sharing not available');
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // OPEN IMESSAGE DIRECTLY
  // ═══════════════════════════════════════════════════════════════

  const openIMessage = useCallback(async (phoneNumber: string, message: string = ''): Promise<boolean> => {
    const url = message
      ? `sms:${phoneNumber}&body=${encodeURIComponent(message)}`
      : `sms:${phoneNumber}`;

    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }

    return false;
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // PUNISHMENT ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send embarrassing email to boss
   * Opens Mail app with pre-filled content
   */
  const sendBossEmail = useCallback(async (): Promise<boolean> => {
    const subject = encodeURIComponent('Running late again');
    const body = encodeURIComponent('Sorry, I overslept and will be running late today. It won\'t happen again.\n\nSent from Snoozer - because I snoozed my alarm 😬');
    const mailUrl = `mailto:?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
        return true;
      }
      return false;
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] sendBossEmail error:', error);
      return false;
    }
  }, []);

  /**
   * Post embarrassing tweet
   * Opens Twitter/X app with pre-filled tweet
   */
  const postEmbarrassingTweet = useCallback(async (): Promise<boolean> => {
    const tweet = encodeURIComponent("I couldn't wake up on time again 😴 #snoozer #lazy #cantadult");

    // Try Twitter app first, then web fallback
    const twitterAppUrl = `twitter://post?message=${tweet}`;
    const twitterWebUrl = `https://twitter.com/intent/tweet?text=${tweet}`;

    try {
      const canOpenApp = await Linking.canOpenURL(twitterAppUrl);
      if (canOpenApp) {
        await Linking.openURL(twitterAppUrl);
        return true;
      }

      // Fallback to web
      await Linking.openURL(twitterWebUrl);
      return true;
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] postEmbarrassingTweet error:', error);
      return false;
    }
  }, []);

  /**
   * Initiate phone call to buddy
   * Opens Phone app with number
   */
  const callBuddy = useCallback(async (phoneNumber: string): Promise<boolean> => {
    if (!phoneNumber) return false;

    const telUrl = `tel:${phoneNumber}`;

    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
        return true;
      }
      return false;
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] callBuddy error:', error);
      return false;
    }
  }, []);

  /**
   * Send text to wife's dad
   * Opens Messages with embarrassing text
   */
  const textWifesDad = useCallback(async (phoneNumber: string): Promise<boolean> => {
    const message = "Hey Robert, quick question - is it normal for grown adults to hit snooze 5 times? Asking for a friend (me).";
    return await openIMessage(phoneNumber, message);
  }, [openIMessage]);

  /**
   * Send "I miss u" text to ex
   * Opens Messages with the dreaded text
   */
  const textEx = useCallback(async (phoneNumber: string): Promise<boolean> => {
    const message = "I miss u 💔";
    return await openIMessage(phoneNumber, message);
  }, [openIMessage]);

  /**
   * Send buddy notification when user snoozes
   */
  const sendBuddyNotification = useCallback(async (
    phoneNumber: string,
    userName: string,
    time: string
  ): Promise<boolean> => {
    const message = `🚨 ${userName} just SNOOZED at ${time}! They're being lazy again. Time to roast them! 😤`;
    return await openIMessage(phoneNumber, message);
  }, [openIMessage]);

  // ═══════════════════════════════════════════════════════════════
  // BUDDY STATUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  const checkBuddyStatus = useCallback(async (): Promise<BuddyInfo | null> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.buddy);
      const buddyInfo = stored ? JSON.parse(stored) : null;
      setBuddy(buddyInfo);
      return buddyInfo;
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] Error checking buddy status:', error);
      return null;
    }
  }, []);

  const confirmBuddyJoined = useCallback(async (buddyName: string): Promise<void> => {
    const currentBuddy = await checkBuddyStatus();
    if (currentBuddy) {
      const updatedBuddy: BuddyInfo = {
        ...currentBuddy,
        name: buddyName,
        hasApp: true,
        joinedAt: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.buddy, JSON.stringify(updatedBuddy));
      setBuddy(updatedBuddy);
    }
  }, [checkBuddyStatus]);

  const saveBuddyInfo = useCallback(async (buddyInfo: BuddyInfo): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.buddy, JSON.stringify(buddyInfo));
      setBuddy(buddyInfo);
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] Error saving buddy info:', error);
      throw error;
    }
  }, []);

  const clearBuddy = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.buddy);
      setBuddy(null);
    } catch (error) {
      if (__DEV__) console.error('[useIMessage] Error clearing buddy:', error);
    }
  }, []);

  return {
    // State
    buddy,
    isSMSAvailable,
    isLoading,

    // Actions
    inviteBuddy,
    sendAppleCash,
    sendShameMessage,
    sendShameVideo,
    openIMessage,
    checkBuddyStatus,
    confirmBuddyJoined,
    saveBuddyInfo,
    clearBuddy,

    // Punishment actions
    sendBossEmail,
    postEmbarrassingTweet,
    callBuddy,
    textWifesDad,
    textEx,
    sendBuddyNotification,
  };
}
