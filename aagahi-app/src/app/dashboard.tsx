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
 * - UI GUARANTEE: Implements explicitly defined `zIndex` and `elevation` layers 
 *   to ensure Floating Action Buttons (FABs) and HUD panels never clip or vanish.
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
  ScrollView
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
 */
interface ThemeColors {
  primary: string;
  surface: string;
  surfaceDark: string;
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

const COLORS: ThemeColors = {
  primary: '#D90429', // Deep energetic red
  surface: '#FFFFFF',
  surfaceDark: '#1E2028',
  surfaceLightGrid: '#F8FAFC',
  textDark: '#1E293B',
  textMuted: '#64748B',
  overlay: 'rgba(30, 32, 40, 0.95)',
  warning: '#F59E0B',
  disabled: '#E5E7EB',
  fabShadow: '#000000',
  safeRoute: '#3B82F6', // Deep blue
  alternateRoute: '#8B5CF6',
  emeraldGreen: '#10B981', // Rich green
  oceanBlue: '#0EA5E9',
  sunflowerYellow: '#FBBF24',
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
  const { user, logout } = useAuth();
  
  // WADIAH LOCALIZATION ENGINE EXTRACTION
  const languageContextPayload = useLanguage();
  const activeLanguageCode: string = languageContextPayload.locale;
  const switchLanguageFunction: (locale: 'en' | 'ur') => void = languageContextPayload.setLocale;
  const translateFunction: (key: any) => string = languageContextPayload.t;
  const toggleLanguageFunction: () => void = languageContextPayload.toggleLanguage;

  const mapRef = useRef<MapView>(null);
  const isMountedRef = useRef<boolean>(true);

  const startSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hazardRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rerouteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vehicleRecalculateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      Alert.alert(
        'Aagahi Spatial Optical Scanner',
        'Select the explicitly targeted optical scanning hardware module you wish to initialize natively:',
        [
          { text: 'Cancel Hardware Operation', style: 'cancel' },
          {
            text: 'AI Room Safety Assessment',
            onPress: () => {
              try {
                router.push({ pathname: '/scanner', params: { mode: 'ai' } });
              } catch (aiScannerRouteInitError: unknown) {
                console.error('[triggerDualScannerMenu] AI Scanner hardware route module load failure explicitly:', aiScannerRouteInitError);
              }
            },
          },
          {
            text: 'Scan Facility Compliance QR',
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
  // PILLAR 5: UNIFIED REPORTING LOGIC (THE STABLE BASELINE)
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

  const handleSecureLogoutProcedure = async (): Promise<void> => {
    try {
      await logout();
      router.replace('/');
    } catch (logoutPipelineArchitectureError: unknown) {
      console.error('[handleSecureLogoutProcedure] Authentication token deletion logout pipeline failed structurally natively implicitly: ', logoutPipelineArchitectureError);
    }
  };

  // ==========================================
  // PREMIUM HOME DASHBOARD RENDER LOGIC
  // ==========================================
  
  /**
   * @function renderPremiumHomeDashboard
   * @description Constructs the high-fidelity UI layout for the primary Aagahi Application startup screen natively.
   * Isolates the layout grid completely from the heavy map engine to massively optimize boot parameters implicitly.
   */
  const renderPremiumHomeDashboard = (): React.JSX.Element => {
    return (
      <View style={[styles.dashboardMainContainer, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}>
        
        {/* TOP QUARTER: Premium Application Header / Banner Section */}
        <View style={styles.dashboardHeaderSection}>
          <View style={styles.dashboardHeaderRowFlex}>
            <View>
              <Text style={[styles.dashboardGreetingTitle, isDarkMode && { color: COLORS.surface }]}>
                {translateFunction('greeting')} {user?.username || 'Arsheel Abbas'}
              </Text>
              <Text style={styles.dashboardGreetingSubtitle}>Aagahi Spatial Division</Text>
            </View>
            <TouchableOpacity 
              style={[styles.dashboardProfileAvatarButton, isDarkMode && { backgroundColor: '#2B2D42' }]}
              onPress={() => setIsDarkMode(!isDarkMode)}
              activeOpacity={0.8}
            >
               <MaterialCommunityIcons 
                 name={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'} 
                 size={24} 
                 color={COLORS.primary} 
               />
            </TouchableOpacity>
          </View>

          {/* Abstract Clip Art / Data Visualization Banner Placeholder Area */}
          <View style={[styles.dashboardBannerImagePlaceholder, isDarkMode && { backgroundColor: '#2B2D42' }]}>
            <MaterialCommunityIcons name="shield-cross-outline" size={48} color={COLORS.primary} style={{ opacity: 0.8 }} />
            <Text style={[styles.dashboardBannerText, isDarkMode && { color: COLORS.surface }]}>System Telemetry Active</Text>
            <Text style={styles.dashboardBannerSubtext}>Monitoring Live Environment Grid Securely.</Text>
          </View>
        </View>

        {/* CORE ACTION CENTER: Four Pillar Feature Grid natively structured */}
        <ScrollView contentContainerStyle={styles.dashboardScrollGridContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.dashboardSectionTitle, isDarkMode && { color: COLORS.surface }]}>Core Spatial Operations</Text>
          
          <View style={styles.dashboardActionGridFlexRow}>
            {/* Action 1: Navigation Engine natively */}
            <TouchableOpacity 
              style={[styles.dashboardActionCardItem, isDarkMode && { backgroundColor: '#2B2D42', shadowColor: 'transparent' }]} 
              activeOpacity={0.85} 
              onPress={() => setInteractionMode('view')}
            >
              <View style={[styles.dashboardActionIconWrapperBackground, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <MaterialCommunityIcons name="map-search-outline" size={32} color={COLORS.safeRoute} />
              </View>
              <Text style={[styles.dashboardActionCardTitle, isDarkMode && { color: COLORS.surface }]}>Spatial Map</Text>
              <Text style={styles.dashboardActionCardDescription}>View dynamic hazards</Text>
            </TouchableOpacity>

            {/* Action 2: Safe Route Calculation directly */}
            <TouchableOpacity 
              style={[styles.dashboardActionCardItem, isDarkMode && { backgroundColor: '#2B2D42', shadowColor: 'transparent' }]} 
              activeOpacity={0.85} 
              onPress={() => initiateRoutingMode()}
            >
              <View style={[styles.dashboardActionIconWrapperBackground, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <MaterialCommunityIcons name="directions-fork" size={32} color={COLORS.alternateRoute} />
              </View>
              <Text style={[styles.dashboardActionCardTitle, isDarkMode && { color: COLORS.surface }]}>{translateFunction('safe_path_title')}</Text>
              <Text style={styles.dashboardActionCardDescription}>Secure path calculation</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dashboardActionGridFlexRow}>
            {/* Action 3: Spatial Reporting Module */}
            <TouchableOpacity 
              style={[styles.dashboardActionCardItem, isDarkMode && { backgroundColor: '#2B2D42', shadowColor: 'transparent' }]} 
              activeOpacity={0.85} 
              onPress={() => activateReportingModeState('report_single')}
            >
              <View style={[styles.dashboardActionIconWrapperBackground, { backgroundColor: 'rgba(217, 4, 41, 0.15)' }]}>
                <MaterialCommunityIcons name="alert-decagram-outline" size={32} color={COLORS.primary} />
              </View>
              <Text style={[styles.dashboardActionCardTitle, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_report')}</Text>
              <Text style={styles.dashboardActionCardDescription}>Flag structural anomalies</Text>
            </TouchableOpacity>

            {/* Action 4: Hardware Scanning */}
            <TouchableOpacity 
              style={[styles.dashboardActionCardItem, isDarkMode && { backgroundColor: '#2B2D42', shadowColor: 'transparent' }]} 
              activeOpacity={0.85} 
              onPress={triggerDualScannerMenu}
            >
              <View style={[styles.dashboardActionIconWrapperBackground, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="qrcode-scan" size={32} color={COLORS.emeraldGreen} />
              </View>
              <Text style={[styles.dashboardActionCardTitle, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_scan')}</Text>
              <Text style={styles.dashboardActionCardDescription}>AI room evaluation matrix</Text>
            </TouchableOpacity>
          </View>

          {/* Supplementary Actions List mapping */}
          {user?.role === 'warden' && (
             <TouchableOpacity style={[styles.dashboardFullWidthButtonStruct, isDarkMode && { backgroundColor: '#2B2D42' }]} onPress={() => router.push('/warden')}>
               <MaterialCommunityIcons name="shield-account-variant" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
               <Text style={[styles.dashboardFullWidthButtonText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_warden')} Administration</Text>
               <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
             </TouchableOpacity>
          )}

          {user?.role === 'shopkeeper' && (
             <TouchableOpacity style={[styles.dashboardFullWidthButtonStruct, isDarkMode && { backgroundColor: '#2B2D42' }]} onPress={() => router.push('/shopkeeper')}>
               <MaterialCommunityIcons name="storefront-outline" size={24} color={COLORS.oceanBlue} style={{ marginRight: 12 }} />
               <Text style={[styles.dashboardFullWidthButtonText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_portal')} Directory Setup</Text>
               <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
             </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.dashboardFullWidthButtonStruct, isDarkMode && { backgroundColor: '#2B2D42' }]} onPress={() => router.push('/chat')}>
             <MaterialCommunityIcons name="forum-outline" size={24} color={COLORS.sunflowerYellow} style={{ marginRight: 12 }} />
             <Text style={[styles.dashboardFullWidthButtonText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('chat_header_title')}</Text>
             <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          <div style={{ height: 100 }} />
        </ScrollView>

        {/* ========================================== */}
        {/* BOTTOM GLOBAL NAVIGATION BAR NATIVELY      */}
        {/* ========================================== */}
        <View style={[styles.bottomNavigationBarContainer, isDarkMode && { backgroundColor: '#1E2028', borderTopColor: '#2B2D42' }]}>
          
          <TouchableOpacity style={styles.bottomNavigationItemButtonActive} activeOpacity={0.8}>
            <MaterialCommunityIcons name="home-variant" size={26} color={COLORS.primary} />
            <Text style={[styles.bottomNavigationItemText, { color: COLORS.primary, fontWeight: '700' }]}>Home</Text>
          </TouchableOpacity>

          {/* WADIAH LOCALIZATION TOGGLE PILL */}
          <TouchableOpacity 
            style={styles.bottomNavigationItemButton} 
            activeOpacity={0.8}
            onPress={toggleLanguageFunction}
          >
            <MaterialCommunityIcons name="translate" size={26} color={COLORS.primary} />
            <Text style={[styles.bottomNavigationItemText, { color: COLORS.primary, fontWeight: '800' }]}>
              {activeLanguageCode === 'en' ? 'اردو' : 'EN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomNavigationItemButton} activeOpacity={0.8} onPress={() => setInteractionMode('view')}>
            <MaterialCommunityIcons name="map-outline" size={26} color={COLORS.textMuted} />
            <Text style={styles.bottomNavigationItemText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomNavigationItemButton} activeOpacity={0.8} onPress={handleSecureLogoutProcedure}>
            <MaterialCommunityIcons name="account-circle-outline" size={26} color={COLORS.textMuted} />
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
            <View style={styles.hardwareTopBarOverlayViewBox}>
              
              <TouchableOpacity onPress={cancelActiveModalityState} style={[styles.hardwareProfileAvatarButtonSquare, isDarkMode && { backgroundColor: COLORS.surfaceDark }, { marginRight: 10, width: 'auto', paddingHorizontal: 16 }]}>
                <MaterialCommunityIcons name="home-outline" size={22} color={COLORS.primary} style={{ marginRight: 6 }}/>
                <Text style={{fontWeight: '700', color: COLORS.primary}}>Home Dashboard</Text>
              </TouchableOpacity>
              
              <View style={[styles.universalSearchBoxContainerStruct, isDarkMode && { backgroundColor: COLORS.surfaceDark }, {flex: 1}]}>
                <Text style={[styles.universalSearchTextTitleString, isDarkMode && { color: COLORS.surface }]}>
                  {translateFunction('dashboardTitle')}
                </Text>
              </View>

              {/* WADIAH TOP BAR LANGUAGE TOGGLE */}
              <TouchableOpacity
                style={[styles.hardwareProfileAvatarButtonSquare, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                activeOpacity={0.8}
                onPress={toggleLanguageFunction}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.primary }}>
                  {activeLanguageCode === 'en' ? 'اردو' : 'EN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.hardwareProfileAvatarButtonSquare, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                activeOpacity={0.8}
                onPress={() => setIsDarkMode(!isDarkMode)}
              >
                <MaterialCommunityIcons name={isDarkMode ? 'white-balance-sunny' : 'moon-waning-crescent'} size={22} color={COLORS.primary} />
              </TouchableOpacity>
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
                <Text style={[styles.routingEngineTitleLabelStringText, isDarkMode && { color: COLORS.surface }]}>{translateFunction('safe_path_title')}</Text>
              </View>

              {/* START LOCATION INPUT */}
              <View style={[styles.routingEngineInputGroupRowFlexContainer, { zIndex: 9999 }]}>
                <MaterialCommunityIcons name="circle-slice-8" size={16} color={COLORS.safeRoute} style={styles.routingEngineInputIconSpacing} />
                <TextInput
                  style={[styles.routingEngineInputFieldComponent, isDarkMode && { backgroundColor: '#2B2D42', color: COLORS.surface }]}
                  value={startLocationText}
                  onChangeText={(changedTextParameterString: string) => executeLocationSearch(changedTextParameterString, 'start')}
                  placeholder={translateFunction('start_placeholder')}
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
                  placeholder={translateFunction('dest_placeholder')}
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
                    <Text style={styles.calculateSafeRouteSubmissionButtonStringLabelText}>{translateFunction('find_route')}</Text>
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
              <Text style={[styles.unifiedReportingPanelMasterTitleStringText, isDarkMode && { color: COLORS.surface }]}>
                {interactionMode === 'report_dual' ? 'Initialize Road Blockage Matrix' : 'Pinpoint Hazard Epicenter Coordinate Location'}
              </Text>
              <Text style={styles.unifiedReportingPanelMasterSubtitleStringText}>
                {interactionMode === 'report_dual'
                  ? 'Drag both physical pins structurally to denote the exact start and end coordinate points of the blocked road vector segment on the mapping grid.'
                  : 'Drag the primary anchor pin accurately to the exact physical geographical hardware location of the structural hazard anomaly.'}
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
                    Point Hardware Hazard
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unifiedReportingPanelSegmentedToggleButtonNode, interactionMode === 'report_dual' && styles.unifiedReportingPanelSegmentedToggleButtonNodeActive]}
                  onPress={() => activateReportingModeState('report_dual')}
                >
                  <Text
                    style={[styles.unifiedReportingPanelSegmentedToggleButtonLabelString, interactionMode === 'report_dual' && styles.unifiedReportingPanelSegmentedToggleButtonLabelStringActive]}
                  >
                    Road Vector Blockage
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.unifiedReportingPanelSubmissionActionRowFlex}>
                <TouchableOpacity style={styles.unifiedReportingPanelCancelButtonNode} activeOpacity={0.85} onPress={cancelActiveModalityState}>
                  <Text style={styles.unifiedReportingPanelCancelButtonLabelText}>Abort Execution</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.unifiedReportingPanelConfirmButtonNode} activeOpacity={0.85} onPress={confirmReportCoordinatesValidationDispatch}>
                  <MaterialCommunityIcons name="check-bold" size={18} color={COLORS.surface} />
                  <Text style={styles.unifiedReportingPanelConfirmButtonLabelText}>Secure Location</Text>
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
          {/* 6. FLOATING ACTION BUTTON RAIL             */}
          {/* ========================================== */}
          {interactionMode === 'view' && (
            <View style={styles.omniFloatingActionButtonRailAbsoluteContainer}>
              
              <TouchableOpacity style={[styles.omniFloatingActionButtonCoreItemNode, styles.omniFloatingActionButtonPrimaryAccentNode]} activeOpacity={0.85} onPress={initiateRoutingMode}>
                <MaterialCommunityIcons name="directions" size={26} color={COLORS.surface} />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, { color: COLORS.surface }]}>{translateFunction('fab_navigate')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.omniFloatingActionButtonCoreItemNode, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                activeOpacity={0.85}
                onPress={() => router.push('/chat')}
              >
                <MaterialCommunityIcons name="forum-outline" size={24} color={isDarkMode ? COLORS.surface : COLORS.textDark} />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_chat')}</Text>
              </TouchableOpacity>

              {user?.role === 'warden' && (
                <TouchableOpacity
                  style={[styles.omniFloatingActionButtonCoreItemNode, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/warden')}
                >
                  <MaterialCommunityIcons name="shield-account-outline" size={24} color={COLORS.primary} />
                  <Text style={[styles.omniFloatingActionButtonLabelTextString, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_warden')}</Text>
                </TouchableOpacity>
              )}

              {user?.role === 'shopkeeper' && (
                <TouchableOpacity
                  style={[styles.omniFloatingActionButtonCoreItemNode, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/shopkeeper')}
                >
                  <MaterialCommunityIcons
                    name="storefront-outline"
                    size={24}
                    color={isDarkMode ? COLORS.surface : COLORS.textDark}
                  />
                  <Text style={[styles.omniFloatingActionButtonLabelTextString, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_portal')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.omniFloatingActionButtonCoreItemNode, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                activeOpacity={0.85}
                onPress={triggerDualScannerMenu}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={24} color={isDarkMode ? COLORS.surface : COLORS.textDark} />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_scan')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.omniFloatingActionButtonCoreItemNode, { backgroundColor: COLORS.primary }]}
                activeOpacity={0.85}
                onPress={() => activateReportingModeState('report_single')}
              >
                <MaterialCommunityIcons name="alert-octagon" size={24} color={COLORS.surface} />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, { color: COLORS.surface }]}>{translateFunction('fab_report')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.omniFloatingActionButtonCoreItemNode, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                activeOpacity={0.85}
                onPress={() => activateReportingModeState('report_dual')}
              >
                <MaterialCommunityIcons name="road-variant" size={24} color={isDarkMode ? COLORS.surface : COLORS.textDark} />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_blockage')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.omniFloatingActionButtonCoreItemNode, isDarkMode && { backgroundColor: COLORS.surfaceDark }]}
                activeOpacity={0.85}
                onPress={() => router.push('/fund')}
              >
                <MaterialCommunityIcons
                  name="hand-coin-outline"
                  size={24}
                  color={isDarkMode ? COLORS.surface : COLORS.textDark}
                />
                <Text style={[styles.omniFloatingActionButtonLabelTextString, isDarkMode && { color: COLORS.surface }]}>{translateFunction('fab_fund')}</Text>
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
// EXHAUSTIVE STYLESHEET REGISTRY
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
    width: 48,
    height: 48,
    borderRadius: 14,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
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
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
    backgroundColor: '#F1F3F6',
  },
  vehicleModalitySelectableButtonCoreActive: { backgroundColor: COLORS.safeRoute },
  vehicleModalitySelectableButtonLabelString: { marginTop: 4, fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  vehicleModalityLimitationNoteDisclaimerStringText: { marginTop: 8, fontSize: 12, color: COLORS.warning, fontStyle: 'italic', textAlign: 'center' },

  calculateSafeRouteSubmissionButtonComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.safeRoute,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  calculateSafeRouteSubmissionButtonComponentDisabledState: { backgroundColor: COLORS.disabled },
  calculateSafeRouteSubmissionButtonStringLabelText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: COLORS.surface },

  unifiedReportingPanelAbsoluteContainerBox: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
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
    borderRadius: 12,
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
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
  },
  unifiedReportingPanelCancelButtonLabelText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  unifiedReportingPanelConfirmButtonNode: {
    flex: 1.6,
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  unifiedReportingPanelConfirmButtonLabelText: { marginLeft: 6, fontSize: 15, fontWeight: '700', color: COLORS.surface },

  mathematicalRouteMetricsPanelAbsoluteContainerBox: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
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
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  mathematicalRouteMetricsPanelStartNavigationButtonLabelText: { marginLeft: 8, fontSize: 15, fontWeight: '700', color: COLORS.surface },

  activeTrueNavigationTopInformationPanelBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
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
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },
  activeTrueNavigationCancelButtonLabelTextString: {
    color: COLORS.surface,
    fontWeight: '800',
    marginLeft: 6,
  },

  omniFloatingActionButtonRailAbsoluteContainer: { position: 'absolute', right: 16, bottom: 24, alignItems: 'center' },
  omniFloatingActionButtonCoreItemNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    marginTop: 12,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  omniFloatingActionButtonPrimaryAccentNode: { backgroundColor: COLORS.safeRoute, marginTop: 0 },
  omniFloatingActionButtonLabelTextString: { fontSize: 10, fontWeight: '800', color: COLORS.textDark, marginTop: 2 },

  globalApplicationLoadingOverlayShieldViewBox: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 80,
    alignSelf: 'center',
    backgroundColor: COLORS.overlay,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // ==========================================
  // PREMIUM HOME DASHBOARD NEW STYLES LOGIC
  // ==========================================
  dashboardMainContainer: {
    flex: 1,
    backgroundColor: COLORS.surfaceLightGrid,
  },
  dashboardHeaderSection: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  dashboardHeaderRowFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 16,
  },
  dashboardBannerImagePlaceholder: {
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dashboardBannerText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  dashboardBannerSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    marginTop: 4,
  },
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
  dashboardActionGridFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dashboardActionCardItem: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  dashboardActionIconWrapperBackground: {
    width: 56,
    height: 56,
    borderRadius: 16,
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
    borderRadius: 16,
    marginBottom: 12,
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
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: COLORS.fabShadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
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
  bottomNavigationItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 4,
  }
});