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
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

    const message = `${userName} invited you to Snoozer! 😴💰\n\nIf they snooze, YOU get paid. Hold them accountable.\n\nDownload: ${APP_LINK}?ref=${encodeURIComponent(phoneNumber)}`;

    const { result } = await SMS.sendSMSAsync([phoneNumber], message);

    // Save buddy info if sent
    if (result === 'sent' || result === 'unknown') {
      const buddyInfo: BuddyInfo = {
        name: '', // Will be set later via confirmBuddyJoined
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

  const sendAppleCash = useCallback(async (phoneNumber: string, amount: number): Promise<string> => {
    // Apple Cash is triggered by sending a message with just "$X"
    // iMessage auto-converts this to a payment request
    const message = `$${amount}`;

    // Method 1: Use SMS API
    const isAvailable = await SMS.isAvailableAsync();

    if (isAvailable) {
      await SMS.sendSMSAsync([phoneNumber], message);
      return 'opened';
    }

    // Method 2: Fallback to URL scheme
    const smsUrl = `sms:${phoneNumber}&body=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(smsUrl);

    if (canOpen) {
      await Linking.openURL(smsUrl);
      return 'opened';
    }

    throw new Error('Cannot open Messages app');
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
    const isShareAvailable = await Sharing.isAvailableAsync();

    if (isShareAvailable) {
      await Sharing.shareAsync(videoUri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Send your shame video',
        UTI: 'public.movie',
      });
      return 'shared';
    }

    throw new Error('Sharing not available');
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
  };
}
