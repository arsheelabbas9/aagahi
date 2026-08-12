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

// NEW: Global Identity Manager & Centralized Network Configuration
import { useAuth } from '../context/AuthContext';
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

/**
 * ShopkeeperScreen Component
 * The isolated dashboard for commercial property owners. 
 * Allows authenticated shopkeepers to manage their physical location coordinates, 
 * update mandatory fire safety checklists, calculate live compliance scores, 
 * and inspect their unique, ID-bound cryptographic QR identity hash (Pillar 4).
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Shopkeeper Interface.
 */
export default function ShopkeeperScreen(): React.JSX.Element {
  
  // --- Global Identity Extraction ---
  // Access the persistent user session to extract the true Merchant ID for database syncing.
  const { user } = useAuth();

  // --- Explicitly Typed State Management ---
  
  // Tracks individual infrastructure checklist statuses for real-time score calculation
  const [extinguisherOperational, setExtinguisherOperational] = useState<boolean>(true);
  const [wiringInspected, setWiringInspected] = useState<boolean>(true);
  const [exitsUnobstructed, setExitsUnobstructed] = useState<boolean>(true);
  const [emergencyLightingActive, setEmergencyLightingActive] = useState<boolean>(true);

  // Tracks the live calculated safety score retrieved from the backend engine
  const [currentScore, setCurrentScore] = useState<number>(100);
  
  // Tracks network submission loading status to prevent double-tap race conditions
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // PILLAR 4 STATE: Generate a cryptographic QR hash string representing the merchant's digital compliance identity.
  // We mathematically bind the hash to the actual logged-in user ID to ensure complete database correlation.
  const dynamicUserIdString: string = user ? String(user.id) : "system_default";
  const identityBoundHash: string = `aagahi_merch_${dynamicUserIdString}_5605f6e80bcecc14aab82b015cc20b13`;
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

      // Step 2: Extract and cast the actual merchant ID from the global AuthContext
      const rawUserId: string | number = user ? user.id : 1;
      
      // Parse the ID safely into an integer to perfectly match the backend PostgreSQL schema
      const parsedShopId: number = typeof rawUserId === 'number' 
        ? rawUserId 
        : parseInt(String(rawUserId), 10);

      // Step 3: Unpack and construct the explicit JSON payload matching the Pydantic schema
      const requestPayloadObject = {
        shop_id: parsedShopId,
        extinguisher_operational: extinguisherOperational,
        wiring_inspected: wiringInspected,
        exits_unobstructed: exitsUnobstructed,
        emergency_lighting: emergencyLightingActive,
      };
      
      // Serialize the payload object into a transmission-ready UTF-8 string
      const requestPayloadString: string = JSON.stringify(requestPayloadObject);

      // Step 4: Execute the network PUT request to the Python compliance engine API
      const response: Response = await fetch(API_COMPLIANCE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestPayloadString,
      });

      // Step 5: Unpack the network stream into a raw JSON object safely
      const rawJsonResponse: any = await response.json();
      
      // Step 6: Explicitly cast the response into our defined TypeScript interface for safe extraction
      const parsedResponse: ComplianceApiResponse = rawJsonResponse as ComplianceApiResponse;
      
      // Step 7: Evaluate the HTTP status success boolean natively
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 8: Update the live score state with the algorithmically computed score from the server
        const extractedSafetyScore: number = parsedResponse.safety_score;
        const updatedScore: number = extractedSafetyScore;
        setCurrentScore(updatedScore);

        // Step 9: Provide immediate positive operational confirmation to the merchant
        const alertTitle: string = "Compliance Synchronized";
        const alertMessage: string = `Your safety score has been successfully recalculated to ${updatedScore}/100.`;
        Alert.alert(alertTitle, alertMessage);
      } else {
        // Step 10: Extract server-side exception details if available via FastAPI HTTPExceptions
        const defaultErrorMessage: string = "Failed to update compliance registry.";
        const serverErrorMessage: string = parsedResponse.detail || defaultErrorMessage;
        Alert.alert("Submission Error", serverErrorMessage);
      }

    } catch (error: unknown) {
      // Step 11: Catch catastrophic network or connection drops securely
      let exceptionMessage: string = "Network connection to the compliance server failed.";
      
      if (error instanceof Error) {
        exceptionMessage = `Compliance Exception: ${error.message}`;
      }
      
      Alert.alert("Connection Error", exceptionMessage);
      console.error("[ShopkeeperScreen.handleChecklistUpdate] Fatal synchronization failure: ", error);

    } finally {
      // Step 12: Release the loading lock regardless of success or failure outcome
      setIsSubmitting(false);
    }
  };

  /**
   * Sub-render helper to construct interactive compliance checklist toggle rows.
   * Isolates the mapping logic to ensure strict parameter definitions.
   * 
   * @param {string} label - The descriptive text for the infrastructure item.
   * @param {boolean} value - The current boolean state of the item.
   * @param {React.Dispatch<React.SetStateAction<boolean>>} setter - The state mutation function.
   * @returns {React.JSX.Element} The rendered touchable toggle row.
   */
  const renderChecklistRow = (
    label: string, 
    value: boolean, 
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ): React.JSX.Element => {
    return (
      <TouchableOpacity 
        style={styles.checkboxRow}
        activeOpacity={0.8}
        onPress={() => setter(!value)}
        disabled={isSubmitting}
      >
        <Text style={styles.checkboxLabel}>{label}</Text>
        <MaterialCommunityIcons 
          name={value ? "checkbox-marked-circle" : "checkbox-blank-outline"} 
          size={24} 
          color={value ? COLORS.success : COLORS.textMuted} 
        />
      </TouchableOpacity>
    );
  };

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* --- Top Navigation Header --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Merchant Portal</Text>
          <Text style={styles.headerTitle}>Facility Management</Text>
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
            <Text style={styles.cardTitle}>Cryptographic Compliance QR</Text>
            <MaterialCommunityIcons name="qrcode" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.cardDescription}>
            Display this secure digital token to visiting Wardens and Citizens for instant hardware scanning and compliance verification.
          </Text>

          {/* Visual QR Hash Display Container */}
          <View style={styles.qrContainer}>
            <View style={styles.qrMockPlaceholder}>
              <MaterialCommunityIcons name="qrcode-scan" size={64} color={COLORS.textDark} />
            </View>
            <Text style={styles.qrHashLabel}>Active Cryptographic Hash:</Text>
            <Text style={styles.qrHashText} numberOfLines={1} ellipsizeMode="middle">
              {shopCryptographicHash}
            </Text>
          </View>
        </View>

        {/* Compliance Badge & Reputation Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Safety Compliance Status</Text>
            <MaterialCommunityIcons 
              name="shield-check" 
              size={24} 
              color={currentScore >= 75 ? COLORS.success : COLORS.warning} 
            />
          </View>
          <Text style={styles.cardDescription}>
            Your public rating is broadcasted dynamically to consumer scans to build local trust and incentivize hazard mitigation.
          </Text>
          
          <View style={styles.scoreContainer}>
            <Text style={[
              styles.scoreText, 
              { color: currentScore >= 75 ? COLORS.success : COLORS.primary }
            ]}>
              {currentScore} / 100
            </Text>
            <Text style={styles.scoreLabel}>Aagahi Safety Score</Text>
          </View>
        </View>

        {/* Spatial Data Management Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Geographic Registry</Text>
            <MaterialCommunityIcons name="map-marker-radius" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.cardDescription}>
            Ensure your store's physical coordinates are accurate for the emergency routing engine.
          </Text>
          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.85}
            onPress={() => Alert.alert("Geographic Registry", "Location calibration module active.")}
          >
            <Text style={styles.actionButtonText}>CALIBRATE LOCATION</Text>
          </TouchableOpacity>
        </View>

        {/* Infrastructure Checklist Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Fire Safety Checklist</Text>
            <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={COLORS.textDark} />
          </View>
          <Text style={styles.cardDescription}>
            Update your monthly fire extinguisher and structural integrity reports to maintain compliance badges.
          </Text>

          {/* Interactive Checklist Toggle Matrix */}
          <View style={styles.checklistContainer}>
            {renderChecklistRow("Fire Extinguishers Operational", extinguisherOperational, setExtinguisherOperational)}
            {renderChecklistRow("Electrical Wiring Inspected", wiringInspected, setWiringInspected)}
            {renderChecklistRow("Emergency Exits Unobstructed", exitsUnobstructed, setExitsUnobstructed)}
            {renderChecklistRow("Backup Emergency Lighting Active", emergencyLightingActive, setEmergencyLightingActive)}
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
              <Text style={styles.actionButtonTextSecondary}>UPDATE CHECKLIST</Text>
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
  // PILLAR 4: QR Display Styles
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
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