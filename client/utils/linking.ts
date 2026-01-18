import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const LINKING_PREFIX = Linking.createURL('/');
export const UNIVERSAL_LINK_PREFIX = 'https://snoozer.app';

export const linkingConfig = {
  prefixes: [LINKING_PREFIX, UNIVERSAL_LINK_PREFIX, 'snoozer://'],
  config: {
    screens: {
      AcceptInvite: {
        path: 'invite',
        parse: {
          code: (code: string) => code,
        },
      },
      BuddyDashboard: 'buddy',
      BuddyPoke: 'buddy/poke',
      BuddyHistory: 'buddy/history',
      PaymentHistory: 'payments',
      Home: '',
    },
  },
};

export const generateInviteCode = (userName: string): string => {
  const prefix = 'SNOOZE';
  const namePart = userName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'USER';
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${namePart}-${randomPart}`;
};

export const getInviteLink = (code: string): string => {
  return `snoozer://invite?code=${code}`;
};

export const getUniversalInviteLink = (code: string): string => {
  return `${UNIVERSAL_LINK_PREFIX}/invite/${code}`;
};

export const parseInviteCode = (url: string): string | null => {
  try {
    const parsed = Linking.parse(url);
    if (parsed.queryParams?.code) {
      return parsed.queryParams.code as string;
    }
    if (parsed.path?.startsWith('invite/')) {
      return parsed.path.replace('invite/', '');
    }
    return null;
  } catch {
    return null;
  }
};

export const openURL = async (url: string): Promise<boolean> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};
