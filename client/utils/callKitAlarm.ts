import { Platform } from 'react-native';

let RNCallKeep: any = null;
let callKitAvailable = false;

try {
  RNCallKeep = require('react-native-callkeep').default;
  callKitAvailable = Platform.OS === 'ios' && RNCallKeep != null;
} catch (error) {
  if (__DEV__) console.log('[CallKit] react-native-callkeep not available (Expo Go mode)');
  callKitAvailable = false;
}

const callToAlarmMap = new Map<string, string>();
const alarmToCallMap = new Map<string, string>();

export function isCallKitAvailable(): boolean {
  return callKitAvailable;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function setupCallKit(): Promise<boolean> {
  if (!callKitAvailable || !RNCallKeep) {
    return false;
  }

  const options = {
    ios: {
      appName: 'Snoozer',
      supportsVideo: false,
      maximumCallGroups: '1',
      maximumCallsPerCallGroup: '1',
      includesCallsInRecents: false,
    },
    android: {
      alertTitle: 'Permissions Required',
      alertDescription: 'This app needs permissions to handle alarms',
      cancelButton: 'Cancel',
      okButton: 'OK',
      additionalPermissions: [],
    },
  };

  try {
    await RNCallKeep.setup(options);
    if (__DEV__) console.log('[CallKit] Setup successful');
    return true;
  } catch (error) {
    if (__DEV__) console.error('[CallKit] Setup failed:', error);
    callKitAvailable = false;
    return false;
  }
}

export function displayAlarmCall(alarmId: string, label: string): string | null {
  if (!callKitAvailable || !RNCallKeep) {
    return null;
  }

  try {
    const callUUID = generateUUID();

    callToAlarmMap.set(callUUID, alarmId);
    alarmToCallMap.set(alarmId, callUUID);

    RNCallKeep.displayIncomingCall(
      callUUID,
      'Snoozer',
      label || 'Wake Up!',
      'generic',
      false
    );

    if (__DEV__) console.log('[CallKit] Displaying alarm call:', callUUID, 'for alarm:', alarmId);
    return callUUID;
  } catch (error) {
    if (__DEV__) console.error('[CallKit] Error displaying call:', error);
    return null;
  }
}

export function endAlarmCall(callUUID: string): void {
  if (!callKitAvailable || !RNCallKeep) {
    return;
  }

  try {
    RNCallKeep.endCall(callUUID);

    const alarmId = callToAlarmMap.get(callUUID);
    if (alarmId) {
      alarmToCallMap.delete(alarmId);
    }
    callToAlarmMap.delete(callUUID);

    if (__DEV__) console.log('[CallKit] Ended call:', callUUID);
  } catch (error) {
    if (__DEV__) console.error('[CallKit] Error ending call:', error);
  }
}

export function endAlarmCallByAlarmId(alarmId: string): void {
  const callUUID = alarmToCallMap.get(alarmId);
  if (callUUID) {
    endAlarmCall(callUUID);
  }
}

export function getAlarmIdFromCall(callUUID: string): string | undefined {
  return callToAlarmMap.get(callUUID);
}

export interface CallKitCallbacks {
  onAnswer: (alarmId: string, callUUID: string) => void;
  onDecline: (alarmId: string, callUUID: string) => void;
}

export function addCallKitListeners(callbacks: CallKitCallbacks): () => void {
  if (!callKitAvailable || !RNCallKeep) {
    return () => {};
  }

  const answerHandler = (data: { callUUID: string }) => {
    const alarmId = callToAlarmMap.get(data.callUUID);
    if (alarmId) {
      if (__DEV__) console.log('[CallKit] Call answered:', data.callUUID, 'alarm:', alarmId);
      callbacks.onAnswer(alarmId, data.callUUID);
    }
    endAlarmCall(data.callUUID);
  };

  const endHandler = (data: { callUUID: string }) => {
    const alarmId = callToAlarmMap.get(data.callUUID);
    if (alarmId) {
      if (__DEV__) console.log('[CallKit] Call declined:', data.callUUID, 'alarm:', alarmId);
      callbacks.onDecline(alarmId, data.callUUID);
    }
    endAlarmCall(data.callUUID);
  };

  RNCallKeep.addEventListener('answerCall', answerHandler);
  RNCallKeep.addEventListener('endCall', endHandler);

  if (__DEV__) console.log('[CallKit] Listeners registered');

  return () => {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    if (__DEV__) console.log('[CallKit] Listeners removed');
  };
}

export function reportCallStarted(callUUID: string): void {
  if (!callKitAvailable || !RNCallKeep) return;
  RNCallKeep.reportConnectingOutgoingCallWithUUID(callUUID);
}
