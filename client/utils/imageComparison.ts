import * as ImageManipulator from 'expo-image-manipulator';

const COMPARISON_SIZE = 32;
const MATCH_THRESHOLD = 0.65;

interface ComparisonResult {
  isMatch: boolean;
  similarity: number;
  message: string;
}

export async function compareImages(
  referenceUri: string,
  proofUri: string
): Promise<ComparisonResult> {
  try {
    if (!referenceUri || !proofUri) {
      return {
        isMatch: false,
        similarity: 0,
        message: 'Missing image for comparison',
      };
    }

    const [refResized, proofResized] = await Promise.all([
      ImageManipulator.manipulateAsync(
        referenceUri,
        [{ resize: { width: COMPARISON_SIZE, height: COMPARISON_SIZE } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      ),
      ImageManipulator.manipulateAsync(
        proofUri,
        [{ resize: { width: COMPARISON_SIZE, height: COMPARISON_SIZE } }],
        { base64: true, format: ImageManipulator.SaveFormat.JPEG }
      ),
    ]);

    if (!refResized.base64 || !proofResized.base64) {
      return {
        isMatch: false,
        similarity: 0,
        message: 'Failed to process images',
      };
    }

    const similarity = calculateSimilarity(refResized.base64, proofResized.base64);
    const isMatch = similarity >= MATCH_THRESHOLD;

    return {
      isMatch,
      similarity,
      message: isMatch
        ? 'Location verified!'
        : 'Photo doesn\'t match your wake-up spot. Try again!',
    };
  } catch (error) {
    if (__DEV__) console.log('[ImageComparison] Error:', error);
    return {
      isMatch: true,
      similarity: 1,
      message: 'Comparison skipped - accepting photo',
    };
  }
}

function calculateSimilarity(base64A: string, base64B: string): number {
  const bytesA = base64ToBytes(base64A);
  const bytesB = base64ToBytes(base64B);

  if (bytesA.length === 0 || bytesB.length === 0) {
    return 0;
  }

  const minLen = Math.min(bytesA.length, bytesB.length);
  let matchCount = 0;
  const sampleSize = Math.min(minLen, 1000);
  const step = Math.floor(minLen / sampleSize);

  for (let i = 0; i < minLen; i += step) {
    const diff = Math.abs(bytesA[i] - bytesB[i]);
    if (diff < 40) {
      matchCount++;
    }
  }

  return matchCount / (minLen / step);
}

function base64ToBytes(base64: string): number[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];

  let buffer = 0;
  let bits = 0;

  for (const char of base64) {
    if (char === '=') break;
    const val = chars.indexOf(char);
    if (val === -1) continue;

    buffer = (buffer << 6) | val;
    bits += 6;

    while (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
}

export async function validateProofPhoto(
  referenceUri: string,
  proofUri: string
): Promise<ComparisonResult> {
  if (!referenceUri) {
    return {
      isMatch: true,
      similarity: 1,
      message: 'No reference photo set - accepting proof',
    };
  }

  return compareImages(referenceUri, proofUri);
}
