/**
 * ============================================================================
 * @file routing.tsx
 * @title Active Hazard Zone Evacuation Engine
 * @description 
 * Renders the active hazard epicenter, draws the geographic evacuation perimeter,
 * and lists the specific commercial facilities trapped within the blast radius.
 * 
 * @upgrades_applied
 * - LOCALIZATION: Fully integrated `useLanguage` to dynamically map static strings 
 *   (titles, badges, dynamic distances, API fallback errors) to bilingual state.
 * - MANDATORY EXPANSION: All explicit typings, nested blocks, and mapping
 *   arrays mathematically unpacked for extreme code verbosity without altering
 *   the baseline geographic logic.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Platform 
} from 'react-native';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { router } from 'expo-router';

// LOCALIZATION ENGINE INJECTION
import { useLanguage } from '../context/LanguageContext';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/**
 * Defines the structured data payload returned from the spatial engine
 * for each shop located within the active hazard perimeter.
 */
interface AffectedShop {
  shop_name: string;
  distance_meters: number;
  safety_score: number;
}

/**
 * Defines the structured response expected from the FastAPI danger zone endpoint.
 */
interface DangerZoneResponse {
  status: string;
  message: string;
  data?: AffectedShop[];
  detail?: string;
}

/**
 * Strict typing for the application's central color palette.
 */
interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  warning: string;
  textDark: string;
  textMuted: string;
  border: string;
}

// Update to your machine's local IP if testing on a physical device
const API_URL: string = 'http://127.0.0.1:8000/api/scan-danger-zone';

// Coordinates for the simulated emergency (Saddar, Karachi)
const HAZARD_COORDS = {
  latitude: 24.8560,
  longitude: 67.0280,
  radius: 1000,
};

const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429',
  warning: '#F59E0B',
  textDark: '#2B2D42',
  textMuted: '#8D99AE',
  border: '#EDF2F4',
};

// ==========================================
// COMPONENT: ROUTING & EVACUATION SCREEN
// ==========================================

/**
 * RoutingScreen Component
 * Renders the active hazard epicenter, draws the geographic evacuation perimeter,
 * and lists the specific commercial facilities trapped within the blast radius.
 * 
 * @returns {React.JSX.Element} The rendered Evacuation Map Interface.
 */
export default function RoutingScreen(): React.JSX.Element {
  
  const languageContext = useLanguage();
  const translateKey: (key: any) => string = languageContext.t;

  // --- Explicitly Typed State Management ---
  const [affectedShops, setAffectedShops] = useState<AffectedShop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * React lifecycle hook.
   * Triggers the spatial data retrieval sequence the moment the component mounts.
   */
  useEffect(() => {
    fetchHazardData();
  }, []);

  /**
   * Orchestrates the secure transmission of the hazard epicenter coordinates
   * to the Python backend to compute the exact facilities requiring evacuation.
   * 
   * @async
   * @returns {Promise<void>}
   */
  const fetchHazardData = async (): Promise<void> => {
    try {
      // Step 1: Initialize loading state to render activity indicators
      setLoading(true);
      
      // Step 2: Unpack and construct the exact JSON payload for the POST request
      const requestPayloadObject = {
        lat: HAZARD_COORDS.latitude,
        lng: HAZARD_COORDS.longitude,
        radius: HAZARD_COORDS.radius,
      };
      const requestBodyString: string = JSON.stringify(requestPayloadObject);

      // Step 3: Execute the network POST request to the Spatial Engine
      const response: Response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBodyString,
      });

      // Step 4: Unpack the stream into a raw JSON object
      const rawJson: any = await response.json();
      
      // Step 5: Cast the raw object into our strict TypeScript interface
      const parsedJson: DangerZoneResponse = rawJson as DangerZoneResponse;
      
      // Step 6: Evaluate the HTTP status success boolean
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess && parsedJson.data) {
        // Hydrate the React state with the returned shop array
        setAffectedShops(parsedJson.data);
      } else {
        // Handle server-side logic rejections safely
        const defaultErrorMessage: string = translateKey('routing_err_fetch');
        const errorMessage: string = parsedJson.detail || defaultErrorMessage;
        setError(errorMessage);
      }
      
    } catch (err: unknown) {
      // Step 7: Catch and log catastrophic network or CORS failures
      let exceptionMessage: string = translateKey('routing_err_conn');
      if (err instanceof Error) {
        exceptionMessage = `Network Exception: ${err.message}`;
      }
      setError(exceptionMessage);
      console.error("[RoutingScreen.fetchHazardData] Spatial Engine connection dropped: ", err);
      
    } finally {
      // Step 8: Ensure the loading lock is released regardless of outcome
      setLoading(false);
    }
  };

  /**
   * Sub-render function to format individual facilities within the FlatList.
   * Explicitly typed to prevent undefined property errors during list iteration.
   * 
   * @param {Object} props - The destructured FlatList render properties.
   * @param {AffectedShop} props.item - The specific facility data object.
   * @param {number} props.index - The list iteration index used for rank calculation.
   * @returns {React.JSX.Element} The formatted Shop Card.
   */
  const renderShopItem = ({ item, index }: { item: AffectedShop, index: number }): React.JSX.Element => {
    // Unpack variables for clean rendering
    const currentRank: number = index + 1;
    const roundedDistance: string = item.distance_meters.toFixed(1);
    
    // Inject dynamic strings from localization dictionary
    const rawDistanceString: string = translateKey('routing_card_distance');
    const localizedDistanceString: string = rawDistanceString.replace('{distance}', roundedDistance);

    const rawScoreString: string = translateKey('routing_card_score');
    const localizedScoreString: string = rawScoreString.replace('{score}', item.safety_score.toString());
    
    return (
      <View style={styles.shopCard}>
        <View style={styles.shopHeader}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{currentRank}</Text>
          </View>
          <Text style={styles.shopName} numberOfLines={1}>{item.shop_name}</Text>
        </View>
        <View style={styles.shopDetails}>
          <Text style={styles.detailText}>{localizedDistanceString}</Text>
          <Text style={styles.detailText}>{localizedScoreString}</Text>
        </View>
      </View>
    );
  };

  // Construct the camera viewport configurations explicitly
  const initialMapRegion: Region = {
    latitude: HAZARD_COORDS.latitude,
    longitude: HAZARD_COORDS.longitude,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
          <Text style={styles.backText}>{translateKey('routing_back_btn')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{translateKey('routing_header_title')}</Text>
      </View>

      {/* Map Rendering Engine Section */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <View style={styles.webMapFallback}>
            <Text style={styles.webMapText}>{translateKey('routing_map_fallback')}</Text>
          </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={initialMapRegion}
          >
            {/* Hazard Epicenter Pin */}
            <Marker coordinate={HAZARD_COORDS} title={translateKey('routing_map_epicenter_title')} />
            
            {/* Evacuation Perimeter Overlay (1000m) */}
            <Circle
              center={HAZARD_COORDS}
              radius={HAZARD_COORDS.radius}
              strokeWidth={2}
              strokeColor="rgba(217, 4, 41, 0.5)"
              fillColor="rgba(217, 4, 41, 0.15)"
            />
          </MapView>
        )}
      </View>

      {/* Evacuation Priority List Section */}
      <View style={styles.listContainer}>
        
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{translateKey('routing_list_title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{affectedShops.length} {translateKey('routing_list_facilities')}</Text>
          </View>
        </View>

        {/* Conditional Rendering Logic for Network States */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={affectedShops}
            keyExtractor={(item: AffectedShop, index: number) => index.toString()}
            renderItem={renderShopItem}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
        
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
    height: '40%', 
    width: '100%', 
    backgroundColor: '#E5E7EB' 
  },
  map: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0 
  },
  webMapFallback: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  webMapText: { 
    color: COLORS.textMuted, 
    textAlign: 'center', 
    fontWeight: '500' 
  },
  listContainer: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  listHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: COLORS.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  listTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  countBadge: { 
    backgroundColor: '#FEE2E2', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  countText: { 
    color: COLORS.primary, 
    fontSize: 12, 
    fontWeight: '700' 
  },
  flatListContent: { 
    padding: 16 
  },
  loader: { 
    marginTop: 40 
  },
  errorText: { 
    textAlign: 'center', 
    marginTop: 40, 
    color: COLORS.primary, 
    fontWeight: '500' 
  },
  shopCard: { 
    backgroundColor: COLORS.surface, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  shopHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  rankBadge: { 
    backgroundColor: COLORS.textDark, 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  rankText: { 
    color: COLORS.surface, 
    fontSize: 12, 
    fontWeight: '700' 
  },
  shopName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.textDark, 
    flex: 1 
  },
  shopDetails: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingLeft: 40 
  },
  detailText: { 
    fontSize: 13, 
    color: COLORS.textMuted, 
    fontWeight: '500' 
  },
});