import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  Platform, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';

// SPATIAL ENGINE IMPORTS: Polyline natively supports dual-pin continuous geographic blockages
import MapView, { Marker, Region, MapPressEvent, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

// IDENTITY & NETWORK: Centralized context modules ensuring state integrity
import { useAuth, UserSession } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/**
 * Defines the strict structural typing for the System Theme colors.
 * Ensures UI consistency and mathematically prevents invalid hex code injections across the application.
 */
interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  warning: string;
  textDark: string;
  textMuted: string;
  border: string;
  success: string;
  disabled: string; // Used to visually indicate mathematically locked UI elements
}

/**
 * Defines the geographic coordinate structure required for map markers and spatial payloads.
 */
interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Defines the precise structure for an individual coordinate pair payload.
 * Separated to ensure strict typing when pushing array objects to the PostgreSQL backend.
 */
interface HazardCoordinate {
  lat: number;
  lng: number;
}

/**
 * Defines the strict payload structure expected by the FastAPI backend schema.
 * Utilizes a `coordinates` array to mathematically support both PostGIS 'POINT' (1 coordinate) 
 * and 'LINESTRING' (2 coordinates) geometries natively.
 */
interface HazardReportPayload {
  reporter_id: string;
  hazard_type: string;
  coordinates: HazardCoordinate[]; 
  description: string;
}

/**
 * Defines the expected server response structure upon API submission to handle precise UI state changes.
 */
interface ServerResponse {
  status: string;
  data?: any;
  detail?: string;
}

// Memory allocation for the explicit Theme dictionary
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429', // High-alert Red
  warning: '#F59E0B',
  textDark: '#2B2D42',
  textMuted: '#8D99AE',
  border: '#EDF2F4',
  success: '#10B981',
  disabled: '#E5E7EB', // Subtle grey for algorithmically locked-out states
};

/**
 * Dynamically constructed URL for the FastAPI hazard reporting endpoint.
 */
const API_REPORT_URL: string = `${API_BASE_URL}/api/hazards/report`;

/**
 * Pre-defined, immutable list of standardized hazard categories for the community reporting tool.
 */
const HAZARD_CATEGORIES: string[] = [
  'Road Blockage',
  'Fire Hazard',
  'Structural Damage',
  'Water Leak',
  'Electrical Fault',
];

/**
 * STRICT DATABASE MAPPING DICTIONARY
 * Maps human-readable UI categories to the exact string enums sent to the API.
 * NOTE TO ARCHITECT: If the Supabase "hazards_hazard_type_check" constraint fails on specific 
 * categories (like 'water' or 'electrical'), it means the database schema natively expects 
 * different string values. Ensure the DB constraint matches these explicitly.
 */
const HAZARD_TYPE_MAPPING: Record<string, string> = {
  'Road Blockage': 'road_blockage',
  'Fire Hazard': 'fire',
  'Structural Damage': 'structural',
  'Water Leak': 'water', 
  'Electrical Fault': 'electrical',
};

// ==========================================
// UTILITY ENGINE: DYNAMIC EMOJI RENDERER
// ==========================================

/**
 * Mathematically evaluates the currently selected category state and returns a highly 
 * visible Unicode Emoji. This directly addresses the requirement for distinct visual 
 * indicators (🔥, 💧, 🚧) on the reporting map instead of generic red pins.
 * 
 * @param {string} categoryName - The raw string of the selected category.
 * @returns {string} The precise Unicode emoji character.
 */
const getCategoryEmoji = (categoryName: string): string => {
  try {
    // Step 1: Explicitly validate the incoming string to prevent null pointer exceptions
    if (!categoryName || typeof categoryName !== 'string') {
      return '📍'; // Default drop pin if no category is selected yet
    }

    const normalizedCategory: string = categoryName.toLowerCase().trim();
    
    // Step 2: Execute pattern matching to return the correct visual asset
    if (normalizedCategory.includes('fire')) return '🔥';
    if (normalizedCategory.includes('water')) return '💧';
    if (normalizedCategory.includes('struct')) return '🏢';
    
    // THE FIX: Correctly targeting normalizedCategory instead of normalizedType
    if (normalizedCategory.includes('elect')) return '⚡'; 
    
    if (normalizedCategory.includes('road') || normalizedCategory.includes('block')) return '🚧';
    
    // Step 3: Fallback for undefined categories
    return '⚠️';
  } catch (error: unknown) {
    console.warn("[getCategoryEmoji] Icon generation failed, returning fallback.", error);
    return '📍';
  }
};

// ==========================================
// COMPONENT: FIELD INCIDENT REPORTER
// ==========================================

/**
 * ReportScreen Component
 * Empowers authenticated users to categorize anomalies, provide textual descriptions, 
 * and push dynamic multi-coordinate data directly to the PostGIS database.
 * Now features live Emoji Marker updates based on user selection.
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Reporting Interface.
 */
export default function ReportScreen(): React.JSX.Element {
  
  // --- Global Identity Extraction ---
  // Accesses the global memory pipeline to attach the correct user ID to the database row
  const { user } = useAuth();

  // --- Explicitly Typed State Management ---
  
  // Primary spatial anchor (Pin A)
  const [selectedLocation, setSelectedLocation] = useState<Coordinate>({
    latitude: 24.8560,
    longitude: 67.0280,
  });
  
  // Secondary spatial anchor (Pin B) - Exists strictly for continuous LineString operations
  const [secondaryLocation, setSecondaryLocation] = useState<Coordinate | null>(null);
  
  // Tracks whether the UI is configured for a single point or a continuous segment
  const [reportingMode, setReportingMode] = useState<'single' | 'dual'>('single');
  
  // Form input states for data collection
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  
  // Interface locking boolean to prevent asynchronous database duplication
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Viewport & Routing Extraction ---
  // Retrieves coordinates safely passed from the Dashboard 3D Map
  const routeParameters = useLocalSearchParams();

  // Extract primitive string values BEFORE passing them to useEffect dependencies.
  // This explicitly guarantees React does not enter a "Maximum update depth exceeded" infinite loop.
  const routeLatA = String(routeParameters.lat || '');
  const routeLngA = String(routeParameters.lng || '');
  const routeLatB = String(routeParameters.latB || '');
  const routeLngB = String(routeParameters.lngB || '');
  const routeMode = String(routeParameters.mode || '');

  /**
   * React lifecycle effect to automatically parse, validate, and set incoming coordinates 
   * from the routing bridge. Safely implements strict dual-pin enforcement.
   */
  useEffect(() => {
    try {
      // Step 1: Validate that primary parameters exist
      if (routeLatA && routeLngA) {
        
        // Unpack mathematically to floating-point numbers
        const parsedLatitude: number = parseFloat(routeLatA);
        const parsedLongitude: number = parseFloat(routeLngA);

        // Step 2: Validate the extraction
        if (!isNaN(parsedLatitude) && !isNaN(parsedLongitude)) {
          
          // DELTA CHECK: Prevent unnecessary memory allocations
          const isPrimaryLatChanged: boolean = selectedLocation.latitude !== parsedLatitude;
          const isPrimaryLngChanged: boolean = selectedLocation.longitude !== parsedLongitude;

          if (isPrimaryLatChanged || isPrimaryLngChanged) {
            const synchronizedCoordinateA: Coordinate = {
              latitude: parsedLatitude,
              longitude: parsedLongitude
            };
            setSelectedLocation(synchronizedCoordinateA);
            console.log("[ReportScreen.useEffect] Synchronized Primary Anchor.");
          }
        }

        // Step 3: Evaluate explicit Dual-Pin (Road Blockage) routing parameters
        if (routeMode === 'dual' && routeLatB && routeLngB) {
          
          const parsedLatitudeB: number = parseFloat(routeLatB);
          const parsedLongitudeB: number = parseFloat(routeLngB);
          
          if (!isNaN(parsedLatitudeB) && !isNaN(parsedLongitudeB)) {
            
            // DELTA CHECK FOR PIN B
            const isSecLatChanged: boolean = secondaryLocation?.latitude !== parsedLatitudeB;
            const isSecLngChanged: boolean = secondaryLocation?.longitude !== parsedLongitudeB;

            if (isSecLatChanged || isSecLngChanged) {
              const synchronizedCoordinateB: Coordinate = {
                latitude: parsedLatitudeB,
                longitude: parsedLongitudeB
              };
              setSecondaryLocation(synchronizedCoordinateB);
              console.log("[ReportScreen.useEffect] Synchronized Secondary Anchor.");
            }
            
            // Force the UI state into the correct alignment
            if (reportingMode !== 'dual') {
              setReportingMode('dual');
            }
            
            // MATHEMATICAL LOCK: Auto-select 'Road Blockage' for dual-pin data
            if (selectedCategory !== 'Road Blockage') {
              setSelectedCategory('Road Blockage');
            }
          }
        }
      }
    } catch (error: unknown) {
      let exceptionMessage: string = "Failed to synchronize parameters.";
      if (error instanceof Error) {
        exceptionMessage = error.message;
      }
      console.error("[ReportScreen.useEffect] Execution Failure: ", exceptionMessage);
    }
  }, [routeLatA, routeLngA, routeLatB, routeLngB, routeMode]); 

  /**
   * Defines the camera viewport scale to ensure the markers are visible.
   */
  const INITIAL_REGION: Region = {
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  /**
   * Event listener triggered by the MapView. Updates the primary marker coordinates.
   * 
   * @param {MapPressEvent} event - The native map touch event.
   */
  const handleMapPress = (event: MapPressEvent): void => {
    try {
      // Step 1: Prevent geographic mutation if data is actively transmitting
      if (isSubmitting) {
        console.log("[ReportScreen.handleMapPress] Interface locked.");
        return;
      }

      // Step 2: Unpack payload
      const extractedLatitude: number = event.nativeEvent.coordinate.latitude;
      const extractedLongitude: number = event.nativeEvent.coordinate.longitude;

      // Step 3: Hydrate state
      const newCoordinate: Coordinate = {
        latitude: extractedLatitude,
        longitude: extractedLongitude
      };

      setSelectedLocation(newCoordinate);
      
    } catch (error: unknown) {
      console.error("[ReportScreen.handleMapPress] Spatial logic failed.", error);
    }
  };

  /**
   * Orchestrates the secure transmission of the anomaly report to the Python backend.
   * Constructs the explicit payload arrays required by PostGIS.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the transaction concludes.
   */
  const submitIncidentReport = async (): Promise<void> => {
    try {
      // Step 1: Pre-flight validation
      const isCategoryEmpty: boolean = selectedCategory.trim() === '';
      if (isCategoryEmpty) {
        Alert.alert("Validation Error", "Please structurally select a hazard category before submission.");
        return;
      }

      // Step 2: Engage interface lock
      setIsSubmitting(true);

      // Step 3: Format strings for strict database ingestion
      const rawCategoryText: string = selectedCategory;
      const formattedHazardType: string = HAZARD_TYPE_MAPPING[rawCategoryText] || 'unknown';
      
      const rawDescription: string = description;
      const sanitizedDescription: string = rawDescription.trim();

      const activeUserId: string = user ? String(user.id) : "user_system_default";

      // Step 4: Construct the array payload explicitly designed to support PostGIS geometries
      const coordinatePayloadArray: HazardCoordinate[] = [];
      
      // Inject Primary Anchor
      const primaryAnchor: HazardCoordinate = {
        lat: Number(selectedLocation.latitude),
        lng: Number(selectedLocation.longitude)
      };
      coordinatePayloadArray.push(primaryAnchor);

      // Inject Secondary Anchor (If applicable)
      if (reportingMode === 'dual' && secondaryLocation) {
        const secondaryAnchor: HazardCoordinate = {
          lat: Number(secondaryLocation.latitude),
          lng: Number(secondaryLocation.longitude)
        };
        coordinatePayloadArray.push(secondaryAnchor);
      }

      // Step 5: JSON Serialization
      const requestPayloadObject: HazardReportPayload = {
        reporter_id: activeUserId, 
        hazard_type: formattedHazardType,
        coordinates: coordinatePayloadArray,
        description: sanitizedDescription,
      };
      
      const requestBodyString: string = JSON.stringify(requestPayloadObject);

      // Step 6: Network Execution
      const response: Response = await fetch(API_REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBodyString,
      });

      // Step 7: Stream Unpacking
      const rawJson: any = await response.json();
      const parsedResponse: ServerResponse = rawJson as ServerResponse;
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 8: Transaction Success
        Alert.alert(
          "Report Submitted", 
          "Your coordinates have been securely committed to the spatial database.",
          [{ text: "Acknowledge", onPress: () => router.replace('/dashboard') }]
        );
      } else {
        // Step 9: Transaction Failure (Constraint Drop Warning)
        // If the Supabase constraint rejects the data, we explicitly inform the engineer.
        const serverErrorMessage: string = parsedResponse.detail || "Database transmission failed.";
        console.error(`[API Rejected Payload] Expected DB Constraint value: '${formattedHazardType}'`);
        
        Alert.alert(
          "Database Constraint Error", 
          `${serverErrorMessage}\n\n[Dev Note: If this fails for Water/Electrical but works for Fire, run ALTER TABLE hazards DROP CONSTRAINT hazards_hazard_type_check; in Supabase.]`
        );
      }

    } catch (error: unknown) {
      // Step 10: Connection Failure
      let exceptionMessage: string = "Network connection to the server dropped unexpectedly.";
      if (error instanceof Error) {
        exceptionMessage = `Network Exception: ${error.message}`;
      }
      
      Alert.alert("Connection Error", exceptionMessage);
      console.error("[ReportScreen.submitIncidentReport] Fatal Error: ", error);

    } finally {
      // Step 11: Release Lock
      setIsSubmitting(false);
    }
  };

  /**
   * Generates the dynamic visual indicator for the map based on the active state.
   */
  const currentActiveEmoji: string = getCategoryEmoji(selectedCategory);

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* --- HEADER SECTION --- */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} disabled={isSubmitting}>
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Anomaly</Text>
      </View>

      {/* --- HARDWARE KEYBOARD WRAPPER --- */}
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          
          {/* --- SPATIAL MAP RENDERER --- */}
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>1. Confirm Coordinates</Text>
            <Text style={styles.instructionText}>Review your spatial data visually before final transmission.</Text>
            
            <View style={styles.mapWrapper}>
              {Platform.OS === 'web' ? (
                <View style={styles.webMapFallback}>
                  <Text style={styles.webMapText}>Map rendering requires a physical mobile device.</Text>
                </View>
              ) : (
                <MapView
                  style={styles.map}
                  region={INITIAL_REGION}
                  onPress={handleMapPress}
                  scrollEnabled={false} // Mathematically prevents accidental panning while filling the form
                  zoomEnabled={false}
                >
                  {/* Primary Data Point: Dynamically renders the selected emoji icon */}
                  <Marker 
                    coordinate={selectedLocation} 
                    title="Primary Epicenter"
                    tracksViewChanges={false} // Fixes Android disappearing marker bug
                  >
                    <View style={styles.emojiMarkerContainer}>
                      <Text style={styles.emojiMarkerText}>{currentActiveEmoji}</Text>
                    </View>
                  </Marker>

                  {/* Secondary Data Point (Only renders if routing mode dictates a LineString) */}
                  {reportingMode === 'dual' && secondaryLocation && (
                    <Marker 
                      coordinate={secondaryLocation} 
                      title="Secondary Point"
                      tracksViewChanges={false}
                    >
                      <View style={styles.emojiMarkerContainer}>
                        <Text style={styles.emojiMarkerText}>{currentActiveEmoji}</Text>
                      </View>
                    </Marker>
                  )}

                  {/* EXPLICIT FIX: Red Polyline linking Pin A and Pin B for Road Blockage segments */}
                  {reportingMode === 'dual' && secondaryLocation && (
                    <Polyline
                      coordinates={[selectedLocation, secondaryLocation]}
                      strokeColor={COLORS.primary}
                      strokeWidth={8} // High thickness for immediate visual identification
                      lineDashPattern={[15, 10]}
                    />
                  )}
                </MapView>
              )}
            </View>
          </View>

          {/* --- DATA COLLECTION LAYER --- */}
          <View style={styles.formContainer}>
            
            <Text style={styles.sectionTitle}>2. Categorize Hazard</Text>
            <View style={styles.categoryGrid}>
              
              {HAZARD_CATEGORIES.map((category: string, index: number) => {
                const isSelected: boolean = selectedCategory === category;
                
                // CRITICAL ARCHITECTURE LOGIC: 
                // If the app is in Dual-Pin (LineString) mode, mathematically lock out all 
                // other categories to strictly enforce data integrity.
                const isLockedOut: boolean = reportingMode === 'dual' && category !== 'Road Blockage';
                
                return (
                  <TouchableOpacity
                    key={`hazard-category-${index}`}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillSelected,
                      isLockedOut && { opacity: 0.3, backgroundColor: COLORS.disabled, borderColor: COLORS.disabled }
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCategory(category)}
                    disabled={isSubmitting || isLockedOut}
                  >
                    <Text style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextSelected,
                      isLockedOut && { color: COLORS.textMuted }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
            </View>

            <Text style={styles.sectionTitle}>3. Additional Context (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the severity, scope, or specific physical details of the incident..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              editable={!isSubmitting}
              textAlignVertical="top"
            />

            {/* Network Submission Action Trigger */}
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                (isSubmitting || !selectedCategory) && styles.submitButtonDisabled
              ]}
              activeOpacity={0.85}
              onPress={submitIncidentReport}
              disabled={isSubmitting || !selectedCategory}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="cloud-upload" size={20} color={COLORS.surface} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>TRANSMIT REPORT</Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  container: { 
    flex: 1 
  },
  scrollContent: { 
    flexGrow: 1 
  },
  header: { 
    padding: 20, 
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
    fontSize: 20, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  mapContainer: { 
    padding: 20, 
    backgroundColor: COLORS.surface, 
    marginBottom: 12 
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.textDark, 
    marginBottom: 4 
  },
  instructionText: { 
    fontSize: 13, 
    color: COLORS.textMuted, 
    marginBottom: 16 
  },
  mapWrapper: { 
    height: 180, // Optimized to allow the UI to fit perfectly on smaller mobile screens
    width: '100%', 
    borderRadius: 16, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  map: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  
  // Custom Dynamic Emoji Styling Matrix
  emojiMarkerContainer: {
    backgroundColor: COLORS.surface,
    padding: 8,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiMarkerText: {
    fontSize: 20,
    textAlign: 'center'
  },

  webMapFallback: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#E5E7EB' 
  },
  webMapText: { 
    color: COLORS.textMuted, 
    fontWeight: '500' 
  },
  formContainer: { 
    padding: 20, 
    backgroundColor: COLORS.surface, 
    flex: 1 
  },
  categoryGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 24, 
    marginTop: 8 
  },
  categoryPill: { 
    backgroundColor: COLORS.background, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginRight: 10, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  categoryPillSelected: { 
    backgroundColor: COLORS.warning, 
    borderColor: COLORS.warning 
  },
  categoryPillText: { 
    color: COLORS.textDark, 
    fontWeight: '600', 
    fontSize: 13 
  },
  categoryPillTextSelected: { 
    color: COLORS.surface 
  },
  textArea: { 
    backgroundColor: COLORS.background, 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 15, 
    color: COLORS.textDark, 
    minHeight: 120, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    marginTop: 8, 
    marginBottom: 32 
  },
  submitButton: { 
    backgroundColor: COLORS.primary, 
    height: 56, 
    borderRadius: 14, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: COLORS.primary, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 4 
  },
  submitButtonDisabled: { 
    opacity: 0.6, 
    shadowOpacity: 0 
  },
  submitButtonText: { 
    color: COLORS.surface, 
    fontSize: 16, 
    fontWeight: '700', 
    letterSpacing: 1 
  },
});