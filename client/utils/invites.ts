import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateInviteCode, getInviteLink, getUniversalInviteLink } from './linking';

const STORAGE_KEYS = {
  PENDING_INVITE: '@snoozer/pending_invite',
  SENT_INVITES: '@snoozer/sent_invites',
  MY_INVITE_CODE: '@snoozer/my_invite_code',
};

export interface Invite {
  code: string;
  fromName: string;
  fromPhone?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface SentInvite {
  code: string;
  toPhone: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export const getMyInviteCode = async (userName: string): Promise<string> => {
  try {
    const existingCode = await AsyncStorage.getItem(STORAGE_KEYS.MY_INVITE_CODE);
    if (existingCode) {
      return existingCode;
    }
    const newCode = generateInviteCode(userName);
    await AsyncStorage.setItem(STORAGE_KEYS.MY_INVITE_CODE, newCode);
    return newCode;
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error getting invite code:', error);
    return generateInviteCode(userName);
  }
};

export const regenerateInviteCode = async (userName: string): Promise<string> => {
  const newCode = generateInviteCode(userName);
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MY_INVITE_CODE, newCode);
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error saving new invite code:', error);
  }
  return newCode;
};

export const getPendingInvite = async (): Promise<Invite | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_INVITE);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error getting pending invite:', error);
    return null;
  }
};

export const savePendingInvite = async (invite: Invite): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_INVITE, JSON.stringify(invite));
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error saving pending invite:', error);
  }
};

export const clearPendingInvite = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_INVITE);
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error clearing pending invite:', error);
  }
};

export const getSentInvites = async (): Promise<SentInvite[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SENT_INVITES);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error getting sent invites:', error);
    return [];
  }
};

export const saveSentInvite = async (invite: SentInvite): Promise<void> => {
  try {
    const existing = await getSentInvites();
    existing.push(invite);
    await AsyncStorage.setItem(STORAGE_KEYS.SENT_INVITES, JSON.stringify(existing));
  } catch (error) {
    if (__DEV__) console.log('[Invites] Error saving sent invite:', error);
  }
};

export const parseInviteFromCode = (code: string, fromName?: string): Invite => {
  const namePart = code.split('-')[1] || 'Someone';
  return {
    code,
    fromName: fromName || namePart,
    timestamp: Date.now(),
    status: 'pending',
  };
};

export const getInviteMessage = (code: string, userName: string): string => {
  const link = getInviteLink(code);
  return `Hey! Join me on Snoozer and let's hold each other accountable to wake up on time. 💪\n\nTap to accept: ${link}\n\n- ${userName}`;
};

export const getShareableInviteData = (code: string, userName: string) => {
  return {
    message: getInviteMessage(code, userName),
    link: getInviteLink(code),
    universalLink: getUniversalInviteLink(code),
  };
};
