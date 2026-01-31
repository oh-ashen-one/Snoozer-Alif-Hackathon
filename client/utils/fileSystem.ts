import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { getApiUrl } from '../lib/query-client';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;

const STORAGE_KEYS = {
  REFERENCE_PHOTO: '@snoozer/reference_photo',
  SHAME_VIDEO: '@snoozer/shame_video',
  DEVICE_ID: '@snoozer/device_id',
};

// Get or create a unique device ID
export async function getDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (stored) {
      return stored;
    }
    // Generate a new device ID
    const newDeviceId = Constants.installationId ?? `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, newDeviceId);
    return newDeviceId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    return `fallback-${Date.now()}`;
  }
}

export async function ensureDirectories(): Promise<void> {
  try {
    const photosInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!photosInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
    }
    
    const videosInfo = await FileSystem.getInfoAsync(VIDEOS_DIR);
    if (!videosInfo.exists) {
      await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

export async function saveReferencePhoto(uri: string): Promise<string | null> {
  try {
    await ensureDirectories();
    const destination = `${PHOTOS_DIR}reference.jpg`;
    
    const existingInfo = await FileSystem.getInfoAsync(destination);
    if (existingInfo.exists) {
      await FileSystem.deleteAsync(destination);
    }
    
    await FileSystem.copyAsync({ from: uri, to: destination });
    await AsyncStorage.setItem(STORAGE_KEYS.REFERENCE_PHOTO, destination);
    return destination;
  } catch (error) {
    console.error('Error saving reference photo:', error);
    return null;
  }
}

export async function saveShameVideo(uri: string): Promise<string | null> {
  try {
    console.log('[FileSystem] Saving shame video to server...');
    
    // Read the video as base64
    const videoBase64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const deviceId = await getDeviceId();
    const baseUrl = getApiUrl();
    
    // Upload to server
    const response = await fetch(`${baseUrl}api/shame-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId,
        videoData: videoBase64,
        mimeType: 'video/mp4',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    // Store a marker in AsyncStorage indicating we have a video on server
    const serverVideoUri = `server://${deviceId}/shame.mp4`;
    await AsyncStorage.setItem(STORAGE_KEYS.SHAME_VIDEO, serverVideoUri);
    
    console.log('[FileSystem] Shame video saved to server successfully');
    return serverVideoUri;
  } catch (error) {
    console.error('Error saving shame video:', error);
    return null;
  }
}

// Proof photos are NOT saved - only used momentarily for comparison
// This function exists for backwards compatibility but does not persist the photo
export async function saveProofPhoto(uri: string): Promise<string | null> {
  // Return the original URI without saving - proof photos are ephemeral
  return uri;
}

export async function getReferencePhoto(): Promise<string | null> {
  try {
    const path = await AsyncStorage.getItem(STORAGE_KEYS.REFERENCE_PHOTO);
    if (!path) return null;
    
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      return path;
    }
    
    await AsyncStorage.removeItem(STORAGE_KEYS.REFERENCE_PHOTO);
    return null;
  } catch (error) {
    console.error('Error getting reference photo:', error);
    return null;
  }
}

export async function getShameVideo(): Promise<string | null> {
  try {
    const storedPath = await AsyncStorage.getItem(STORAGE_KEYS.SHAME_VIDEO);
    if (!storedPath) return null;
    
    // Check if it's a server-stored video
    if (storedPath.startsWith('server://')) {
      console.log('[FileSystem] Fetching shame video from server...');
      
      const deviceId = await getDeviceId();
      const baseUrl = getApiUrl();
      
      const response = await fetch(`${baseUrl}api/shame-video/${deviceId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          await AsyncStorage.removeItem(STORAGE_KEYS.SHAME_VIDEO);
          return null;
        }
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Save to local cache for playback
      await ensureDirectories();
      const localPath = `${VIDEOS_DIR}shame_cache.mp4`;
      
      await FileSystem.writeAsStringAsync(localPath, data.videoData, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log('[FileSystem] Shame video cached locally for playback');
      return localPath;
    }
    
    // Legacy: check local file
    const info = await FileSystem.getInfoAsync(storedPath);
    if (info.exists) {
      return storedPath;
    }
    
    await AsyncStorage.removeItem(STORAGE_KEYS.SHAME_VIDEO);
    return null;
  } catch (error) {
    console.error('Error getting shame video:', error);
    return null;
  }
}

// Check if shame video exists (quick check without downloading)
export async function hasShameVideo(): Promise<boolean> {
  try {
    const storedPath = await AsyncStorage.getItem(STORAGE_KEYS.SHAME_VIDEO);
    if (!storedPath) return false;
    
    if (storedPath.startsWith('server://')) {
      const deviceId = await getDeviceId();
      const baseUrl = getApiUrl();
      
      const response = await fetch(`${baseUrl}api/shame-video/exists/${deviceId}`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data.exists;
    }
    
    // Legacy: check local file
    const info = await FileSystem.getInfoAsync(storedPath);
    return info.exists;
  } catch (error) {
    console.error('Error checking shame video:', error);
    return false;
  }
}

export async function deleteFile(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

export async function fileExists(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch (error) {
    console.error('Error checking file:', error);
    return false;
  }
}

export function generateVideoFilename(alarmId: string): string {
  const timestamp = Date.now();
  return `shame_${alarmId}_${timestamp}.mp4`;
}

export async function saveVideo(uri: string, filename: string): Promise<string | null> {
  try {
    await ensureDirectories();
    const destination = `${VIDEOS_DIR}${filename}`;

    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.error('Error saving video:', error);
    return null;
  }
}

export { PHOTOS_DIR, VIDEOS_DIR, STORAGE_KEYS };
