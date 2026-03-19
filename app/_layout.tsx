import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SharedMessage, SharedPhoto } from '../src/types';
import { checkShareIntent, clearShareData } from '../src/services/intent-handler';

// Global context for shared data
export const SharedDataContext = React.createContext<{
  messages: SharedMessage[];
  photos: SharedPhoto[];
  setMessages: (messages: SharedMessage[]) => void;
  setPhotos: (photos: SharedPhoto[]) => void;
  hasSharedContent: boolean;
  clearSharedContent: () => void;
}>({
  messages: [],
  photos: [],
  setMessages: () => {},
  setPhotos: () => {},
  hasSharedContent: false,
  clearSharedContent: () => {},
});

export default function RootLayout() {
  const [messages, setMessages] = useState<SharedMessage[]>([]);
  const [photos, setPhotos] = useState<SharedPhoto[]>([]);
  const [hasSharedContent, setHasSharedContent] = useState(false);

  useEffect(() => {
    // Check for share intent when app launches
    const initShareIntent = async () => {
      const result = await checkShareIntent();
      
      if (result.hasSharedContent) {
        setMessages(result.messages);
        setPhotos(result.photos);
        setHasSharedContent(true);
      }
    };

    initShareIntent();

    // Cleanup on unmount
    return () => {
      clearShareData();
    };
  }, []);

  const clearSharedContent = () => {
    setMessages([]);
    setPhotos([]);
    setHasSharedContent(false);
    clearShareData();
  };

  return (
    <SharedDataContext.Provider
      value={{
        messages,
        photos,
        setMessages,
        setPhotos,
        hasSharedContent,
        clearSharedContent,
      }}
    >
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1a73e8',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '600',
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: 'OCR Excel App',
            }}
          />
          <Stack.Screen
            name="message-view"
            options={{
              title: 'Shared Messages',
            }}
          />
          <Stack.Screen
            name="table-view"
            options={{
              title: 'Extracted Data',
            }}
          />
          <Stack.Screen
            name="export-view"
            options={{
              title: 'Export',
            }}
          />
        </Stack>
      </View>
    </SharedDataContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});
