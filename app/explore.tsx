/**
 * ============================================================================
 * @file explore.tsx
 * @description
 * Expo Boilerplate documentation screen.
 * 
 * @upgrades_applied
 * - LOCALIZATION: Integrated `useLanguage` translation hook to dynamically
 *   render the informational segments in Urdu and English.
 * - MANDATORY EXPANSION: Explicitly mapped all inline component logic,
 *   unpacked styling platforms, and strictly typed React objects to maintain
 *   mathematical consistency across the application architecture.
 * ============================================================================
 */

import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import React from 'react';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// LOCALIZATION ENGINE INJECTION
import { useLanguage } from '../context/LanguageContext';

export default function TabTwoScreen(): React.JSX.Element {
  
  const languageContext = useLanguage();
  const translateKey: (key: any) => string = languageContext.t;

  const safeAreaInsets: EdgeInsets = useSafeAreaInsets();
  
  // Mathematically calculate the bottom padding boundary
  const calculatedBottomInset: number = safeAreaInsets.bottom + BottomTabInset + Spacing.three;
  
  const insets = {
    ...safeAreaInsets,
    bottom: calculatedBottomInset,
  };
  
  const theme = useTheme();

  // Explicitly evaluate platform styles to prevent OS-level render clashes
  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      
      <ThemedView style={styles.container}>
        
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">{translateKey('explore_title')}</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            {translateKey('explore_subtitle')}
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev" asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.linkButton}>
                <ThemedText type="link">{translateKey('explore_link_docs')}</ThemedText>
                {Platform.OS !== 'web' && (
                  <SymbolView
                    tintColor={theme.text}
                    name={Platform.OS === 'ios' ? 'arrow.up.right.square' : 'link'}
                    size={12}
                  />
                )}
              </ThemedView>
            </Pressable>
          </ExternalLink>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          
          <Collapsible title={translateKey('explore_col1_title')}>
            <ThemedText type="small">
              {translateKey('explore_col1_part1')} 
              <ThemedText type="code">src/app/index.tsx</ThemedText> 
              {translateKey('explore_col1_part2')} 
              <ThemedText type="code">src/app/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              {translateKey('explore_col1_part3')} 
              <ThemedText type="code">src/app/_layout.tsx</ThemedText> 
              {translateKey('explore_col1_part4')}
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="linkPrimary">{translateKey('explore_link_learn_more')}</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title={translateKey('explore_col2_title')}>
            <ThemedView type="backgroundElement" style={styles.collapsibleContent}>
              <ThemedText type="small">
                {translateKey('explore_col2_part1')} 
                <ThemedText type="smallBold">w</ThemedText> 
                {translateKey('explore_col2_part2')}
              </ThemedText>
              <Image
                source={require('@/assets/images/tutorial-web.png')}
                style={styles.imageTutorial}
              />
            </ThemedView>
          </Collapsible>

          <Collapsible title={translateKey('explore_col3_title')}>
            <ThemedText type="small">
              {translateKey('explore_col3_part1')} 
              <ThemedText type="code">@2x</ThemedText> 
              {translateKey('explore_col3_part2')} 
              <ThemedText type="code">@3x</ThemedText> 
              {translateKey('explore_col3_part3')}
            </ThemedText>
            <Image source={require('@/assets/images/react-logo.png')} style={styles.imageReact} />
            <ExternalLink href="https://reactnative.dev/docs/images">
              <ThemedText type="linkPrimary">{translateKey('explore_link_learn_more')}</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title={translateKey('explore_col4_title')}>
            <ThemedText type="small">
              {translateKey('explore_col4_part1')} 
              <ThemedText type="code">useColorScheme()</ThemedText> 
              {translateKey('explore_col4_part2')}
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
              <ThemedText type="linkPrimary">{translateKey('explore_link_learn_more')}</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title={translateKey('explore_col5_title')}>
            <ThemedText type="small">
              {translateKey('explore_col5_part1')} 
              <ThemedText type="code">src/components/ui/collapsible.tsx</ThemedText> 
              {translateKey('explore_col5_part2')} 
              <ThemedText type="code">react-native-reanimated</ThemedText> 
              {translateKey('explore_col5_part3')}
            </ThemedText>
          </Collapsible>

        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});