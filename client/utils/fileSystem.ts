import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;

const STORAGE_KEYS = {
  REFERENCE_PHOTO: '@snoozer/reference_photo',
  SHAME_VIDEO: '@snoozer/shame_video',
};

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
    await ensureDirectories();
    const destination = `${VIDEOS_DIR}shame.mp4`;
    
    const existingInfo = await FileSystem.getInfoAsync(destination);
    if (existingInfo.exists) {
      await FileSystem.deleteAsync(destination);
    }
    
    await FileSystem.copyAsync({ from: uri, to: destination });
    await AsyncStorage.setItem(STORAGE_KEYS.SHAME_VIDEO, destination);
    return destination;
  } catch (error) {
    console.error('Error saving shame video:', error);
    return null;
  }
}

export async function saveProofPhoto(uri: string): Promise<string | null> {
  try {
    await ensureDirectories();
    const timestamp = Date.now();
    const destination = `${PHOTOS_DIR}proof_${timestamp}.jpg`;
    
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.error('Error saving proof photo:', error);
    return null;
  }
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
    const path = await AsyncStorage.getItem(STORAGE_KEYS.SHAME_VIDEO);
    if (!path) return null;
    
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      return path;
    }
    
    await AsyncStorage.removeItem(STORAGE_KEYS.SHAME_VIDEO);
    return null;
  } catch (error) {
    console.error('Error getting shame video:', error);
    return null;
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

export { PHOTOS_DIR, VIDEOS_DIR, STORAGE_KEYS };
