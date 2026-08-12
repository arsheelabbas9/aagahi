import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/** 
 * Defines the strict structural typing for the System Theme colors.
 * Replicates the established visual hierarchy from the primary authentication gateway 
 * to maintain absolute UI consistency across the application state.
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
 * This mathematically prevents arbitrary or malicious string injections into the role state logic.
 */
type SystemRole = 'general' | 'shopkeeper' | 'warden';

/**
 * Defines the expected structure of the API response from the Python backend
 * during the registration lifecycle. This ensures the frontend parser knows exactly
 * what data types to expect from the server stream.
 */
interface RegisterApiResponse {
  status?: string;
  detail?: string;
  user?: {
    id: string | number;
    email: string;
    username: string;
    role: string;
  };
}

// System Theme instantiation explicitly typed and strictly assigned to memory.
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429',    // Alert Red: Primary call-to-action and accent color
  textDark: '#2B2D42',   // Primary Text: High-contrast readability
  textMuted: '#8D99AE',  // Secondary Text: Placeholder and description labels
  border: '#EDF2F4',     // Component Borders: Subtle separators
  activeTabBg: '#FEE2E2',// Highlight background indicating the currently selected designation tab
};

/**
 * The IPv4 address of the FastAPI backend registration endpoint.
 * Configured specifically for physical local-network device testing.
 */
const REGISTER_API_URL: string = 'http://192.168.88.107:8000/api/auth/register';

// ==========================================
// COMPONENT: DYNAMIC REGISTRATION ENGINE
// ==========================================

/**
 * RegisterScreen Component
 * Automates the onboarding pipeline for all three system designations (Citizen, Shop Owner, Warden).
 * Captures mandatory parameters required for community chat and telemetry features (username, contact)
 * while bypassing OTP validation for immediate functional access during the demo phase.
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Registration Interface.
 */
export default function RegisterScreen(): React.JSX.Element {
  
  // --- Explicitly Typed State Management ---
  // Each input field requires its own isolated state tracker to prevent cross-contamination.
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  
  // Interface locking boolean. Prevents multi-tap network spam during active submissions.
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // State: Tracks the specific tier the user is attempting to register as. Defaults to general citizen.
  const [activeRole, setActiveRole] = useState<SystemRole>('general');

  /**
   * Orchestrates the secure transmission of new user credentials to the Python API.
   * Handles strict pre-flight validation, data sanitization, asynchronous network fetching, 
   * security memory purging, and dynamic routing upon successful database insertion.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the registration lifecycle completely concludes.
   */
  const handleRegistration = async (): Promise<void> => {
    try {
      // Step 1: Input Sanitization and Unpacking
      // We isolate and trim variables explicitly to prevent invisible whitespace 
      // from causing authentication or hashing failures on the backend engine.
      const rawEmail: string = email;
      const sanitizedEmail: string = rawEmail.trim();
      
      const rawPassword: string = password;
      
      const rawUsername: string = username;
      const sanitizedUsername: string = rawUsername.trim();
      
      const rawContact: string = contactNumber;
      const sanitizedContact: string = rawContact.trim();

      // Step 2: Pre-flight Validation Execution
      // Calculate boolean flags for empty states to ensure the system rejects 
      // incomplete payloads before burning network resources.
      const isEmailEmpty: boolean = sanitizedEmail.length === 0;
      const isPasswordEmpty: boolean = rawPassword.length === 0;
      const isUsernameEmpty: boolean = sanitizedUsername.length === 0;
      const isContactEmpty: boolean = sanitizedContact.length === 0;

      if (isEmailEmpty || isPasswordEmpty || isUsernameEmpty || isContactEmpty) {
        const validationTitle: string = "Validation Error";
        const validationMessage: string = "All fields are mandatory. Please complete your profile parameters before submitting.";
        Alert.alert(validationTitle, validationMessage);
        return;
      }

      // Step 3: Lock the interface
      // Setting this to true disables all interactive buttons and text inputs.
      setIsLoading(true);
      console.log("[RegisterScreen.handleRegistration] Registration sequence initiated for role: ", activeRole);

      // Step 4: Construct the JSON payload explicitly
      // This object structure matches the Pydantic data model expected by FastAPI.
      const requestPayloadObject = {
        email: sanitizedEmail,
        password: rawPassword,
        username: sanitizedUsername,
        contact_number: sanitizedContact,
        role: activeRole
      };
      
      // Serialize the object into a transmission-ready UTF-8 string.
      const requestPayloadString: string = JSON.stringify(requestPayloadObject);

      // Step 5: Execute the network POST request to the local Python backend gateway
      const response: Response = await fetch(REGISTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestPayloadString,
      });

      // Step 6: Unpack and await the raw JSON resolution from the data stream
      const rawJsonResponse: any = await response.json();
      
      // Step 7: Cast the untyped JSON payload safely into our strict TypeScript interface
      const parsedResponse: RegisterApiResponse = rawJsonResponse as RegisterApiResponse;
      
      // Step 8: Evaluate the HTTP Status Code for a 2xx success metric
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess && parsedResponse.user) {
        // Step 9: Security Purge
        // Instantly destroy sensitive credentials from local React state memory.
        setEmail('');
        setPassword('');
        setUsername('');
        setContactNumber('');
        
        // Step 10: Provide success feedback and route the user back to the Identity Gatekeeper (Login)
        const successTitle: string = "Registration Successful";
        const successMessage: string = "Your identity profile has been verified and registered in the database.";
        
        Alert.alert(
          successTitle, 
          successMessage,
          [
            { 
              text: "Proceed to Login", 
              onPress: () => router.replace('/') 
            }
          ]
        );
      } else {
        // Step 11: Server Rejection Handling
        // Extract the specific error detail provided by FastAPI's HTTPException (e.g., Duplicate Email).
        const defaultErrorMessage: string = "Database insertion failed due to an unknown error.";
        const serverErrorMessage: string = parsedResponse.detail || defaultErrorMessage;
        
        const failureTitle: string = "Registration Failed";
        Alert.alert(failureTitle, serverErrorMessage);
      }

    } catch (error: unknown) {
      // Step 12: Catch catastrophic network layer failures (e.g., server offline, Wi-Fi disconnected)
      let errorMessage: string = "Failed to reach the secure gateway. Please check your network connection.";
      
      // Type-guard the unknown error object to safely extract the message property
      if (error instanceof Error) {
        errorMessage = `Network Error: ${error.message}`;
      }
      
      const errorTitle: string = "Connection Error";
      Alert.alert(errorTitle, errorMessage);
      console.error("[RegisterScreen.handleRegistration] Critical Network Failure: ", error);

    } finally {
      // Step 13: Release the interface lock
      // This block executes regardless of success or failure outcome, ensuring the UI never gets stuck.
      setIsLoading(false);
    }
  };

  /**
   * Helper function to render a single role selection tab button.
   * Explicitly typed to handle the dynamic application of styles based on active memory state.
   * 
   * @param {SystemRole} roleValue - The internal database value of the role.
   * @param {string} displayLabel - The human-readable label rendered in the UI.
   * @returns {React.JSX.Element} The rendered TouchableOpacity tab button.
   */
  const renderRoleTab = (roleValue: SystemRole, displayLabel: string): React.JSX.Element => {
    // Evaluate if this specific tab matches the currently selected active state
    const isActive: boolean = activeRole === roleValue;
    
    return (
      <TouchableOpacity
        style={[
          styles.tabButton, 
          isActive && styles.tabButtonActive
        ]}
        activeOpacity={0.8}
        onPress={() => setActiveRole(roleValue)}
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
      <View style={styles.mobileContainer}>
        {/* ScrollView ensures the keyboard does not block inputs on smaller mobile viewports */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* --- Header Section --- */}
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>JOIN AAGAHI</Text>
            <Text style={styles.subtitleText}>Create your community identity</Text>
          </View>

          {/* --- Designation Selection Tabs --- */}
          <View style={styles.tabContainer}>
            {renderRoleTab('general', 'Citizen')}
            {renderRoleTab('shopkeeper', 'Shop Owner')}
            {renderRoleTab('warden', 'Warden')}
          </View>

          {/* --- Form Parameters Card --- */}
          <View style={styles.card}>
            
            {/* Username Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unique Username</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. saddle_eagle99"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {/* Email Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput 
                style={styles.input}
                placeholder="Enter valid email"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            {/* Contact Number Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Number</Text>
              <TextInput 
                style={styles.input}
                placeholder="+92 3XX XXXXXXX"
                placeholderTextColor={COLORS.textMuted}
                value={contactNumber}
                onChangeText={setContactNumber}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            {/* Password Input Group */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Secure Password</Text>
              <TextInput 
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true} // Obfuscates text input for local shoulder-surfing security
                editable={!isLoading}
              />
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity 
              style={[
                styles.registerButton, 
                isLoading && styles.registerButtonDisabled
              ]}
              activeOpacity={0.85}
              onPress={handleRegistration}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.registerButtonText}>REGISTER ACCOUNT</Text>
              )}
            </TouchableOpacity>

            {/* Routing Redirect to Login Gateway */}
            <TouchableOpacity 
              style={styles.loginRedirect}
              onPress={() => router.replace('/')}
              disabled={isLoading}
            >
              <Text style={styles.loginRedirectText}>Already have an account? Login</Text>
            </TouchableOpacity>
            
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
    backgroundColor: COLORS.background 
  },
  mobileContainer: { 
    flex: 1, 
    width: '100%', 
    maxWidth: 480, 
    alignSelf: 'center', 
    backgroundColor: COLORS.background 
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 24, 
    paddingVertical: 40, 
    justifyContent: 'center' 
  },
  headerContainer: { 
    alignItems: 'center', 
    marginBottom: 32 
  },
  logoText: { 
    fontSize: 36, 
    fontWeight: '900', 
    color: COLORS.textDark, 
    letterSpacing: 1.5, 
    marginBottom: 4 
  },
  subtitleText: { 
    fontSize: 14, 
    color: COLORS.textMuted, 
    letterSpacing: 0.5, 
    fontWeight: '500' 
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
    elevation: 2 
  },
  tabButton: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderRadius: 12 
  },
  tabButtonActive: { 
    backgroundColor: COLORS.activeTabBg 
  },
  tabText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: COLORS.textMuted 
  },
  tabTextActive: { 
    color: COLORS.primary, 
    fontWeight: '700' 
  },
  card: { 
    backgroundColor: COLORS.surface, 
    borderRadius: 24, 
    padding: 24, 
    elevation: 4 
  },
  inputGroup: { 
    marginBottom: 16 
  },
  inputLabel: { 
    color: COLORS.textDark, 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 8, 
    marginLeft: 4 
  },
  input: { 
    backgroundColor: '#F8FAFC', 
    color: COLORS.textDark, 
    height: 56, 
    borderRadius: 14, 
    paddingHorizontal: 16, 
    fontSize: 16, 
    borderWidth: 1.5, 
    borderColor: COLORS.border 
  },
  registerButton: { 
    backgroundColor: COLORS.primary, 
    height: 56, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 12 
  },
  registerButtonDisabled: { 
    opacity: 0.7 
  },
  registerButtonText: { 
    color: COLORS.surface, 
    fontSize: 16, 
    fontWeight: '700', 
    letterSpacing: 1 
  },
  loginRedirect: { 
    marginTop: 20, 
    alignItems: 'center' 
  },
  loginRedirectText: { 
    color: COLORS.primary, 
    fontSize: 14, 
    fontWeight: '600' 
  }
});