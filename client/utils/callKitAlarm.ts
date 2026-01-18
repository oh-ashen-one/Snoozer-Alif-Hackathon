import { Platform } from 'react-native';
import RNCallKeep, { IOptions } from 'react-native-callkeep';

// Map of CallKit UUIDs to alarm IDs
const callToAlarmMap = new Map<string, string>();
const alarmToCallMap = new Map<string, string>();

// Check if CallKit is available (iOS only)
export function isCallKitAvailable(): boolean {
  return Platform.OS === 'ios';
}

// Generate a UUID for CallKit
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Setup CallKit - call this once on app start
export async function setupCallKit(): Promise<boolean> {
  if (!isCallKitAvailable()) {
    return false;
  }

  const options: IOptions = {
    ios: {
      appName: 'Snoozer',
      supportsVideo: false,
      maximumCallGroups: '1',
      maximumCallsPerCallGroup: '1',
      includesCallsInRecents: false, // Don't pollute call history
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
    return false;
  }
}

// Display the incoming alarm "call" - this shows full-screen UI on lock screen
export function displayAlarmCall(alarmId: string, label: string): string | null {
  if (!isCallKitAvailable()) {
    return null;
  }

  try {
    // Generate unique call UUID
    const callUUID = generateUUID();

    // Store mapping
    callToAlarmMap.set(callUUID, alarmId);
    alarmToCallMap.set(alarmId, callUUID);

    // Display the incoming call
    // This triggers iOS to show full-screen incoming call UI
    RNCallKeep.displayIncomingCall(
      callUUID,
      'Snoozer',           // handle (caller ID)
      label || 'Wake Up!', // localizedCallerName
      'generic',           // handleType
      false                // hasVideo
    );

    if (__DEV__) console.log('[CallKit] Displaying alarm call:', callUUID, 'for alarm:', alarmId);
    return callUUID;
  } catch (error) {
    if (__DEV__) console.error('[CallKit] Error displaying call:', error);
    return null;
  }
}

// End the alarm "call"
export function endAlarmCall(callUUID: string): void {
  if (!isCallKitAvailable()) {
    return;
  }

  try {
    RNCallKeep.endCall(callUUID);

    // Clean up mappings
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

// End alarm call by alarm ID
export function endAlarmCallByAlarmId(alarmId: string): void {
  const callUUID = alarmToCallMap.get(alarmId);
  if (callUUID) {
    endAlarmCall(callUUID);
  }
}

// Get alarm ID from call UUID
export function getAlarmIdFromCall(callUUID: string): string | undefined {
  return callToAlarmMap.get(callUUID);
}

// Callback types for CallKit events
export interface CallKitCallbacks {
  onAnswer: (alarmId: string, callUUID: string) => void;
  onDecline: (alarmId: string, callUUID: string) => void;
}

// Add CallKit event listeners
export function addCallKitListeners(callbacks: CallKitCallbacks): () => void {
  if (!isCallKitAvailable()) {
    return () => {};
  }

  // User answered the "call" (tapped Accept)
  const answerHandler = (data: { callUUID: string }) => {
    const alarmId = callToAlarmMap.get(data.callUUID);
    if (alarmId) {
      if (__DEV__) console.log('[CallKit] Call answered:', data.callUUID, 'alarm:', alarmId);
      callbacks.onAnswer(alarmId, data.callUUID);
    }
    // End the call after answering
    endAlarmCall(data.callUUID);
  };

  // User declined the "call" (tapped Decline)
  const endHandler = (data: { callUUID: string }) => {
    const alarmId = callToAlarmMap.get(data.callUUID);
    if (alarmId) {
      if (__DEV__) console.log('[CallKit] Call declined:', data.callUUID, 'alarm:', alarmId);
      callbacks.onDecline(alarmId, data.callUUID);
    }
    // Clean up
    endAlarmCall(data.callUUID);
  };

  // Register listeners
  RNCallKeep.addEventListener('answerCall', answerHandler);
  RNCallKeep.addEventListener('endCall', endHandler);

  if (__DEV__) console.log('[CallKit] Listeners registered');

  // Return cleanup function
  return () => {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    if (__DEV__) console.log('[CallKit] Listeners removed');
  };
}

// Report call started (required for proper CallKit integration)
export function reportCallStarted(callUUID: string): void {
  if (!isCallKitAvailable()) return;
  RNCallKeep.reportConnectingOutgoingCallWithUUID(callUUID);
}
