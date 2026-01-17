import * as FileSystem from 'expo-file-system';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const VIDEOS_DIR = `${FileSystem.documentDirectory}videos/`;

export async function ensureDirectoriesExist(): Promise<void> {
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

export async function savePhoto(uri: string, filename: string): Promise<string | null> {
  try {
    await ensureDirectoriesExist();
    const destination = `${PHOTOS_DIR}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.error('Error saving photo:', error);
    return null;
  }
}

export async function saveVideo(uri: string, filename: string): Promise<string | null> {
  try {
    await ensureDirectoriesExist();
    const destination = `${VIDEOS_DIR}${filename}`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  } catch (error) {
    console.error('Error saving video:', error);
    return null;
  }
}

export async function deleteFile(uri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri);
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

export function generatePhotoFilename(alarmId: string): string {
  return `reference_${alarmId}_${Date.now()}.jpg`;
}

export function generateVideoFilename(alarmId: string): string {
  return `shame_${alarmId}_${Date.now()}.mp4`;
}
