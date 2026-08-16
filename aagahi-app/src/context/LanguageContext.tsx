/**
 * ============================================================================
 * @file LanguageContext.tsx
 * @description
 * The global state manager for the bilingual translation engine.
 * Dynamically switches between English and Urdu dictionaries and provides 
 * the `useLanguage` hook to all child components natively.
 * ============================================================================
 */

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { englishTranslations } from '../locales/en';
import { urduTranslations } from '../locales/ur';
import { TranslationDictionary } from '../locales/types';

// Define the allowed language states
type Locale = 'en' | 'ur';

// Define the strict structure of the Context payload
interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof TranslationDictionary) => string;
  toggleLanguage: () => void;
}

// Initialize the Context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Create the Provider Component to wrap the app
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>('en'); // Default to English

  // The core translation function
  const t = (key: keyof TranslationDictionary): string => {
    const dictionary = locale === 'ur' ? urduTranslations : englishTranslations;
    return dictionary[key] || key; // Fallback to the raw key if a translation is missing
  };

  // Helper function to easily swap languages from any button
  const toggleLanguage = () => {
    setLocale((prevLocale) => (prevLocale === 'en' ? 'ur' : 'en'));
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom Hook for easy component access
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider wrapper.');
  }
  return context;
};