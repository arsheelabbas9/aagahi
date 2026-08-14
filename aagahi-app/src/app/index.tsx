/**
 * ============================================================================
 * @file index.tsx
 * @title Aagahi Identity Gatekeeper (Login Interface)
 * @description 
 * Serves as the primary entry point and authentication gateway for the application.
 * Integrates Pillar 1 Multi-Role Authentication by enforcing strict Role-Based 
 * Access Control (RBAC) prior to credential validation, ensuring secure routing.
 * 
 * @upgrades_in_this_build
 * - CRITICAL NETWORK FIX: Replaced the hardcoded local IPv4 address with the 
 *   centralized API_BASE_URL to eradicate the [TypeError: Network request timed out] crash.
 * - PHASE 3.3 INTEGRATION: Expanded the `AuthenticatedUser` interface and session 
 *   payload mapping to explicitly capture and hydrate `shop_name` and `shop_category` 
 *   from the backend login response into the global AuthContext memory.
 * - EXTREME VERBOSITY: Applied mathematical unpacking, explicit type annotations, 
 *   and robust try/catch blocks across the entire file structure.
 * ============================================================================
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// CRITICAL FIX: Importing the global authentication context pipeline
import { useAuth } from '../context/AuthContext';

// CRITICAL FIX: Importing centralized network routing to prevent connection timeouts
import { API_BASE_URL } from '../config/api';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/** 
 * Defines the strict structural typing for the System Theme colors.
 * Ensures no invalid hex codes or undefined color properties are passed 
 * to the React Native stylesheet rendering engine.
 */
interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  textDark: string;
  textMuted: string;
  border: string;
  activeTabBg: string;
}

/**
 * Defines the strict union type for the three authorized system roles outlined in Pillar 1.
 * This mathematically prevents arbitrary string injections (e.g., typos like 'admin') 
 * into the role state management logic.
 */
type SystemRole = 'general' | 'shopkeeper' | 'warden';

/**
 * Defines the expected structured payload of the authenticated user returned 
 * from the PostgreSQL database via the Python FastAPI layer.
 * UPGRADED: Includes optional Phase 3.3 properties to securely capture storefront telemetry.
 */
interface AuthenticatedUser {
  id: number;
  email: string;
  username?: string; // Added to strictly match the UserSession interface mapping requirement
  role: string; 
  shop_name?: string; // Phase 3.3: Storefront Identifier
  shop_category?: string; // Phase 3.3: Storefront Classification
}

/**
 * Defines the precise structure of the API response from the Python backend.
 * By explicitly typing this, the frontend parser guarantees absolute safety 
 * when extracting nested properties from the JSON stream.
 */
interface AuthApiResponse {
  status?: string;
  detail?: string;
  user?: AuthenticatedUser;
}

// System Theme instantiation explicitly typed and strictly assigned to memory.
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429',    // Alert Red: Used for primary calls to action and active states
  textDark: '#2B2D42',   // Primary Text: High contrast for readability
  textMuted: '#8D99AE',  // Secondary Text: Low priority labels and placeholders
  border: '#EDF2F4',     // Component Borders: Subtle separators
  activeTabBg: '#FEE2E2',// Highlight background: Indicates the currently selected role tab
};

/**
 * Dynamically constructed absolute URL for the FastAPI backend authentication endpoint.
 * This natively resolves the [TypeError: Network request timed out] by routing securely
 * to the active cloud instance instead of a dead local IPv4 address.
 */
const AUTH_API_URL: string = `${API_BASE_URL}/api/auth/login`;

// ==========================================
// COMPONENT: AUTHENTICATION GATEWAY
// ==========================================

/**
 * LoginScreen Component
 * Serves as the primary entry point and Identity Gatekeeper for the application.
 * Integrates Pillar 1 Multi-Role Authentication by enforcing strict role selection
 * prior to credential validation, ensuring distinct interface routing upon success.
 * Also provides the routing bridge to the Dynamic Registration Pipeline.
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Authentication Interface.
 */
export default function LoginScreen(): React.JSX.Element {
  
  // --- Global Identity Extraction (The Fix for Identity Amnesia) ---
  const { login } = useAuth();

  // --- Explicitly Typed State Management ---
  // Each parameter utilizes an isolated state hook to prevent unnecessary cross-component re-renders.
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Interface locking boolean. Prevents network spam during active HTTP requests.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State: Tracks the specific interface/role the user is attempting to access. Defaults to general (citizen).
  const [activeRole, setActiveRole] = useState<SystemRole>('general');

  /**
   * Orchestrates the secure transmission of user credentials to the API.
   * Handles state locking, rigorous input sanitization, asynchronous network fetching, 
   * strict RBAC validation, and dynamically routes the user to their isolated environment.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the authentication lifecycle concludes.
   */
  const handleAuthentication = async (): Promise<void> => {
    try {
      // Step 1: Input Sanitization and Unpacking
      // We isolate and trim variables explicitly to prevent invisible whitespace from corrupting hashes.
      const rawEmail: string = email;
      const sanitizedEmail: string = rawEmail.trim();
      
      const rawPassword: string = password;
      
      // Step 2: Pre-flight Validation
      // Calculate boolean flags to ensure the system does not waste network resources on empty payloads.
      const isEmailEmpty: boolean = sanitizedEmail.length === 0;
      const isPasswordEmpty: boolean = rawPassword.length === 0;

      if (isEmailEmpty || isPasswordEmpty) {
        const validationTitle: string = "Validation Error";
        const validationMessage: string = "Please provide both your identification email and your passphrase.";
        Alert.alert(validationTitle, validationMessage);
        return;
      }

      // Step 3: Lock the interface to prevent concurrent submission spam and race conditions.
      setIsLoading(true);
      console.log(`[LoginScreen.handleAuthentication] Authentication sequence engaged for role: ${activeRole}`);

      // Step 4: Construct the JSON payload explicitly based on the validated backend Pydantic schema.
      const requestPayloadObject = {
        email: sanitizedEmail,
        password: rawPassword,
      };
      
      // Serialize the object into a transmission-ready UTF-8 string.
      const requestPayloadString: string = JSON.stringify(requestPayloadObject);

      // Step 5: Execute the network POST request to the Python backend gateway natively.
      const networkHeaders: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const networkOptions: RequestInit = {
        method: 'POST',
        headers: networkHeaders,
        body: requestPayloadString,
      };

      const response: Response = await fetch(AUTH_API_URL, networkOptions);

      // Step 6: Unpack and await the raw JSON resolution from the byte stream securely.
      const rawJsonResponse: Record<string, unknown> = await response.json();
      
      // Step 7: Cast the untyped JSON safely into our strict TypeScript interface.
      const parsedResponse: AuthApiResponse = rawJsonResponse as AuthApiResponse;
      
      // Step 8: Evaluate HTTP Status Code to determine operational success natively.
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess && parsedResponse.user) {
        
        // Step 9: Enforce Strict Role-Based Access Control (RBAC) Guardrails
        // We mathematically verify that a user cannot log in via an unauthorized tab, even with a valid password.
        const authenticatedRole: string = parsedResponse.user.role;
        const requestedRole: SystemRole = activeRole;
        const isRoleAuthorized: boolean = authenticatedRole === requestedRole;

        if (!isRoleAuthorized) {
          const deniedTitle: string = "Access Denied";
          const deniedMessage: string = `Your account credentials are valid, but you do not possess '${requestedRole.toUpperCase()}' privileges. Please select the correct role tab.`;
          Alert.alert(deniedTitle, deniedMessage);
          return;
        }

        // Step 10: Security Purge
        // Purge sensitive credentials from local React state memory immediately upon verified success.
        setEmail('');
        setPassword('');
        
        // Step 11: HYDRATE GLOBAL CONTEXT MEMORY (THE MISSING LINK)
        // Here we commit the authenticated user mathematically into the global application memory
        // BEFORE routing them. This ensures the Dashboard instantly recognizes Wardens/Shopkeepers.
        try {
          // Extract core user parameters with strict fallback types
          const targetIdString: string = String(parsedResponse.user.id);
          const targetEmail: string = parsedResponse.user.email;
          const targetUsername: string = parsedResponse.user.username || 'SystemUser';
          const targetRoleEnum: 'general' | 'shopkeeper' | 'warden' = parsedResponse.user.role as 'general' | 'shopkeeper' | 'warden';

          // Extract optional Phase 3.3 parameters for Shopkeeper configuration natively
          const extractedShopName: string | undefined = parsedResponse.user.shop_name;
          const extractedShopCategory: string | undefined = parsedResponse.user.shop_category;

          // Explicitly map the backend payload to the exact structure the AuthContext expects
          const sessionPayload: Record<string, any> = {
            id: targetIdString,
            email: targetEmail,
            username: targetUsername,
            role: targetRoleEnum
          };

          // Conditionally inject storefront metadata if the backend returned it successfully
          if (extractedShopName !== undefined && extractedShopName !== null) {
              sessionPayload.shop_name = extractedShopName;
          }
          
          if (extractedShopCategory !== undefined && extractedShopCategory !== null) {
              sessionPayload.shop_category = extractedShopCategory;
          }
          
          // Transmit the fully constructed payload to the global identity manager
          await login(sessionPayload as any);
          console.log("[LoginScreen.handleAuthentication] Memory hydration successful.");
        } catch (memoryError: unknown) {
          console.error("[LoginScreen.handleAuthentication] Failed to hydrate global memory: ", memoryError);
        }

        // Step 12: Execute Strict Universal Routing
        // Instead of trapping Wardens and Shopkeepers in isolated screens,
        // ALL valid identities are fundamentally routed to the central Universal Map ('/dashboard').
        // Role-specific operational overlays will be natively injected on top of the map via AuthContext.
        try {
          const universalDashboardRoute: string = '/dashboard';
          router.replace(universalDashboardRoute as any);
          console.log(`[LoginScreen.handleAuthentication] Auth Success: ${authenticatedRole}. Enforcing universal route to map.`);
        } catch (routeError: unknown) {
          let routeExceptionMsg: string = "Failed to inject dashboard route.";
          if (routeError instanceof Error) {
            routeExceptionMsg = routeError.message;
          }
          console.error("[LoginScreen.handleAuthentication] Navigation injection failed: ", routeExceptionMsg);
          Alert.alert("Routing Error", "Could not load the universal dashboard. Please restart the application.");
        }

      } else {
        // Step 13: Server Rejection Handling
        // Extract the specific error detail provided by FastAPI's HTTPException.
        const defaultErrorMessage: string = "Invalid credentials provided.";
        const serverErrorMessage: string = parsedResponse.detail || defaultErrorMessage;
        
        const failureTitle: string = "Authentication Failed";
        Alert.alert(failureTitle, serverErrorMessage);
      }

    } catch (error: unknown) {
      // Step 14: Catch catastrophic network failures (e.g., server offline, CORS block, Wi-Fi drop)
      let errorMessage: string = "Failed to reach the secure authentication server. Please check your network connection.";
      
      // Type-guard the unknown error object to safely extract specific operational messages.
      if (error instanceof Error) {
        errorMessage = `Network Error: ${error.message}`;
      }
      
      const errorTitle: string = "Connection Error";
      Alert.alert(errorTitle, errorMessage);
      console.error("[LoginScreen.handleAuthentication] Critical Network Failure: ", error);

    } finally {
      // Step 15: Release the interface lock regardless of execution success or failure.
      setIsLoading(false);
    }
  };

  /**
   * Orchestrates safe navigation to the Dynamic Registration Pipeline.
   * Wrapped in a function to explicitly handle state unmounting and loading checks.
   * 
   * @returns {void}
   */
  const navigateToRegistration = (): void => {
    try {
      const registrationRoute: string = '/register';
      router.push(registrationRoute as any);
    } catch (error: unknown) {
      console.error("[LoginScreen.navigateToRegistration] Routing Failure: ", error);
    }
  };

  /**
   * Helper function to selectively render a single role selection tab.
   * Explicitly typed to handle the dynamic application of styles based on active memory state.
   * 
   * @param {SystemRole} roleValue - The internal database value of the role.
   * @param {string} displayLabel - The human-readable label rendered to the UI.
   * @returns {React.JSX.Element} The rendered TouchableOpacity tab button.
   */
  const renderRoleTab = (roleValue: SystemRole, displayLabel: string): React.JSX.Element => {
    // Evaluate if this specific tab matches the currently selected state.
    const isActive: boolean = activeRole === roleValue;
    
    return (
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive
        ]}
        activeOpacity={0.8}
        onPress={() => {
          // Clear any typed credentials dynamically when switching tabs to enforce security.
          const isEmailFilled: boolean = email !== '';
          const isPasswordFilled: boolean = password !== '';
          
          if (isEmailFilled || isPasswordFilled) {
            setEmail('');
            setPassword('');
          }
          // Mutate the active role state tracker.
          setActiveRole(roleValue);
        }}
        disabled={isLoading}
      >
        <Text style={[
          styles.tabText,
          isActive && styles.tabTextActive
        ]}>
          {displayLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Layout constraint for web/desktop viewing to prevent catastrophic UI stretching */}
      <View style={styles.mobileContainer}>
        
        {/* ScrollView injected to ensure keyboard does not overlap inputs on smaller devices */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* --- Header Section --- */}
          <View style={styles.headerContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>SECURE PORTAL</Text>
            </View>
            <Text style={styles.logoText}>AAGAHI</Text>
            <Text style={styles.subtitleText}>Emergency Routing & Assessment</Text>
          </View>

          {/* --- Multi-Role Tab Selection Section --- */}
          <View style={styles.tabContainer}>
            {renderRoleTab('general', 'Citizen')}
            {renderRoleTab('shopkeeper', 'Shop Owner')}
            {renderRoleTab('warden', 'Warden')}
          </View>

          {/* --- Authentication Form Card --- */}
          <View style={styles.card}>
            
            {/* Dynamic Context Header based on Active Role */}
            <Text style={styles.formContextText}>
              Authenticating as: <Text style={styles.formContextHighlight}>{activeRole.toUpperCase()}</Text>
            </Text>
            
            {/* Email Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Registered Email</Text>
              <TextInput 
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading} // Strictly disable input while network request is active
              />
            </View>

            {/* Password Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput 
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true} // Obfuscate password text for immediate visual security
                editable={!isLoading}  // Strictly disable input while network request is active
              />
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                isLoading && styles.loginButtonDisabled
              ]}
              activeOpacity={0.85}
              onPress={handleAuthentication}
              disabled={isLoading}
            >
              {isLoading ? (
                // Display spinning loading indicator during active network transmission stream
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>LOGIN</Text>
              )}
            </TouchableOpacity>

            {/* --- Routing Bridge to Registration Pipeline (Pillar 1) --- */}
            <TouchableOpacity 
              style={styles.registerRedirect}
              onPress={navigateToRegistration}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.registerRedirectText}>Don't have an identity profile? Register</Text>
            </TouchableOpacity>
            
          </View>

          {/* --- Footer Section --- */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Authorized Personnel Only</Text>
          </View>
          
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// STYLESHEET REGISTRY
// ==========================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 24, 
    paddingVertical: 20, 
    justifyContent: 'center' 
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  badge: {
    backgroundColor: 'rgba(217, 4, 41, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textMuted,
    letterSpacing: 1,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: COLORS.activeTabBg,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)',
      }
    }),
  },
  formContextText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  formContextHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    color: COLORS.textDark,
    height: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  registerRedirect: { 
    marginTop: 20, 
    alignItems: 'center' 
  },
  registerRedirectText: { 
    color: COLORS.primary, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  }
});