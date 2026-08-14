/**
 * ============================================================================
 * @file AuthContext.tsx
 * @title Aagahi Global Authentication & Identity Manager
 * @description 
 * This module is the central nervous system for identity state across the Aagahi app.
 * It manages the volatile React State and the persistent physical disk storage
 * (AsyncStorage) to ensure cryptographic authentication persists across app restarts.
 * 
 * @upgrades_in_this_build
 * - PHASE 3.3 INTEGRATION: Expanded the UserSession interface to natively support
 *   commercial storefront metadata (shop_name, shop_category).
 * - HYDRATION SAFETY: The disk read cycle now explicitly extracts and sanitizes 
 *   shopkeeper details, preventing RAM amnesia upon application reboot.
 * - EXTREME VERBOSITY: Applied mathematical unpacking, explicit type annotations, 
 *   and extensive JSDoc commentary across the entire file structure.
 * ============================================================================
 */

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/**
 * Defines the strict structural interface of an authenticated user session.
 * This guarantees that downstream consuming components (such as Chat, Dashboard, and Reports) 
 * always have access to a validated, type-safe identity payload containing their assigned role.
 * 
 * UPGRADED: Now natively supports Phase 3.3 commercial metadata to bind the frontend
 * session directly to the PostgreSQL `public.shops` architectural row.
 */
export interface UserSession {
  id: string | number;
  email: string;
  username: string;
  role: 'general' | 'shopkeeper' | 'warden';
  // NEW OPTIONAL PARAMETERS FOR PHASE 3.3
  shop_name?: string;
  shop_category?: string;
}

/**
 * Defines the available operations, state properties, and methods provided by the global AuthContext.
 * Enforces strict typing on the provider's exported context functions to prevent runtime integration bugs.
 */
interface AuthContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (userData: UserSession) => Promise<void>;
  logout: () => Promise<void>;
}

// Instantiate the Context with undefined to enforce proper Provider tree wrapping.
// If a component attempts to consume this outside the provider hierarchy, it will trap the architectural error.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==========================================
// COMPONENT: GLOBAL AUTHENTICATION PROVIDER
// ==========================================

/**
 * AuthProvider Component
 * Wraps the application root to provide a persistent, globally accessible user session.
 * Hydrates state from physical device AsyncStorage on application boot to maintain 
 * cryptographic authentication across app restarts without forcing re-logins.
 * 
 * @param {ReactNode} children - The child component nodes within the React application tree.
 * @returns {React.JSX.Element} The strictly typed context wrapper provider.
 */
export const AuthProvider = ({ children }: { children: ReactNode }): React.JSX.Element => {
  
  // --- Explicitly Typed State Management ---
  
  // Holds the active user session memory in volatile React state for instant component access
  const [user, setUser] = useState<UserSession | null>(null);
  
  // Application boot lock state to prevent the Expo Router from rendering protected routes 
  // before local device storage has completed its asynchronous read cycle
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * React Lifecycle hook to read the persistent local storage subsystem upon initial application boot.
   * Extracts the serialized JSON session string, parses it into memory, and hydrates the volatile state.
   * UPGRADED: Includes structural validation to prevent corrupted disk data from crashing the app,
   * while actively hunting for extended commercial storefront identifiers.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the file system hydration sequence concludes.
   */
  useEffect(() => {
    const hydrateSession = async (): Promise<void> => {
      try {
        // Step 1: Define the secure local storage key identifier
        const storageKey: string = '@aagahi_user_session';
        
        // Step 2: Attempt to extract the secure session string from physical device disk memory
        const storedSessionString: string | null = await AsyncStorage.getItem(storageKey);
        
        // Step 3: Evaluate if a valid pre-existing session string exists on disk
        if (storedSessionString !== null) {
          
          // Step 4: Parse the serialized JSON string back into an untyped object first
          const rawParsedData: any = JSON.parse(storedSessionString);
          
          // Step 5: Sanitize and strictly type-cast the extracted core data to prevent runtime amnesia
          const extractedRole: string = String(rawParsedData.role || 'general').toLowerCase().trim();
          let validatedRole: 'general' | 'shopkeeper' | 'warden' = 'general';
          
          if (extractedRole === 'warden' || extractedRole === 'shopkeeper' || extractedRole === 'general') {
            validatedRole = extractedRole as 'general' | 'shopkeeper' | 'warden';
          }

          // Step 5.5: Conditionally extract and sanitize Phase 3.3 Shopkeeper metadata
          // We utilize optional chaining and strict type checks to prevent undefined crashes.
          const rawExtractedShopName: any = rawParsedData.shop_name;
          const validatedShopName: string | undefined = rawExtractedShopName 
            ? String(rawExtractedShopName).trim() 
            : undefined;

          const rawExtractedShopCategory: any = rawParsedData.shop_category;
          const validatedShopCategory: string | undefined = rawExtractedShopCategory 
            ? String(rawExtractedShopCategory).trim() 
            : undefined;
          
          // Step 6: Construct the fully verified payload mathematically
          const validatedUserData: UserSession = {
            id: rawParsedData.id,
            email: String(rawParsedData.email || ''),
            username: String(rawParsedData.username || ''),
            role: validatedRole,
            shop_name: validatedShopName,
            shop_category: validatedShopCategory
          };
          
          // Step 7: Hydrate the active volatile application state with the verified payload
          setUser(validatedUserData);
          console.log(`[AuthProvider.hydrateSession] Existing session recovered successfully. Active Role: ${validatedRole.toUpperCase()}`);
        } else {
          console.log("[AuthProvider.hydrateSession] No active session found on disk. Awaiting fresh authentication.");
        }
      } catch (error: unknown) {
        // Step 8: Catch catastrophic file system read errors securely to prevent boot crashes
        let exceptionMessage: string = "Failed to access local storage subsystem.";
        if (error instanceof Error) {
          exceptionMessage = error.message;
        }
        console.error("[AuthProvider.hydrateSession] Disk hydration failure: ", exceptionMessage);
      } finally {
        // Step 9: Release the application boot lock regardless of success or failure outcome
        setIsLoading(false);
      }
    };

    // Execute the storage hydration sequence immediately upon component mount
    hydrateSession();
  }, []);

  /**
   * Commits a newly authenticated user session to both volatile React State 
   * and physical device persistent storage (AsyncStorage).
   * UPGRADED: Mathematically validates the role string and securely packages 
   * any provided storefront metadata into the final serialized disk artifact.
   * 
   * @async
   * @param {UserSession} userData - The validated user object returned from the backend authentication gateway.
   * @returns {Promise<void>} Resolves when the disk write cycle successfully concludes.
   */
  const login = async (userData: UserSession): Promise<void> => {
    try {
      // Step 1: Unpack and rigorously sanitize the incoming core payload to prevent casing mismatches
      const rawId: string | number = userData.id;
      const rawEmail: string = userData.email;
      const rawUsername: string = userData.username;
      
      // Ensure the role is perfectly formatted to match the frontend TypeScript union exactly
      const rawRole: string = String(userData.role).toLowerCase().trim();

      // Step 1.5: Unpack incoming Phase 3.3 Shopkeeper optional parameters
      const rawShopName: string | undefined = userData.shop_name;
      const rawShopCategory: string | undefined = userData.shop_category;

      // Step 2: Enforce a strict Role Validation Guard
      let sanitizedRole: 'general' | 'shopkeeper' | 'warden' = 'general';
      if (rawRole === 'warden' || rawRole === 'shopkeeper' || rawRole === 'general') {
          sanitizedRole = rawRole as 'general' | 'shopkeeper' | 'warden';
      } else {
          console.warn(`[AuthContext.login] Security Warning: Unrecognized role '${rawRole}' detected. Forcing fallback to 'general' status.`);
      }

      // Step 3: Reconstruct the perfectly typed and sanitized identity payload
      const sanitizedUserData: UserSession = {
          id: rawId,
          email: rawEmail,
          username: rawUsername,
          role: sanitizedRole
      };

      // Step 3.5: Conditionally attach shop parameters if they mathematically exist in the stream
      if (rawShopName !== undefined && rawShopName !== null) {
          sanitizedUserData.shop_name = rawShopName.trim();
      }
      if (rawShopCategory !== undefined && rawShopCategory !== null) {
          sanitizedUserData.shop_category = rawShopCategory.trim();
      }

      // Step 4: Serialize the strict session object into a flat string format for disk storage compatibility
      const serializedData: string = JSON.stringify(sanitizedUserData);
      
      // Step 5: Define the target storage key identifier
      const storageKey: string = '@aagahi_user_session';
      
      // Step 6: Execute asynchronous disk write operation to permanently store the session
      await AsyncStorage.setItem(storageKey, serializedData);
      
      // Step 7: Hydrate the volatile application state to trigger immediate reactive UI updates across all screens
      setUser(sanitizedUserData);
      console.log(`[AuthProvider.login] Session successfully committed to device memory. Role enforced as: ${sanitizedRole.toUpperCase()}`);

    } catch (error: unknown) {
      // Step 8: Catch file system write failures (e.g., storage capacity full, OS permissions denied)
      let exceptionMessage: string = "Failed to write session to local storage.";
      if (error instanceof Error) {
        exceptionMessage = error.message;
      }
      console.error("[AuthProvider.login] Disk write failure: ", exceptionMessage);
    }
  };

  /**
   * Purges the active user session from both volatile React State and physical device storage.
   * Executed during user manual logout or when an authorization token invalidates.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the disk deletion cycle concludes.
   */
  const logout = async (): Promise<void> => {
    try {
      // Step 1: Define the target storage key identifier
      const storageKey: string = '@aagahi_user_session';
      
      // Step 2: Execute asynchronous disk deletion operation to clear persistent credentials
      await AsyncStorage.removeItem(storageKey);
      
      // Step 3: Clear the volatile application state completely, updating all reactive consumers
      setUser(null);
      console.log("[AuthProvider.logout] Session successfully purged from device disk and memory.");

    } catch (error: unknown) {
      // Step 4: Catch file system deletion failures gracefully
      let exceptionMessage: string = "Failed to remove session from local storage.";
      if (error instanceof Error) {
        exceptionMessage = error.message;
      }
      console.error("[AuthProvider.logout] Disk purge failure: ", exceptionMessage);
    }
  };

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==========================================
// EXPORTED CONSUMER HOOK
// ==========================================

/**
 * Custom architectural hook to safely consume the AuthContext throughout the application tree.
 * Utilizes a strict runtime boundary check to throw a fatal error if utilized outside 
 * of the AuthProvider hierarchy, completely preventing silent runtime state failures.
 * 
 * @returns {AuthContextType} The active authentication context execution pipeline.
 * @throws {Error} If called from a component component not wrapped by an <AuthProvider> parent.
 */
export const useAuth = (): AuthContextType => {
  // Step 1: Extract the context from React's useContext hook
  const context: AuthContextType | undefined = useContext(AuthContext);
  
  // Step 2: Validate context existence to guard against architectural tree violations
  if (context === undefined) {
    const fatalErrorMessage: string = "useAuth architecture violation: Must be used within an AuthProvider component hierarchy tree.";
    throw new Error(fatalErrorMessage);
  }
  
  // Step 3: Return the strictly typed context pipeline
  return context;
};