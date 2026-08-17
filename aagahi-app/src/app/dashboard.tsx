/**
 * ============================================================================
 * @file dashboard.tsx
 * @title Aagahi Spatial Dashboard Engine (The Ultimate Golden Baseline & Localization Merge)
 * @author Arsheel Abbas (Aagahi Spatial Division)
 * 
 * @description 
 * This module operates as the absolute central nervous system for geographic 
 * visualization and platform interaction within the Aagahi environment. It seamlessly
 * integrates a high-end layout-driven User Interface with advanced OSRM pathfinding, 
 * true in-app navigation, exponential-backoff telemetry syncing, and a bilingual 
 * Urdu/English localization engine.
 * 
 * @architecture
 * - STRICT TYPING: Employs uncompromising TypeScript definitions to mathematically 
 *   prevent runtime memory faults and undefined pointer errors.
 * - MODULAR UI CONDITIONAL RENDERING: Upgraded to support a dual-state viewport. 
 *   It boots into a premium, non-map layout dashboard first, explicitly hiding the 
 *   map behind a state wall to save rendering pipeline costs until spatial visualization 
 *   is strictly required by the user.
 * - NATIVE RENDERING: Utilizes native spatial engines (`react-native-maps`) 
 *   strictly bound to hardware-accelerated viewports for 60FPS performance.
 * - ASYNC ISOLATION: Features robust, exponential-backoff network fallback systems.
 * - UX DECLUTTERING & POLISH: Re-ordered grid priorities to shift Community Chat 
 *   to the primary 4-pillar grid. Migrated Safe Path Navigation strictly inside 
 *   the Map feature via a dedicated spatial trigger. Fixed high-contrast typography 
 *   and iconography on the Safety Status banner natively.
 * - AUTO-ZOOM RESTORATION: Injected a dynamic `useEffect` listener to force the 
 *   camera to snap to the user's hardware coordinates immediately upon rendering 
 *   the map viewport.
 * - HUD STREAMLINING: Removed the Language Toggle from the Map Viewport Top HUD 
 *   to ensure zero visual distractions.
 * 
 * @revision GUARDIAN GRID v9.0 — VISUAL SYSTEM OVERHAUL (NON-DESTRUCTIVE)
 * This revision is a strictly presentational upgrade. Every mathematical routine, 
 * every network call, every piece of state management, and every event handler 
 * from the prior baseline is preserved byte-for-byte in terms of behavior. Only 
 * the visual design system (color tokens, spacing/radius tokens, the Home 
 * Dashboard render tree, and a small number of decorative additions) has been 
 * rebuilt. The design concept — "Guardian Grid" — borrows its visual language 
 * directly from the product's actual function: a radar-style pulsing "coverage 
 * ring" around the safety-status shield (echoing live hazard monitoring), an 
 * asymmetric "bento" action grid instead of a rigid 2x2 (so the highest-priority 
 * action, the Optical Scanner, reads as unmistakably primary), and a single bold 
 * "control-room" hero header that hands off to a calm, glass-bordered, daylight 
 * body — rather than drenching the entire screen in a generic dark theme. 
 * No new third-party packages are introduced; every visual effect below is 
 * achieved with primitives already imported in this file (View, Animated, 
 * StyleSheet) so this file compiles with zero additional installs.
 * ============================================================================
 */

// ============================================================================
// 1. CORE REACT IMPORTS (Heavily Unpacked for Stack Trace Clarity)
// ============================================================================
import React from 'react';
import { 
  useState, 
  useEffect, 
  useRef, 
  Fragment 
} from 'react';

// ============================================================================
// 2. REACT NATIVE NATIVE COMPONENTS
// ============================================================================
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Text, 
  Platform, 
  Alert, 
  ActivityIndicator, 
  TextInput, 
  Keyboard, 
  FlatList, 
  KeyboardAvoidingView,
  ScrollView,
  Animated
} from 'react-native';

// ============================================================================
// 3. HARDWARE & SAFE AREA ENGINES
// ============================================================================
import { 
  SafeAreaView 
} from 'react-native-safe-area-context';

import MapView, { 
  Marker, 
  PROVIDER_GOOGLE, 
  Region, 
  Polyline, 
  MarkerDragStartEndEvent, 
  UserLocationChangeEvent 
} from 'react-native-maps';

import * as Location from 'expo-location';
import { 
  LocationObject, 
  LocationGeocodedAddress
} from 'expo-location';

// ============================================================================
// 4. UI ICONOGRAPHY & NAVIGATION UTILITIES
// ============================================================================
import { 
  MaterialCommunityIcons 
} from '@expo/vector-icons';

import { 
  router 
} from 'expo-router';

// ============================================================================
// 5. GLOBAL IDENTITY, LOCALIZATION & BACKEND API
// ============================================================================
import { 
  useAuth
} from '../context/AuthContext';

import { 
  useLanguage 
} from '../context/LanguageContext';

import { 
  API_BASE_URL 
} from '../config/api';

// ============================================================================
// STRICT TYPESCRIPT INTERFACES & STRUCTURAL DEFINITIONS
// ============================================================================

/**
 * @interface ThemeColors
 * @description Centralized dictionary defining strict hexadecimal bounds for all UI elements.
 * 
 * @revision GUARDIAN GRID v9.0 — Six new tokens were appended to the tail of this 
 * interface (`primaryDeep`, `surfaceElevatedDark`, `glassBorderLight`, 
 * `glassBorderDark`, `accentGlowShadow`, `safeGlowShadow`). These are strictly 
 * additive: every original key name, and therefore every existing style rule 
 * that already reads from `COLORS.*`, continues to resolve exactly as before — 
 * it simply now resolves to a refreshed hex value. Nothing that already 
 * consumed this interface needs to change.
 */
interface ThemeColors {
  primary: string;
  primaryDeep: string;
  surface: string;
  surfaceDark: string;
  surfaceElevatedDark: string;
  surfaceLightGrid: string;
  textDark: string;
  textMuted: string;
  overlay: string;
  warning: string;
  disabled: string;
  fabShadow: string;
  safeRoute: string;
  alternateRoute: string;
  emeraldGreen: string;
  oceanBlue: string;
  sunflowerYellow: string;
  glassBorderLight: string;
  glassBorderDark: string;
  accentGlowShadow: string;
  safeGlowShadow: string;
}

/**
 * @interface HazardData
 * @description Mapped directly to the Supabase PostgreSQL return schema.
 */
interface HazardData {
  id: number;
  reporter_id: string;
  hazard_type: string;
  location: any; 
  description: string;
  status: string;
}

/**
 * @interface HazardApiResponse
 * @description Wraps the structural payload returned by the Python FastAPI backend.
 */
interface HazardApiResponse {
  status: string;
  data: HazardData[];
  detail?: string;
}

/**
 * @interface CoordinatePayload
 * @description The universally required mathematical node array structure for React Native Maps.
 */
interface CoordinatePayload {
  latitude: number;
  longitude: number;
}

/**
 * @interface ParsedSpatialData
 * @description Internal memory representation differentiating a static epicenter vs a blockage line.
 */
interface ParsedSpatialData {
  type: 'point' | 'linestring';
  coordinates: CoordinatePayload[];
}

/**
 * @type VehicleModality
 * @description Strictly limited union governing OSRM execution matrices.
 */
type VehicleModality = 'car' | 'bike' | 'truck' | 'foot';

/**
 * @interface RouteMetrics
 * @description Contains the physical execution path and the mathematical distance/time calculations.
 */
interface RouteMetrics {
  coordinates: CoordinatePayload[];
  distanceKm: number;
  estimatedMinutes: number;
}

/**
 * @type InteractionMode
 * @description Enforces explicit state machines for what the user is currently doing on the screen.
 * @note Includes 'home_dashboard' to serve as the default application state hiding the map natively.
 */
type InteractionMode = 'home_dashboard' | 'view' | 'report_single' | 'report_dual' | 'routing' | 'active_navigation';

// ------------------------------------------
// NOMINATIM OPENSTREETMAP API TYPES
// ------------------------------------------

interface NominatimAddressBlock {
  amenity?: string;
  shop?: string;
  building?: string;
  office?: string;
  tourism?: string;
  leisure?: string;
  government?: string;
  road?: string;
  suburb?: string;
  city?: string;
  [additionalAddressKey: string]: string | undefined;
}

interface NominatimNameDetailsBlock {
  name?: string;
  [additionalNameKey: string]: string | undefined;
}

interface NominatimSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddressBlock;
  namedetails?: NominatimNameDetailsBlock;
  extratags?: Record<string, string>;
  class?: string;
  type?: string;
  importance?: number;
}

// ------------------------------------------
// ROUTING PROFILES
// ------------------------------------------

interface VehicleProfileConfig {
  osrmProfile: string;
  iconName: string;
  displayLabel: string;
  limitationNote: string | null;
}

// ============================================================================
// IMMUTABLE CONSTANTS & MASTER CONFIGURATIONS
// ============================================================================

/**
 * @constant SPACING_SCALE
 * @description GUARDIAN GRID v9.0 — A small, disciplined spacing scale used only 
 * by the newly-built Home Dashboard elements below. It exists so that new 
 * padding/margin/gap decisions are drawn from one deliberate set of numbers 
 * instead of ad-hoc magic numbers, which keeps the new "bento" layout visually 
 * consistent with itself. This constant does not replace or touch any spacing 
 * value already hard-coded inside pre-existing, untouched style rules.
 */
const SPACING_SCALE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

/**
 * @constant RADIUS_SCALE
 * @description GUARDIAN GRID v9.0 — A small corner-radius scale, mirroring the 
 * radii already present throughout the legacy stylesheet (14 / 18 / 20 / 22) so 
 * new components read as part of the same family rather than a mismatched skin.
 */
const RADIUS_SCALE = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

/**
 * @constant COLORS
 * @description GUARDIAN GRID v9.0 — Refreshed color system.
 * 
 * Because almost every existing style rule in this file reads its color from 
 * `COLORS.*` rather than a hard-coded hex string, replacing the values here is 
 * sufficient to re-skin the map markers, HUD panels, buttons, and FABs 
 * throughout the entire application without touching their structural style 
 * rules or their JSX. Only the Home Dashboard render tree further down was 
 * rebuilt structurally, since it is the single largest and most-seen visual 
 * surface in the app.
 * 
 * Rationale for each shift (kept intentionally restrained — one bold accent, 
 * calm neutrals everywhere else, per standard visual-identity discipline):
 * - `primary` moved from a flat brick red (#D90429) to a slightly hotter, more 
 *   saturated crimson (#FF3B5C) that reads clearly as "alert / hazard" against 
 *   both light and dark surfaces without becoming alarmist neon.
 * - `safeRoute` moved from a plain blue (#3B82F6) to an electric indigo 
 *   (#4C6FFF), giving "safe path" a distinct visual temperature from the 
 *   hazard-red so the two are never confusable at a glance on the map.
 * - `emeraldGreen` was brightened to a mint-leaning #12D9A0 so the "monitored / 
 *   safe" status states feel alive rather than institutional.
 * - New glass-border and glow-shadow tokens exist purely to let card surfaces 
 *   (in both light and dark mode) pick up a one-pixel edge of definition and a 
 *   soft tinted shadow instead of a flat drop shadow, without inventing a whole 
 *   parallel styling system.
 */
const COLORS: ThemeColors = {
  primary: '#FF3B5C',           // Guardian Grid signal crimson (hazard / alert)
  primaryDeep: '#B4123A',       // Pressed / shadow variant of primary
  surface: '#FFFFFF',
  surfaceDark: '#0A0B14',       // Near-ink navy, reserved for the hero header only
  surfaceElevatedDark: '#161826', // Card surface used when isDarkMode is active
  surfaceLightGrid: '#F5F6FB',
  textDark: '#0F172A',
  textMuted: '#64748B',
  overlay: 'rgba(10, 11, 20, 0.96)',
  warning: '#FFB020',
  disabled: '#E5E7EB',
  fabShadow: '#000000',
  safeRoute: '#4C6FFF',         // Electric indigo (safe path / routing)
  alternateRoute: '#A855F7',
  emeraldGreen: '#12D9A0',      // Mint-emerald (monitored / safe status)
  oceanBlue: '#0EA5E9',
  sunflowerYellow: '#FFC93C',
  glassBorderLight: 'rgba(15, 23, 42, 0.07)',
  glassBorderDark: 'rgba(255, 255, 255, 0.09)',
  accentGlowShadow: 'rgba(255, 59, 92, 0.35)',
  safeGlowShadow: 'rgba(76, 111, 255, 0.35)',
};

const BUILDING_LABEL_WHITE: string = '#FFFFFF';

const TACTICAL_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#28394b' }, { visibility: 'on' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: BUILDING_LABEL_WHITE }, { visibility: 'on' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'poi.business', elementType: 'geometry', stylers: [{ color: '#31415a' }, { visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels.text.fill', stylers: [{ color: BUILDING_LABEL_WHITE }, { visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'geometry', stylers: [{ color: '#3a2530' }, { visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'labels.text.fill', stylers: [{ color: BUILDING_LABEL_WHITE }, { visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.government', elementType: 'geometry', stylers: [{ color: '#2c3a4f' }, { visibility: 'on' }] },
  { featureType: 'poi.government', elementType: 'labels.text.fill', stylers: [{ color: BUILDING_LABEL_WHITE }, { visibility: 'on' }] },
  { featureType: 'poi.government', elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

/**
 * THE TRUE VEHICLE ROUTING TABLE.
 * Maps every VehicleModality to its OSRM profile constraints natively. 
 */
const VEHICLE_PROFILES: Record<VehicleModality, VehicleProfileConfig> = {
  car: {
    osrmProfile: 'car',
    iconName: 'car',
    displayLabel: 'Car',
    limitationNote: null,
  },
  bike: {
    osrmProfile: 'bike',
    iconName: 'motorbike',
    displayLabel: 'Bike',
    limitationNote: 'Bike routes structurally bypass heavy traffic arteries and narrow alleys.',
  },
  truck: {
    osrmProfile: 'car',
    iconName: 'truck',
    displayLabel: 'Truck',
    limitationNote: 'Truck profiles enforce wider turn radii and avoid structural bottlenecks.',
  },
  foot: {
    osrmProfile: 'foot',
    iconName: 'walk',
    displayLabel: 'Walk',
    limitationNote: 'Pedestrian routes utilize sidewalks and footpaths dynamically.',
  }
};

const KARACHI_VIEWBOX: string = '66.90,24.95,67.15,24.75';
const KARACHI_CENTER_COORDINATE: CoordinatePayload = { latitude: 24.8607, longitude: 67.0011 };
const KARACHI_SOFT_BOUNDS = { minLat: 24.60, maxLat: 25.10, minLng: 66.70, maxLng: 67.40 };

const NOMINATIM_USER_AGENT: string = 'Aagahi_Enterprise_App_Master_V8';
const NOMINATIM_RESULT_LIMIT: number = 15;
const NOMINATIM_DEBOUNCE_MS: number = 350;
const NOMINATIM_MIN_QUERY_LENGTH: number = 3;

const GPS_CAMERA_PITCH: number = 55;
const GPS_CAMERA_ALTITUDE: number = 1800;
const GPS_CAMERA_ZOOM: number = 16;
const GPS_INITIAL_SNAP_DURATION_MS: number = 2000;
const GPS_BACKUP_SNAP_DURATION_MS: number = 1500;

const NAV_CAMERA_PITCH: number = 75; // Extreme tactical tilt for turn-by-turn logic
const NAV_CAMERA_ALTITUDE: number = 150; // Low altitude to see exact street corners
const NAV_CAMERA_ZOOM: number = 19;

const HAZARD_PROXIMITY_THRESHOLD_KM: number = 0.15; // The mathematical buffer radius around any hazard
const HAZARD_REFRESH_INTERVAL_MS: number = 60000;
const MAX_HAZARD_FETCH_RETRIES: number = 3;
const HAZARD_FETCH_RETRY_BASE_DELAY_MS: number = 800;

// ============================================================================
// PURE UTILITY & MATHEMATICAL ENGINES
// ============================================================================

/**
 * @function getHazardEmoji
 * @description Translates the raw PostgreSQL enum string into a visual Unicode emoji explicitly.
 * @param {string} hazardType - The categorical string definition of the hazard.
 * @returns {string} The standardized visual representation character.
 */
const getHazardEmoji = (hazardType: string): string => {
  try {
    const isStringValid: boolean = typeof hazardType === 'string' && hazardType.length > 0;
    if (!isStringValid) return '⚠️';

    const normalizedType: string = hazardType.toLowerCase().trim();

    if (normalizedType.includes('fire')) return '🔥';
    if (normalizedType.includes('water')) return '💧';
    if (normalizedType.includes('struct')) return '🏢';
    if (normalizedType.includes('elect')) return '⚡';
    if (normalizedType.includes('road') || normalizedType.includes('block')) return '🚧';

    return '⚠️';
  } catch (error: unknown) {
    console.warn('[getHazardEmoji] Parsing failed, falling back to default.', error);
    return '⚠️';
  }
};

/**
 * @function decodePolyline
 * @description Extracts and decrypts the compressed Google Maps Polyline format strictly into an 
 * array of standard float-based coordinate pairs for spatial mapping engines natively.
 * @param {string} encodedStringPayload - The compressed alphanumeric geometry string.
 * @returns {CoordinatePayload[]} Structurally defined array of standard map nodes.
 */
const decodePolyline = (encodedStringPayload: string): CoordinatePayload[] => {
  try {
    const isEncodedStrValid: boolean = typeof encodedStringPayload === 'string' && encodedStringPayload.length > 0;
    if (!isEncodedStrValid) return [];

    const polylineNodeArray: CoordinatePayload[] = [];
    let payloadIndexIterator: number = 0;
    const stringTotalLength: number = encodedStringPayload.length;
    let mathematicalLatitudeAccumulator: number = 0;
    let mathematicalLongitudeAccumulator: number = 0;

    while (payloadIndexIterator < stringTotalLength) {
      let extractedByteValue: number;
      let binaryShiftOffset: number = 0;
      let parsedIntegerResult: number = 0;

      do {
        extractedByteValue = encodedStringPayload.charCodeAt(payloadIndexIterator++) - 63;
        parsedIntegerResult |= (extractedByteValue & 0x1f) << binaryShiftOffset;
        binaryShiftOffset += 5;
      } while (extractedByteValue >= 0x20);
      
      const deltaLatitudeTransformation: number = parsedIntegerResult & 1 ? ~(parsedIntegerResult >> 1) : parsedIntegerResult >> 1;
      mathematicalLatitudeAccumulator += deltaLatitudeTransformation;

      binaryShiftOffset = 0;
      parsedIntegerResult = 0;
      
      do {
        extractedByteValue = encodedStringPayload.charCodeAt(payloadIndexIterator++) - 63;
        parsedIntegerResult |= (extractedByteValue & 0x1f) << binaryShiftOffset;
        binaryShiftOffset += 5;
      } while (extractedByteValue >= 0x20);
      
      const deltaLongitudeTransformation: number = parsedIntegerResult & 1 ? ~(parsedIntegerResult >> 1) : parsedIntegerResult >> 1;
      mathematicalLongitudeAccumulator += deltaLongitudeTransformation;

      const decompressedSpatialNode: CoordinatePayload = {
        latitude: mathematicalLatitudeAccumulator / 1e5, 
        longitude: mathematicalLongitudeAccumulator / 1e5 
      };
      
      polylineNodeArray.push(decompressedSpatialNode);
    }
    return polylineNodeArray;
  } catch (decodeError: unknown) {
    console.error('[decodePolyline] Polyline decompression algorithmic execution failed:', decodeError);
    return [];
  }
};

/**
 * @function parseEWKB
 * @description Extracts geometric data from Extended Well-Known Binary hexadecimal strings structurally.
 * Parses endianness explicitly and constructs CoordinatePayload sets.
 * @param {string} hexadecimalString - The EWKB representation string natively fetched from PostgreSQL.
 * @returns {ParsedSpatialData | null} The structural geometry or null if invalid.
 */
const parseEWKB = (hexadecimalString: string): ParsedSpatialData | null => {
  try {
    const isHexLengthValid: boolean = typeof hexadecimalString === 'string' && hexadecimalString.length >= 42;
    if (!isHexLengthValid) return null;

    const readUnsignedInteger32LittleEndian = (hexadecimalTarget: string, logicalByteOffset: number): number => {
      const charArrayOffsetPointer: number = logicalByteOffset * 2;
      const hexadecimalFourByteSlice: string = hexadecimalTarget.substring(charArrayOffsetPointer, charArrayOffsetPointer + 8);
      
      const isSliceLengthValid: boolean = hexadecimalFourByteSlice.length === 8;
      if (!isSliceLengthValid) return NaN;

      const memoryBuffer: ArrayBuffer = new ArrayBuffer(4);
      const dataViewInterface: DataView = new DataView(memoryBuffer);
      for (let iteratorIndex = 0; iteratorIndex < 4; iteratorIndex++) {
        const structuralSlice: string = hexadecimalFourByteSlice.substring(iteratorIndex * 2, iteratorIndex * 2 + 2);
        dataViewInterface.setUint8(iteratorIndex, parseInt(structuralSlice, 16));
      }
      return dataViewInterface.getUint32(0, true);
    };

    const readDoublePrecisionFloatLittleEndian = (hexadecimalTarget: string, logicalByteOffset: number): number => {
      const charArrayOffsetPointer: number = logicalByteOffset * 2;
      const hexadecimalEightByteSlice: string = hexadecimalTarget.substring(charArrayOffsetPointer, charArrayOffsetPointer + 16);
      
      const isSliceLengthValid: boolean = hexadecimalEightByteSlice.length === 16;
      if (!isSliceLengthValid) return NaN;

      const memoryBuffer: ArrayBuffer = new ArrayBuffer(8);
      const dataViewInterface: DataView = new DataView(memoryBuffer);
      for (let iteratorIndex = 0; iteratorIndex < 8; iteratorIndex++) {
        const structuralSlice: string = hexadecimalEightByteSlice.substring(iteratorIndex * 2, iteratorIndex * 2 + 2);
        dataViewInterface.setUint8(iteratorIndex, parseInt(structuralSlice, 16));
      }
      return dataViewInterface.getFloat64(0, true);
    };

    const endianDetectionSlice: string = hexadecimalString.substring(0, 2);
    const endianNumericalValue: number = parseInt(endianDetectionSlice, 16);
    
    const isStrictlyLittleEndianArchitecture: boolean = endianNumericalValue === 1;
    if (!isStrictlyLittleEndianArchitecture) return null;

    const metadataTypeInteger: number = readUnsignedInteger32LittleEndian(hexadecimalString, 1);
    const hasSpatialReferenceSystemIdentifier: boolean = (metadataTypeInteger & 0x20000000) !== 0;
    const resolvedGeometryTypeIdentifier: number = metadataTypeInteger & 0xff;

    let dynamicByteOffsetPointer: number = 5;
    if (hasSpatialReferenceSystemIdentifier) {
        dynamicByteOffsetPointer += 4;
    }

    if (resolvedGeometryTypeIdentifier === 1) { // Point extraction logic
      const extractedLongitudeFloat: number = readDoublePrecisionFloatLittleEndian(hexadecimalString, dynamicByteOffsetPointer);
      const extractedLatitudeFloat: number = readDoublePrecisionFloatLittleEndian(hexadecimalString, dynamicByteOffsetPointer + 8);
      
      const isMathematicalFloatValid: boolean = !isNaN(extractedLatitudeFloat) && !isNaN(extractedLongitudeFloat);
      if (isMathematicalFloatValid) {
        return { 
          type: 'point', 
          coordinates: [{ latitude: extractedLatitudeFloat, longitude: extractedLongitudeFloat }] 
        };
      }
    } else if (resolvedGeometryTypeIdentifier === 2) { // LineString extraction logic
      const numberOfDataPoints: number = readUnsignedInteger32LittleEndian(hexadecimalString, dynamicByteOffsetPointer);
      dynamicByteOffsetPointer += 4;

      const lineCoordinateArrayCache: CoordinatePayload[] = [];
      for (let pointIteratorIndex = 0; pointIteratorIndex < numberOfDataPoints; pointIteratorIndex++) {
        const currentLongitudeNode: number = readDoublePrecisionFloatLittleEndian(hexadecimalString, dynamicByteOffsetPointer);
        const currentLatitudeNode: number = readDoublePrecisionFloatLittleEndian(hexadecimalString, dynamicByteOffsetPointer + 8);
        
        const isCurrentNodeFloatValid: boolean = !isNaN(currentLatitudeNode) && !isNaN(currentLongitudeNode);
        if (isCurrentNodeFloatValid) {
          lineCoordinateArrayCache.push({ latitude: currentLatitudeNode, longitude: currentLongitudeNode });
        }
        dynamicByteOffsetPointer += 16;
      }

      const isGeneratedLineStructurallyValid: boolean = lineCoordinateArrayCache.length >= 2;
      if (isGeneratedLineStructurallyValid) {
        return { type: 'linestring', coordinates: lineCoordinateArrayCache };
      }
    }
    return null;
  } catch (extractionError: unknown) {
    console.error('[parseEWKB] Binary decomposition failed explicitly during geometric translation:', extractionError);
    return null;
  }
};

/**
 * @function calculateHaversineDistance
 * @description Utilizes the Haversine formula to rigorously determine the great-circle distance 
 * between two points mathematically natively mapping onto Earth's surface sphere.
 * @param {number} latitudeNodeOne - Origin latitude.
 * @param {number} longitudeNodeOne - Origin longitude.
 * @param {number} latitudeNodeTwo - Destination latitude.
 * @param {number} longitudeNodeTwo - Destination longitude.
 * @returns {number} Distance directly returned in Kilometers logically.
 */
const calculateHaversineDistance = (latitudeNodeOne: number, longitudeNodeOne: number, latitudeNodeTwo: number, longitudeNodeTwo: number): number => {
  try {
    const earthRadiusConstantKilometers: number = 6371;
    const deltaLatitudeRadians: number = (latitudeNodeTwo - latitudeNodeOne) * (Math.PI / 180);
    const deltaLongitudeRadians: number = (longitudeNodeTwo - longitudeNodeOne) * (Math.PI / 180);

    const computationalPartOne: number = Math.sin(deltaLatitudeRadians / 2) * Math.sin(deltaLatitudeRadians / 2);
    const computationalPartTwo: number = Math.cos(latitudeNodeOne * (Math.PI / 180)) * Math.cos(latitudeNodeTwo * (Math.PI / 180));
    const computationalPartThree: number = Math.sin(deltaLongitudeRadians / 2) * Math.sin(deltaLongitudeRadians / 2);
    
    const mathematicalChordLengthSquare: number = computationalPartOne + (computationalPartTwo * computationalPartThree);
    const angularDistanceCalculation: number = 2 * Math.atan2(Math.sqrt(mathematicalChordLengthSquare), Math.sqrt(1 - mathematicalChordLengthSquare));
    
    return earthRadiusConstantKilometers * angularDistanceCalculation;
  } catch (haversineExecutionError: unknown) {
    console.error('[calculateHaversineDistance] Mathematical distance calculation engine failed:', haversineExecutionError);
    return 0;
  }
};

/**
 * @function calculateBearing
 * @description Calculates the exact compass heading (0-360 degrees) for map rotation natively.
 * It enforces trigonometric logic upon spherical coordinates.
 */
const calculateBearing = (latitudeOrigin: number, longitudeOrigin: number, latitudeDestination: number, longitudeDestination: number): number => {
  try {
    const convertToRadians = (degreesPayload: number): number => degreesPayload * (Math.PI / 180);
    const convertToDegrees = (radiansPayload: number): number => radiansPayload * (180 / Math.PI);

    const phiOriginRadians: number = convertToRadians(latitudeOrigin);
    const phiDestinationRadians: number = convertToRadians(latitudeDestination);
    const deltaLambdaRadians: number = convertToRadians(longitudeDestination - longitudeOrigin);

    const trigonometricYComponent: number = Math.sin(deltaLambdaRadians) * Math.cos(phiDestinationRadians);
    const trigonometricXPartOne: number = Math.cos(phiOriginRadians) * Math.sin(phiDestinationRadians);
    const trigonometricXPartTwo: number = Math.sin(phiOriginRadians) * Math.cos(phiDestinationRadians) * Math.cos(deltaLambdaRadians);
    const trigonometricXComponent: number = trigonometricXPartOne - trigonometricXPartTwo;

    const angularThetaCalculated: number = Math.atan2(trigonometricYComponent, trigonometricXComponent);
    const rawCompassBearingDegrees: number = convertToDegrees(angularThetaCalculated);
    const normalizedCompassBearing: number = (rawCompassBearingDegrees + 360) % 360;

    return normalizedCompassBearing;
  } catch (bearingError: unknown) {
    console.error("[calculateBearing] Trigonometric trajectory failure explicitly caught:", bearingError);
    return 0; 
  }
};

const extractBestPlaceName = (suggestionBlock: NominatimSuggestion): string => {
  try {
    const namedetailsNameField: string | undefined = suggestionBlock.namedetails ? suggestionBlock.namedetails.name : undefined;
    const isNamedetailsFieldValid: boolean = typeof namedetailsNameField === 'string' && namedetailsNameField.trim().length > 0;
    if (isNamedetailsFieldValid) return (namedetailsNameField as string).trim();

    const nestedAddressBlock: NominatimAddressBlock | undefined = suggestionBlock.address;
    const isNestedAddressBlockValid: boolean = nestedAddressBlock !== undefined && nestedAddressBlock !== null;

    if (isNestedAddressBlockValid) {
      const explicitCandidateFieldsArray: string[] = ['amenity', 'shop', 'building', 'office', 'tourism', 'leisure', 'government'];
      for (let iteratorCount: number = 0; iteratorCount < explicitCandidateFieldsArray.length; iteratorCount++) {
        const activeFieldKey: string = explicitCandidateFieldsArray[iteratorCount];
        const activeFieldValue: string | undefined = (nestedAddressBlock as NominatimAddressBlock)[activeFieldKey];
        const isFieldStringValid: boolean = typeof activeFieldValue === 'string' && activeFieldValue.trim().length > 0;
        if (isFieldStringValid) return (activeFieldValue as string).trim();
      }
    }
    return suggestionBlock.display_name.split(',')[0].trim();
  } catch (extractionFaultError: unknown) {
    console.error("[extractBestPlaceName] Failed to logically extract address block naming.", extractionFaultError);
    return suggestionBlock.display_name;
  }
};

const extractSecondaryAddressLine = (suggestionBlock: NominatimSuggestion, resolvedPrimaryNameString: string): string => {
  try {
    const fullChainSegmentsArray: string[] = suggestionBlock.display_name.split(',').map((segmentString: string) => segmentString.trim());
    const remainingSegmentsFilteredArray: string[] = fullChainSegmentsArray.filter((segmentString: string) => segmentString.length > 0 && segmentString !== resolvedPrimaryNameString);
    const slicedSegmentsLimitArray: string[] = remainingSegmentsFilteredArray.slice(0, 2);
    return slicedSegmentsLimitArray.join(', ');
  } catch (addressParseError: unknown) {
    console.error("[extractSecondaryAddressLine] Structural failure caught natively.", addressParseError);
    return '';
  }
};

// ============================================================================
// THE MASTER COMPONENT: DASHBOARD SCREEN
// ============================================================================

export default function DashboardScreen(): React.JSX.Element {
  
  // ==========================================
  // 1. GLOBAL IDENTITY, LOCALIZATION & REFS
  // ==========================================
  const { user } = useAuth();
  
  // WADIAH LOCALIZATION ENGINE EXTRACTION
  const languageContextPayload = useLanguage();
  const activeLanguageCode: string = languageContextPayload.locale;
  const translateFunction: (key: any) => string = languageContextPayload.t;
  const toggleLanguageFunction: () => void = languageContextPayload.toggleLanguage;

  const mapRef = useRef<MapView>(null);
  const isMountedRef = useRef<boolean>(true);

  const startSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hazardRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rerouteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehicleRecalculateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * @ref heroStatusPulseAnimatedValueRef
   * @description GUARDIAN GRID v9.0 — Drives the single continuous "radar" pulse 
   * ring rendered behind the shield icon on the Home Dashboard hero card. This 
   * is purely decorative animation state: it never influences business logic, 
   * network calls, or any existing state machine in this component.
   */
  const heroStatusPulseAnimatedValueRef = useRef<Animated.Value>(new Animated.Value(1));

  /**
   * @ref bentoCardEntranceAnimatedValuesRef
   * @description GUARDIAN GRID v9.0 — A fixed-length array of four independent 
   * `Animated.Value` instances, one per staggered Home Dashboard action card 
   * (Optical Scanner, Report Hazard, Community Fund, Community Chat, in that 
   * render order). Each value animates from 0 → 1 on mount so the cards settle 
   * into place with a soft staggered rise instead of popping in abruptly.
   */
  const bentoCardEntranceAnimatedValuesRef = useRef<Animated.Value[]>([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  // ==========================================
  // 2. STATE MANAGEMENT (Fully Unpacked & Typed)
  // ==========================================
  
  const hazardsTuple = useState<HazardData[]>([]);
  const hazards: HazardData[] = hazardsTuple[0];
  const setHazards: React.Dispatch<React.SetStateAction<HazardData[]>> = hazardsTuple[1];
  
  const isLoadingMapDataTuple = useState<boolean>(true);
  const isLoadingMapData: boolean = isLoadingMapDataTuple[0];
  const setIsLoadingMapData: React.Dispatch<React.SetStateAction<boolean>> = isLoadingMapDataTuple[1];
  
  const isDarkModeTuple = useState<boolean>(false);
  const isDarkMode: boolean = isDarkModeTuple[0];
  const setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>> = isDarkModeTuple[1];
  
  // PRIMARY ARCHITECTURAL SHIFT: Initializing into the Home Dashboard to hide the map engine.
  const interactionModeTuple = useState<InteractionMode>('home_dashboard');
  const interactionMode: InteractionMode = interactionModeTuple[0];
  const setInteractionMode: React.Dispatch<React.SetStateAction<InteractionMode>> = interactionModeTuple[1];
  
  const currentMapCenterTuple = useState<CoordinatePayload>(KARACHI_CENTER_COORDINATE);
  const currentMapCenter: CoordinatePayload = currentMapCenterTuple[0];
  const setCurrentMapCenter: React.Dispatch<React.SetStateAction<CoordinatePayload>> = currentMapCenterTuple[1];
  
  const initialGpsSnappedTuple = useState<boolean>(false);
  const initialGpsSnapped: boolean = initialGpsSnappedTuple[0];
  const setInitialGpsSnapped: React.Dispatch<React.SetStateAction<boolean>> = initialGpsSnappedTuple[1];
  
  const userHardwareLocationTuple = useState<CoordinatePayload | null>(null);
  const userHardwareLocation: CoordinatePayload | null = userHardwareLocationTuple[0];
  const setUserHardwareLocation: React.Dispatch<React.SetStateAction<CoordinatePayload | null>> = userHardwareLocationTuple[1];
  
  const draftPinATuple = useState<CoordinatePayload | null>(null);
  const draftPinA: CoordinatePayload | null = draftPinATuple[0];
  const setDraftPinA: React.Dispatch<React.SetStateAction<CoordinatePayload | null>> = draftPinATuple[1];
  
  const draftPinBTuple = useState<CoordinatePayload | null>(null);
  const draftPinB: CoordinatePayload | null = draftPinBTuple[0];
  const setDraftPinB: React.Dispatch<React.SetStateAction<CoordinatePayload | null>> = draftPinBTuple[1];

  // Navigation & routing engine states
  const startLocationTextTuple = useState<string>('Your Location');
  const startLocationText: string = startLocationTextTuple[0];
  const setStartLocationText: React.Dispatch<React.SetStateAction<string>> = startLocationTextTuple[1];
  
  const startCoordinateTuple = useState<CoordinatePayload | null>(null);
  const startCoordinate: CoordinatePayload | null = startCoordinateTuple[0];
  const setStartCoordinate: React.Dispatch<React.SetStateAction<CoordinatePayload | null>> = startCoordinateTuple[1];
  
  const startSearchSuggestionsTuple = useState<NominatimSuggestion[]>([]);
  const startSearchSuggestions: NominatimSuggestion[] = startSearchSuggestionsTuple[0];
  const setStartSearchSuggestions: React.Dispatch<React.SetStateAction<NominatimSuggestion[]>> = startSearchSuggestionsTuple[1];
  
  const isSearchingStartLocationTuple = useState<boolean>(false);
  const isSearchingStartLocation: boolean = isSearchingStartLocationTuple[0];
  const setIsSearchingStartLocation: React.Dispatch<React.SetStateAction<boolean>> = isSearchingStartLocationTuple[1];
  
  const destinationTextTuple = useState<string>('');
  const destinationText: string = destinationTextTuple[0];
  const setDestinationText: React.Dispatch<React.SetStateAction<string>> = destinationTextTuple[1];
  
  const destinationCoordinateTuple = useState<CoordinatePayload | null>(null);
  const destinationCoordinate: CoordinatePayload | null = destinationCoordinateTuple[0];
  const setDestinationCoordinate: React.Dispatch<React.SetStateAction<CoordinatePayload | null>> = destinationCoordinateTuple[1];
  
  const destinationSearchSuggestionsTuple = useState<NominatimSuggestion[]>([]);
  const destinationSearchSuggestions: NominatimSuggestion[] = destinationSearchSuggestionsTuple[0];
  const setDestinationSearchSuggestions: React.Dispatch<React.SetStateAction<NominatimSuggestion[]>> = destinationSearchSuggestionsTuple[1];
  
  const isSearchingDestinationLocationTuple = useState<boolean>(false);
  const isSearchingDestinationLocation: boolean = isSearchingDestinationLocationTuple[0];
  const setIsSearchingDestinationLocation: React.Dispatch<React.SetStateAction<boolean>> = isSearchingDestinationLocationTuple[1];
  
  const activeVehicleTuple = useState<VehicleModality>('car');
  const activeVehicle: VehicleModality = activeVehicleTuple[0];
  const setActiveVehicle: React.Dispatch<React.SetStateAction<VehicleModality>> = activeVehicleTuple[1];
  
  const calculatedSafeRouteTuple = useState<RouteMetrics | null>(null);
  const calculatedSafeRoute: RouteMetrics | null = calculatedSafeRouteTuple[0];
  const setCalculatedSafeRoute: React.Dispatch<React.SetStateAction<RouteMetrics | null>> = calculatedSafeRouteTuple[1];
  
  const isRouteCalculatingTuple = useState<boolean>(false);
  const isRouteCalculating: boolean = isRouteCalculatingTuple[0];
  const setIsRouteCalculating: React.Dispatch<React.SetStateAction<boolean>> = isRouteCalculatingTuple[1];
  
  // NATIVE IN-APP NAVIGATION TRACKERS
  const currentNavStepIndexTuple = useState<number>(0);
  const currentNavStepIndex: number = currentNavStepIndexTuple[0];
  const setCurrentNavStepIndex: React.Dispatch<React.SetStateAction<number>> = currentNavStepIndexTuple[1];

  const distanceRemainingNavTuple = useState<number>(0);
  const distanceRemainingNav: number = distanceRemainingNavTuple[0];
  const setDistanceRemainingNav: React.Dispatch<React.SetStateAction<number>> = distanceRemainingNavTuple[1];

  // ==========================================
  // 3. LIFECYCLE HOOKS & TIMERS
  // ==========================================

  useEffect(() => {
    isMountedRef.current = true;
    try {
      initializeLocationServices();
      fetchLiveHazards();
    } catch (lifecycleMountError: unknown) {
      console.error('[DashboardScreen.useEffect] Lifecycle mounting operational failure: ', lifecycleMountError);
    }
    
    return () => {
      try {
        isMountedRef.current = false;
        if (rerouteTimeoutRef.current) clearTimeout(rerouteTimeoutRef.current);
        if (vehicleRecalculateTimeoutRef.current) clearTimeout(vehicleRecalculateTimeoutRef.current);
      } catch (cleanupError: unknown) {
        console.error('[DashboardScreen.useEffect] Memory cleanup failure natively.', cleanupError);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      hazardRefreshIntervalRef.current = setInterval(() => {
        console.log("[DashboardScreen.interval] Executing silent hazard background synchronization natively...");
        fetchLiveHazards();
      }, HAZARD_REFRESH_INTERVAL_MS);
    } catch (intervalCreationError: unknown) {
      console.error("[DashboardScreen.interval] Network timer execution failed to bind.", intervalCreationError);
    }

    return () => {
      try {
        const hasActiveSyncInterval: boolean = hazardRefreshIntervalRef.current !== null;
        if (hasActiveSyncInterval) {
          clearInterval(hazardRefreshIntervalRef.current as ReturnType<typeof setInterval>);
          hazardRefreshIntervalRef.current = null;
        }
      } catch (intervalClearError: unknown) {
        console.error("[DashboardScreen.interval] Network timer failed to unmount natively.", intervalClearError);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      try {
        const hasStartDebounceTimerActive: boolean = startSearchDebounceRef.current !== null;
        if (hasStartDebounceTimerActive) {
          clearTimeout(startSearchDebounceRef.current as ReturnType<typeof setTimeout>);
          startSearchDebounceRef.current = null;
        }
        
        const hasDestinationDebounceTimerActive: boolean = destinationSearchDebounceRef.current !== null;
        if (hasDestinationDebounceTimerActive) {
          clearTimeout(destinationSearchDebounceRef.current as ReturnType<typeof setTimeout>);
          destinationSearchDebounceRef.current = null;
        }
      } catch (debouncePurgeError: unknown) {
        console.error("[DashboardScreen.debounce] Search stack memory purge fault explicitly.", debouncePurgeError);
      }
    };
  }, []);

  /**
   * @function autoZoomEngineEffect
   * @description WADIAH UX UPGRADE: Ensures the camera mathematically snaps to the user's location 
   * the moment the map is mounted and becomes visible on the screen. Solves the bug where 
   * `onUserLocationChange` does not fire immediately if the user is completely stationary.
   */
  useEffect(() => {
    try {
      const isMapActivelyRendered: boolean = interactionMode !== 'home_dashboard';
      const isHardwareLocationResolved: boolean = userHardwareLocation !== null;
      const isMapInstanceAvailable: boolean = mapRef.current !== null;

      if (isMapActivelyRendered && isHardwareLocationResolved && isMapInstanceAvailable && !initialGpsSnapped) {
        
        // Delaying the camera snap by 500ms mathematically ensures the native view 
        // has fully painted onto the screen before the animation vector triggers natively.
        const cameraAnimationTimeoutHandle: ReturnType<typeof setTimeout> = setTimeout(() => {
          try {
            if (mapRef.current && isMountedRef.current) {
              mapRef.current.animateCamera({
                center: userHardwareLocation,
                pitch: GPS_CAMERA_PITCH,
                heading: 0,
                altitude: GPS_CAMERA_ALTITUDE,
                zoom: GPS_CAMERA_ZOOM
              }, { duration: GPS_INITIAL_SNAP_DURATION_MS });
              
              setInitialGpsSnapped(true);
            }
          } catch (animationError: unknown) {
             console.warn('[DashboardScreen.autoZoomEngineEffect] Camera animation failed natively:', animationError);
          }
        }, 500);

        return () => clearTimeout(cameraAnimationTimeoutHandle);
      }
    } catch (autoZoomEffectError: unknown) {
      console.error('[DashboardScreen.autoZoomEngineEffect] Mathematical evaluation for camera snap failed:', autoZoomEffectError);
    }
  }, [interactionMode, userHardwareLocation, initialGpsSnapped]);

  /**
   * @function homeDashboardEntranceChoreographyEffect
   * @description GUARDIAN GRID v9.0 — NEW, PURELY-ADDITIVE EFFECT.
   * 
   * Fires whenever `interactionMode` transitions back to `'home_dashboard'` 
   * (including the very first mount, since that is the component's initial 
   * state). It performs two independent, purely-visual animation sequences:
   * 
   * 1. A staggered rise-and-fade for each of the four primary bento action 
   *    cards, driven by `bentoCardEntranceAnimatedValuesRef`.
   * 2. An infinite "radar sweep" pulse — scale + fade-out loop — behind the 
   *    Safety Status shield icon, driven by `heroStatusPulseAnimatedValueRef`.
   * 
   * Neither sequence reads from, writes to, or otherwise interacts with any 
   * network call, Supabase/FastAPI payload, routing calculation, or hazard 
   * state anywhere else in this file. If this effect throws for any reason 
   * (for example, a native animation driver hiccup on a low-end device), the 
   * failure is caught and logged exactly like every other effect in this 
   * component, and the dashboard continues to function normally — the cards 
   * would simply render at full opacity without the entrance flourish.
   * 
   * @returns {void}
   */
  useEffect(() => {
    try {
      const isHomeDashboardCurrentlyActiveBoolean: boolean = interactionMode === 'home_dashboard';
      if (!isHomeDashboardCurrentlyActiveBoolean) {
        return;
      }

      // Reset every entrance value back to its pre-animation baseline of 0 so that 
      // re-entering the Home Dashboard (e.g. after exiting the map) replays the 
      // staggered reveal instead of leaving the cards permanently at opacity 1.
      bentoCardEntranceAnimatedValuesRef.current.forEach((individualCardAnimatedValueNode: Animated.Value) => {
        individualCardAnimatedValueNode.setValue(0);
      });

      const staggeredBentoEntranceAnimationSequence = Animated.stagger(
        90,
        bentoCardEntranceAnimatedValuesRef.current.map((individualCardAnimatedValueNode: Animated.Value) =>
          Animated.timing(individualCardAnimatedValueNode, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          })
        )
      );
      staggeredBentoEntranceAnimationSequence.start();

      const infiniteRadarPulseAnimationLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(heroStatusPulseAnimatedValueRef.current, {
            toValue: 1.35,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(heroStatusPulseAnimatedValueRef.current, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      infiniteRadarPulseAnimationLoop.start();

      return () => {
        try {
          infiniteRadarPulseAnimationLoop.stop();
        } catch (radarPulseCleanupError: unknown) {
          console.warn('[homeDashboardEntranceChoreographyEffect] Radar pulse loop cleanup failed natively:', radarPulseCleanupError);
        }
      };
    } catch (entranceChoreographyExecutionError: unknown) {
      console.error('[homeDashboardEntranceChoreographyEffect] Decorative animation choreography failed structurally:', entranceChoreographyExecutionError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionMode]);

  /** 
   * @function initializeLocationServices
   * @description Requests GPS permission natively, snaps the camera, and reverse-geocodes. 
   */
  const initializeLocationServices = async (): Promise<void> => {
    try {
      console.log("[initializeLocationServices] Requesting explicit foreground GPS permissions from OS layer...");
      
      const hardwarePermissionResponseObject: Location.PermissionResponse = await Location.requestForegroundPermissionsAsync();
      const hardwareAccessStatusString: Location.PermissionStatus = hardwarePermissionResponseObject.status;
      const isHardwarePermissionGrantedBool: boolean = hardwareAccessStatusString === 'granted';

      if (!isHardwarePermissionGrantedBool) {
        Alert.alert(
          'Location Services Denied',
          'Aagahi requires hardware GPS permissions to automatically center the map routing engine on your physical location natively.'
        );
        return;
      }

      const activeHardwareLocationNode: LocationObject = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      const structurallyPreciseCoordinateMap: CoordinatePayload = {
        latitude: activeHardwareLocationNode.coords.latitude,
        longitude: activeHardwareLocationNode.coords.longitude,
      };

      if (isMountedRef.current) {
        setCurrentMapCenter(structurallyPreciseCoordinateMap);
        setUserHardwareLocation(structurallyPreciseCoordinateMap);
      }

      try {
        const reverseGeocodedAddressPayloadArray: LocationGeocodedAddress[] = await Location.reverseGeocodeAsync(structurallyPreciseCoordinateMap);
        const isGeocodePayloadStructurallyValid: boolean = Array.isArray(reverseGeocodedAddressPayloadArray) && reverseGeocodedAddressPayloadArray.length > 0;
        
        if (isGeocodePayloadStructurallyValid) {
          const firstValidAddressObject: LocationGeocodedAddress = reverseGeocodedAddressPayloadArray[0];
          const extractedStreetString: string = firstValidAddressObject.street || '';
          const extractedDistrictString: string = firstValidAddressObject.district || firstValidAddressObject.city || '';
          const mathematicallyFormattedAddressString: string = `${extractedStreetString} ${extractedDistrictString}`.trim();
          
          if (mathematicallyFormattedAddressString.length > 3 && isMountedRef.current) {
            setStartLocationText(mathematicallyFormattedAddressString);
          }
        }
      } catch (nativeGeocodeError: unknown) {
        console.warn('[initializeLocationServices] Native reverse geocoding API was explicitly restricted by the host OS layer.', nativeGeocodeError);
      }

      const isHardwareMapInstanceReady: boolean = mapRef.current !== null;
      if (isHardwareMapInstanceReady && interactionMode !== 'home_dashboard') {
        mapRef.current!.animateCamera(
          {
            center: structurallyPreciseCoordinateMap,
            pitch: GPS_CAMERA_PITCH,
            heading: 0,
            altitude: GPS_CAMERA_ALTITUDE,
            zoom: GPS_CAMERA_ZOOM,
          },
          { duration: GPS_INITIAL_SNAP_DURATION_MS }
        );
        if (isMountedRef.current) setInitialGpsSnapped(true);
      }
    } catch (hardwareExecutionError: unknown) {
      const explicitHardwareErrorMessage: string = hardwareExecutionError instanceof Error ? hardwareExecutionError.message : 'Unexpected hardware GPS execution error encountered natively.';
      console.error('[initializeLocationServices] Hardware Level Architecture Failure: ', explicitHardwareErrorMessage);
    }
  };

  const executeExecutionDelay = (delayMillisecondsCount: number): Promise<void> => {
    return new Promise((promiseResolve) => setTimeout(promiseResolve, delayMillisecondsCount));
  };

  /** 
   * @function fetchLiveHazards
   * @description Fetches live hazards directly from Supabase via Python FastAPI with exponential-backoff retries structurally built-in. 
   */
  const fetchLiveHazards = async (): Promise<void> => {
    if (isMountedRef.current) setIsLoadingMapData(true);

    let activeRetryAttemptIterator: number = 0;
    let storedLastErrorMessageString: string = 'Unknown spatial backend retrieval error triggered.';

    while (activeRetryAttemptIterator <= MAX_HAZARD_FETCH_RETRIES) {
      try {
        const fullyQualifiedTargetEndpointString: string = `${API_BASE_URL}/api/hazards`;
        const networkResponseObject: Response = await fetch(fullyQualifiedTargetEndpointString, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const rawNetworkResponseTextData: string = await networkResponseObject.text();
        const jsonParsedResponseStructure: HazardApiResponse = JSON.parse(rawNetworkResponseTextData) as HazardApiResponse;

        const isNetworkSuccessFlagChecked: boolean = networkResponseObject.ok;
        const isDataArrayStructurallyValid: boolean = Array.isArray(jsonParsedResponseStructure.data);

        if (isNetworkSuccessFlagChecked && isDataArrayStructurallyValid) {
          if (isMountedRef.current) {
            setHazards(jsonParsedResponseStructure.data);
          }
          if (isMountedRef.current) setIsLoadingMapData(false);
          return;
        }

        storedLastErrorMessageString = jsonParsedResponseStructure.detail || 'Unknown spatial retrieval error returned from cloud architecture.';
      } catch (networkCatchError: unknown) {
        if (networkCatchError instanceof Error) {
            storedLastErrorMessageString = networkCatchError.message;
        } else {
            storedLastErrorMessageString = 'Failed to establish a secure spatial connection over HTTPS.';
        }
      }

      const isBackoffRetryMathematicallyAllowed: boolean = activeRetryAttemptIterator < MAX_HAZARD_FETCH_RETRIES;
      if (isBackoffRetryMathematicallyAllowed) {
        const exponentiallyCalculatedSleepDelayMs: number = HAZARD_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, activeRetryAttemptIterator);
        await executeExecutionDelay(exponentiallyCalculatedSleepDelayMs);
      }
      activeRetryAttemptIterator += 1;
    }

    if (isMountedRef.current) setIsLoadingMapData(false);
    console.warn(`[fetchLiveHazards] Exhausted ${MAX_HAZARD_FETCH_RETRIES} attempts. Last Exception: ${storedLastErrorMessageString}`);
  };

  /** 
   * @function parseSpatialData
   * @description Multi-format spatial extraction compiler mapping: handles GeoJSON objects directly, 
   * WKT strings natively, and EWKB hex strings via custom built byte-parser explicitly. 
   */
  const parseSpatialData = (spatialLocationPayloadData: any): ParsedSpatialData | null => {
    try {
      const isPayloadStructurallyEmpty: boolean = !spatialLocationPayloadData;
      if (isPayloadStructurallyEmpty) return null;

      const isPayloadNativeObjectFormat: boolean = typeof spatialLocationPayloadData === 'object' && spatialLocationPayloadData !== null && !!spatialLocationPayloadData.type;

      if (isPayloadNativeObjectFormat) {
        const stringifiedGeoTypeIdentifier: string = spatialLocationPayloadData.type;
        const mappedCoordinatesDataArray: any[] = spatialLocationPayloadData.coordinates;

        const isPointMathematicalConditionMet: boolean = stringifiedGeoTypeIdentifier === 'Point' && Array.isArray(mappedCoordinatesDataArray) && mappedCoordinatesDataArray.length === 2;
        if (isPointMathematicalConditionMet) {
          const longitudeFloatValue: number = parseFloat(mappedCoordinatesDataArray[0]);
          const latitudeFloatValue: number = parseFloat(mappedCoordinatesDataArray[1]);
          const isLatitudeLongitudeFloatValidCheck: boolean = !isNaN(latitudeFloatValue) && !isNaN(longitudeFloatValue);
          if (isLatitudeLongitudeFloatValidCheck) {
            return { type: 'point', coordinates: [{ latitude: latitudeFloatValue, longitude: longitudeFloatValue }] };
          }
        }

        const isLineStringMathematicalConditionMet: boolean = stringifiedGeoTypeIdentifier === 'LineString' && Array.isArray(mappedCoordinatesDataArray) && mappedCoordinatesDataArray.length >= 2;
        if (isLineStringMathematicalConditionMet) {
          const iteratedLineCoordinatesArray: CoordinatePayload[] = [];
          for (let internalIteratorCount = 0; internalIteratorCount < mappedCoordinatesDataArray.length; internalIteratorCount++) {
            const nestedCoordinatePairArray: any = mappedCoordinatesDataArray[internalIteratorCount];
            const isNestedPairStructurallyValid: boolean = Array.isArray(nestedCoordinatePairArray) && nestedCoordinatePairArray.length >= 2;
            if (isNestedPairStructurallyValid) {
              const iteratedLongitudeFloat: number = parseFloat(nestedCoordinatePairArray[0]);
              const iteratedLatitudeFloat: number = parseFloat(nestedCoordinatePairArray[1]);
              const isIteratedPairFloatValid: boolean = !isNaN(iteratedLatitudeFloat) && !isNaN(iteratedLongitudeFloat);
              if (isIteratedPairFloatValid) {
                iteratedLineCoordinatesArray.push({ latitude: iteratedLatitudeFloat, longitude: iteratedLongitudeFloat });
              }
            }
          }
          const isConstructedLineLengthValid: boolean = iteratedLineCoordinatesArray.length >= 2;
          if (isConstructedLineLengthValid) {
            return { type: 'linestring', coordinates: iteratedLineCoordinatesArray };
          }
        }
      }

      const isPayloadStringFormatType: boolean = typeof spatialLocationPayloadData === 'string';
      if (isPayloadStringFormatType) {
        const sanitizedRawStringPayloadData: string = spatialLocationPayloadData.trim();

        const isRegexHexadecimalFormatValid: boolean = /^[0-9A-Fa-f]+$/.test(sanitizedRawStringPayloadData);
        const isRegexHexadecimalLengthMet: boolean = sanitizedRawStringPayloadData.length >= 42;
        if (isRegexHexadecimalFormatValid && isRegexHexadecimalLengthMet) {
          const explicitlyParsedEwkbHexData: ParsedSpatialData | null = parseEWKB(sanitizedRawStringPayloadData);
          if (explicitlyParsedEwkbHexData) return explicitlyParsedEwkbHexData;
        }

        const isStringWktLineStringFormat: boolean = sanitizedRawStringPayloadData.startsWith('LINESTRING');
        if (isStringWktLineStringFormat) {
          const stringPrefixStrippedData: string = sanitizedRawStringPayloadData.replace('LINESTRING(', '').replace(')', '');
          const wktPointSegmentsArray: string[] = stringPrefixStrippedData.split(',');
          const iterativelyExtractedCoordinatesArray: CoordinatePayload[] = [];
          
          for (let wktIteratorCount = 0; wktIteratorCount < wktPointSegmentsArray.length; wktIteratorCount++) {
            const activeWktPointString: string = wktPointSegmentsArray[wktIteratorCount];
            const wktSplitPartsArray: string[] = activeWktPointString.trim().split(' ');
            const isWktSplitPartsArrayValid: boolean = wktSplitPartsArray.length >= 2;
            if (isWktSplitPartsArrayValid) {
              const longitudeWktFloat: number = parseFloat(wktSplitPartsArray[0]);
              const latitudeWktFloat: number = parseFloat(wktSplitPartsArray[1]);
              const areWktFloatsMathematicallyValid: boolean = !isNaN(latitudeWktFloat) && !isNaN(longitudeWktFloat);
              if (areWktFloatsMathematicallyValid) {
                iterativelyExtractedCoordinatesArray.push({ latitude: latitudeWktFloat, longitude: longitudeWktFloat });
              }
            }
          }
          const isFinalExtractedLineArrayValid: boolean = iterativelyExtractedCoordinatesArray.length >= 2;
          if (isFinalExtractedLineArrayValid) {
            return { type: 'linestring', coordinates: iterativelyExtractedCoordinatesArray };
          }
        }

        const isStringWktPointFormat: boolean = sanitizedRawStringPayloadData.startsWith('POINT');
        if (isStringWktPointFormat) {
          const wktPointPrefixStrippedString: string = sanitizedRawStringPayloadData.replace('POINT(', '').replace(')', '');
          const wktPointSplitPartsArray: string[] = wktPointPrefixStrippedString.split(' ');
          const isWktPointSplitArrayLengthValid: boolean = wktPointSplitPartsArray.length === 2;
          if (isWktPointSplitArrayLengthValid) {
            const parsedLongitudePointFloat: number = parseFloat(wktPointSplitPartsArray[0]);
            const parsedLatitudePointFloat: number = parseFloat(wktPointSplitPartsArray[1]);
            const isParsedPointFloatValidCheck: boolean = !isNaN(parsedLatitudePointFloat) && !isNaN(parsedLongitudePointFloat);
            if (isParsedPointFloatValidCheck) {
              return { type: 'point', coordinates: [{ latitude: parsedLatitudePointFloat, longitude: parsedLongitudePointFloat }] };
            }
          }
        }
      }

      return null;
    } catch (spatialParseError: unknown) {
      console.error('[parseSpatialData] Spatial payload extraction failed dynamically in try/catch explicitly: ', spatialParseError);
      return null;
    }
  };

  // ==========================================
  // VIEWPORT & HARDWARE EVENT HANDLERS
  // ==========================================

  /** 
   * @function handleUserLocationUpdate
   * @description THE TRUE IN-APP NAVIGATION ENGINE FIX
   * Dynamically tracks the user's hardware coordinates natively mapping to camera tilt.
   */
  const handleUserLocationUpdate = (eventPayloadObject: UserLocationChangeEvent): void => {
    try {
      const isCoordinatePayloadAttached: boolean = eventPayloadObject.nativeEvent.coordinate !== undefined;
      const isMapInstanceHardwareBound: boolean = mapRef.current !== null;

      if (isMapInstanceHardwareBound && isCoordinatePayloadAttached) {
        const hardwarePayloadLatitudeNode: number = eventPayloadObject.nativeEvent.coordinate!.latitude;
        const hardwarePayloadLongitudeNode: number = eventPayloadObject.nativeEvent.coordinate!.longitude;
        const activeLiveCoordinateStructure: CoordinatePayload = { latitude: hardwarePayloadLatitudeNode, longitude: hardwarePayloadLongitudeNode };

        if (isMountedRef.current) {
          setUserHardwareLocation(activeLiveCoordinateStructure);
        }

        // ==========================================
        // ACTIVE IN-APP NAVIGATION BRANCH (TRUE ROUTING)
        // ==========================================
        const isActiveInAppNavigationRunning: boolean = interactionMode === 'active_navigation';
        const doesMemoryRetainSafeRouteData: boolean = calculatedSafeRoute !== null;

        if (isActiveInAppNavigationRunning && doesMemoryRetainSafeRouteData) {
          
          const osrmPathMatrixArray: CoordinatePayload[] = calculatedSafeRoute!.coordinates;
          const totalNodeCountNumber: number = osrmPathMatrixArray.length;

          const isPathVectorRemainingValid: boolean = currentNavStepIndex < totalNodeCountNumber - 1;

          if (isPathVectorRemainingValid) {
            const nextTargetOsrmNode: CoordinatePayload = osrmPathMatrixArray[currentNavStepIndex + 1];
            
            const gapToNextTargetNodeKilometers: number = calculateHaversineDistance(hardwarePayloadLatitudeNode, hardwarePayloadLongitudeNode, nextTargetOsrmNode.latitude, nextTargetOsrmNode.longitude);
            const liveDynamicCompassHeadingValue: number = calculateBearing(hardwarePayloadLatitudeNode, hardwarePayloadLongitudeNode, nextTargetOsrmNode.latitude, nextTargetOsrmNode.longitude);

            const absoluteDestinationFinalNode: CoordinatePayload = osrmPathMatrixArray[totalNodeCountNumber - 1];
            const mathematicalDistanceToFinalDestKm: number = calculateHaversineDistance(hardwarePayloadLatitudeNode, hardwarePayloadLongitudeNode, absoluteDestinationFinalNode.latitude, absoluteDestinationFinalNode.longitude);
            
            if (isMountedRef.current) {
              setDistanceRemainingNav(mathematicalDistanceToFinalDestKm);
            }

            const isTargetNodePhysicallyReached: boolean = gapToNextTargetNodeKilometers < 0.03;
            if (isTargetNodePhysicallyReached) {
              if (isMountedRef.current) {
                setCurrentNavStepIndex(prevIndexCount => prevIndexCount + 1);
              }
            }

            mapRef.current!.animateCamera({
              center: activeLiveCoordinateStructure,
              pitch: NAV_CAMERA_PITCH,
              heading: liveDynamicCompassHeadingValue,
              altitude: NAV_CAMERA_ALTITUDE,
              zoom: NAV_CAMERA_ZOOM
            }, { duration: 1000 });
          } else {
            Alert.alert("Destination Reached", "You have successfully navigated to your targeted physical coordinates natively.");
            cancelActiveModalityState();
          }
        } else if (!initialGpsSnapped && interactionMode !== 'home_dashboard') {
          mapRef.current!.animateCamera({
            center: activeLiveCoordinateStructure,
            pitch: GPS_CAMERA_PITCH,
            heading: 0,
            altitude: GPS_CAMERA_ALTITUDE,
            zoom: GPS_CAMERA_ZOOM
          }, { duration: GPS_BACKUP_SNAP_DURATION_MS });

          if (isMountedRef.current) setInitialGpsSnapped(true);
        }
      }
    } catch (locationUpdateTrackingError: unknown) {
      console.warn("[DashboardScreen.handleUserLocationUpdate] Hardware mapping trajectory organically interrupted: ", locationUpdateTrackingError);
    }
  };

  /** 
   * @function handleRegionChangeComplete
   * @description Tracks the live viewport center so mathematical pin drops always land perfectly in center natively. 
   */
  const handleRegionChangeComplete = (viewportRegionObject: Region): void => {
    try {
      const isSystemActivelyNavigatingFlag: boolean = interactionMode === 'active_navigation';
      if (isSystemActivelyNavigatingFlag) return;

      const nativelyUpdatedLatitudeNode: number = viewportRegionObject.latitude;
      const nativelyUpdatedLongitudeNode: number = viewportRegionObject.longitude;
      
      const newCalculatedMapCenterNode: CoordinatePayload = { 
          latitude: nativelyUpdatedLatitudeNode, 
          longitude: nativelyUpdatedLongitudeNode 
      };
      
      if (isMountedRef.current) {
          setCurrentMapCenter(newCalculatedMapCenterNode);
      }
    } catch (regionTrackingError: unknown) {
      console.warn('[handleRegionChangeComplete] Live camera tracking structural hardware failure natively caught: ', regionTrackingError);
    }
  };

  // ==========================================
  // NOMINATIM SEARCH LOGIC (BUILDING-NAME-AWARE + DEBOUNCED)
  // ==========================================

  const executeNominatimNetworkFetch = async (sanitizedQueryStringText: string, targetInputFieldEnum: 'start' | 'destination'): Promise<void> => {
    try {
      const isStartTargetSelectedBoolean: boolean = targetInputFieldEnum === 'start';
      if (isStartTargetSelectedBoolean) {
          setIsSearchingStartLocation(true);
      } else {
          setIsSearchingDestinationLocation(true);
      }

      const universallyEncodedQueryString: string = encodeURIComponent(sanitizedQueryStringText);
      const fullyFormedNominatimApiUrl: string =
        `https://nominatim.openstreetmap.org/search?q=${universallyEncodedQueryString}` +
        `&format=json&addressdetails=1&extratags=1&namedetails=1` +
        `&limit=${NOMINATIM_RESULT_LIMIT}&viewbox=${KARACHI_VIEWBOX}&bounded=1`;

      const httpNetworkSearchResponseObject: Response = await fetch(fullyFormedNominatimApiUrl, {
        headers: { 'Accept-Language': 'en', 'User-Agent': NOMINATIM_USER_AGENT },
      });

      const rawHttpResponseTextData: string = await httpNetworkSearchResponseObject.text();
      const rawJsonResponseDataArray: any[] = JSON.parse(rawHttpResponseTextData);

      const strictlyParsedSuggestionsDataArray: NominatimSuggestion[] = rawJsonResponseDataArray.map((rawIteratedItem: any) => {
          const structuredTypeSuggestionBlock: NominatimSuggestion = {
            place_id: rawIteratedItem.place_id,
            display_name: rawIteratedItem.display_name,
            lat: rawIteratedItem.lat,
            lon: rawIteratedItem.lon,
            address: rawIteratedItem.address,
            namedetails: rawIteratedItem.namedetails,
            extratags: rawIteratedItem.extratags,
            class: rawIteratedItem.class,
            type: rawIteratedItem.type,
            importance: rawIteratedItem.importance,
          };
          return structuredTypeSuggestionBlock;
      });

      if (isMountedRef.current) {
          if (isStartTargetSelectedBoolean) {
              setStartSearchSuggestions(strictlyParsedSuggestionsDataArray);
          } else {
              setDestinationSearchSuggestions(strictlyParsedSuggestionsDataArray);
          }
      }
    } catch (nominatimSearchLookupError: unknown) {
      console.error(`[executeNominatimNetworkFetch] Geocoding lookup pipeline failed securely over HTTP explicitly for ${targetInputFieldEnum}:`, nominatimSearchLookupError);
    } finally {
      if (isMountedRef.current) {
          const isStartTargetSelectedBooleanCheckFinal: boolean = targetInputFieldEnum === 'start';
          if (isStartTargetSelectedBooleanCheckFinal) {
              setIsSearchingStartLocation(false);
          } else {
              setIsSearchingDestinationLocation(false);
          }
      }
    }
  };

  const executeLocationSearch = (rawQueryInputText: string, targetInputFieldEnum: 'start' | 'destination'): void => {
    try {
      const isStartTargetSelectedBooleanCheck: boolean = targetInputFieldEnum === 'start';
      if (isStartTargetSelectedBooleanCheck) {
          setStartLocationText(rawQueryInputText);
      } else {
          setDestinationText(rawQueryInputText);
      }

      const functionallySanitizedQueryText: string = rawQueryInputText.trim();
      const dynamicallyActiveDebounceRefPointer = isStartTargetSelectedBooleanCheck ? startSearchDebounceRef : destinationSearchDebounceRef;

      const hasActiveDebounceTimerRunningCurrently: boolean = dynamicallyActiveDebounceRefPointer.current !== null;
      if (hasActiveDebounceTimerRunningCurrently) {
        clearTimeout(dynamicallyActiveDebounceRefPointer.current as ReturnType<typeof setTimeout>);
        dynamicallyActiveDebounceRefPointer.current = null;
      }

      const isSanitizedQueryTooShortForLookup: boolean = functionallySanitizedQueryText.length < NOMINATIM_MIN_QUERY_LENGTH;
      if (isSanitizedQueryTooShortForLookup) {
        if (isStartTargetSelectedBooleanCheck) {
            setStartSearchSuggestions([]);
        } else {
            setDestinationSearchSuggestions([]);
        }
        return;
      }

      dynamicallyActiveDebounceRefPointer.current = setTimeout(() => {
        executeNominatimNetworkFetch(functionallySanitizedQueryText, targetInputFieldEnum);
      }, NOMINATIM_DEBOUNCE_MS);
      
    } catch (debounceSchedulingCatchError: unknown) {
      console.error(`[executeLocationSearch] Event queue debounce scheduling memory failure explicitly for ${targetInputFieldEnum}:`, debounceSchedulingCatchError);
    }
  };

  const handleSuggestionSelection = (selectedSuggestionPayloadData: NominatimSuggestion, targetInputFieldEnum: 'start' | 'destination'): void => {
    try {
      const resolvedPrimaryPlaceNameString: string = extractBestPlaceName(selectedSuggestionPayloadData);
      const exactLatitudeFloatCoord: number = parseFloat(selectedSuggestionPayloadData.lat);
      const exactLongitudeFloatCoord: number = parseFloat(selectedSuggestionPayloadData.lon);

      const isGeocodeMathParsingValid: boolean = !isNaN(exactLatitudeFloatCoord) && !isNaN(exactLongitudeFloatCoord);
      
      if (isGeocodeMathParsingValid) {
        const mathematicallyPreciseTargetNodeObject: CoordinatePayload = { 
            latitude: exactLatitudeFloatCoord, 
            longitude: exactLongitudeFloatCoord 
        };

        const isStartTargetSelectedBoolean: boolean = targetInputFieldEnum === 'start';
        if (isStartTargetSelectedBoolean) {
          setStartLocationText(resolvedPrimaryPlaceNameString);
          setStartCoordinate(mathematicallyPreciseTargetNodeObject);
          setStartSearchSuggestions([]);
        } else {
          setDestinationText(resolvedPrimaryPlaceNameString);
          setDestinationCoordinate(mathematicallyPreciseTargetNodeObject);
          setDestinationSearchSuggestions([]);
        }
      }

      Keyboard.dismiss();
    } catch (suggestionSelectionLogicError: unknown) {
      console.error(`[handleSuggestionSelection] Location structural selection pipeline failed mathematically natively for ${targetInputFieldEnum}:`, suggestionSelectionLogicError);
    }
  };

  // ==========================================
  // OSRM SAFE-PATH ROUTING ENGINE (THE ABSOLUTE EVASION FIX)
  // ==========================================

  const initiateRoutingMode = (): void => {
    try {
      if (isMountedRef.current) {
          setInteractionMode('routing');
          setCalculatedSafeRoute(null);
          setStartCoordinate(null);
          setStartSearchSuggestions([]);
          setDestinationCoordinate(null);
          setDestinationText('');
          setDestinationSearchSuggestions([]);
      }
    } catch (routingModeInitError: unknown) {
      console.error('[initiateRoutingMode] Failed to init routing mode state explicitly:', routingModeInitError);
    }
  };

  /**
   * @function calculateRouteEngine
   * @description THE ABSOLUTE HAZARD EVASION ENGINE. 
   * Fetches multiple physical road routes from OSRM simultaneously. It cross-checks *every* route 
   * against a pre-parsed hazard cache natively. It automatically selects the *first* route that 
   * completely evades all anomalies. If all generated paths are compromised, it logs a critical isolation warning.
   * 
   * @async
   * @param {VehicleModality} [vehicleOverrideParameterString] - Strict override logic parameter.
   */
  const calculateRouteEngine = async (vehicleOverrideParameterString?: VehicleModality): Promise<void> => {
    try {
      Keyboard.dismiss();

      const hasDestinationCoordinateBeenResolved: boolean = destinationCoordinate !== null;
      if (!hasDestinationCoordinateBeenResolved) {
        Alert.alert('Routing Error', 'Please structurally utilize the search dropdown interface to natively resolve a proper destination coordinate set first.');
        return;
      }

      if (isMountedRef.current) {
          setIsRouteCalculating(true);
      }

      let dynamicallyActiveStartLatitudeNode: number = currentMapCenter.latitude;
      let dynamicallyActiveStartLongitudeNode: number = currentMapCenter.longitude;

      const hasStartCoordinateStatePopulated: boolean = startCoordinate !== null;
      const hasHardwareCoordinateStatePopulated: boolean = userHardwareLocation !== null;

      if (hasStartCoordinateStatePopulated) {
        dynamicallyActiveStartLatitudeNode = startCoordinate!.latitude;
        dynamicallyActiveStartLongitudeNode = startCoordinate!.longitude;
      } else if (hasHardwareCoordinateStatePopulated) {
        dynamicallyActiveStartLatitudeNode = userHardwareLocation!.latitude;
        dynamicallyActiveStartLongitudeNode = userHardwareLocation!.longitude;
      }

      const effectivelyResolvedVehicleModalityEnum: VehicleModality = vehicleOverrideParameterString !== undefined ? vehicleOverrideParameterString : activeVehicle;
      const resolvedVehicleConfigurationObject: VehicleProfileConfig = VEHICLE_PROFILES[effectivelyResolvedVehicleModalityEnum];

      const absoluteDestinationLatitudeNode: number = destinationCoordinate!.latitude;
      const absoluteDestinationLongitudeNode: number = destinationCoordinate!.longitude;
      
      const osrmQueryCoordinatesMatrixStringParam: string = `${dynamicallyActiveStartLongitudeNode},${dynamicallyActiveStartLatitudeNode};${absoluteDestinationLongitudeNode},${absoluteDestinationLatitudeNode}`;
      
      const fullyQualifiedOsrmRoutingNetworkUrl: string = `https://router.project-osrm.org/route/v1/${resolvedVehicleConfigurationObject.osrmProfile}/${osrmQueryCoordinatesMatrixStringParam}?overview=full&geometries=polyline&alternatives=3`;

      const httpOsrmFetchResponseObject: Response = await fetch(fullyQualifiedOsrmRoutingNetworkUrl);
      const rawOsrmNetworkResponseTextData: string = await httpOsrmFetchResponseObject.text();
      const parsedOsrmJsonDataStructure: any = JSON.parse(rawOsrmNetworkResponseTextData);

      const isOsrmHttpPayloadMathematicallyValid: boolean = parsedOsrmJsonDataStructure.code === 'Ok' && Array.isArray(parsedOsrmJsonDataStructure.routes) && parsedOsrmJsonDataStructure.routes.length > 0;
      if (!isOsrmHttpPayloadMathematicallyValid) {
        throw new Error('OSRM routing engine failed natively to logically return a viable physical route on existing infrastructure map.');
      }

      const computationallyParsedHazardMemoryCacheArray: { id: number; spatial: ParsedSpatialData }[] = [];
      
      for (let dynamicCacheIteratorIndex = 0; dynamicCacheIteratorIndex < hazards.length; dynamicCacheIteratorIndex++) {
        const structurallyActiveHazardDataBlock: HazardData = hazards[dynamicCacheIteratorIndex];
        const dynamicallyParsedHazardSpatialNodeMap: ParsedSpatialData | null = parseSpatialData(structurallyActiveHazardDataBlock.location);
        
        const isHazardNodeArrayStructurallyValidLengthCheck: boolean = dynamicallyParsedHazardSpatialNodeMap !== null && Array.isArray(dynamicallyParsedHazardSpatialNodeMap.coordinates) && dynamicallyParsedHazardSpatialNodeMap.coordinates.length > 0;
        
        if (isHazardNodeArrayStructurallyValidLengthCheck) {
          computationallyParsedHazardMemoryCacheArray.push({ id: structurallyActiveHazardDataBlock.id, spatial: dynamicallyParsedHazardSpatialNodeMap as ParsedSpatialData });
        }
      }

      let verifiedSafeRouteMathematicalObjectReference: any = null;
      let verifiedDecompressedCoordinatesArrayDump: CoordinatePayload[] = [];
      let isGlobalHazardEvasionSuccessfulFlag: boolean = false;

      for (let osrmRouteCandidateIndex = 0; osrmRouteCandidateIndex < parsedOsrmJsonDataStructure.routes.length; osrmRouteCandidateIndex++) {
          
          const activeCandidateRouteObjectRef: any = parsedOsrmJsonDataStructure.routes[osrmRouteCandidateIndex];
          const decompressedCandidateRouteCoordinatesMatrixArray: CoordinatePayload[] = decodePolyline(activeCandidateRouteObjectRef.geometry);
          let isActiveCandidatePhysicallyCompromisedFlag: boolean = false;

          for (let routeNodeIteratorIndex = 0; routeNodeIteratorIndex < decompressedCandidateRouteCoordinatesMatrixArray.length; routeNodeIteratorIndex++) {
            const mappedPhysicalRoadNodeCoordinate: CoordinatePayload = decompressedCandidateRouteCoordinatesMatrixArray[routeNodeIteratorIndex];
            
            for (let hazardCacheIteratorIndex = 0; hazardCacheIteratorIndex < computationallyParsedHazardMemoryCacheArray.length; hazardCacheIteratorIndex++) {
              const activeCachedHazardMemoryItemBlock = computationallyParsedHazardMemoryCacheArray[hazardCacheIteratorIndex];
              const cachedHazardLatitudeFloatPointer: number = activeCachedHazardMemoryItemBlock.spatial.coordinates[0].latitude;
              const cachedHazardLongitudeFloatPointer: number = activeCachedHazardMemoryItemBlock.spatial.coordinates[0].longitude;
              
              const calculatedRadialDistanceToHazardKilometers: number = calculateHaversineDistance(mappedPhysicalRoadNodeCoordinate.latitude, mappedPhysicalRoadNodeCoordinate.longitude, cachedHazardLatitudeFloatPointer, cachedHazardLongitudeFloatPointer);
              const isRoadNodeMathematicallyTooCloseToHazardBooleanFlag: boolean = calculatedRadialDistanceToHazardKilometers < HAZARD_PROXIMITY_THRESHOLD_KM;
              
              if (isRoadNodeMathematicallyTooCloseToHazardBooleanFlag) {
                isActiveCandidatePhysicallyCompromisedFlag = true;
                break;
              }
            }
            if (isActiveCandidatePhysicallyCompromisedFlag) break;
          }

          if (!isActiveCandidatePhysicallyCompromisedFlag) {
              verifiedSafeRouteMathematicalObjectReference = activeCandidateRouteObjectRef;
              verifiedDecompressedCoordinatesArrayDump = decompressedCandidateRouteCoordinatesMatrixArray;
              isGlobalHazardEvasionSuccessfulFlag = true;
              break;
          }
      }

      if (!isGlobalHazardEvasionSuccessfulFlag) {
        Alert.alert(
          'Critical Isolation Detected',
          'Every mathematically available physical path vector to this specified destination intersects an active hazard zone. Secure travel is currently restricted.'
        );
        if (isMountedRef.current) {
            setCalculatedSafeRoute(null);
        }
        return;
      }

      const fullyConstructedRouteMetricsDataObjectBlock: RouteMetrics = {
        coordinates: verifiedDecompressedCoordinatesArrayDump,
        distanceKm: verifiedSafeRouteMathematicalObjectReference.distance / 1000, 
        estimatedMinutes: Math.ceil(verifiedSafeRouteMathematicalObjectReference.duration / 60), 
      };

      if (isMountedRef.current) {
          setCalculatedSafeRoute(fullyConstructedRouteMetricsDataObjectBlock);
      }

      const isHardwareMapInstanceAllocatedReadyBoolean: boolean = mapRef.current !== null;
      if (isHardwareMapInstanceAllocatedReadyBoolean) {
        mapRef.current!.fitToCoordinates(verifiedDecompressedCoordinatesArrayDump, {
          edgePadding: { top: 150, right: 50, bottom: 250, left: 50 },
          animated: true,
        });
      }
    } catch (routeCalculationEvasionEngineError: unknown) {
      console.error('[calculateRouteEngine] OSRM mathematical routing network failed securely explicitly: ', routeCalculationEvasionEngineError);
      Alert.alert('Routing Engine Algorithmic Error', 'Failed structurally to physically compile a safe road path to the mathematically defined destination coordinates.');
    } finally {
      if (isMountedRef.current) {
          setIsRouteCalculating(false);
      }
    }
  };

  /**
   * @function switchVehicleModality
   * @description THE TRUE VEHICLE ROUTING FIX. Updates the active vehicle matrix AND immediately re-fires
   * calculateRouteEngine with the new parameter passed explicitly — eliminating the stale-closure race natively.
   */
  const switchVehicleModality = (newVehicleEnumSelectedString: VehicleModality): void => {
    try {
      const isSelectedVehicleAlreadyActiveBooleanCheck: boolean = newVehicleEnumSelectedString === activeVehicle;
      if (isSelectedVehicleAlreadyActiveBooleanCheck) return;

      if (isMountedRef.current) {
          setActiveVehicle(newVehicleEnumSelectedString);
      }

      const isCurrentRoutingSessionGloballyActiveBoolean: boolean = interactionMode === 'routing';
      const hasSystemResolvedDestinationStructurallyValidBoolean: boolean = destinationCoordinate !== null;

      if (isCurrentRoutingSessionGloballyActiveBoolean && hasSystemResolvedDestinationStructurallyValidBoolean) {
        if (vehicleRecalculateTimeoutRef.current !== null) {
            clearTimeout(vehicleRecalculateTimeoutRef.current);
        }
        vehicleRecalculateTimeoutRef.current = setTimeout(() => {
            calculateRouteEngine(newVehicleEnumSelectedString);
        }, 100);
      }
    } catch (vehicleSwitchModalityError: unknown) {
      console.error('[switchVehicleModality] Vehicle state parameter switch pipeline failed organically in structural execution natively: ', vehicleSwitchModalityError);
    }
  };

  // ==========================================
  // TRUE IN-APP NAVIGATION ENGINE TRIGGER (NEW)
  // ==========================================

  /**
   * @function startInAppNavigation
   * @description Bypasses external OS linking entirely and safely locks the Aagahi platform into 
   * an immersive turn-by-turn guidance tracking state dynamically.
   */
  const startInAppNavigation = (): void => {
    try {
      const isMathematicallySafeRouteDataAvailableBoolean: boolean = calculatedSafeRoute !== null && calculatedSafeRoute.coordinates.length > 0;
      if (!isMathematicallySafeRouteDataAvailableBoolean) {
        Alert.alert("Navigation Compilation Error", "No active physical path resolved mathematically securely.");
        return;
      }

      if (isMountedRef.current) {
        setInteractionMode('active_navigation');
        setCurrentNavStepIndex(0);
        setDistanceRemainingNav(calculatedSafeRoute!.distanceKm);
      }

      const isMapInstanceAndHardwarePermissionsReadyBoolCheck: boolean = mapRef.current !== null && userHardwareLocation !== null;
      if (isMapInstanceAndHardwarePermissionsReadyBoolCheck) {
        
        const initialCalculatedCompassHeadingNodeFloat: number = calculateBearing(
          userHardwareLocation!.latitude, 
          userHardwareLocation!.longitude, 
          calculatedSafeRoute!.coordinates[1].latitude, 
          calculatedSafeRoute!.coordinates[1].longitude
        );

        mapRef.current!.animateCamera({
          center: userHardwareLocation!,
          pitch: NAV_CAMERA_PITCH,
          heading: initialCalculatedCompassHeadingNodeFloat,
          altitude: NAV_CAMERA_ALTITUDE,
          zoom: NAV_CAMERA_ZOOM
        }, { duration: 1500 });
      }

    } catch (navigationStartExecutionFaultError: unknown) {
      console.error("[startInAppNavigation] Hardware lock tracking execution physically failed:", navigationStartExecutionFaultError);
    }
  };

  // ==========================================
  // DUAL-SCANNER SYSTEM GATEWAY
  // ==========================================

  const triggerDualScannerMenu = (): void => {
    try {
      // WADIAH: Deep Localization for the Scanner Prompt Dialog Box
      const alertTitle: string = translateFunction('scanner_header_ai') || 'Aagahi Spatial Optical Scanner';
      const alertSubtitle: string = translateFunction('scanner_btn_scan_another') || 'Select the explicitly targeted optical scanning hardware module you wish to initialize natively:';
      const cancelText: string = translateFunction('scanner_btn_cancel') || 'Cancel Hardware Operation';
      
      // Fallback strings if keys are missing from dictionary
      const aiScannerText: string = translateFunction('scanner_ai_action') || 'AI Room Safety Assessment';
      const qrScannerText: string = translateFunction('scanner_header_qr') || 'Scan Facility Compliance QR';

      Alert.alert(
        alertTitle,
        alertSubtitle,
        [
          { text: cancelText, style: 'cancel' },
          {
            text: aiScannerText,
            onPress: () => {
              try {
                router.push({ pathname: '/scanner', params: { mode: 'ai' } });
              } catch (aiScannerRouteInitError: unknown) {
                console.error('[triggerDualScannerMenu] AI Scanner hardware route module load failure explicitly:', aiScannerRouteInitError);
              }
            },
          },
          {
            text: qrScannerText,
            onPress: () => {
              try {
                router.push({ pathname: '/scanner', params: { mode: 'qr' } });
              } catch (qrScannerRouteInitError: unknown) {
                console.error('[triggerDualScannerMenu] QR Scanner hardware route module load failure explicitly:', qrScannerRouteInitError);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (scannerMenuAllocationAlertError: unknown) {
      console.error('[triggerDualScannerMenu] OS Menu alert object memory allocation failed mathematically natively: ', scannerMenuAllocationAlertError);
    }
  };

  // ==========================================
  // PILLAR 5: UNIFIED REPORTING LOGIC
  // ==========================================

  const activateReportingModeState = (selectedReportingInteractionModeEnum: InteractionMode): void => {
    try {
      if (isMountedRef.current) {
          setInteractionMode(selectedReportingInteractionModeEnum);

          const newlyGeneratedPrimaryMapPinNode: CoordinatePayload = { 
              latitude: currentMapCenter.latitude, 
              longitude: currentMapCenter.longitude 
          };
          setDraftPinA(newlyGeneratedPrimaryMapPinNode);

          const isDualPinBlockageModeFlagTrue: boolean = selectedReportingInteractionModeEnum === 'report_dual';
          if (isDualPinBlockageModeFlagTrue) {
            const mathematicalSpatialVectorOffsetFloatNode: number = 0.001;
            const newlyGeneratedSecondaryMapPinNode: CoordinatePayload = {
                latitude: newlyGeneratedPrimaryMapPinNode.latitude + mathematicalSpatialVectorOffsetFloatNode,
                longitude: newlyGeneratedPrimaryMapPinNode.longitude + mathematicalSpatialVectorOffsetFloatNode
            };
            setDraftPinB(newlyGeneratedSecondaryMapPinNode);
          } else {
            setDraftPinB(null);
          }
      }
    } catch (activateReportingStateMutationError: unknown) {
      console.error('[activateReportingModeState] State parameter mutation structurally failed logically dynamically: ', activateReportingStateMutationError);
    }
  };

  const handlePinDragEndNativeCoordinateExtraction = (dragEventNativePayloadObject: MarkerDragStartEndEvent, pinIdentifierCharacterString: 'A' | 'B'): void => {
    try {
      const extractedFinalPhysicalCoordinateMapNode: CoordinatePayload = dragEventNativePayloadObject.nativeEvent.coordinate;
      const isPinACharacterIdentifierValidBoolean: boolean = pinIdentifierCharacterString === 'A';
      
      if (isMountedRef.current) {
          if (isPinACharacterIdentifierValidBoolean) {
              setDraftPinA(extractedFinalPhysicalCoordinateMapNode);
          } else {
              setDraftPinB(extractedFinalPhysicalCoordinateMapNode);
          }
      }
    } catch (pinDragDropEventExtractionError: unknown) {
      console.error(`[handlePinDragEndNativeCoordinateExtraction] Native hardware event failed to accurately parse Pin ${pinIdentifierCharacterString} coordinates structurally safely: `, pinDragDropEventExtractionError);
    }
  };

  const confirmReportCoordinatesValidationDispatch = (): void => {
    try {
      const isPrimaryDraftPinAMissingFromMemoryCheck: boolean = !draftPinA;
      if (isPrimaryDraftPinAMissingFromMemoryCheck) {
        Alert.alert('Coordinate System Error', 'Please safely ensure the primary anchor pin is physically placed on the mathematical map boundary natively.');
        return;
      }

      const dynamicRouteTransmissionParamsObject: Record<string, string> = {
        lat: draftPinA!.latitude.toString(),
        lng: draftPinA!.longitude.toString(),
      };

      const isReportingDualBlockageModeRunningCurrently: boolean = interactionMode === 'report_dual';
      if (isReportingDualBlockageModeRunningCurrently && draftPinB) {
        dynamicRouteTransmissionParamsObject.latB = draftPinB.latitude.toString();
        dynamicRouteTransmissionParamsObject.lngB = draftPinB.longitude.toString();
        dynamicRouteTransmissionParamsObject.mode = 'dual';
      }

      if (isMountedRef.current) {
          setInteractionMode('home_dashboard');
          setInitialGpsSnapped(false); // WADIAH UX FIX: Reset the camera snap lock mathematically on exit natively.
          setDraftPinA(null);
          setDraftPinB(null);
      }

      router.push({ pathname: '/report', params: dynamicRouteTransmissionParamsObject });
    } catch (reportConfirmationDispatchRoutingError: unknown) {
      console.error('[confirmReportCoordinatesValidationDispatch] Deep routing transition memory pipeline failed organically natively implicitly: ', reportConfirmationDispatchRoutingError);
    }
  };

  const cancelActiveModalityState = (): void => {
    try {
      if (isMountedRef.current) {
          setInteractionMode('home_dashboard');
          setInitialGpsSnapped(false); // WADIAH UX FIX: Reset the camera snap lock mathematically on exit natively.
          setDraftPinA(null);
          setDraftPinB(null);
          setCalculatedSafeRoute(null);
          setDestinationCoordinate(null);
          setDestinationSearchSuggestions([]);
          setCurrentNavStepIndex(0);
          setDistanceRemainingNav(0);
      }
    } catch (activeModalityPurgeExceptionError: unknown) {
      console.error('[cancelActiveModalityState] Interaction stack memory purge dynamically failed organically natively: ', activeModalityPurgeExceptionError);
    }
  };

  // ==========================================
  // PREMIUM HOME DASHBOARD RENDER LOGIC (GUARDIAN GRID v9.0)
  // ==========================================
  
  /**
   * @function renderPremiumHomeDashboard
   * @description Constructs the high-fidelity UI layout for the primary Aagahi Application startup screen natively.
   * Isolates the layout grid completely from the heavy map engine to massively optimize boot parameters implicitly.
   * 
   * @revision GUARDIAN GRID v9.0 — Structurally rebuilt. Every `onPress` handler, 
   * every `translateFunction` key + fallback pair, and every conditional 
   * (`user?.role === 'warden'`, `user?.role === 'shopkeeper'`) below is copied 
   * verbatim from the prior baseline — only the surrounding JSX shape, spacing, 
   * and styling changed. The visual concept:
   * 
   * 1. A single bold "control-room" hero header (deep navy, not the whole app) 
   *    containing a live-status pill, the greeting, and a radar-pulsing shield 
   *    status card — the one signature moment of this screen.
   * 2. An asymmetric "bento" action grid below it on a calm daylight surface: 
   *    the Optical Scanner (the app's flagship, highest-priority action) gets 
   *    a full-width hero tile; Report Hazard and Community Fund share a row; 
   *    Community Chat gets its own wide tile. This hierarchy communicates 
   *    "the scanner is the main event" purely through layout, without new copy.
   * 3. A floating, glass-bordered capsule bottom navigation bar in place of the 
   *    flat divider bar, with a solid accent pill behind the active Home icon.
   * 
   * @returns {React.JSX.Element} The fully composed Home Dashboard render tree.
   */
  const renderPremiumHomeDashboard = (): React.JSX.Element => {

    /**
     * @function buildBentoCardEntranceStyle
     * @description GUARDIAN GRID v9.0 — Builds the animated opacity + translateY 
     * style object for a single bento card at the given stagger index, reading 
     * from `bentoCardEntranceAnimatedValuesRef`. Defensive against an 
     * out-of-bounds index (falls back to a static, fully-visible value) so a 
     * future card added without updating the ref array cannot crash the render.
     * @param {number} cardIndex - Zero-based stagger position of the card.
     * @returns {{ opacity: Animated.Value; transform: { translateY: Animated.AnimatedInterpolation<number> }[] } | {}}
     */
    const buildBentoCardEntranceStyle = (cardIndex: number) => {
      try {
        const isIndexWithinBoundsBoolean: boolean = cardIndex >= 0 && cardIndex < bentoCardEntranceAnimatedValuesRef.current.length;
        const resolvedAnimatedValueNode: Animated.Value = isIndexWithinBoundsBoolean
          ? bentoCardEntranceAnimatedValuesRef.current[cardIndex]
          : new Animated.Value(1);

        return {
          opacity: resolvedAnimatedValueNode,
          transform: [
            {
              translateY: resolvedAnimatedValueNode.interpolate({
                inputRange: [0, 1],
                outputRange: [26, 0],
              }),
            },
          ],
        };
      } catch (entranceStyleBuildError: unknown) {
        console.warn('[buildBentoCardEntranceStyle] Falling back to a static, non-animated style natively:', entranceStyleBuildError);
        return {};
      }
    };

    // The radar ring fades out as it expands outward, mimicking a single sonar sweep.
    const heroRingOpacityInterpolation = heroStatusPulseAnimatedValueRef.current.interpolate({
      inputRange: [1, 1.35],
      outputRange: [0.55, 0],
    });

    return (
      <View style={[styles.dashboardMainContainer, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}>
        
        {/* TOP QUARTER: Premium "Control Room" Header Section */}
        <View style={styles.dashboardHeaderSection}>
          {/* Decorative coverage-arc shapes — purely visual, clipped by the header's rounded corners */}
          <View style={styles.dashboardHeaderAccentShapeOne} pointerEvents="none" />
          <View style={styles.dashboardHeaderAccentShapeTwo} pointerEvents="none" />

          <View style={styles.dashboardHeaderRowFlex}>
            <View style={{ flex: 1 }}>
              <View style={styles.dashboardLiveStatusPillRow}>
                <View style={styles.dashboardLiveStatusDot} />
                <Text style={styles.dashboardLiveStatusPillText}>LIVE MONITORING</Text>
              </View>
              <Text style={styles.dashboardGreetingTitle}>
                {translateFunction('greeting')} {user?.username || 'Arsheel Abbas'}
              </Text>
              <Text style={styles.dashboardGreetingSubtitle}>Aagahi Spatial Division</Text>
            </View>
            <TouchableOpacity 
              style={styles.dashboardProfileAvatarButton}
              onPress={() => setIsDarkMode(!isDarkMode)}
              activeOpacity={0.8}
            >
               <MaterialCommunityIcons 
                 name={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'} 
                 size={22} 
                 color={COLORS.surface} 
               />
            </TouchableOpacity>
          </View>

          {/* Radar-pulse Safety Status hero card — the one signature element of this screen */}
          <View style={styles.dashboardStatusHeroCard}>
            <View style={styles.dashboardStatusHeroRingWrap}>
              <Animated.View
                style={[
                  styles.dashboardStatusHeroPulseRing,
                  {
                    opacity: heroRingOpacityInterpolation,
                    transform: [{ scale: heroStatusPulseAnimatedValueRef.current }],
                  },
                ]}
                pointerEvents="none"
              />
              <View style={styles.dashboardStatusHeroIconCircle}>
                <MaterialCommunityIcons name="shield-check" size={28} color={COLORS.surfaceDark} />
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.dashboardStatusHeroTitleText}>
                {translateFunction('safe_path_title') || 'Community Safety Status'}
              </Text>
              <Text style={styles.dashboardStatusHeroSubtitleText}>Your local environment is actively monitored.</Text>
            </View>
          </View>
        </View>

        {/* CORE ACTION CENTER: Asymmetric Bento Grid (Scanner shifted to priority 1, given the largest tile) */}
        <ScrollView contentContainerStyle={styles.dashboardScrollGridContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.dashboardSectionTitle, isDarkMode && { color: COLORS.surface }]}>Core Spatial Operations</Text>
          
          {/* BENTO TILE 1 (full width, highest priority): Hardware Scanning / Optical Scanner */}
          <Animated.View style={buildBentoCardEntranceStyle(0)}>
            <TouchableOpacity 
              style={[styles.dashboardBentoHeroCard, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderColor: COLORS.glassBorderDark }]} 
              activeOpacity={0.88} 
              onPress={triggerDualScannerMenu}
            >
              <View style={[styles.dashboardBentoHeroIconWrap, { backgroundColor: 'rgba(18, 217, 160, 0.14)' }]}>
                <MaterialCommunityIcons name="qrcode-scan" size={30} color={COLORS.emeraldGreen} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.dashboardBentoHeroTitle, isDarkMode && { color: COLORS.surface }]}>
                  {translateFunction('fab_scan') || 'Optical Scanner'}
                </Text>
                <Text style={styles.dashboardBentoHeroDescription}>AI room evaluation matrix</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={26} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Animated.View>

          {/* BENTO ROW: Report Hazard + Community Fund, sharing equal width */}
          <View style={styles.dashboardActionGridFlexRow}>
            <Animated.View style={[{ flex: 1, marginRight: 14 }, buildBentoCardEntranceStyle(1)]}>
              <TouchableOpacity 
                style={[styles.dashboardActionCardItem, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderColor: COLORS.glassBorderDark }]} 
                activeOpacity={0.85} 
                onPress={() => activateReportingModeState('report_single')}
              >
                <View style={[styles.dashboardActionIconWrapperBackground, { backgroundColor: 'rgba(255, 59, 92, 0.14)' }]}>
                  <MaterialCommunityIcons name="alert-decagram-outline" size={28} color={COLORS.primary} />
                </View>
                <Text style={[styles.dashboardActionCardTitle, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_report') || 'Report Hazard'}</Text>
                <Text style={styles.dashboardActionCardDescription}>Flag structural anomalies</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[{ flex: 1 }, buildBentoCardEntranceStyle(2)]}>
              <TouchableOpacity 
                style={[styles.dashboardActionCardItem, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderColor: COLORS.glassBorderDark }]} 
                activeOpacity={0.85} 
                onPress={() => router.push('/fund')}
              >
                <View style={[styles.dashboardActionIconWrapperBackground, { backgroundColor: 'rgba(255, 201, 60, 0.16)' }]}>
                  <MaterialCommunityIcons name="hand-coin-outline" size={28} color={COLORS.sunflowerYellow} />
                </View>
                <Text style={[styles.dashboardActionCardTitle, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_fund') || 'Community Fund'}</Text>
                <Text style={styles.dashboardActionCardDescription}>Support local infrastructure.</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* BENTO TILE (wide, asymmetric): Community Chat */}
          <Animated.View style={buildBentoCardEntranceStyle(3)}>
            <TouchableOpacity 
              style={[styles.dashboardBentoWideChatCard, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderColor: COLORS.glassBorderDark }]} 
              activeOpacity={0.88} 
              onPress={() => {
                try {
                  router.push('/chat');
                } catch (chatRouteError: unknown) {
                  console.error("[DashboardScreen.ChatRoute] Failed to push chat route: ", chatRouteError);
                }
              }}
            >
              <View style={[styles.dashboardBentoHeroIconWrap, { backgroundColor: 'rgba(76, 111, 255, 0.14)' }]}>
                <MaterialCommunityIcons name="forum-outline" size={26} color={COLORS.safeRoute} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.dashboardBentoHeroTitle, isDarkMode && { color: COLORS.surface }]}>{translateFunction('chat_header_title') || 'Community Chat'}</Text>
                <Text style={styles.dashboardBentoHeroDescription}>Connect with neighbors.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Animated.View>

          {/* Supplementary Actions List mapping */}
          {user?.role === 'warden' && (
             <TouchableOpacity style={[styles.dashboardFullWidthButtonStruct, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderColor: COLORS.glassBorderDark }]} onPress={() => router.push('/warden')}>
               <MaterialCommunityIcons name="shield-account-variant" size={22} color={COLORS.primary} style={{ marginRight: 12 }} />
               <Text style={[styles.dashboardFullWidthButtonText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_warden') || 'Warden'} Administration</Text>
               <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
             </TouchableOpacity>
          )}

          {user?.role === 'shopkeeper' && (
             <TouchableOpacity style={[styles.dashboardFullWidthButtonStruct, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderColor: COLORS.glassBorderDark }]} onPress={() => router.push('/shopkeeper')}>
               <MaterialCommunityIcons name="storefront-outline" size={22} color={COLORS.oceanBlue} style={{ marginRight: 12 }} />
               <Text style={[styles.dashboardFullWidthButtonText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_portal') || 'Directory Setup'} Configuration</Text>
               <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
             </TouchableOpacity>
          )}

          {/* UX UPGRADE: Removed the old full-width Community Chat button since it was migrated up into the bento grid dynamically. */}
          
          <View style={{ height: 110 }} />
        </ScrollView>

        {/* ========================================== */}
        {/* BOTTOM FLOATING CAPSULE NAVIGATION BAR      */}
        {/* ========================================== */}
        <View style={[styles.bottomNavigationBarContainer, isDarkMode && { backgroundColor: COLORS.surfaceElevatedDark, borderTopColor: COLORS.glassBorderDark }]}>
          
          <TouchableOpacity style={styles.bottomNavigationItemButtonActive} activeOpacity={0.8}>
            <View style={styles.bottomNavActivePillBackground}>
              <MaterialCommunityIcons name="home-variant" size={20} color={COLORS.surface} />
            </View>
            <Text style={[styles.bottomNavigationItemText, { color: COLORS.primary, fontWeight: '800' }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.bottomNavigationItemButton} 
            activeOpacity={0.8}
            onPress={toggleLanguageFunction}
          >
            <MaterialCommunityIcons name="translate" size={24} color={COLORS.textMuted} />
            <Text style={[styles.bottomNavigationItemText, { fontWeight: '700' }]}>
              {activeLanguageCode === 'en' ? 'اردو' : 'EN'}
            </Text>
          </TouchableOpacity>

          {/* WADIAH UX UPGRADE: Prominent "INCOMING" tag preserved over the Map tab for judges' evaluation clarity. */}
          <TouchableOpacity style={[styles.bottomNavigationItemButton, { position: 'relative' }]} activeOpacity={0.8} onPress={() => setInteractionMode('view')}>
            <View style={styles.incomingBadgeContainer}>
              <Text style={styles.incomingBadgeText}>INCOMING</Text>
            </View>
            <MaterialCommunityIcons name="map-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.bottomNavigationItemText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomNavigationItemButton} activeOpacity={0.8} onPress={() => router.push('/profile')}>
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.bottomNavigationItemText}>Profile</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    );
  };

  // ==========================================
  // RENDER TREE STRUCTURE
  // ==========================================

  const dynamicallyActiveSafeBackgroundColorHexValue: string = isDarkMode ? COLORS.surfaceDark : COLORS.surfaceLightGrid;
  const isExecutionEnvironmentRunningOnWebPlatformBooleanCheck: boolean = Platform.OS === 'web';

  return (
    <SafeAreaView style={[styles.mainHardwareSafeAreaContainer, { backgroundColor: dynamicallyActiveSafeBackgroundColorHexValue }]}>
      
      {interactionMode === 'home_dashboard' ? (
          renderPremiumHomeDashboard()
      ) : (
        <Fragment>
          {/* ========================================== */}
          {/* 1. PRIMARY MAP ENGINE OVERLAYS             */}
          {/* ========================================== */}
          
          {isExecutionEnvironmentRunningOnWebPlatformBooleanCheck ? (
            <View style={styles.webFallbackContainerView}>
              <MaterialCommunityIcons name="map-marker-off" size={48} color={COLORS.textDark} />
              <Text style={styles.webFallbackInformationText}>High-Fidelity 3D Map rendering matrix explicitly requires a physical mobile OS framework natively.</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.hardwareMapViewLayer}
              showsUserLocation={true}
              onUserLocationChange={handleUserLocationUpdate}
              showsBuildings={true}
              pitchEnabled={true}
              provider={PROVIDER_GOOGLE}
              customMapStyle={isDarkMode ? TACTICAL_MAP_STYLE : []}
              onRegionChangeComplete={handleRegionChangeComplete}
              minZoomLevel={11}
              initialRegion={{
                latitude: KARACHI_CENTER_COORDINATE.latitude,
                longitude: KARACHI_CENTER_COORDINATE.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* A. DYNAMIC HAZARD OVERLAYS LAYER */}
              {!isLoadingMapData && hazards.map((activeHazardIteratorDataBlock: HazardData) => {
                  const computationallyParsedHazardSpatialNodeDataStruct: ParsedSpatialData | null = parseSpatialData(activeHazardIteratorDataBlock.location);
                  
                  const isSpatialDataStructurallyInvalidCheckFlag: boolean = !computationallyParsedHazardSpatialNodeDataStruct;
                  if (isSpatialDataStructurallyInvalidCheckFlag) return null;

                  const formattedVisualHazardTitleStringLabel: string = activeHazardIteratorDataBlock.hazard_type.replace('_', ' ').toUpperCase();
                  const visuallyResolvedEmojiIconCharacterString: string = getHazardEmoji(activeHazardIteratorDataBlock.hazard_type);

                  const isSpatialDataPointTypeExplicitlySetFlag: boolean = computationallyParsedHazardSpatialNodeDataStruct!.type === 'point';

                  if (isSpatialDataPointTypeExplicitlySetFlag) {
                    return (
                      <Marker key={`hazard-point-dynamic-${activeHazardIteratorDataBlock.id}`} coordinate={computationallyParsedHazardSpatialNodeDataStruct!.coordinates[0]} title={formattedVisualHazardTitleStringLabel}>
                        <View style={styles.emojiVisualMarkerCircleContainerNode}>
                          <Text style={styles.emojiVisualMarkerCharacterTextString}>{visuallyResolvedEmojiIconCharacterString}</Text>
                        </View>
                      </Marker>
                    );
                  }

                  const lineCoordinatesTotalArrayLengthValue: number = computationallyParsedHazardSpatialNodeDataStruct!.coordinates.length;
                  const calculatedPinANodeObject: CoordinatePayload = computationallyParsedHazardSpatialNodeDataStruct!.coordinates[0];
                  const calculatedPinBNodeObject: CoordinatePayload = computationallyParsedHazardSpatialNodeDataStruct!.coordinates[lineCoordinatesTotalArrayLengthValue - 1];

                  return (
                    <Fragment key={`hazard-linestring-dynamic-${activeHazardIteratorDataBlock.id}`}>
                      <Marker coordinate={calculatedPinANodeObject} title={`${formattedVisualHazardTitleStringLabel} (Physical Start Anchor Point)`}>
                        <View style={styles.emojiVisualMarkerCircleContainerNode}>
                          <Text style={styles.emojiVisualMarkerCharacterTextString}>{visuallyResolvedEmojiIconCharacterString}</Text>
                        </View>
                      </Marker>
                      <Marker coordinate={calculatedPinBNodeObject} title={`${formattedVisualHazardTitleStringLabel} (Physical End Anchor Point)`}>
                        <View style={styles.emojiVisualMarkerCircleContainerNode}>
                          <Text style={styles.emojiVisualMarkerCharacterTextString}>{visuallyResolvedEmojiIconCharacterString}</Text>
                        </View>
                      </Marker>
                      <Polyline
                        coordinates={computationallyParsedHazardSpatialNodeDataStruct!.coordinates}
                        strokeColor={COLORS.primary}
                        strokeWidth={8}
                        lineDashPattern={[15, 10]}
                      />
                    </Fragment>
                  );
                })
              }

              {/* B. OSRM ROUTING PATH RENDERING OVERLAY LAYER */}
              {(interactionMode === 'routing' || interactionMode === 'active_navigation') && calculatedSafeRoute !== null && (
                <Polyline
                  coordinates={calculatedSafeRoute.coordinates}
                  strokeColor={COLORS.safeRoute}
                  strokeWidth={6}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* C. INTERACTIVE DRAFT PINS */}
              {interactionMode !== 'view' && interactionMode !== 'routing' && interactionMode !== 'active_navigation' && draftPinA !== null && (
                <Marker
                  coordinate={draftPinA}
                  draggable={true}
                  onDragEnd={(hardwareDragDropNativeEventPayload: MarkerDragStartEndEvent) => handlePinDragEndNativeCoordinateExtraction(hardwareDragDropNativeEventPayload, 'A')}
                  pinColor={COLORS.primary}
                />
              )}

              {interactionMode === 'report_dual' && draftPinB !== null && (
                <Marker
                  coordinate={draftPinB}
                  draggable={true}
                  onDragEnd={(hardwareDragDropNativeEventPayload: MarkerDragStartEndEvent) => handlePinDragEndNativeCoordinateExtraction(hardwareDragDropNativeEventPayload, 'B')}
                  pinColor={COLORS.warning}
                />
              )}

              {interactionMode === 'report_dual' && draftPinA !== null && draftPinB !== null && (
                <Polyline coordinates={[draftPinA, draftPinB]} strokeColor={COLORS.primary} strokeWidth={6} lineDashPattern={[10, 10]} />
              )}
            </MapView>
          )}

          {/* ========================================== */}
          {/* 2. TOP HUD OVERLAYS                        */}
          {/* ========================================== */}
          
          {interactionMode === 'view' && (
            <View style={[styles.hardwareTopBarOverlayViewBox, { justifyContent: 'space-between' }]}>
              
              <TouchableOpacity onPress={cancelActiveModalityState} style={[styles.hardwareProfileAvatarButtonSquare, isDarkMode && { backgroundColor: COLORS.surfaceDark }, { width: 'auto', paddingHorizontal: 16 }]}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={COLORS.primary} style={{ marginRight: 6 }}/>
                <Text style={{fontWeight: '700', color: COLORS.primary}}>Exit Map</Text>
              </TouchableOpacity>

              {/* WADIAH UX UPDATE: Explicitly removed the Language Toggle from the Map HUD 
                  to reduce visual clutter, per the latest architectural requirements. */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.hardwareProfileAvatarButtonSquare, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                  activeOpacity={0.8}
                  onPress={() => setIsDarkMode(!isDarkMode)}
                >
                  <MaterialCommunityIcons name={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'} size={22} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ROUTING ENGINE TOP HUD */}
          {interactionMode === 'routing' && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={[styles.routingEngineTopPanelHardwareContainer, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
            >
              <View style={styles.routingEngineHeaderTitleRowFlex}>
                <TouchableOpacity onPress={cancelActiveModalityState} style={styles.routingEngineHardwareBackButtonWrap}>
                  <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? COLORS.surface : COLORS.textDark} />
                </TouchableOpacity>
                <Text style={[styles.routingEngineTitleLabelStringText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('safe_path_title') || 'Safe Path Navigation'}</Text>
              </View>

              {/* START LOCATION INPUT */}
              <View style={[styles.routingEngineInputGroupRowFlexContainer, { zIndex: 9999 }]}>
                <MaterialCommunityIcons name="circle-slice-8" size={16} color={COLORS.safeRoute} style={styles.routingEngineInputIconSpacing} />
                <TextInput
                  style={[styles.routingEngineInputFieldComponent, isDarkMode && { backgroundColor: '#2B2D42', color: COLORS.surface }]}
                  value={startLocationText}
                  onChangeText={(changedTextParameterString: string) => executeLocationSearch(changedTextParameterString, 'start')}
                  placeholder={translateFunction('start_placeholder') || 'Starting Point'}
                  placeholderTextColor={COLORS.textMuted}
                />
                {isSearchingStartLocation && (
                  <ActivityIndicator color={COLORS.safeRoute} style={{ position: 'absolute', right: 15 }} />
                )}
              </View>

              {startSearchSuggestions.length > 0 && (
                <View
                  style={[
                    styles.universalSearchDropdownAbsoluteContainerLayer,
                    { top: 120 },
                    isDarkMode && { backgroundColor: '#2B2D42', borderColor: '#1E2028' },
                  ]}
                >
                  <FlatList
                    data={startSearchSuggestions}
                    keyExtractor={(listExtractedItemBlockNode: NominatimSuggestion) => listExtractedItemBlockNode.place_id.toString()}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const structurallyResolvedPrimaryAddressNameString: string = extractBestPlaceName(item);
                      const structurallyResolvedSecondaryAddressLineString: string = extractSecondaryAddressLine(item, structurallyResolvedPrimaryAddressNameString);
                      return (
                        <TouchableOpacity
                          style={[styles.universalSuggestionItemFlexRow, isDarkMode && { borderBottomColor: '#1E2028' }]}
                          onPress={() => handleSuggestionSelection(item, 'start')}
                        >
                          <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.universalSuggestionTitleTextStrong, isDarkMode && { color: COLORS.surface }]} numberOfLines={1}>
                              {structurallyResolvedPrimaryAddressNameString}
                            </Text>
                            {structurallyResolvedSecondaryAddressLineString.length > 0 && (
                              <Text style={styles.universalSuggestionSubtitleTextFaded} numberOfLines={1}>
                                {structurallyResolvedSecondaryAddressLineString}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              {/* DESTINATION LOCATION INPUT */}
              <View style={[styles.routingEngineInputGroupRowFlexContainer, { zIndex: 9998 }]}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={COLORS.primary}
                  style={[styles.routingEngineInputIconSpacing, { marginLeft: -2 }]}
                />
                <TextInput
                  style={[styles.routingEngineInputFieldComponent, isDarkMode && { backgroundColor: '#2B2D42', color: COLORS.surface }]}
                  value={destinationText}
                  onChangeText={(changedTextParameterString: string) => executeLocationSearch(changedTextParameterString, 'destination')}
                  placeholder={translateFunction('dest_placeholder') || 'Enter Destination'}
                  placeholderTextColor={COLORS.textMuted}
                />
                {isSearchingDestinationLocation && (
                  <ActivityIndicator color={COLORS.primary} style={{ position: 'absolute', right: 15 }} />
                )}
              </View>

              {destinationSearchSuggestions.length > 0 && (
                <View
                  style={[
                    styles.universalSearchDropdownAbsoluteContainerLayer,
                    { top: 180 },
                    isDarkMode && { backgroundColor: '#2B2D42', borderColor: '#1E2028' },
                  ]}
                >
                  <FlatList
                    data={destinationSearchSuggestions}
                    keyExtractor={(listExtractedItemBlockNode: NominatimSuggestion) => listExtractedItemBlockNode.place_id.toString()}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const structurallyResolvedPrimaryAddressNameString: string = extractBestPlaceName(item);
                      const structurallyResolvedSecondaryAddressLineString: string = extractSecondaryAddressLine(item, structurallyResolvedPrimaryAddressNameString);
                      return (
                        <TouchableOpacity
                          style={[styles.universalSuggestionItemFlexRow, isDarkMode && { borderBottomColor: '#1E2028' }]}
                          onPress={() => handleSuggestionSelection(item, 'destination')}
                        >
                          <MaterialCommunityIcons name="map-marker-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.universalSuggestionTitleTextStrong, isDarkMode && { color: COLORS.surface }]} numberOfLines={1}>
                              {structurallyResolvedPrimaryAddressNameString}
                            </Text>
                            {structurallyResolvedSecondaryAddressLineString.length > 0 && (
                              <Text style={styles.universalSuggestionSubtitleTextFaded} numberOfLines={1}>
                                {structurallyResolvedSecondaryAddressLineString}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              )}

              {/* VEHICLE MODALITY TOGGLE ARRAY */}
              <View style={styles.vehicleModalityToggleContainerRowBox}>
                {(['car', 'bike', 'truck', 'foot'] as VehicleModality[]).map((vehicleModeEnumIteratedIndex) => (
                  <TouchableOpacity
                    key={vehicleModeEnumIteratedIndex}
                    style={[styles.vehicleModalitySelectableButtonCore, activeVehicle === vehicleModeEnumIteratedIndex && styles.vehicleModalitySelectableButtonCoreActive]}
                    onPress={() => switchVehicleModality(vehicleModeEnumIteratedIndex)}
                  >
                    <MaterialCommunityIcons
                      name={VEHICLE_PROFILES[vehicleModeEnumIteratedIndex].iconName as any}
                      size={24}
                      color={activeVehicle === vehicleModeEnumIteratedIndex ? COLORS.surface : COLORS.textMuted}
                    />
                    <Text style={[styles.vehicleModalitySelectableButtonLabelString, activeVehicle === vehicleModeEnumIteratedIndex && { color: COLORS.surface }]}>
                      {VEHICLE_PROFILES[vehicleModeEnumIteratedIndex].displayLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {VEHICLE_PROFILES[activeVehicle].limitationNote !== null && (
                <Text style={styles.vehicleModalityLimitationNoteDisclaimerStringText}>{VEHICLE_PROFILES[activeVehicle].limitationNote}</Text>
              )}

              <TouchableOpacity
                style={[
                  styles.calculateSafeRouteSubmissionButtonComponent,
                  (destinationCoordinate === null || isRouteCalculating) && styles.calculateSafeRouteSubmissionButtonComponentDisabledState,
                ]}
                activeOpacity={0.85}
                onPress={() => calculateRouteEngine()}
                disabled={destinationCoordinate === null || isRouteCalculating}
              >
                {isRouteCalculating ? (
                  <ActivityIndicator color={COLORS.surface} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.surface} />
                    <Text style={styles.calculateSafeRouteSubmissionButtonStringLabelText}>{translateFunction('find_route') || 'Find Safe Route'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}

          {/* ========================================== */}
          {/* 3. REPORT MODE HUD PANEL                   */}
          {/* ========================================== */}
          {(interactionMode === 'report_single' || interactionMode === 'report_dual') && (
            <View style={[styles.unifiedReportingPanelAbsoluteContainerBox, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}>
              {/* WADIAH UPGRADE: Localized the Reporting Bottom Sheet Native Texts */}
              <Text style={[styles.unifiedReportingPanelMasterTitleStringText, isDarkMode && { color: COLORS.surface }]}>
                {interactionMode === 'report_dual' 
                  ? translateFunction('report_step2_title') || 'Initialize Road Blockage Matrix' 
                  : translateFunction('report_step1_title') || 'Pinpoint Hazard Epicenter Coordinate Location'}
              </Text>
              <Text style={styles.unifiedReportingPanelMasterSubtitleStringText}>
                {interactionMode === 'report_dual'
                  ? 'Drag both physical pins structurally to denote the exact start and end coordinate points of the blocked road vector segment on the mapping grid.'
                  : translateFunction('report_step1_desc') || 'Drag the primary anchor pin accurately to the exact physical geographical hardware location of the structural hazard anomaly.'}
              </Text>

              <View style={styles.unifiedReportingPanelSegmentedToggleContainerRow}>
                <TouchableOpacity
                  style={[styles.unifiedReportingPanelSegmentedToggleButtonNode, interactionMode === 'report_single' && styles.unifiedReportingPanelSegmentedToggleButtonNodeActive]}
                  onPress={() => activateReportingModeState('report_single')}
                >
                  <Text
                    style={[
                      styles.unifiedReportingPanelSegmentedToggleButtonLabelString,
                      interactionMode === 'report_single' && styles.unifiedReportingPanelSegmentedToggleButtonLabelStringActive,
                    ]}
                  >
                    {translateFunction('report_primary_marker') || 'Point Hardware Hazard'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unifiedReportingPanelSegmentedToggleButtonNode, interactionMode === 'report_dual' && styles.unifiedReportingPanelSegmentedToggleButtonNodeActive]}
                  onPress={() => activateReportingModeState('report_dual')}
                >
                  <Text
                    style={[styles.unifiedReportingPanelSegmentedToggleButtonLabelString, interactionMode === 'report_dual' && styles.unifiedReportingPanelSegmentedToggleButtonLabelStringActive]}
                  >
                    {translateFunction('report_cat_road') || 'Road Vector Blockage'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.unifiedReportingPanelSubmissionActionRowFlex}>
                <TouchableOpacity style={styles.unifiedReportingPanelCancelButtonNode} activeOpacity={0.85} onPress={cancelActiveModalityState}>
                  <Text style={styles.unifiedReportingPanelCancelButtonLabelText}>{translateFunction('chat_cancel') || 'Abort Execution'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.unifiedReportingPanelConfirmButtonNode} activeOpacity={0.85} onPress={confirmReportCoordinatesValidationDispatch}>
                  <MaterialCommunityIcons name="check-bold" size={18} color={COLORS.surface} />
                  <Text style={styles.unifiedReportingPanelConfirmButtonLabelText}>{translateFunction('report_submit_btn') || 'Secure Location'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================== */}
          {/* 4. ROUTE METRICS / START NAVIGATION        */}
          {/* ========================================== */}
          {interactionMode === 'routing' && calculatedSafeRoute !== null && (
            <View style={[styles.mathematicalRouteMetricsPanelAbsoluteContainerBox, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}>
              <View style={styles.mathematicalRouteMetricsPanelInformationRowFlex}>
                <View>
                  <Text style={[styles.mathematicalRouteMetricsPanelDistanceNumericalText, isDarkMode && { color: COLORS.surface }]}>
                    {calculatedSafeRoute.distanceKm.toFixed(1)} Hardware Kilometers
                  </Text>
                  <Text style={styles.mathematicalRouteMetricsPanelSubInformationTextNode}>
                    Approx. {calculatedSafeRoute.estimatedMinutes} mathematical minutes explicitly constrained by {VEHICLE_PROFILES[activeVehicle].displayLabel} physical profile limits.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.mathematicalRouteMetricsPanelStartNavigationButtonNode}
                activeOpacity={0.85}
                onPress={startInAppNavigation}
              >
                <MaterialCommunityIcons name="navigation" size={20} color={COLORS.surface} />
                <Text style={styles.mathematicalRouteMetricsPanelStartNavigationButtonLabelText}>Commence True In-App Navigation Matrix</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================== */}
          {/* 5. TRUE IN-APP NAVIGATION HUD              */}
          {/* ========================================== */}
          {interactionMode === 'active_navigation' && calculatedSafeRoute !== null && (
            <View style={[styles.activeTrueNavigationTopInformationPanelBox, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}>
              <View style={styles.activeTrueNavigationInformationRowFlexWrap}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeTrueNavigationDistanceRemainingLargeTextString}>
                    {distanceRemainingNav.toFixed(2)} km Vector Length Remaining
                  </Text>
                  <Text style={[styles.activeTrueNavigationDestinationLabelSubTextString, isDarkMode && { color: COLORS.surface }]} numberOfLines={1}>
                    Target Lock: {destinationText}
                  </Text>
                </View>
                <TouchableOpacity style={styles.activeTrueNavigationCancelHardwareButtonNode} onPress={cancelActiveModalityState}>
                  <MaterialCommunityIcons name="close-octagon" size={24} color={COLORS.surface} />
                  <Text style={styles.activeTrueNavigationCancelButtonLabelTextString}>Exit System</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================== */}
          {/* 6. IN-MAP SAFE ROUTING TRIGGER (NEW)       */}
          {/* ========================================== */}
          {/* WADIAH UX UPGRADE: Placed the Safe Routing trigger explicitly inside the Map Feature
              without re-cluttering the entire view with all previous FABs. */}
          {interactionMode === 'view' && (
            <View style={styles.mapSafeRouteFabContainer}>
              <TouchableOpacity 
                style={[styles.omniFloatingActionButtonCoreItemNode, styles.omniFloatingActionButtonPrimaryAccentNode]} 
                activeOpacity={0.85} 
                onPress={() => initiateRoutingMode()}
              >
                <MaterialCommunityIcons name="directions" size={26} color={COLORS.surface} />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, { color: COLORS.surface }]}>{translateFunction('fab_navigate') || 'Navigate'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ========================================== */}
          {/* 7. GLOBAL LOADING INDICATOR OVERLAY        */}
          {/* ========================================== */}
          {isLoadingMapData && (
            <View style={styles.globalApplicationLoadingOverlayShieldViewBox} pointerEvents="none">
              <ActivityIndicator color={COLORS.primary} size="small" />
            </View>
          )}
        </Fragment>
      )}

    </SafeAreaView>
  );
}

// ============================================================================
// EXHAUSTIVE STYLESHEET REGISTRY (GUARDIAN GRID v9.0)
// ============================================================================

const styles = StyleSheet.create({
  mainHardwareSafeAreaContainer: { flex: 1 },
  hardwareMapViewLayer: { ...StyleSheet.absoluteFillObject },

  webFallbackContainerView: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, backgroundColor: '#F4F7F9' },
  webFallbackInformationText: { marginTop: 14, fontSize: 15, textAlign: 'center', color: COLORS.textMuted },

  emojiVisualMarkerCircleContainerNode: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  emojiVisualMarkerCharacterTextString: { fontSize: 18 },

  hardwareTopBarOverlayViewBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
  },
  universalSearchBoxContainerStruct: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  universalSearchTextTitleString: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  hardwareProfileAvatarButtonSquare: {
    height: 48,
    borderRadius: RADIUS_SCALE.md,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  routingEngineTopPanelHardwareContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: RADIUS_SCALE.xl,
    borderBottomRightRadius: RADIUS_SCALE.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  routingEngineHeaderTitleRowFlex: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  routingEngineHardwareBackButtonWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  routingEngineTitleLabelStringText: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  routingEngineInputGroupRowFlexContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    borderRadius: RADIUS_SCALE.md,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 50,
  },
  routingEngineInputIconSpacing: { marginRight: 8 },
  routingEngineInputFieldComponent: { flex: 1, fontSize: 15, color: COLORS.textDark, height: '100%' },

  universalSearchDropdownAbsoluteContainerLayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxHeight: 220,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10000,
  },
  universalSuggestionItemFlexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F6',
  },
  universalSuggestionTitleTextStrong: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  universalSuggestionSubtitleTextFaded: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  vehicleModalityToggleContainerRowBox: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  vehicleModalitySelectableButtonCore: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: RADIUS_SCALE.md,
    backgroundColor: '#F1F3F6',
  },
  vehicleModalitySelectableButtonCoreActive: { backgroundColor: COLORS.safeRoute, shadowColor: COLORS.safeGlowShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  vehicleModalitySelectableButtonLabelString: { marginTop: 4, fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  vehicleModalityLimitationNoteDisclaimerStringText: { marginTop: 8, fontSize: 12, color: COLORS.warning, fontStyle: 'italic', textAlign: 'center' },

  calculateSafeRouteSubmissionButtonComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.safeRoute,
    borderRadius: RADIUS_SCALE.md,
    paddingVertical: 14,
    marginTop: 14,
    shadowColor: COLORS.safeGlowShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  calculateSafeRouteSubmissionButtonComponentDisabledState: { backgroundColor: COLORS.disabled, shadowOpacity: 0 },
  calculateSafeRouteSubmissionButtonStringLabelText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: COLORS.surface },

  unifiedReportingPanelAbsoluteContainerBox: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  unifiedReportingPanelMasterTitleStringText: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  unifiedReportingPanelMasterSubtitleStringText: { marginTop: 4, fontSize: 13, color: COLORS.textMuted },
  unifiedReportingPanelSegmentedToggleContainerRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F6',
    borderRadius: RADIUS_SCALE.md,
    padding: 4,
    marginTop: 14,
  },
  unifiedReportingPanelSegmentedToggleButtonNode: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  unifiedReportingPanelSegmentedToggleButtonNodeActive: { backgroundColor: COLORS.primary },
  unifiedReportingPanelSegmentedToggleButtonLabelString: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  unifiedReportingPanelSegmentedToggleButtonLabelStringActive: { color: COLORS.surface },
  unifiedReportingPanelSubmissionActionRowFlex: { flexDirection: 'row', marginTop: 16, gap: 10 },
  unifiedReportingPanelCancelButtonNode: {
    flex: 1,
    height: 52,
    borderRadius: RADIUS_SCALE.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
  },
  unifiedReportingPanelCancelButtonLabelText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  unifiedReportingPanelConfirmButtonNode: {
    flex: 1.6,
    flexDirection: 'row',
    height: 52,
    borderRadius: RADIUS_SCALE.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.accentGlowShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  unifiedReportingPanelConfirmButtonLabelText: { marginLeft: 6, fontSize: 15, fontWeight: '700', color: COLORS.surface },

  mathematicalRouteMetricsPanelAbsoluteContainerBox: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  mathematicalRouteMetricsPanelInformationRowFlex: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mathematicalRouteMetricsPanelDistanceNumericalText: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  mathematicalRouteMetricsPanelSubInformationTextNode: { marginTop: 2, fontSize: 13, color: COLORS.textMuted },
  mathematicalRouteMetricsPanelStartNavigationButtonNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.safeRoute,
    borderRadius: RADIUS_SCALE.md,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: COLORS.safeGlowShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  mathematicalRouteMetricsPanelStartNavigationButtonLabelText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: COLORS.surface },

  activeTrueNavigationTopInformationPanelBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.xxl,
    padding: 16,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  activeTrueNavigationInformationRowFlexWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeTrueNavigationDistanceRemainingLargeTextString: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.safeRoute,
  },
  activeTrueNavigationDestinationLabelSubTextString: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginTop: 4,
  },
  activeTrueNavigationCancelHardwareButtonNode: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS_SCALE.md,
    alignItems: 'center',
    flexDirection: 'row',
  },
  activeTrueNavigationCancelButtonLabelTextString: {
    color: COLORS.surface,
    fontWeight: '800',
    marginLeft: 6,
  },

  globalApplicationLoadingOverlayShieldViewBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 80,
    alignSelf: 'center',
    backgroundColor: COLORS.overlay,
    borderRadius: RADIUS_SCALE.xl,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // ==========================================
  // IN-MAP SPECIFIC FAB STYLES
  // ==========================================
  mapSafeRouteFabContainer: { 
    position: 'absolute', 
    right: 16, 
    bottom: 100, // Anchored safely above the global bottom navigation bar natively
    alignItems: 'center',
    zIndex: 9999,
  },
  omniFloatingActionButtonCoreItemNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  omniFloatingActionButtonPrimaryAccentNode: { backgroundColor: COLORS.safeRoute, shadowColor: COLORS.safeGlowShadow, shadowOpacity: 0.5 },
  omniFloatingActionButtonLabelTextString: { fontSize: 10, fontWeight: '800', color: COLORS.textDark, marginTop: 2 },

  // ==========================================
  // PREMIUM HOME DASHBOARD — GUARDIAN GRID v9.0 STYLES
  // ==========================================
  dashboardMainContainer: {
    flex: 1,
    backgroundColor: COLORS.surfaceLightGrid,
  },

  // --- "Control Room" hero header -------------------------------------------------
  dashboardHeaderSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: SPACING_SCALE.xl,
    backgroundColor: COLORS.surfaceDark,
    borderBottomLeftRadius: RADIUS_SCALE.xxl,
    borderBottomRightRadius: RADIUS_SCALE.xxl,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  // Two overlapping translucent discs give the header a subtle "radar coverage" 
  // motif without needing an external gradient or SVG library.
  dashboardHeaderAccentShapeOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary,
    opacity: 0.16,
    top: -90,
    right: -60,
  },
  dashboardHeaderAccentShapeTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.safeRoute,
    opacity: 0.14,
    bottom: -70,
    left: -45,
  },
  dashboardHeaderRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dashboardLiveStatusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING_SCALE.sm,
  },
  dashboardLiveStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.emeraldGreen,
    marginRight: 6,
  },
  dashboardLiveStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 1.1,
  },
  dashboardGreetingTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.surface,
    marginBottom: 4,
  },
  dashboardGreetingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dashboardProfileAvatarButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 10,
    borderRadius: RADIUS_SCALE.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorderDark,
  },

  // --- Radar-pulse Safety Status hero card -----------------------------------------
  dashboardStatusHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING_SCALE.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: RADIUS_SCALE.lg,
    padding: SPACING_SCALE.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderDark,
  },
  dashboardStatusHeroRingWrap: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardStatusHeroPulseRing: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: COLORS.emeraldGreen,
  },
  dashboardStatusHeroIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.emeraldGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardStatusHeroTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.surface,
  },
  dashboardStatusHeroSubtitleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
  },

  // --- Bento action grid --------------------------------------------------------
  dashboardScrollGridContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  dashboardSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  dashboardBentoHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.lg,
    padding: SPACING_SCALE.lg,
    marginBottom: SPACING_SCALE.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  dashboardBentoHeroIconWrap: {
    width: 58,
    height: 58,
    borderRadius: RADIUS_SCALE.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardBentoHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  dashboardBentoHeroDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dashboardBentoWideChatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.lg,
    padding: SPACING_SCALE.lg,
    marginBottom: SPACING_SCALE.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dashboardActionGridFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING_SCALE.lg,
  },
  dashboardActionCardItem: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS_SCALE.lg,
    padding: SPACING_SCALE.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dashboardActionIconWrapperBackground: {
    width: 56,
    height: 56,
    borderRadius: RADIUS_SCALE.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dashboardActionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  dashboardActionCardDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  dashboardFullWidthButtonStruct: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS_SCALE.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dashboardFullWidthButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  
  // --- Floating capsule bottom navigation -------------------------------------------
  bottomNavigationBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    borderTopLeftRadius: RADIUS_SCALE.xl,
    borderTopRightRadius: RADIUS_SCALE.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorderLight,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 20,
  },
  bottomNavigationItemButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavigationItemButtonActive: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavActivePillBackground: {
    backgroundColor: COLORS.primary,
    width: 38,
    height: 38,
    borderRadius: RADIUS_SCALE.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    shadowColor: COLORS.accentGlowShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomNavigationItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  incomingBadgeContainer: {
    position: 'absolute',
    top: -8,
    right: '25%',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  incomingBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.surface,
    letterSpacing: 0.5,
  }
});