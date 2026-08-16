/**
 * ============================================================================
 * @file warden.tsx
 * @title Enterprise-Grade Warden Verification & Resolution Engine (Localized Master Build)
 * @author Arsheel Abbas (Aagahi Spatial Division)
 * 
 * @description 
 * This module operates as the highly secure, elevated-privilege administrative 
 * dashboard for community Wardens within the Aagahi ecosystem. It interfaces 
 * directly with the PostGIS spatial database to moderate incoming geographic 
 * anomalies, authorize pending citizen submissions, and purge resolved hazards.
 * 
 * @architecture
 * - STRICT TYPING: Employs uncompromising TypeScript interfaces to mathematically 
 *   prevent runtime memory faults during complex network state hydration.
 * - NATIVE RENDERING: Utilizes React Native FlatLists optimized for massive 
 *   datasets without triggering UI thread lockups.
 * - ASYNC ISOLATION: Features exhaustive `try/catch` fallback systems to prevent
 *   FastAPI validation array crashes from bringing down the mobile client.
 * 
 * @upgrades_applied_in_this_master_build
 * 1. FATAL IMPORT FIX: Explicitly injected `Platform` into the react-native 
 *    destructuring array to resolve the Line 861 execution crash natively.
 * 2. HAZARD RESOLUTION & DELETION: Wardens can actively delete both pending 
 *    spam reports and successfully resolved live hazards off the map, ensuring 
 *    the public interface never misleads citizens.
 * 3. LIVE HAZARD TRACKING: Extracted `verified` hazards from the master fetch 
 *    payload and populated them into a secondary live-tracking queue.
 * 4. EXTREME VERBOSITY: Every logical block, styling attribute, and network 
 *    request has been aggressively unpacked, explicitly typed, and documented.
 * 5. ROBUST TELEMETRY: Implemented nested error-handling blocks specifically 
 *    designed to trap and stringify complex Python Pydantic validation failures.
 * 6. GLOBAL LOCALIZATION (NEW): Injected `useLanguage` hook to dynamically render 
 *    Urdu/English text based on persistent application state securely.
 * ============================================================================
 */

// ============================================================================
// 1. CORE REACT ENGINE IMPORTS (Heavily Unpacked)
// ============================================================================
import React from 'react';
import { 
  useState, 
  useEffect 
} from 'react';

// ============================================================================
// 2. REACT NATIVE NATIVE COMPONENTS (With PLATFORM Crash Fix)
// ============================================================================
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  Platform // CRITICAL FIX: Explicitly imported to prevent StyleSheet OS evaluation crash
} from 'react-native';

import { 
  SafeAreaView 
} from 'react-native-safe-area-context';

// ============================================================================
// 3. UI ICONOGRAPHY & NAVIGATION UTILITIES
// ============================================================================
import { 
  MaterialCommunityIcons 
} from '@expo/vector-icons';

import { 
  router 
} from 'expo-router';

// ============================================================================
// 4. GLOBAL IDENTITY MANAGER, LOCALIZATION & CENTRALIZED NETWORK CONFIGURATION
// ============================================================================
import { 
  useAuth,
  UserSession
} from '../context/AuthContext';

import { 
  useLanguage 
} from '../context/LanguageContext'; // INJECTED: Localization Context Hook

import { 
  API_BASE_URL 
} from '../config/api';

// ============================================================================
// SYSTEM CONFIGURATION & STRICT TYPE DEFINITIONS
// ============================================================================

/**
 * @interface ThemeColors
 * @description Defines the strict structural typing for the System Theme colors.
 * Maintains UI consistency across the Warden administrative interfaces and 
 * mathematically prevents invalid hex code injections from crashing the view tree.
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
 * @interface PendingHazard
 * @description Defines the strict data structure of a hazard report as retrieved 
 * from the PostGIS database.
 * 
 * UPGRADED: The `location` field has been intentionally typed as `any` because 
 * the PostGIS backend dynamically parses geographic coordinates into GeoJSON 
 * objects ({type, coordinates, crs}) during network transmission.
 */
interface PendingHazard {
  /** The unique primary key integer mapped directly from the PostgreSQL row */
  id: number;
  
  /** The cryptographic UUID linking the report to a specific field agent */
  reporter_id: string;
  
  /** Categorization string utilized for UI emoji matching and icon resolution */
  hazard_type: string;
  
  /** Allows safe ingress of dynamic PostGIS GeoJSON objects or raw WKT/EWKB strings */
  location: any; 
  
  /** Detailed alphanumeric description logged manually by the reporting user */
  description: string;
  
  /** State machine parameter (e.g., 'pending', 'verified', 'resolved') */
  status: string;
}

/**
 * @interface FetchHazardsResponse
 * @description Defines the expected server response structure when fetching the 
 * hazard array. Enforces a strict contract between the Python backend and the 
 * frontend parser arrays.
 */
interface FetchHazardsResponse {
  /** Strict string indicator of network request completion */
  status: string;
  
  /** The deeply nested array containing the raw database rows */
  data: PendingHazard[];
  
  /** Set to 'any' to dynamically accommodate FastAPI Array/Object validation errors */
  detail?: any; 
}

/**
 * @interface VerificationResponse
 * @description Defines the expected server response structure upon executing a 
 * successful verification or deletion mutation locally.
 */
interface VerificationResponse {
  /** Strict string indicator of mutation success */
  status: string;
  
  /** The mutated row data returned by the server (if applicable) */
  data?: any;
  
  /** Set to 'any' to dynamically accommodate FastAPI Array/Object validation errors */
  detail?: any; 
}

// ============================================================================
// IMMUTABLE CONSTANTS & ENDPOINT REGISTRY
// ============================================================================

/**
 * System Theme instantiation explicitly typed and strictly assigned to memory.
 * Ensures the Warden dashboard retains its distinct administrative aesthetics.
 */
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429', // High-alert red for deletion actions
  warning: '#F59E0B', // Amber for pending reviews
  success: '#10B981', // Green for authorization actions
  textDark: '#2B2D42',
  textMuted: '#8D99AE',
  border: '#EDF2F4',
};

/**
 * Dynamically constructed API endpoints utilizing the centralized configuration.
 * Replaces hardcoded IPs to ensure cross-environment compatibility securely.
 */
const API_HAZARDS_URL: string = `${API_BASE_URL}/api/hazards`;
const API_VERIFY_URL: string = `${API_BASE_URL}/api/hazards/verify`;

// NEW ENDPOINT: Utilized for physically deleting resolved or spam hazards
const API_DELETE_URL: string = `${API_BASE_URL}/api/hazards`;

// ============================================================================
// THE MASTER COMPONENT: WARDEN VERIFICATION HUB
// ============================================================================

/**
 * WardenDashboardScreen Component
 * Elevated privilege interface for community Wardens. Fetches all unverified, pending 
 * hazards from the spatial engine and provides a secure checklist to manually authorize
 * them for public broadcast.
 * 
 * UPGRADE: Now also fetches fully verified live hazards, allowing the Warden to monitor
 * active anomalies and securely delete them from the database once the physical location
 * has been resolved.
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Warden Verification Interface.
 */
export default function WardenDashboardScreen(): React.JSX.Element {
  
  // ==========================================
  // GLOBAL IDENTITY & LOCALIZATION EXTRACTION
  // ==========================================
  
  // Access the persistent user session to extract the true Warden ID for authorization logs.
  const authContext = useAuth();
  const user: UserSession | null = authContext.user;

  // Access the global language state to seamlessly map UI elements to English/Urdu.
  const languageContext = useLanguage();
  const translateKey: (key: any) => string = languageContext.t;

  // ==========================================
  // EXPLICITLY TYPED STATE MANAGEMENT
  // ==========================================
  
  /**
   * Tracks the queue of hazards awaiting Warden approval natively.
   */
  const pendingReportsTuple = useState<PendingHazard[]>([]);
  const pendingReports: PendingHazard[] = pendingReportsTuple[0];
  const setPendingReports: React.Dispatch<React.SetStateAction<PendingHazard[]>> = pendingReportsTuple[1];
  
  /**
   * NEW FEATURE: Tracks the queue of hazards currently LIVE on the community map.
   * Required so the Warden can delete them once they are physically resolved.
   */
  const activeReportsTuple = useState<PendingHazard[]>([]);
  const activeReports: PendingHazard[] = activeReportsTuple[0];
  const setActiveReports: React.Dispatch<React.SetStateAction<PendingHazard[]>> = activeReportsTuple[1];

  /**
   * Primary network loading lock for the initial initialization fetch organically.
   */
  const isLoadingTuple = useState<boolean>(true);
  const isLoading: boolean = isLoadingTuple[0];
  const setIsLoading: React.Dispatch<React.SetStateAction<boolean>> = isLoadingTuple[1];
  
  /**
   * Verification mutation lock preventing duplicate network calls.
   */
  const isVerifyingTuple = useState<boolean>(false);
  const isVerifying: boolean = isVerifyingTuple[0];
  const setIsVerifying: React.Dispatch<React.SetStateAction<boolean>> = isVerifyingTuple[1];
  
  /**
   * NEW FEATURE: Deletion mutation lock preventing duplicate network calls.
   * Tracks exactly which hazard ID is currently being destroyed.
   */
  const deletingHazardIdTuple = useState<number | null>(null);
  const deletingHazardId: number | null = deletingHazardIdTuple[0];
  const setDeletingHazardId: React.Dispatch<React.SetStateAction<number | null>> = deletingHazardIdTuple[1];

  /**
   * Tracks and renders catastrophic network failures dynamically.
   */
  const networkErrorTuple = useState<string | null>(null);
  const networkError: string | null = networkErrorTuple[0];
  const setNetworkError: React.Dispatch<React.SetStateAction<string | null>> = networkErrorTuple[1];

  // ==========================================
  // HARDWARE & NETWORK LIFECYCLES
  // ==========================================

  /**
   * React lifecycle hook.
   * Triggers the secure database retrieval sequence the exact millisecond the 
   * Warden dashboard mounts into the React Native view hierarchy.
   */
  useEffect(() => {
    try {
      fetchPendingReports();
    } catch (lifecycleError: unknown) {
      console.error("[WardenDashboardScreen.useEffect] Lifecycle mounting failure: ", lifecycleError);
    }
  }, []);

  /**
   * Orchestrates the secure retrieval of all hazards from the database, bypassing the 
   * general user filter by utilizing the elevated 'is_warden=true' query parameter.
   * 
   * UPGRADED: Now mathematically partitions the returned array into two distinct memory 
   * structures: Pending (Awaiting Approval) and Active (Live on Map).
   * 
   * @async
   * @returns {Promise<void>} Resolves when the network fetch cycle concludes securely.
   */
  const fetchPendingReports = async (): Promise<void> => {
    try {
      // Step 1: Initialize loading lock and clear previous error state trackers mathematically
      setIsLoading(true);
      setNetworkError(null);

      // Step 2: Construct the explicit endpoint URL with the Warden authorization query flag
      const targetEndpoint: string = `${API_HAZARDS_URL}?is_warden=true`;
      
      const requestOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Step 3: Execute the network GET request to the Python FastAPI backend organically
      const response: Response = await fetch(targetEndpoint, requestOptions);

      // Step 4: Unpack the stream into a raw JSON object asynchronously
      const rawResponseText: string = await response.text();
      const rawJsonResponse: any = JSON.parse(rawResponseText);
      
      // Step 5: Explicitly cast the untyped JSON into our strict TypeScript interface
      const parsedResponse: FetchHazardsResponse = rawJsonResponse as FetchHazardsResponse;
      
      // Step 6: Evaluate the HTTP Status Code success boolean natively
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess && parsedResponse.data) {
        
        // Step 7: Extract the master list of all database hazards returned securely
        const allHazards: PendingHazard[] = parsedResponse.data;
        
        // Step 8: Filter mathematically to isolate ONLY 'pending' reports for authorization
        const unverifiedHazards: PendingHazard[] = allHazards.filter(
          (hazard: PendingHazard) => hazard.status === 'pending'
        );
        
        // Step 9 (NEW): Filter mathematically to isolate live 'verified' reports for resolution
        const verifiedLiveHazards: PendingHazard[] = allHazards.filter(
          (hazard: PendingHazard) => hazard.status === 'verified' || hazard.status === 'active'
        );
        
        // Step 10: Hydrate the React state with both populated tracking arrays
        setPendingReports(unverifiedHazards);
        setActiveReports(verifiedLiveHazards);
        
      } else {
        // Step 11: CRITICAL FIX - Safe Error Unpacking
        // Prevents React Native from crashing if the backend sends an array or object in the 'detail' field.
        const defaultErrorMessage: string = translateKey('warden_err_fetch_default');
        let finalErrorMessage: string = defaultErrorMessage;
        
        if (parsedResponse.detail) {
          const isDetailString: boolean = typeof parsedResponse.detail === 'string';
          
          if (isDetailString) {
            finalErrorMessage = parsedResponse.detail as string;
          } else {
            // Safely serialize native arrays/objects into a readable string format structurally
            try {
              finalErrorMessage = JSON.stringify(parsedResponse.detail);
            } catch (serializationError: unknown) {
              console.warn("[fetchPendingReports] Detail serialization failed.", serializationError);
              finalErrorMessage = translateKey('warden_err_fetch_complex');
            }
          }
        }
        
        // Commit the safely extracted error message to the visual layer
        setNetworkError(finalErrorMessage);
      }

    } catch (error: unknown) {
      // Step 12: Catch and log catastrophic network failures securely (e.g., Server Offline)
      let errorMessage: string = translateKey('warden_err_fetch_conn');
      
      if (error instanceof Error) {
        errorMessage = `Network Disruption Details: ${error.message}`;
      }
      
      setNetworkError(errorMessage);
      console.error("[WardenDashboardScreen.fetchPendingReports] Critical Pipeline Failure: ", error);

    } finally {
      // Step 13: Explicitly release the primary loading lock regardless of success or failure
      setIsLoading(false);
    }
  };

  /**
   * Elevated privilege execution. Transmits an authorization signal to the Python backend,
   * converting a 'pending' hazard to 'verified', triggering its rendering on the global map.
   * 
   * @async
   * @param {number} hazardId - The unique PostgreSQL identifier of the target report.
   * @returns {Promise<void>} Resolves when the mutation cycle concludes structurally.
   */
  const verifyHazardReport = async (hazardId: number): Promise<void> => {
    try {
      // Step 1: Lock the interface to prevent duplicate verification network calls dynamically
      setIsVerifying(true);

      // Step 2: Extract genuine identity context securely
      // We safely cast the numeric/string ID to a string to satisfy URL parameter requirements.
      const activeUserId: string | number = user ? user.id : "warden_system_default";
      const currentWardenId: string = String(activeUserId);
      
      // Step 3: Construct the highly specific REST API mutation endpoint dynamically
      const mutationEndpoint: string = `${API_VERIFY_URL}/${hazardId}?warden_id=${encodeURIComponent(currentWardenId)}`;

      const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Step 4: Execute the network POST request to mutate the database state intrinsically
      const response: Response = await fetch(mutationEndpoint, requestOptions);

      // Step 5: Unpack the stream into a raw JSON object safely
      const rawResponseText: string = await response.text();
      const rawJsonResponse: any = JSON.parse(rawResponseText);
      
      // Step 6: Cast the response to our strict interface for safe property access logically
      const parsedResponse: VerificationResponse = rawJsonResponse as VerificationResponse;
      
      // Step 7: Evaluate the HTTP Status success boolean natively
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 8: Provide immediate positive operational feedback via native alert
        Alert.alert(
          translateKey('warden_succ_verify_title'), 
          translateKey('warden_succ_verify_msg')
        );
        
        // Step 9: Re-trigger a full list fetch to ensure the 'Active Reports' list 
        // instantly populates with the newly verified hazard without requiring an app reload.
        await fetchPendingReports();

      } else {
        // Step 10: CRITICAL FIX - Native Array Parsing Guard for Alert.alert execution
        // If FastAPI throws a Pydantic Validation error, it returns an array instead of a string.
        const defaultErrorMessage: string = translateKey('warden_err_verify_default');
        let finalErrorMessage: string = defaultErrorMessage;

        if (parsedResponse.detail) {
          const isDetailString: boolean = typeof parsedResponse.detail === 'string';
          
          if (isDetailString) {
            finalErrorMessage = parsedResponse.detail as string;
          } else {
            // Securely serialize arrays/objects to prevent the "cannot be cast to string" crash natively
            try {
              finalErrorMessage = JSON.stringify(parsedResponse.detail);
            } catch (serializationException: unknown) {
              console.warn("[verifyHazardReport] Detail serialization failed.", serializationException);
              finalErrorMessage = translateKey('warden_err_verify_complex');
            }
          }
        }
        
        Alert.alert(translateKey('warden_err_verify_title'), finalErrorMessage);
      }

    } catch (error: unknown) {
      // Step 11: Catch fatal connection disruptions during the active mutation phase
      let exceptionMessage: string = translateKey('warden_err_verify_conn');
      
      if (error instanceof Error) {
        exceptionMessage = `Mutation Exception Sequence: ${error.message}`;
      }
      
      Alert.alert(translateKey('warden_err_conn_title'), exceptionMessage);
      console.error("[WardenDashboardScreen.verifyHazardReport] Fatal Mutation Error: ", error);

    } finally {
      // Step 12: Explicitly release the verification lock globally structurally
      setIsVerifying(false);
    }
  };

  /**
   * THE NEW RESOLUTION & DELETION ENGINE
   * Elevated privilege execution to forcefully and permanently delete a hazard from the 
   * PostGIS database. This is critical for clearing "ghost hazards" once the physical 
   * situation in the real world has been resolved.
   * 
   * @async
   * @param {number} hazardId - The unique PostgreSQL primary key of the target report.
   * @returns {Promise<void>} Resolves when the deletion operation concludes successfully.
   */
  const removeResolvedHazard = async (hazardId: number): Promise<void> => {
    try {
      // Step 1: Engage the specific deletion lock mapped strictly to this hazard ID
      setDeletingHazardId(hazardId);

      // Step 2: Extract identity context for logging audit trails securely
      const activeUserId: string | number = user ? user.id : "warden_system_default";
      const currentWardenId: string = String(activeUserId);
      
      // Step 3: Construct the highly specific REST API deletion endpoint natively
      const deletionEndpoint: string = `${API_DELETE_URL}/${hazardId}?warden_id=${encodeURIComponent(currentWardenId)}`;

      const requestOptions: RequestInit = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Step 4: Execute the network DELETE request to permanently purge the database record
      const response: Response = await fetch(deletionEndpoint, requestOptions);

      // Step 5: Unpack the stream explicitly and safely
      const rawResponseText: string = await response.text();
      let rawJsonResponse: any = {};
      
      if (rawResponseText.trim().length > 0) {
        rawJsonResponse = JSON.parse(rawResponseText);
      }
      
      const parsedResponse: VerificationResponse = rawJsonResponse as VerificationResponse;
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 6: Provide immediate operational feedback to the Warden visually
        Alert.alert(
          translateKey('warden_succ_del_title'), 
          translateKey('warden_succ_del_msg')
        );
        
        // Step 7: Seamlessly execute local memory purges without waiting for a full network reload
        // Removes the purged item from BOTH the pending and active arrays simultaneously.
        setPendingReports((currentQueue: PendingHazard[]) => {
          const updatedQueue: PendingHazard[] = currentQueue.filter((item: PendingHazard) => item.id !== hazardId);
          return updatedQueue;
        });

        setActiveReports((currentQueue: PendingHazard[]) => {
          const updatedQueue: PendingHazard[] = currentQueue.filter((item: PendingHazard) => item.id !== hazardId);
          return updatedQueue;
        });

      } else {
        // Step 8: Handle FastAPI rejection structures natively and securely
        const defaultErrorMessage: string = translateKey('warden_err_del_default');
        let finalErrorMessage: string = defaultErrorMessage;

        if (parsedResponse.detail) {
          const isDetailString: boolean = typeof parsedResponse.detail === 'string';
          
          if (isDetailString) {
            finalErrorMessage = parsedResponse.detail as string;
          } else {
            try {
              finalErrorMessage = JSON.stringify(parsedResponse.detail);
            } catch (serializationException: unknown) {
              console.warn("[removeResolvedHazard] Detail serialization failed.", serializationException);
              finalErrorMessage = translateKey('warden_err_del_complex');
            }
          }
        }
        
        Alert.alert(translateKey('warden_err_del_title'), finalErrorMessage);
      }

    } catch (error: unknown) {
      // Step 9: Catch catastrophic local network failures
      let exceptionMessage: string = translateKey('warden_err_del_conn');
      
      if (error instanceof Error) {
        exceptionMessage = `Deletion Exception: ${error.message}`;
      }
      
      Alert.alert(translateKey('warden_err_net_disturb_title'), exceptionMessage);
      console.error("[WardenDashboardScreen.removeResolvedHazard] Fatal Deletion Error: ", error);

    } finally {
      // Step 10: Ensure the specific item lock is released natively
      setDeletingHazardId(null);
    }
  };

  /**
   * Helper Utility: Validates and sanitizes the spatial geometry payload before UI rendering.
   * The database payload may inject an object structured as { type: "Point", coordinates: [...] }.
   * We isolate this property and guarantee it resolves to a pure string for the <Text> component
   * to mathematically prevent 'Objects are not valid as a React child' crash scenarios.
   * 
   * @param {any} rawLocationData - The raw spatial payload from the database.
   * @returns {string} The safely stringified coordinate mapping.
   */
  const extractSafeLocationString = (rawLocationData: any): string => {
    try {
      const isObjectType: boolean = typeof rawLocationData === 'object';
      const isNotNull: boolean = rawLocationData !== null;
      
      if (isObjectType && isNotNull) {
        // Condition A: It is a PostGIS GeoJSON Object -> Serialize to string cleanly
        return JSON.stringify(rawLocationData);
      } else {
        // Condition B: It is a legacy string or flat coordinate -> Cast to string natively
        return String(rawLocationData);
      }
    } catch (parseException: unknown) {
      // Guard condition: If the object contains circular references, prevent fatal parsing crash
      console.error("[extractSafeLocationString] CRITICAL ERROR: Spatial parsing rejected payload ->", parseException);
      return translateKey('warden_err_spatial_enc');
    }
  };

  // ============================================================================
  // RENDER BLOCKS: COMPONENT BUILDERS
  // ============================================================================

  /**
   * Sub-render function to format individual UNVERIFIED anomalies within the primary FlatList.
   * Explicitly typed to prevent undefined property errors during continuous list iteration.
   * 
   * @param {Object} props - The destructured FlatList render properties container natively.
   * @param {PendingHazard} props.item - The specific pending hazard data object fetched.
   * @returns {React.JSX.Element} The strictly formatted Pending Report Card structurally.
   */
  const renderPendingReportCard = ({ item }: { item: PendingHazard }): React.JSX.Element => {
    
    // Clean and format the raw database strings for the UI display mathematically
    const rawHazardType: string = item.hazard_type;
    const formattedTitle: string = rawHazardType.replace('_', ' ').toUpperCase();
    
    // Ensure an empty description defaults to a safe fallback string inherently
    const rawDescription: string = item.description;
    const reportDescription: string = rawDescription || translateKey('warden_card_no_context');
    
    // Execute the secure spatial stringifier
    const safeLocationString: string = extractSafeLocationString(item.location);
    
    // Check if this specific item is currently locked in a deletion transaction
    const isThisItemDeleting: boolean = deletingHazardId === item.id;
    const isAnyActionLocked: boolean = isVerifying || isThisItemDeleting;

    return (
      <View style={styles.card}>
        
        <View style={styles.cardHeader}>
          <View style={styles.badgeWarning}>
            <Text style={styles.badgeTextWarning}>{translateKey('warden_card_pending_badge')}</Text>
          </View>
          <Text style={styles.reporterText}>{translateKey('warden_card_reporter_prefix')}{item.reporter_id}</Text>
        </View>

        <Text style={styles.hazardTitle}>{formattedTitle}</Text>
        <Text style={styles.hazardDescription}>{reportDescription}</Text>
        
        <View style={styles.locationContainer}>
          <MaterialCommunityIcons name="map-marker-radius" size={16} color={COLORS.textMuted} />
          {/* Inject the mathematically sanitized spatial string directly into the React component */}
          <Text style={styles.locationText} numberOfLines={2}>
            {translateKey('warden_card_spatial_prefix')}{safeLocationString}
          </Text>
        </View>

        {/* Master Action Row: Verification vs Rejection */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.verifyButton, 
              isAnyActionLocked && styles.buttonDisabled
            ]}
            activeOpacity={0.85}
            onPress={() => verifyHazardReport(item.id)}
            disabled={isAnyActionLocked}
          >
            <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>{translateKey('warden_btn_authorize')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.deleteButton, 
              isAnyActionLocked && styles.buttonDisabled
            ]}
            activeOpacity={0.85}
            onPress={() => removeResolvedHazard(item.id)}
            disabled={isAnyActionLocked}
          >
            {isThisItemDeleting ? (
               <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <>
                <MaterialCommunityIcons name="delete-forever" size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>{translateKey('warden_btn_reject')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  /**
   * Sub-render function to format LIVE VERIFIED anomalies within the secondary FlatList.
   * This is where the Warden executes the lifecycle resolution features cleanly.
   * 
   * @param {Object} props - The destructured FlatList render properties container natively.
   * @param {PendingHazard} props.item - The specific active hazard data object fetched.
   * @returns {React.JSX.Element} The strictly formatted Active Report Card structurally.
   */
  const renderActiveReportCard = ({ item }: { item: PendingHazard }): React.JSX.Element => {
    
    // Extract textual properties securely
    const rawHazardType: string = item.hazard_type;
    const formattedTitle: string = rawHazardType.replace('_', ' ').toUpperCase();
    
    const rawDescription: string = item.description;
    const reportDescription: string = rawDescription || translateKey('warden_card_active_no_context');
    
    // Extract spatial properties securely
    const safeLocationString: string = extractSafeLocationString(item.location);
    const isThisItemDeleting: boolean = deletingHazardId === item.id;

    return (
      <View style={styles.card}>
        
        <View style={styles.cardHeader}>
          <View style={styles.badgeSuccess}>
            <Text style={styles.badgeTextSuccess}>{translateKey('warden_card_live_badge')}</Text>
          </View>
          <Text style={styles.reporterText}>{translateKey('warden_card_reporter_prefix')}{item.reporter_id}</Text>
        </View>

        <Text style={styles.hazardTitle}>{formattedTitle}</Text>
        <Text style={styles.hazardDescription}>{reportDescription}</Text>
        
        <View style={styles.locationContainer}>
          <MaterialCommunityIcons name="crosshairs-gps" size={16} color={COLORS.textMuted} />
          <Text style={styles.locationText} numberOfLines={2}>
            {translateKey('warden_card_active_spatial_prefix')}{safeLocationString}
          </Text>
        </View>

        {/* The Deletion Engine Execution Binding */}
        <TouchableOpacity 
          style={[
            styles.fullWidthDeleteButton, 
            isThisItemDeleting && styles.buttonDisabled
          ]}
          activeOpacity={0.85}
          onPress={() => removeResolvedHazard(item.id)}
          disabled={isThisItemDeleting}
        >
          {isThisItemDeleting ? (
             <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <>
              <MaterialCommunityIcons name="check-decagram" size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>{translateKey('warden_btn_resolve')}</Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    );
  };

  // ============================================================================
  // MASTER RENDERING TREE EXECUTION
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* ------------------------------------------ */}
      {/* 1. ARCHITECTURAL HEADER SECTION */}
      {/* ------------------------------------------ */}
      <View style={styles.header}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => router.back()} 
          disabled={isVerifying || deletingHazardId !== null}
        >
          <Text style={styles.backText}>{translateKey('warden_back_btn')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translateKey('warden_header_title')}</Text>
      </View>

      {/* ------------------------------------------ */}
      {/* 2. PRIMARY CONTENT CONTAINER */}
      {/* ------------------------------------------ */}
      {/* Note: The UI is explicitly partitioned into two flex-isolated halves to display both 
          Pending and Active reports simultaneously without nesting ScrollViews dangerously. */}
      <View style={styles.container}>
        
        {/* ========================================================= */}
        {/* UPPER HALF: PENDING VERIFICATION QUEUE */}
        {/* ========================================================= */}
        <View style={styles.halfFlexSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{translateKey('warden_queue_title')}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{pendingReports.length} {translateKey('warden_pending_badge')}</Text>
            </View>
          </View>

          {/* Conditional Rendering Logic for Network and Queue States securely */}
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.warning} style={styles.loader} />
          ) : networkError ? (
            <Text style={styles.errorText}>{networkError}</Text>
          ) : pendingReports.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="shield-check-outline" size={54} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>{translateKey('warden_queue_empty_title')}</Text>
              <Text style={styles.emptyStateSubtext}>{translateKey('warden_queue_empty_sub')}</Text>
            </View>
          ) : (
            <FlatList
              data={pendingReports}
              keyExtractor={(item: PendingHazard) => `pending-${item.id.toString()}`}
              renderItem={renderPendingReportCard}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* ========================================================= */}
        {/* LOWER HALF: ACTIVE HAZARD RESOLUTION QUEUE (NEW) */}
        {/* ========================================================= */}
        <View style={[styles.halfFlexSection, styles.borderTopDivider]}>
          <View style={styles.listHeaderActive}>
            <Text style={styles.listTitleActive}>{translateKey('warden_active_title')}</Text>
            <View style={styles.countBadgeActive}>
              <Text style={styles.countTextActive}>{activeReports.length} {translateKey('warden_active_badge')}</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : activeReports.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="map-marker-off" size={54} color={COLORS.textMuted} />
              <Text style={styles.emptyStateText}>{translateKey('warden_active_empty_title')}</Text>
              <Text style={styles.emptyStateSubtext}>{translateKey('warden_active_empty_sub')}</Text>
            </View>
          ) : (
            <FlatList
              data={activeReports}
              keyExtractor={(item: PendingHazard) => `active-${item.id.toString()}`}
              renderItem={renderActiveReportCard}
              contentContainerStyle={styles.flatListContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// EXHAUSTIVE STYLESHEET REGISTRY (Heavily Unpacked & Explicit)
// ============================================================================
const styles = StyleSheet.create({
  
  // ------------------------------------------
  // STRUCTURAL ROOT BOUNDARIES
  // ------------------------------------------
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },

  halfFlexSection: {
    flex: 1, 
    backgroundColor: COLORS.background
  },

  borderTopDivider: {
    borderTopWidth: 4,
    borderTopColor: COLORS.border,
  },

  // ------------------------------------------
  // TOP NAVIGATION HEADER ELEMENTS
  // ------------------------------------------
  header: { 
    paddingHorizontal: 20,
    // The Line 861 Crash is resolved here. Platform is now properly imported at the top of the file natively.
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
    zIndex: 10 
  },
  
  backText: { 
    color: COLORS.textMuted, 
    fontSize: 14, 
    marginBottom: 8, 
    fontWeight: '600' 
  },
  
  headerTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textDark,
    letterSpacing: -0.5
  },

  // ------------------------------------------
  // LIST HEADERS & METRIC BADGES
  // ------------------------------------------
  listHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16,
    paddingHorizontal: 20, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  
  listTitle: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: COLORS.textDark,
    letterSpacing: -0.2
  },
  
  countBadge: { 
    backgroundColor: 'rgba(245, 158, 11, 0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  
  countText: { 
    color: COLORS.warning, 
    fontSize: 12, 
    fontWeight: '800' 
  },

  listHeaderActive: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16,
    paddingHorizontal: 20, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },

  listTitleActive: {
    fontSize: 16, 
    fontWeight: '800', 
    color: COLORS.primary, 
    letterSpacing: -0.2
  },

  countBadgeActive: {
    backgroundColor: 'rgba(217, 4, 41, 0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },

  countTextActive: {
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: '800' 
  },

  // ------------------------------------------
  // NETWORK STATES (Loaders, Errors, Empty)
  // ------------------------------------------
  loader: { 
    marginTop: 40 
  },
  
  errorText: { 
    textAlign: 'center', 
    marginTop: 40, 
    color: COLORS.primary, 
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 20,
    lineHeight: 22
  },
  
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20
  },
  
  emptyStateText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center'
  },
  
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20
  },

  // ------------------------------------------
  // FLATLIST STRUCTURAL CONSTRAINTS
  // ------------------------------------------
  flatListContent: { 
    padding: 16,
    paddingBottom: 40 
  },

  // ------------------------------------------
  // GENERIC CARD STYLING AESTHETICS
  // ------------------------------------------
  card: { 
    backgroundColor: COLORS.surface, 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border,
    shadowColor: '#000000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 3 
  },
  
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14 
  },
  
  badgeWarning: { 
    backgroundColor: 'rgba(245, 158, 11, 0.1)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  
  badgeTextWarning: { 
    color: COLORS.warning, 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1 
  },

  badgeSuccess: { 
    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  
  badgeTextSuccess: { 
    color: COLORS.success, 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1 
  },
  
  reporterText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  
  hazardTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: COLORS.textDark, 
    marginBottom: 8,
    letterSpacing: -0.3
  },
  
  hazardDescription: { 
    fontSize: 14, 
    color: COLORS.textDark, 
    lineHeight: 22,
    marginBottom: 18,
    fontWeight: '500'
  },
  
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', 
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  
  locationText: { 
    flex: 1, 
    fontSize: 12, 
    color: COLORS.textMuted, 
    fontWeight: '600',
    marginLeft: 10,
    lineHeight: 18
  },

  // ------------------------------------------
  // ELEVATED ACTION BUTTONS EXPLICIT MAP
  // ------------------------------------------
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12 
  },

  actionButton: {
    flex: 1, 
    height: 48, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },

  verifyButton: { 
    backgroundColor: COLORS.success, 
  },

  deleteButton: {
    backgroundColor: COLORS.primary, 
  },

  fullWidthDeleteButton: {
    width: '100%', 
    backgroundColor: COLORS.primary,
    height: 52, 
    borderRadius: 14, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  
  buttonDisabled: { 
    opacity: 0.55 
  },
  
  actionButtonText: { 
    color: COLORS.surface, 
    fontSize: 12, 
    fontWeight: '800', 
    letterSpacing: 0.8 
  },
});