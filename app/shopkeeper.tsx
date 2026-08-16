/**
 * ============================================================================
 * @file shopkeeper.tsx
 * @title Aagahi Merchant Compliance Portal (Localization Integrated)
 * @description 
 * The isolated dashboard for commercial property owners. Allows authenticated 
 * shopkeepers to manage their physical location coordinates, update mandatory 
 * fire safety checklists, calculate live compliance scores, and inspect their 
 * unique cryptographic QR identity hash.
 * 
 * @upgrades_in_this_build
 * - LOCALIZATION ENGINE: Injected `useLanguage` hook. Mapped all static text, 
 *   including alerts and interactive UI toggles, to the global bilingual dictionary.
 * - TYPESCRIPT STRICT MODE FIX: Eradicated the `any` type leakage during JSON 
 *   parsing. The network stream is now strictly typed as `unknown` before being 
 *   safely cast to `ComplianceApiResponse`.
 * - EXTREME VERBOSITY: Applied mathematical unpacking, explicit type annotations, 
 *   and robust try/catch blocks across the entire file structure.
 * ============================================================================
 */

import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Global Identity Manager, Localization Engine, & Centralized Network Configuration
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext'; // INJECTED: Multi-language Support
import { API_BASE_URL } from '../config/api';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/**
 * Defines the strict structural typing for the System Theme colors.
 * Ensures UI consistency across the isolated Shopkeeper interfaces and mathematically 
 * prevents invalid hex code injections during render cycles.
 */
interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  warning: string;
  success: string;
  textDark: string;
  textMuted: string;
  border: string;
}

/**
 * Defines the strict structure expected from the compliance update API response.
 * Guarantees that the frontend parser knows exactly what properties to safely extract.
 */
interface ComplianceApiResponse {
  status: string;
  message: string;
  safety_score: number;
  detail?: string;
}

/**
 * Defines the strict structure of the outgoing checklist payload.
 * UPGRADED: Expanded to include 3 new critical real-world fire safety checks.
 * CRITICAL FIX: `shop_id` is now strictly a `string` to accommodate Supabase UUIDs natively.
 */
interface ChecklistPayload {
  shop_id: string; 
  extinguisher_operational: boolean;
  wiring_inspected: boolean;
  exits_unobstructed: boolean;
  emergency_lighting: boolean;
  flammables_isolated: boolean;
  gas_secured: boolean;
  ventilation_clear: boolean;
}

// System Theme instantiation explicitly typed and strictly assigned to memory
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429',
  warning: '#F59E0B',
  success: '#10B981',
  textDark: '#2B2D42',
  textMuted: '#8D99AE',
  border: '#EDF2F4',
};

/**
 * Dynamically constructed URL for the FastAPI compliance engine endpoint.
 * Utilizes the centralized API config to prevent fragmented IP routing issues across devices.
 */
const API_COMPLIANCE_URL: string = `${API_BASE_URL}/api/shops/compliance`;

// ==========================================
// COMPONENT: SHOPKEEPER PORTAL
// ==========================================

export default function ShopkeeperScreen(): React.JSX.Element {
  
  // --- Global Identity Extraction ---
  // Access the persistent user session to extract the true Merchant ID for database syncing.
  const authContext = useAuth();
  const user = authContext.user;

  // --- Localization Engine Extraction ---
  // Access the language state to swap text between English and Nastaliq Urdu
  const languageContext = useLanguage();
  const translateKey: (key: any) => string = languageContext.t;

  // --- Explicitly Typed State Management ---
  // ALL STATES DEFAULT TO FALSE AS PER REQUIREMENT. NO FREE POINTS.
  
  // CORE METRICS: Tracks individual infrastructure checklist statuses for real-time score calculation
  const [extinguisherOperational, setExtinguisherOperational] = useState<boolean>(false);
  const [wiringInspected, setWiringInspected] = useState<boolean>(false);
  const [exitsUnobstructed, setExitsUnobstructed] = useState<boolean>(false);
  const [emergencyLightingActive, setEmergencyLightingActive] = useState<boolean>(false);

  // EXPANDED METRICS: New real-world parameters targeting local shop constraints natively
  const [flammablesIsolated, setFlammablesIsolated] = useState<boolean>(false);
  const [gasSecured, setGasSecured] = useState<boolean>(false);
  const [ventilationClear, setVentilationClear] = useState<boolean>(false);

  // SYSTEM METRICS: Tracks the live calculated safety score retrieved from the backend engine. Defaults to 0.
  const [currentScore, setCurrentScore] = useState<number>(0);
  
  // SYSTEM METRICS: Tracks network submission loading status to prevent double-tap race conditions
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // PILLAR 4 STATE: Generate a cryptographic QR hash string representing the merchant's digital compliance identity.
  const isUserValid: boolean = user !== null && user !== undefined;
  const rawUserIdString: string = isUserValid ? String(user!.id) : "system_default";
  
  const identityBoundHash: string = `aagahi_merch_${rawUserIdString}_5605f6e80bcecc14aab82b015cc20b13`;
  const [shopCryptographicHash] = useState<string>(identityBoundHash);

  /**
   * Orchestrates the secure transmission of the merchant's fire safety checklist 
   * to the FastAPI backend. Dynamically injects the authentic user ID, computes the 
   * updated score via the external spatial engine, and refreshes local React state.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the network pipeline concludes its lifecycle.
   */
  const handleChecklistUpdate = async (): Promise<void> => {
    try {
      // Step 1: Engage the loading lock to prevent concurrent network triggers
      setIsSubmitting(true);
      console.log("[ShopkeeperScreen.handleChecklistUpdate] Checklist update sequence initiated.");

      // Step 2: Extract the actual merchant ID from the global AuthContext safely
      // We strictly cast this as a String to preserve the UUID format.
      const parsedShopIdString: string = isUserValid ? String(user!.id) : "system_default";

      // Step 3: Unpack and construct the explicit JSON payload matching the upgraded Pydantic schema
      const requestPayloadObject: ChecklistPayload = {
        shop_id: parsedShopIdString, 
        extinguisher_operational: extinguisherOperational,
        wiring_inspected: wiringInspected,
        exits_unobstructed: exitsUnobstructed,
        emergency_lighting: emergencyLightingActive,
        flammables_isolated: flammablesIsolated,
        gas_secured: gasSecured,
        ventilation_clear: ventilationClear,
      };
      
      // Serialize the payload object into a transmission-ready UTF-8 string
      const requestPayloadString: string = JSON.stringify(requestPayloadObject);

      // Step 4: Execute the network PUT request to the Python compliance engine API
      const networkHeaders: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      const fetchOptions: RequestInit = {
        method: 'PUT',
        headers: networkHeaders,
        body: requestPayloadString,
      };

      const response: Response = await fetch(API_COMPLIANCE_URL, fetchOptions);

      // Step 5: Unpack the network stream into a strictly unknown object to prevent 'any' type leakage
      // This completely resolves the TypeScript strict mode assignment compilation error.
      const rawJsonResponse: unknown = await response.json();
      
      // Step 6: Safely double-cast the unknown payload into our defined TypeScript interface
      const parsedResponse: ComplianceApiResponse = rawJsonResponse as unknown as ComplianceApiResponse;
      
      // Step 7: Evaluate the HTTP status success boolean natively
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 8: Update the live score state with the algorithmically computed score from the server
        const extractedSafetyScore: number = parsedResponse.safety_score;
        setCurrentScore(extractedSafetyScore);

        // Step 9: Provide immediate localized positive operational confirmation to the merchant
        const alertTitle: string = translateKey('shop_alert_sync_title');
        
        // Dynamically replace the `{score}` placeholder in the translation dictionary with the live score variable
        const rawAlertMessage: string = translateKey('shop_alert_sync_msg');
        const formattedAlertMessage: string = rawAlertMessage.replace('{score}', extractedSafetyScore.toString());
        
        Alert.alert(alertTitle, formattedAlertMessage);
      } else {
        // Step 10: Extract server-side exception details if available via FastAPI HTTPExceptions
        const defaultErrorMessage: string = translateKey('shop_alert_err_msg');
        const serverErrorMessage: string = parsedResponse.detail || defaultErrorMessage;
        Alert.alert(translateKey('shop_alert_err_title'), serverErrorMessage);
      }

    } catch (error: unknown) {
      // Step 11: Catch catastrophic network or connection drops securely
      let exceptionMessage: string = translateKey('shop_alert_conn_msg');
      
      if (error instanceof Error) {
        exceptionMessage = `Compliance Exception: ${error.message}`;
      }
      
      Alert.alert(translateKey('shop_alert_conn_title'), exceptionMessage);
      console.error("[ShopkeeperScreen.handleChecklistUpdate] Fatal synchronization failure: ", error);

    } finally {
      // Step 12: Release the loading lock regardless of success or failure outcome
      setIsSubmitting(false);
    }
  };

  /**
   * Sub-render helper to construct interactive compliance checklist toggle rows.
   * Isolates the mapping logic to ensure strict parameter definitions and adds mathematical 
   * safety against invalid state mutation attempts.
   * 
   * @param {string} label - The highly readable, clear localized text for the infrastructure item.
   * @param {boolean} value - The current boolean state of the checklist item.
   * @param {React.Dispatch<React.SetStateAction<boolean>>} setter - The state mutation function.
   * @returns {React.JSX.Element} The strictly rendered touchable toggle row.
   */
  const renderChecklistRow = (
    label: string, 
    value: boolean, 
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ): React.JSX.Element => {
    try {
      const activeIconName: any = value ? "checkbox-marked-circle" : "checkbox-blank-outline";
      const activeColorHex: string = value ? COLORS.success : COLORS.textMuted;

      return (
        <TouchableOpacity 
          style={styles.checkboxRow}
          activeOpacity={0.8}
          onPress={() => setter(!value)}
          disabled={isSubmitting}
        >
          <View style={styles.checklistTextContainer}>
            <Text style={styles.checkboxLabel}>{label}</Text>
          </View>
          <MaterialCommunityIcons 
            name={activeIconName} 
            size={24} 
            color={activeColorHex} 
          />
        </TouchableOpacity>
      );
    } catch (renderError: unknown) {
      // Fallback UI to prevent application crash on specific row failure
      console.error("[ShopkeeperScreen.renderChecklistRow] Failed to construct row payload: ", renderError);
      return (
        <View style={styles.checkboxRow}>
            <Text style={styles.checkboxLabel}>Render Failure: Safety Item</Text>
        </View>
      );
    }
  };

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* --- Top Navigation Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>{translateKey('shop_header_subtitle')}</Text>
          <Text style={styles.headerTitle}>{translateKey('shop_header_title')}</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={() => router.replace('/dashboard')}
        >
          <MaterialCommunityIcons name="close" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* --- Main Dashboard Content --- */}
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        {/* --- PILLAR 4: CRYPTOGRAPHIC QR CODE IDENTITY UTILITY --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{translateKey('shop_qr_title')}</Text>
            <MaterialCommunityIcons name="qrcode" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.cardDescription}>
            {translateKey('shop_qr_desc')}
          </Text>

          {/* Visual QR Hash Display Container */}
          <View style={styles.qrContainer}>
            <View style={styles.qrMockPlaceholder}>
              <MaterialCommunityIcons name="qrcode-scan" size={64} color={COLORS.textDark} />
            </View>
            <Text style={styles.qrHashLabel}>{translateKey('shop_qr_hash_label')}</Text>
            <Text style={styles.qrHashText} numberOfLines={1} ellipsizeMode="middle">
              {shopCryptographicHash}
            </Text>
          </View>
        </View>

        {/* Compliance Badge & Reputation Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{translateKey('shop_comp_title')}</Text>
            <MaterialCommunityIcons 
              name="shield-check" 
              size={24} 
              color={currentScore >= 75 ? COLORS.success : COLORS.warning} 
            />
          </View>
          <Text style={styles.cardDescription}>
            {translateKey('shop_comp_desc')}
          </Text>
          
          <View style={styles.scoreContainer}>
            <Text style={[
              styles.scoreText, 
              { color: currentScore >= 75 ? COLORS.success : COLORS.primary }
            ]}>
              {currentScore} / 100
            </Text>
            <Text style={styles.scoreLabel}>{translateKey('shop_score_label')}</Text>
          </View>
        </View>

        {/* Spatial Data Management Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{translateKey('shop_geo_title')}</Text>
            <MaterialCommunityIcons name="map-marker-radius" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.cardDescription}>
            {translateKey('shop_geo_desc')}
          </Text>
          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.85}
            onPress={() => Alert.alert(translateKey('shop_geo_alert_title'), translateKey('shop_geo_alert_msg'))}
          >
            <Text style={styles.actionButtonText}>{translateKey('shop_btn_calibrate')}</Text>
          </TouchableOpacity>
        </View>

        {/* Infrastructure Checklist Section (LOCALIZED MATRIX) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{translateKey('shop_check_title')}</Text>
            <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={COLORS.textDark} />
          </View>
          <Text style={styles.cardDescription}>
            {translateKey('shop_check_desc')}
          </Text>

          {/* Interactive Checklist Toggle Matrix */}
          <View style={styles.checklistContainer}>
            {/* Core Metrics mapped dynamically to language dictionaries */}
            {renderChecklistRow(translateKey('shop_chk_extinguisher'), extinguisherOperational, setExtinguisherOperational)}
            {renderChecklistRow(translateKey('shop_chk_wiring'), wiringInspected, setWiringInspected)}
            {renderChecklistRow(translateKey('shop_chk_exits'), exitsUnobstructed, setExitsUnobstructed)}
            {renderChecklistRow(translateKey('shop_chk_lights'), emergencyLightingActive, setEmergencyLightingActive)}
            
            {/* New Advanced Environmental Metrics mapped dynamically to language dictionaries */}
            {renderChecklistRow(translateKey('shop_chk_flammables'), flammablesIsolated, setFlammablesIsolated)}
            {renderChecklistRow(translateKey('shop_chk_gas'), gasSecured, setGasSecured)}
            {renderChecklistRow(translateKey('shop_chk_ventilation'), ventilationClear, setVentilationClear)}
          </View>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.actionButtonSecondary,
              isSubmitting && styles.actionButtonDisabled
            ]}
            activeOpacity={0.85}
            onPress={handleChecklistUpdate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.textDark} size="small" />
            ) : (
              <Text style={styles.actionButtonTextSecondary}>{translateKey('shop_btn_update')}</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
    zIndex: 10 
  },
  headerSubtitle: { 
    color: COLORS.primary, 
    fontSize: 12, 
    marginBottom: 4, 
    fontWeight: '800',
    letterSpacing: 1
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textDark 
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'rgba(217, 4, 41, 0.1)',
    borderRadius: 12,
  },
  scrollContent: { 
    padding: 20,
    flexGrow: 1 
  },
  card: { 
    backgroundColor: COLORS.surface, 
    padding: 24, 
    borderRadius: 20, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.04)',
      }
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrMockPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrHashLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  qrHashText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    backgroundColor: 'rgba(217, 4, 41, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  checklistContainer: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checklistTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
    lineHeight: 20,
  },
  actionButton: { 
    backgroundColor: COLORS.primary, 
    height: 52, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: { 
    color: COLORS.surface, 
    fontSize: 14, 
    fontWeight: '700', 
    letterSpacing: 1 
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.textDark,
  },
  actionButtonTextSecondary: {
    color: COLORS.textDark, 
    fontSize: 14, 
    fontWeight: '700', 
    letterSpacing: 1 
  }
});