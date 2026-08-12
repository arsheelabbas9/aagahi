import React from 'react';
import { Stack } from 'expo-router';
// IMPORT THE NEW PROVIDER
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout(): React.JSX.Element {
  return (
    // WRAP THE ENTIRE APP NAVIGATION IN THE AUTH PROVIDER
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Your screens are automatically managed by Expo Router here */}
      </Stack>
    </AuthProvider>
  );
}