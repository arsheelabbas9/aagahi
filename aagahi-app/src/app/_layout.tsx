/**
 * ============================================================================
 * @file _layout.tsx
 * @description
 * The absolute structural root of the Aagahi application's navigation stack.
 * This module wraps the entire mobile interface in necessary Context Providers
 * to ensure global state (like Identity and Localization) is accessible to 
 * every deeply nested screen.
 * 
 * @upgrades_applied
 * - LOCALIZATION: Injected the newly engineered LanguageProvider.
 * - EXPLICIT TYPING: Added strict React.JSX.Element return typings.
 * ============================================================================
 */

import React from 'react';
import { Stack } from 'expo-router';


// IMPORT THE CONTEXT PROVIDERS
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';

export default function RootLayout(): React.JSX.Element {
  return (
    // WRAP THE ENTIRE APP NAVIGATION IN THE AUTH PROVIDER FIRST
    <AuthProvider>
      {/* WRAP THE AUTHENTICATED APP IN THE LANGUAGE PROVIDER SECOND */}
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Your screens are automatically managed by Expo Router here */}
        </Stack>
      </LanguageProvider>
    </AuthProvider>
  );
}