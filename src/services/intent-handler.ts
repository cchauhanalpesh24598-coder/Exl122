import { SharedMessage, SharedPhoto } from '../types';
import { generateId } from './storage';

// Note: This uses react-native-receive-sharing-intent for Android
// For production, you may need platform-specific implementations

interface SharedItem {
  filePath?: string;
  text?: string;
  weblink?: string;
  mimeType: string;
  contentUri?: string;
  fileName?: string;
  extension?: string;
}

/**
 * Initialize share intent listener
 */
export function initShareIntentListener(
  onReceive: (messages: SharedMessage[], photos: SharedPhoto[]) => void
): () => void {
  let ReceiveSharingIntent: any;
  
  try {
    ReceiveSharingIntent = require('react-native-receive-sharing-intent').default;
  } catch (error) {
    console.log('Share intent library not available');
    return () => {};
  }

  // Get initial shared files when app opens via share
  ReceiveSharingIntent.getReceivedFiles(
    (files: SharedItem[]) => {
      processSharedItems(files, onReceive);
    },
    (error: any) => {
      console.log('Error receiving shared files:', error);
    }
  );

  // Clean up function
  return () => {
    if (ReceiveSharingIntent) {
      ReceiveSharingIntent.clearReceivedFiles();
    }
  };
}

/**
 * Process shared items and separate into messages and photos
 */
function processSharedItems(
  items: SharedItem[],
  onReceive: (messages: SharedMessage[], photos: SharedPhoto[]) => void
): void {
  const messages: SharedMessage[] = [];
  const photos: SharedPhoto[] = [];

  let messageIndex = 0;
  let photoIndex = 0;

  items.forEach((item, index) => {
    if (item.mimeType?.startsWith('text/') || item.text) {
      // This is a text message
      messages.push({
        id: generateId(),
        text: item.text || '',
        timestamp: Date.now(),
        index: messageIndex++,
      });
    } else if (item.mimeType?.startsWith('image/')) {
      // This is a photo
      photos.push({
        id: generateId(),
        uri: item.filePath || item.contentUri || '',
        timestamp: Date.now(),
        index: photoIndex++,
        messageIndex: Math.floor(photoIndex / 10), // Assuming 10 photos per message
      });
    }
  });

  onReceive(messages, photos);
}

/**
 * Check if app was opened via share intent
 */
export async function checkShareIntent(): Promise<{
  hasSharedContent: boolean;
  messages: SharedMessage[];
  photos: SharedPhoto[];
}> {
  return new Promise((resolve) => {
    let ReceiveSharingIntent: any;
    
    try {
      ReceiveSharingIntent = require('react-native-receive-sharing-intent').default;
    } catch (error) {
      resolve({ hasSharedContent: false, messages: [], photos: [] });
      return;
    }

    ReceiveSharingIntent.getReceivedFiles(
      (files: SharedItem[]) => {
        if (files && files.length > 0) {
          const messages: SharedMessage[] = [];
          const photos: SharedPhoto[] = [];

          let messageIndex = 0;
          let photoIndex = 0;

          files.forEach((item) => {
            if (item.mimeType?.startsWith('text/') || item.text) {
              messages.push({
                id: generateId(),
                text: item.text || '',
                timestamp: Date.now(),
                index: messageIndex++,
              });
            } else if (item.mimeType?.startsWith('image/')) {
              photos.push({
                id: generateId(),
                uri: item.filePath || item.contentUri || '',
                timestamp: Date.now(),
                index: photoIndex++,
                messageIndex: Math.floor(photoIndex / 10),
              });
            }
          });

          resolve({
            hasSharedContent: messages.length > 0 || photos.length > 0,
            messages,
            photos,
          });
        } else {
          resolve({ hasSharedContent: false, messages: [], photos: [] });
        }
      },
      (error: any) => {
        console.log('Error checking share intent:', error);
        resolve({ hasSharedContent: false, messages: [], photos: [] });
      }
    );
  });
}

/**
 * Clear received share data
 */
export function clearShareData(): void {
  try {
    const ReceiveSharingIntent = require('react-native-receive-sharing-intent').default;
    ReceiveSharingIntent.clearReceivedFiles();
  } catch (error) {
    console.log('Could not clear share data');
  }
}

/**
 * Parse WhatsApp forward format
 * WhatsApp forwards have a specific format with contact info and timestamp
 */
export function parseWhatsAppForward(text: string): {
  sender: string;
  timestamp: string;
  content: string;
} {
  // WhatsApp forward format: [date, time] Contact Name: Message
  const forwardPattern = /\[(\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s*([^:]+):\s*([\s\S]*)/;
  
  const match = text.match(forwardPattern);
  
  if (match) {
    return {
      timestamp: match[1],
      sender: match[2].trim(),
      content: match[3].trim(),
    };
  }

  // Return original text if not in forward format
  return {
    sender: '',
    timestamp: '',
    content: text,
  };
}

/**
 * Group photos by their corresponding message
 * Logic: Every set of 10 photos belongs to one message
 */
export function groupPhotosByMessage(
  photos: SharedPhoto[],
  messageCount: number
): Map<number, SharedPhoto[]> {
  const grouped = new Map<number, SharedPhoto[]>();

  // Initialize empty arrays for each message
  for (let i = 0; i < messageCount; i++) {
    grouped.set(i, []);
  }

  // Group photos - assuming sequential order
  photos.forEach((photo, index) => {
    const messageIndex = Math.floor(index / 10);
    if (messageIndex < messageCount) {
      const existing = grouped.get(messageIndex) || [];
      existing.push(photo);
      grouped.set(messageIndex, existing);
    }
  });

  return grouped;
}

/**
 * Get first photo for each message (used for OCR)
 */
export function getFirstPhotoPerMessage(
  photos: SharedPhoto[],
  messageCount: number
): SharedPhoto[] {
  const firstPhotos: SharedPhoto[] = [];
  const grouped = groupPhotosByMessage(photos, messageCount);

  for (let i = 0; i < messageCount; i++) {
    const messagePhotos = grouped.get(i) || [];
    if (messagePhotos.length > 0) {
      firstPhotos.push(messagePhotos[0]);
    }
  }

  return firstPhotos;
}
