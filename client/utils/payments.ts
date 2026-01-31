import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENT_METHOD_KEY = '@snoozer/payment_method';
const PAYMENT_INFO_KEY = '@snoozer/payment_info';

export type PaymentMethod = 'apple_cash' | 'venmo' | 'paypal' | 'cashapp';

export interface PaymentInfo {
  method: PaymentMethod;
  phoneNumber?: string;
  venmoUsername?: string;
  paypalUsername?: string;
  cashTag?: string;
}

export async function openAppleCashMessage(
  phoneNumber: string,
  amount: number,
  _note: string
): Promise<boolean> {
  try {
    // Apple Cash payment message
    const message = `request $${amount} from me. i owe it to you because i failed myself today and this is my punishment. (tap the $${amount} to just send it)`;
    const url = `sms:${phoneNumber}&body=${encodeURIComponent(message)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Payments] Error opening Apple Cash message:', error);
    return false;
  }
}

export function generateVenmoLink(
  username: string,
  amount: number,
  note: string
): string {
  return `venmo://paycharge?txn=pay&recipients=${username}&amount=${amount}&note=${encodeURIComponent(note)}`;
}

export function generatePayPalLink(username: string, amount: number): string {
  return `https://paypal.me/${username}/${amount}`;
}

export function generateCashAppLink(cashtag: string, amount: number): string {
  const cleanTag = cashtag.startsWith('$') ? cashtag.slice(1) : cashtag;
  return `https://cash.app/$${cleanTag}/${amount}`;
}

export async function openPaymentLink(
  method: PaymentMethod,
  paymentInfo: PaymentInfo,
  amount: number,
  note: string
): Promise<boolean> {
  try {
    let url = '';

    switch (method) {
      case 'apple_cash':
        if (paymentInfo.phoneNumber) {
          return await openAppleCashMessage(paymentInfo.phoneNumber, amount, note);
        }
        return false;

      case 'venmo':
        if (paymentInfo.venmoUsername) {
          url = generateVenmoLink(paymentInfo.venmoUsername, amount, note);
        }
        break;

      case 'paypal':
        if (paymentInfo.paypalUsername) {
          url = generatePayPalLink(paymentInfo.paypalUsername, amount);
        }
        break;

      case 'cashapp':
        if (paymentInfo.cashTag) {
          url = generateCashAppLink(paymentInfo.cashTag, amount);
        }
        break;
    }

    if (url) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[Payments] Error opening payment link:', error);
    return false;
  }
}

export async function savePaymentInfo(info: PaymentInfo): Promise<void> {
  try {
    await AsyncStorage.setItem(PAYMENT_INFO_KEY, JSON.stringify(info));
  } catch (error) {
    console.error('[Payments] Error saving payment info:', error);
  }
}

export async function getPaymentInfo(): Promise<PaymentInfo | null> {
  try {
    const data = await AsyncStorage.getItem(PAYMENT_INFO_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Payments] Error getting payment info:', error);
    return null;
  }
}

export async function savePaymentMethod(method: PaymentMethod): Promise<void> {
  try {
    await AsyncStorage.setItem(PAYMENT_METHOD_KEY, method);
  } catch (error) {
    console.error('[Payments] Error saving payment method:', error);
  }
}

export async function getPaymentMethod(): Promise<PaymentMethod | null> {
  try {
    const method = await AsyncStorage.getItem(PAYMENT_METHOD_KEY);
    return method as PaymentMethod | null;
  } catch (error) {
    console.error('[Payments] Error getting payment method:', error);
    return null;
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'apple_cash':
      return 'iMessage / Apple Cash';
    case 'venmo':
      return 'Venmo';
    case 'paypal':
      return 'PayPal';
    case 'cashapp':
      return 'Cash App';
    default:
      return 'Unknown';
  }
}
