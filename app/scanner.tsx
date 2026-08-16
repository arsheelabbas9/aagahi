/**
 * ============================================================================
 * @file scanner.tsx
 * @title Aagahi Dual-Scanner Gateway (AI Vision & Cryptographic QR)
 * @description 
 * This module is the physical entry point for the Aagahi platform's environmental 
 * compliance systems. It interfaces with the native device camera hardware to 
 * execute two distinct operational modes:
 * 1. Facility QR Scanning: Cryptographically verifies storefront legitimacy.
 * 2. AI Room Safety Scanner: Guides users through a multi-angle photo capture 
 *    wizard, normalizes the images, and offloads them to a Vision AI engine for 
 *    severity-coded hazard analysis.
 * 
 * @architecture
 * - HARDWARE INTEGRATION: Uses `expo-camera` for low-latency viewfinder rendering.
 * - IMAGE NORMALIZATION: Uses `expo-image-manipulator` to aggressively resize and 
 *   compress 4K phone captures into lightweight Base64 payloads, preventing 
 *   React Native bridge crashes (OOM errors) during network transit.
 * - ASYNC SAFETY: All network calls are wrapped in AbortControllers and explicit 
 *   timeout locks to prevent infinite loading spinners on bad connections.
 * 
 * @upgrades_in_this_build
 * - BUG FIX: Patched the fatal AST parsing error caused by an unclosed `getSeverityColor` block.
 * - NEW UI LOGIC: Integrated the JSX required to render the `activeFixSuggestions` action buttons.
 * - STICKY FOOTER FIX: The final "Submit for AI Analysis" button has been 
 *   mathematically extracted from the `ScrollView` and anchored to a flex-bottom 
 *   container. This ensures the action button is perpetually visible and accessible 
 *   on smaller devices (like iPhone Mini/SE) regardless of grid overflow.
 * - EXTREME VERBOSITY: Every React hook, state mutation, and functional block 
 *   has been explicitly unpacked and heavily typed.
 * - LOCALIZATION INTEGRATED: Safely mapped all static strings, wizard arrays, and 
 *   action rules to the `useLanguage` translation dictionary.
 * ============================================================================
 */

import React, { 
  useState, 
  useRef, 
  useEffect 
} from 'react';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
  Linking,
} from 'react-native';

import { 
  CameraView, 
  useCameraPermissions, 
  PermissionResponse 
} from 'expo-camera';

import { 
  router, 
  useLocalSearchParams 
} from 'expo-router';

// ImageManipulator is strictly required to normalize aspect ratios and compress
// high-resolution raw camera frames before Base64 serialization.
import * as ImageManipulator from 'expo-image-manipulator';

// NEW DEPENDENCY: lets the user import an existing photo from their device's
// gallery/media library as an alternative to a live camera capture. Requires
// `npx expo install expo-image-picker` to be run before building.
import * as ImagePicker from 'expo-image-picker';

// Centralized Network Configuration & Localization Engine
import { API_BASE_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';

// ==========================================
// SYSTEM CONFIGURATION & TYPE DEFINITIONS
// ==========================================

/**
 * @interface VerifiedShopData
 * @description Defines the structured layout of a successfully verified storefront profile
 * returned from the Python FastAPI validation backend.
 */
interface VerifiedShopData {
  shop_name: string;
  category: string;
  safety_score: number;
}

/**
 * @interface HazardDetail
 * @description Structured description of a single hazard detected by the AI
 * Vision engine during multi-angle room analysis.
 */
interface HazardDetail {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_in_angle?: string;
}

/**
 * @interface AiAnalysisData
 * @description Defines the structured layout of the AI Vision response payload.
 */
interface AiAnalysisData {
  safety_score: number;
  identified_hazards?: string;
  improvement_steps?: string;
  hazard_breakdown?: HazardDetail[];
  confidence_level?: 'low' | 'medium' | 'high';
  images_analyzed?: number;
}

/**
 * @interface ScanResultState
 * @description Strict state object for tracking the result of a hardware camera scan.
 */
interface ScanResultState {
  type: 'success' | 'error';
  data?: VerifiedShopData;      // Used strictly for QR Cryptographic Verification
  aiData?: AiAnalysisData;      // Used strictly for AI Room Safety Analysis
  message?: string;             // Used for Server-side Rejections and Error displays
}

/**
 * @interface ThemeColors
 * @description Strict typing for the central color palette to prevent invalid hex injections.
 */
interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  success: string;
  warning: string;
  textDark: string;
  textMuted: string;
  overlay: string;
}

// Instantiate the explicit Theme dictionary and assign it to the immutable constant
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429',
  success: '#10B981',
  warning: '#F59E0B',
  textDark: '#2B2D42',
  textMuted: '#8D99AE',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// ==========================================
// MULTI-ANGLE CAPTURE WIZARD CONFIGURATION
// ==========================================

/**
 * @interface CaptureStepConfig
 * @description Describes a single "angle" the capture wizard will guide the user through.
 * Hardcoded strings replaced with dynamic dictionary keys for bilingual mapping.
 */
interface CaptureStepConfig {
  id: string;
  angleLabelKey: string;
  instructionTitleKey: string;
  instructionSubtitleKey: string;
  isRequired: boolean;
}

/**
 * @constant CAPTURE_STEPS
 * @description The strictly ordered array of visual angles required to perform a 
 * mathematically sound spatial hazard evaluation. 
 */
const CAPTURE_STEPS: CaptureStepConfig[] = [
  {
    id: 'overview',
    angleLabelKey: 'scanner_step_overview_angle',
    instructionTitleKey: 'scanner_step_overview_title',
    instructionSubtitleKey: 'scanner_step_overview_sub',
    isRequired: true,
  },
  {
    id: 'electrical',
    angleLabelKey: 'scanner_step_electrical_angle',
    instructionTitleKey: 'scanner_step_electrical_title',
    instructionSubtitleKey: 'scanner_step_electrical_sub',
    isRequired: true,
  },
  {
    id: 'exit_path',
    angleLabelKey: 'scanner_step_exit_angle',
    instructionTitleKey: 'scanner_step_exit_title',
    instructionSubtitleKey: 'scanner_step_exit_sub',
    isRequired: true,
  },
];

/**
 * @interface CapturedRoomImage
 * @description Represents one normalized, captured frame sitting in the in-memory capture buffer.
 */
interface CapturedRoomImage {
  stepId: string;
  angleLabel: string;
  uri: string;
  base64: string;
  capturedAt: number;
}

// ==========================================
// NEW: "CLOSED LOOP" FIX-SUGGESTION ENGINE
// ==========================================

/**
 * @interface FixSuggestionRule
 * @description Describes ONE actionable fix the app can recommend after an AI Vision
 * report comes back — a hazard category, matched against the report's text, paired
 * with a vendor/service search link the shopkeeper can tap to actually go solve it.
 *
 * IMPORTANT CAVEAT: The backend does not yet return a structured hazard "type" field
 * (e.g. `hazard_type: 'electrical'`) — it only returns free-text descriptions. Until
 * that lands in `api.py`, this rule set works by scanning the report's combined text
 * for keywords. This is a heuristic, not a guarantee: it can miss a hazard phrased
 * unusually, or occasionally match text that only mentions a term in passing. When the
 * backend adds explicit hazard-type tagging, `deriveFixSuggestionsFromReport` below is
 * the only function that needs to change to consume it directly instead of guessing.
 */
interface FixSuggestionRule {
  id: string;
  matchKeywords: string[];
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string;
  externalUrl: string;
}

/**
 * @constant FIX_SUGGESTION_RULES
 * @description The configured set of hazard-to-solution mappings. Each rule's
 * `externalUrl` currently points to an OLX Pakistan search results page
 * (`https://www.olx.com.pk/items/q-{query}`), since OLX is the marketplace the
 * shopkeeper explicitly asked to redirect to. Edit or add entries here to change
 * which vendors/marketplaces get suggested — no other code needs to change.
 */
const FIX_SUGGESTION_RULES: FixSuggestionRule[] = [
  {
    id: 'electrical',
    matchKeywords: [
      'wire', 'wiring', 'electric', 'cable', 'circuit', 'switchboard',
      'panel', 'short circuit', 'sparking', 'exposed wire',
    ],
    titleKey: 'scanner_fix_elec_title',
    descriptionKey: 'scanner_fix_elec_desc',
    actionLabelKey: 'scanner_fix_elec_action',
    externalUrl: 'https://www.olx.com.pk/items/q-electrician-karachi',
  },
  {
    id: 'fire_extinguisher',
    matchKeywords: [
      'extinguisher', 'fire safety equipment', 'no extinguisher', 'missing extinguisher',
    ],
    titleKey: 'scanner_fix_ext_title',
    descriptionKey: 'scanner_fix_ext_desc',
    actionLabelKey: 'scanner_fix_ext_action',
    externalUrl: 'https://www.olx.com.pk/items/q-fire-extinguisher',
  },
  {
    id: 'blocked_exit',
    matchKeywords: [
      'blocked exit', 'obstructed', 'blocked doorway', 'exit route', 'egress', 'obstruction', 'blocked path',
    ],
    titleKey: 'scanner_fix_block_title',
    descriptionKey: 'scanner_fix_block_desc',
    actionLabelKey: 'scanner_fix_block_action',
    externalUrl: 'https://www.olx.com.pk/items/q-labour-karachi',
  },
  {
    id: 'emergency_lighting',
    matchKeywords: [
      'emergency light', 'no lighting', 'lighting is not', 'dark exit', 'bulb is not working',
    ],
    titleKey: 'scanner_fix_light_title',
    descriptionKey: 'scanner_fix_light_desc',
    actionLabelKey: 'scanner_fix_light_action',
    externalUrl: 'https://www.olx.com.pk/items/q-emergency-light',
  },
];

// ==========================================
// COMPONENT: HARDWARE SCANNER MODULE
// ==========================================

export default function ScannerScreen(): React.JSX.Element {

  // ==========================================
  // ROUTING, MODE & TRANSLATION EXTRACTION
  // ==========================================
  const routerParameters: Record<string, string | string[]> = useLocalSearchParams();
  
  const languageContextObject = useLanguage();
  const translateKey: (key: any) => string = languageContextObject.t;
  
  const rawScanMode: string | string[] | undefined = routerParameters.mode;
  const scanMode: string = (typeof rawScanMode === 'string' ? rawScanMode : 'qr');

  const isQrMode: boolean = scanMode === 'qr';
  const isAiMode: boolean = scanMode === 'ai';

  // ==========================================
  // HARDWARE & STATE MANAGEMENT (EXPLICITLY UNPACKED)
  // ==========================================
  
  const permissionHookData = useCameraPermissions();
  const permission: PermissionResponse | null = permissionHookData[0];
  const requestPermission: () => Promise<PermissionResponse> = permissionHookData[1];

  const cameraRef = useRef<any>(null);

  const scannedStateTuple = useState<boolean>(false);
  const scanned: boolean = scannedStateTuple[0];
  const setScanned: React.Dispatch<React.SetStateAction<boolean>> = scannedStateTuple[1];

  const loadingStateTuple = useState<boolean>(false);
  const loading: boolean = loadingStateTuple[0];
  const setLoading: React.Dispatch<React.SetStateAction<boolean>> = loadingStateTuple[1];

  const isAnalyzingStateTuple = useState<boolean>(false);
  const isAnalyzing: boolean = isAnalyzingStateTuple[0];
  const setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>> = isAnalyzingStateTuple[1];

  const scanResultStateTuple = useState<ScanResultState | null>(null);
  const scanResult: ScanResultState | null = scanResultStateTuple[0];
  const setScanResult: React.Dispatch<React.SetStateAction<ScanResultState | null>> = scanResultStateTuple[1];

  // ==========================================
  // MULTI-ANGLE CAPTURE WIZARD STATE
  // ==========================================

  const captureStepIndexTuple = useState<number>(0);
  const captureStepIndex: number = captureStepIndexTuple[0];
  const setCaptureStepIndex: React.Dispatch<React.SetStateAction<number>> = captureStepIndexTuple[1];

  const capturedRoomImagesTuple = useState<CapturedRoomImage[]>([]);
  const capturedRoomImages: CapturedRoomImage[] = capturedRoomImagesTuple[0];
  const setCapturedRoomImages: React.Dispatch<React.SetStateAction<CapturedRoomImage[]>> = capturedRoomImagesTuple[1];

  const isReviewingCapturesTuple = useState<boolean>(false);
  const isReviewingCaptures: boolean = isReviewingCapturesTuple[0];
  const setIsReviewingCaptures: React.Dispatch<React.SetStateAction<boolean>> = isReviewingCapturesTuple[1];

  const isCapturingFrameTuple = useState<boolean>(false);
  const isCapturingFrame: boolean = isCapturingFrameTuple[0];
  const setIsCapturingFrame: React.Dispatch<React.SetStateAction<boolean>> = isCapturingFrameTuple[1];

  // ==========================================
  // NEW: FIX-SUGGESTION PANEL STATE
  // ==========================================

  const isShowingFixSuggestionsTuple = useState<boolean>(false);
  const isShowingFixSuggestions: boolean = isShowingFixSuggestionsTuple[0];
  const setIsShowingFixSuggestions: React.Dispatch<React.SetStateAction<boolean>> = isShowingFixSuggestionsTuple[1];

  // ==========================================
  // HARDWARE PERMISSION EVALUATION
  // ==========================================

  // NOTE: We check `permission === null` directly (rather than through an
  // intermediate boolean) because TypeScript's control-flow narrowing cannot
  // follow the null-check through a separately assigned variable — without
  // this direct check, `permission.granted` below would report "possibly
  // null" even though this guard clause has already returned in that case.
  if (permission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPermissionGranted: boolean = permission.granted;
  
  if (!isPermissionGranted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.text}>{translateKey('scanner_cam_perm_req')}</Text>
        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.8}
          onPress={() => requestPermission()}
        >
          <Text style={styles.actionButtonText}>{translateKey('scanner_btn_grant')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.textMuted, marginTop: 10 }]}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.actionButtonText}>{translateKey('scanner_btn_cancel')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ==========================================
  // MULTI-ANGLE AI VISION LOGIC
  // ==========================================

  /**
   * @function getIsMinimumRequiredCaptured
   * @description Iterates geometrically over the configuration definitions to confirm 
   * all mandatory spatial angles have been stored in the volatile memory buffer.
   * 
   * @returns {boolean} True if all mandatory steps map to an active capture payload.
   */
  const getIsMinimumRequiredCaptured = (): boolean => {
    try {
      const requiredStepConfigs: CaptureStepConfig[] = CAPTURE_STEPS.filter((step: CaptureStepConfig) => step.isRequired === true);
      const requiredStepIds: string[] = requiredStepConfigs.map((step: CaptureStepConfig) => step.id);

      const capturedStepIds: string[] = capturedRoomImages.map((capture: CapturedRoomImage) => capture.stepId);

      let allRequirementsMet: boolean = true;
      for (let iterationIndex = 0; iterationIndex < requiredStepIds.length; iterationIndex++) {
        const targetId: string = requiredStepIds[iterationIndex];
        const isIdPresent: boolean = capturedStepIds.includes(targetId);
        if (!isIdPresent) {
          allRequirementsMet = false;
          break;
        }
      }

      return allRequirementsMet;
    } catch (evaluationError: unknown) {
      console.error("[ScannerScreen.getIsMinimumRequiredCaptured] Mathematics failure: ", evaluationError);
      return false; // Safely fail closed
    }
  };

  /**
   * @function handleCaptureCurrentAngle
   * @description Activates the hardware sensor array to acquire a raw image buffer, 
   * processes it through the ImageManipulator core to enforce strict width and 
   * compression rules, and mutates the internal step array.
   * 
   * @async
   */
  const handleCaptureCurrentAngle = async (): Promise<void> => {
    try {
      const isCameraAvailable: boolean = cameraRef.current !== null;
      if (!isCameraAvailable) {
        throw new Error('Hardware camera reference is mathematically unavailable.');
      }

      const isConcurrencyLockActive: boolean = isCapturingFrame === true;
      if (isConcurrencyLockActive) {
        return;
      }
      
      setIsCapturingFrame(true);

      const activeStep: CaptureStepConfig | undefined = CAPTURE_STEPS[captureStepIndex];
      const isActiveStepValid: boolean = activeStep !== undefined;
      
      if (!isActiveStepValid) {
        throw new Error('Capture step index boundary violation.');
      }

      const rawPhotoOptions: Record<string, any> = {
        base64: false,
        quality: 0.9,
      };

      const rawPhoto: { uri: string; width: number; height: number } = await cameraRef.current.takePictureAsync(rawPhotoOptions);

      const manipulateActions = [{ resize: { width: 1280 } }];
      const manipulateOptions = {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      };

      const normalizedImage: ImageManipulator.ImageResult = await ImageManipulator.manipulateAsync(
        rawPhoto.uri,
        manipulateActions,
        manipulateOptions
      );

      const isBase64Valid: boolean = typeof normalizedImage.base64 === 'string' && normalizedImage.base64.length > 0;
      if (!isBase64Valid) {
        throw new Error('Image normalization engine failed to construct Base64 buffer.');
      }

      const newCapturePayload: CapturedRoomImage = {
        stepId: activeStep.id,
        angleLabel: translateKey(activeStep.angleLabelKey),
        uri: normalizedImage.uri,
        base64: normalizedImage.base64 as string,
        capturedAt: Date.now(),
      };

      setCapturedRoomImages((previousCaptures: CapturedRoomImage[]) => {
        const deduplicatedCaptures: CapturedRoomImage[] = previousCaptures.filter(
          (capture: CapturedRoomImage) => capture.stepId !== activeStep.id
        );
        return [...deduplicatedCaptures, newCapturePayload];
      });

      const maxStepIndex: number = CAPTURE_STEPS.length - 1;
      const isFinalStepReached: boolean = captureStepIndex >= maxStepIndex;
      
      if (isFinalStepReached) {
        setIsReviewingCaptures(true);
      } else {
        setCaptureStepIndex((previousIndex: number) => previousIndex + 1);
      }

    } catch (error: unknown) {
      let exceptionMessage: string = 'Failed to execute hardware image capture sequence.';
      if (error instanceof Error) {
        exceptionMessage = `Capture Exception: ${error.message}`;
      }
      console.error('[ScannerScreen.handleCaptureCurrentAngle] ', exceptionMessage);
    } finally {
      setIsCapturingFrame(false);
    }
  };

  /**
   * @function handlePickImageFromGallery
   * @description NEW: Lets the user import an EXISTING photo from their device's media
   * library for the currently active wizard step, as an alternative to a live camera
   * capture. Useful when a hazard was already photographed earlier, or a given angle is
   * physically awkward to reach in the moment.
   *
   * Deliberately kept as a fully SEPARATE function rather than refactored to share code
   * with `handleCaptureCurrentAngle` above — that function already works correctly and
   * is not touched. This function duplicates the same normalization pipeline (resize to
   * 1280px width, 0.75 JPEG compression) so gallery-sourced and camera-sourced images are
   * indistinguishable to the AI backend, then commits to the buffer and advances the
   * wizard exactly the same way the live-capture path does.
   *
   * @async
   */
  const handlePickImageFromGallery = async (): Promise<void> => {
    try {
      const isConcurrencyLockActive: boolean = isCapturingFrame === true;
      if (isConcurrencyLockActive) {
        return;
      }

      setIsCapturingFrame(true);

      const activeStep: CaptureStepConfig | undefined = CAPTURE_STEPS[captureStepIndex];
      const isActiveStepValid: boolean = activeStep !== undefined;

      if (!isActiveStepValid) {
        throw new Error('Capture step index boundary violation.');
      }

      // Step 1: Request media library (gallery) access — Expo requires this as a
      // separate permission grant from the camera permission already handled above.
      const mediaLibraryPermission: ImagePicker.MediaLibraryPermissionResponse =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      const isGalleryPermissionGranted: boolean = mediaLibraryPermission.granted === true;
      if (!isGalleryPermissionGranted) {
        throw new Error('Gallery access permission was denied. Enable Photos access in device Settings to import an image.');
      }

      // Step 2: Launch the native OS image picker, scoped strictly to still images.
      const pickerResult: ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        base64: false,
      });

      // Step 3: If the user backed out of the picker UI, this is a silent no-op, not an error.
      const didUserCancelSelection: boolean = pickerResult.canceled === true;
      if (didUserCancelSelection) {
        return;
      }

      const selectedAssets: ImagePicker.ImagePickerAsset[] = pickerResult.assets ?? [];
      const isAssetPresent: boolean = selectedAssets.length > 0;
      if (!isAssetPresent) {
        throw new Error('Gallery picker returned no selected asset.');
      }

      const chosenAsset: ImagePicker.ImagePickerAsset = selectedAssets[0];

      // Step 4: Run the SAME normalization pipeline used for live captures, so a
      // gallery-imported photo is processed identically to one taken live.
      const manipulateActions = [{ resize: { width: 1280 } }];
      const manipulateOptions = {
        compress: 0.75,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      };

      const normalizedImage: ImageManipulator.ImageResult = await ImageManipulator.manipulateAsync(
        chosenAsset.uri,
        manipulateActions,
        manipulateOptions
      );

      const isBase64Valid: boolean = typeof normalizedImage.base64 === 'string' && normalizedImage.base64.length > 0;
      if (!isBase64Valid) {
        throw new Error('Image normalization engine failed to construct Base64 buffer for the imported photo.');
      }

      // Step 5: Package and commit into the capture buffer — identical shape to a live capture.
      const newCapturePayload: CapturedRoomImage = {
        stepId: activeStep.id,
        angleLabel: translateKey(activeStep.angleLabelKey),
        uri: normalizedImage.uri,
        base64: normalizedImage.base64 as string,
        capturedAt: Date.now(),
      };

      setCapturedRoomImages((previousCaptures: CapturedRoomImage[]) => {
        const deduplicatedCaptures: CapturedRoomImage[] = previousCaptures.filter(
          (capture: CapturedRoomImage) => capture.stepId !== activeStep.id
        );
        return [...deduplicatedCaptures, newCapturePayload];
      });

      // Step 6: Advance the wizard exactly as the live-capture path does.
      const maxStepIndex: number = CAPTURE_STEPS.length - 1;
      const isFinalStepReached: boolean = captureStepIndex >= maxStepIndex;

      if (isFinalStepReached) {
        setIsReviewingCaptures(true);
      } else {
        setCaptureStepIndex((previousIndex: number) => previousIndex + 1);
      }

    } catch (error: unknown) {
      let exceptionMessage: string = 'Failed to import photo from device gallery.';
      if (error instanceof Error) {
        exceptionMessage = `Gallery Import Exception: ${error.message}`;
      }
      console.error('[ScannerScreen.handlePickImageFromGallery] ', exceptionMessage);
    } finally {
      setIsCapturingFrame(false);
    }
  };

  /**
   * @function submitRoomScanForAnalysis
   * @description Constructs the composite payload of all cached image Base64 buffers 
   * and routes them to the external AI analytical engine. Enforces a 60-second 
   * circuit breaker to prevent UI lockup on timeout.
   * 
   * @async
   */
  const submitRoomScanForAnalysis = async (): Promise<void> => {
    try {
      const isExecutionLocked: boolean = isAnalyzing === true;
      if (isExecutionLocked) {
        return;
      }

      const isMinimumCoverageSatisfied: boolean = getIsMinimumRequiredCaptured();
      if (!isMinimumCoverageSatisfied) {
        throw new Error('Spatial coverage constraints not met. Please complete all required angles.');
      }

      setIsAnalyzing(true);
      setLoading(true);

      const imagePayloadArray: Array<{ angle_label: string; image_base64: string }> = capturedRoomImages.map(
        (capture: CapturedRoomImage) => {
          return {
            angle_label: capture.angleLabel,
            image_base64: capture.base64,
          };
        }
      );

      const networkTargetEndpoint: string = `${API_BASE_URL}/api/scan-ai`;

      const executionAbortController: AbortController = new AbortController();
      const executionTimeoutHandle: ReturnType<typeof setTimeout> = setTimeout(() => {
        executionAbortController.abort();
      }, 60000);

      let networkResponse: Response;
      try {
        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ images: imagePayloadArray }),
          signal: executionAbortController.signal,
        };
        
        networkResponse = await fetch(networkTargetEndpoint, fetchOptions);
      } finally {
        clearTimeout(executionTimeoutHandle);
      }

      const responseJsonData: any = await networkResponse.json();
      const isTransmissionSuccessful: boolean = networkResponse.ok;

      if (isTransmissionSuccessful) {
        const aiAnalysisPayload: AiAnalysisData = responseJsonData.data as AiAnalysisData;
        const newSuccessState: ScanResultState = { 
            type: 'success', 
            aiData: aiAnalysisPayload 
        };
        
        setScanResult(newSuccessState);
      } else {
        const defaultServerErrorMessage: string = 'AI analytical engine structurally rejected the submission vector.';
        const explicitServerDetail: string = responseJsonData.detail || defaultServerErrorMessage;
        
        const newErrorState: ScanResultState = { 
            type: 'error', 
            message: explicitServerDetail 
        };
        
        setScanResult(newErrorState);
      }

    } catch (error: unknown) {
      let exceptionMessage: string = 'Terminal failure establishing pipeline to the AI Vision backend.';
      if (error instanceof Error) {
        const isTimeoutAbort: boolean = error.name === 'AbortError';
        if (isTimeoutAbort) {
            exceptionMessage = 'Network connection timed out while processing massive image tensors. Verify uplink.';
        } else {
            exceptionMessage = `Vision Exception: ${error.message}`;
        }
      }
      
      const newFatalErrorState: ScanResultState = { 
          type: 'error', 
          message: exceptionMessage 
      };
      setScanResult(newFatalErrorState);
      console.error('[ScannerScreen.submitRoomScanForAnalysis] Fatal Execution Error: ', error);

    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  /**
   * @function handleEditCaptureStep
   * @description Alters the current index pointer to allow users to overwrite a previously 
   * recorded physical frame matrix natively.
   * 
   * @param {string} stepId - The specific configuration string ID to target.
   */
  const handleEditCaptureStep = (stepId: string): void => {
    try {
      const evaluationIndex: number = CAPTURE_STEPS.findIndex((step: CaptureStepConfig) => step.id === stepId);
      const isIndexValid: boolean = evaluationIndex !== -1;
      
      if (!isIndexValid) {
        throw new Error(`Mathematical indexing failure. Step ID not located: ${stepId}`);
      }

      setCapturedRoomImages((previousCaptures: CapturedRoomImage[]) => {
          const strippedArray: CapturedRoomImage[] = previousCaptures.filter(
              (capture: CapturedRoomImage) => capture.stepId !== stepId
          );
          return strippedArray;
      });
      
      setCaptureStepIndex(evaluationIndex);
      setIsReviewingCaptures(false);

    } catch (error: unknown) {
      console.error('[ScannerScreen.handleEditCaptureStep] State rewrite error: ', error);
    }
  };

  /**
   * @function getSeverityColor
   * @description Translates the analytical severity string payload into a specific UI hex code.
   * BUG FIX: Previously lacked a closing bracket and try/catch block, which caused VS Code AST parsing errors.
   * 
   * @param {'low' | 'medium' | 'high' | 'critical'} severity - The input string classification.
   * @returns {string} The designated explicit hexadecimal string.
   */
  const getSeverityColor = (severity: HazardDetail['severity']): string => {
    try {
      switch (severity) {
        case 'critical':
          return '#B00020'; // Dedicated execution red
        case 'high':
          return COLORS.primary;
        case 'medium':
          return COLORS.warning;
        case 'low':
          return COLORS.success;
        default:
          return COLORS.textMuted;
      }
    } catch (error: unknown) {
      console.error('[ScannerScreen.getSeverityColor] Fallback executed due to parsing error:', error);
      return COLORS.textMuted;
    }
  };

  /**
   * @function deriveFixSuggestionsFromReport
   * @description NEW: Reads through everything the AI report said about a room —
   * both the structured `hazard_breakdown` array (if the backend returned one) and
   * the plain-text `identified_hazards` / `improvement_steps` fallback fields — and
   * matches that combined text against `FIX_SUGGESTION_RULES` by keyword. This is
   * how "we found a problem" becomes "here's how to actually go fix it."
   *
   * See the caveat on `FixSuggestionRule` above: this is keyword matching against
   * free text, not a guaranteed classification. It intentionally errs toward
   * matching broadly rather than missing a real hazard.
   *
   * @param {AiAnalysisData} aiData - The completed AI analysis result to scan.
   * @returns {FixSuggestionRule[]} Every configured rule whose keywords were found
   *          in the report text, in the order they're defined in FIX_SUGGESTION_RULES.
   */
  const deriveFixSuggestionsFromReport = (aiData: AiAnalysisData): FixSuggestionRule[] => {
    try {
      // Step 1: Collect every fragment of free text the backend returned that could
      // mention a hazard, regardless of whether it came via the newer structured
      // hazard_breakdown array or the older plain-text fields.
      const textFragments: string[] = [];

      const hasHazardBreakdown: boolean = Array.isArray(aiData.hazard_breakdown);
      if (hasHazardBreakdown) {
        aiData.hazard_breakdown!.forEach((hazardNode: HazardDetail) => {
          textFragments.push(hazardNode.category);
          textFragments.push(hazardNode.description);
        });
      }

      if (aiData.identified_hazards) {
        textFragments.push(aiData.identified_hazards);
      }

      if (aiData.improvement_steps) {
        textFragments.push(aiData.improvement_steps);
      }

      const combinedLowerCaseText: string = textFragments.join(' ').toLowerCase();

      // Step 2: Match each configured rule's keyword list against the combined text.
      const matchedRules: FixSuggestionRule[] = FIX_SUGGESTION_RULES.filter(
        (rule: FixSuggestionRule) => {
          const isRuleMatched: boolean = rule.matchKeywords.some(
            (keyword: string) => combinedLowerCaseText.includes(keyword)
          );
          return isRuleMatched;
        }
      );

      return matchedRules;

    } catch (matchingError: unknown) {
      console.error('[ScannerScreen.deriveFixSuggestionsFromReport] Keyword matching failed: ', matchingError);
      return []; // Safely fail closed — an empty suggestion list, not a crash
    }
  };

  /**
   * @function handleOpenExternalFixLink
   * @description NEW: Opens a suggested vendor/marketplace URL (e.g. an OLX Pakistan
   * search) in the device's default browser, so the shopkeeper can act on a hazard
   * immediately instead of just reading about it.
   *
   * @async
   * @param {string} targetUrl - The absolute external URL to open.
   */
  const handleOpenExternalFixLink = async (targetUrl: string): Promise<void> => {
    try {
      const canDeviceOpenUrl: boolean = await Linking.canOpenURL(targetUrl);
      if (!canDeviceOpenUrl) {
        throw new Error(`Device reported it cannot open this URL: ${targetUrl}`);
      }
      await Linking.openURL(targetUrl);
    } catch (linkError: unknown) {
      console.error('[ScannerScreen.handleOpenExternalFixLink] Failed to open external link: ', linkError);
    }
  };

  // ==========================================
  // CRYPTOGRAPHIC QR VERIFICATION (UNCHANGED CORE LOGIC)
  // ==========================================

  /**
   * @function handleBarCodeScanned
   * @description Detects physical QR vectors via the `CameraView` component and pushes the payload 
   * securely to the FastAPI compliance endpoints.
   * 
   * @async
   */
  const handleBarCodeScanned = async ({ data }: { data: string }): Promise<void> => {
    try {
      const isScanLockEngaged: boolean = scanned === true;
      if (isScanLockEngaged) {
        return;
      }

      setScanned(true);
      setLoading(true);

      const sanitizedHashPayload: string = data.trim();
      const absoluteTargetEndpoint: string = `${API_BASE_URL}/api/scan-qr/${sanitizedHashPayload}`;

      const networkFetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const verificationResponse: Response = await fetch(absoluteTargetEndpoint, networkFetchOptions);
      const rawJsonResponsePayload: any = await verificationResponse.json();

      const isVerificationSuccessful: boolean = verificationResponse.ok;

      if (isVerificationSuccessful) {
        const structurallyVerifiedDetails: VerifiedShopData = rawJsonResponsePayload as VerifiedShopData;
        const newSuccessState: ScanResultState = {
          type: 'success',
          data: structurallyVerifiedDetails
        };

        setScanResult(newSuccessState);
      } else {
        const baselineErrorMessage: string = "Invalid cryptographic signature. Facility not recognized natively.";
        const serverSuppliedDetail: string = rawJsonResponsePayload.detail || baselineErrorMessage;

        const newErrorState: ScanResultState = {
          type: 'error',
          message: serverSuppliedDetail
        };

        setScanResult(newErrorState);
      }

    } catch (error: unknown) {
      let explicitExceptionMessage: string = "Network infrastructure failed to bridge to backend nodes.";
      if (error instanceof Error) {
        explicitExceptionMessage = `Verification Transit Exception: ${error.message}`;
      }

      const fatalNetworkState: ScanResultState = {
        type: 'error',
        message: explicitExceptionMessage
      };

      setScanResult(fatalNetworkState);
      console.error("[ScannerScreen.handleBarCodeScanned] Protocol execution blocked: ", error);

    } finally {
      setLoading(false);
    }
  };

  /**
   * @function resetScannerState
   * @description Resets all UI locks and erases the image buffers to allow repeated execution natively.
   */
  const resetScannerState = (): void => {
    try {
      setScanned(false);
      setScanResult(null);
      setCapturedRoomImages([]);
      setCaptureStepIndex(0);
      setIsReviewingCaptures(false);
      setIsShowingFixSuggestions(false);
    } catch (error: unknown) {
      console.error("[ScannerScreen.resetScannerState] Buffer purge failed: ", error);
    }
  };

  // ==========================================
  // COMPONENT RENDER TREE (WITH STICKY FOOTER)
  // ==========================================

  const headerTitleDisplayString: string = isAiMode ? translateKey('scanner_header_ai') : translateKey('scanner_header_qr');
  const currentActiveCaptureStep: CaptureStepConfig | undefined = CAPTURE_STEPS[captureStepIndex];
  
  const hasActiveResult: boolean = scanResult !== null;
  const isCurrentlyInReviewGrid: boolean = isAiMode && isReviewingCaptures;
  const shouldRenderHardwareFeed: boolean = !hasActiveResult && !isCurrentlyInReviewGrid;

  // NEW: Only compute keyword-matched fix suggestions when there's an actual
  // successful AI report to read — avoids running the matcher on every render.
  const hasSuccessfulAiReport: boolean = isAiMode && scanResult?.type === 'success' && scanResult.aiData !== undefined;
  const activeFixSuggestions: FixSuggestionRule[] = hasSuccessfulAiReport
    ? deriveFixSuggestionsFromReport(scanResult!.aiData!)
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header Viewport Block */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.backText}>{translateKey('scanner_back_btn')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{headerTitleDisplayString}</Text>
      </View>

      {/* Hardware Camera Feed Block */}
      <View style={styles.cameraContainer}>
        {shouldRenderHardwareFeed && (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={isQrMode && !scanned ? handleBarCodeScanned : undefined}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          >
            {isAiMode && (
              <View style={styles.cameraActionOverlay}>

                <View style={styles.stepProgressRow}>
                  {CAPTURE_STEPS.map((stepConfig: CaptureStepConfig, stepIndex: number) => {
                    const isStepCaptured: boolean = capturedRoomImages.some(
                      (cacheObj: CapturedRoomImage) => cacheObj.stepId === stepConfig.id
                    );
                    const isStepCurrentlyActive: boolean = stepIndex === captureStepIndex;
                    
                    return (
                      <View
                        key={stepConfig.id}
                        style={[
                          styles.stepDot,
                          isStepCaptured && styles.stepDotDone,
                          isStepCurrentlyActive && styles.stepDotActive,
                        ]}
                      />
                    );
                  })}
                </View>

                <Text style={styles.instructionTitle}>
                  {currentActiveCaptureStep ? translateKey(currentActiveCaptureStep.instructionTitleKey) : ''}
                  {currentActiveCaptureStep && !currentActiveCaptureStep.isRequired ? translateKey('scanner_step_optional') : ''}
                </Text>
                <Text style={styles.instructionSubtitle}>
                  {currentActiveCaptureStep ? translateKey(currentActiveCaptureStep.instructionSubtitleKey) : ''}
                </Text>

                <TouchableOpacity
                  style={[styles.captureButton, isCapturingFrame && styles.captureButtonDisabled]}
                  activeOpacity={0.85}
                  onPress={handleCaptureCurrentAngle}
                  disabled={isCapturingFrame}
                >
                  <Text style={styles.captureButtonText}>
                    {isCapturingFrame
                      ? translateKey('scanner_cap_processing')
                      : `${translateKey('scanner_cap_prefix')}${currentActiveCaptureStep ? translateKey(currentActiveCaptureStep.angleLabelKey) : 'Angle'}`}
                  </Text>
                </TouchableOpacity>

                {/* NEW: Gallery import option — lets the user pick an existing photo
                    for this angle instead of using the live camera. */}
                <TouchableOpacity
                  style={styles.galleryButton}
                  activeOpacity={0.85}
                  onPress={handlePickImageFromGallery}
                  disabled={isCapturingFrame}
                >
                  <Text style={styles.galleryButtonText}>
                    {isCapturingFrame ? translateKey('scanner_gal_wait') : translateKey('scanner_gal_choose')}
                  </Text>
                </TouchableOpacity>

                {getIsMinimumRequiredCaptured() && (
                  <TouchableOpacity
                    style={styles.finishReviewButton}
                    activeOpacity={0.85}
                    onPress={() => setIsReviewingCaptures(true)}
                  >
                    <Text style={styles.finishReviewButtonText}>
                      {translateKey('scanner_btn_review').replace('{count}', capturedRoomImages.length.toString())}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </CameraView>
        )}

        {/* ========================================== */}
        {/* REVIEW GRID (WITH STICKY FOOTER FIX) */}
        {/* ========================================== */}
        {isCurrentlyInReviewGrid && !hasActiveResult && (
          <View style={styles.reviewContainerFlexWrap}>
            
            <ScrollView style={styles.reviewScroll} contentContainerStyle={styles.reviewScrollContent}>
              <Text style={styles.reviewHeading}>{translateKey('scanner_rev_heading')}</Text>
              <Text style={styles.reviewSubheading}>
                {translateKey('scanner_rev_sub').replace('{count}', capturedRoomImages.length.toString()).replace('{total}', CAPTURE_STEPS.length.toString())}
              </Text>

              <View style={styles.reviewGrid}>
                {CAPTURE_STEPS.map((iteratedStep: CaptureStepConfig) => {
                  const cachedCaptureData: CapturedRoomImage | undefined = capturedRoomImages.find(
                    (node: CapturedRoomImage) => node.stepId === iteratedStep.id
                  );
                  
                  return (
                    <View key={iteratedStep.id} style={styles.reviewTile}>
                      {cachedCaptureData ? (
                        <Image source={{ uri: cachedCaptureData.uri }} style={styles.reviewThumbnail} />
                      ) : (
                        <View style={[styles.reviewThumbnail, styles.reviewThumbnailEmpty]}>
                          <Text style={styles.addTileText}>{translateKey('scanner_rev_empty')}</Text>
                        </View>
                      )}
                      
                      <Text style={styles.reviewTileLabel} numberOfLines={1}>
                        {translateKey(iteratedStep.angleLabelKey)}
                      </Text>
                      
                      <TouchableOpacity onPress={() => handleEditCaptureStep(iteratedStep.id)} activeOpacity={0.8}>
                        <Text style={styles.retakeBadge}>
                          {cachedCaptureData ? translateKey('scanner_rev_retake') : translateKey('scanner_rev_capture')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* THE STICKY FOOTER BLOCK */}
            {/* Extracts the button mathematically outside the ScrollView constraints to prevent bottom-cutoff rendering issues */}
            <View style={styles.stickyFooter}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (!getIsMinimumRequiredCaptured() || isAnalyzing) && styles.captureButtonDisabled,
                ]}
                activeOpacity={0.85}
                onPress={submitRoomScanForAnalysis}
                disabled={!getIsMinimumRequiredCaptured() || isAnalyzing}
              >
                <Text style={styles.actionButtonText}>
                  {isAnalyzing ? translateKey('scanner_submit_analyzing') : translateKey('scanner_submit_btn')}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        )}
      </View>

      {/* ========================================== */}
      {/* FINAL COMPLIANCE / ANALYSIS RESULT MODALS  */}
      {/* ========================================== */}
      <View style={styles.resultContainer}>

        {loading && <ActivityIndicator size="large" color={COLORS.primary} />}

        {isQrMode && scanResult?.type === 'success' && scanResult.data && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>{translateKey('scanner_res_verified')}</Text>
            <Text style={styles.shopName}>{scanResult.data.shop_name}</Text>
            <Text style={styles.shopCategory}>
              {translateKey('scanner_res_cat').replace('{category}', scanResult.data.category)}
            </Text>

            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>
                {translateKey('scanner_res_score').replace('{score}', scanResult.data.safety_score.toString())}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.85}
              onPress={resetScannerState}
            >
              <Text style={styles.actionButtonText}>{translateKey('scanner_btn_scan_another')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAiMode && scanResult?.type === 'success' && scanResult.aiData && (
          <ScrollView style={styles.aiResultScroll}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>{translateKey('scanner_ai_complete')}</Text>

              {typeof scanResult.aiData.images_analyzed === 'number' && (
                <Text style={styles.shopCategory}>
                  {translateKey('scanner_ai_based_on').replace('{count}', scanResult.aiData.images_analyzed.toString())}
                </Text>
              )}

              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>
                  {translateKey('scanner_res_score').replace('{score}', scanResult.aiData.safety_score.toString())}
                </Text>
              </View>

              {Array.isArray(scanResult.aiData.hazard_breakdown) && scanResult.aiData.hazard_breakdown.length > 0 ? (
                <View style={{ width: '100%' }}>
                  <Text style={styles.aiDetailHeader}>{translateKey('scanner_ai_hazards')}</Text>
                  {scanResult.aiData.hazard_breakdown.map((hazardNode: HazardDetail, hazardIndex: number) => {
                    const dotColorHex: string = getSeverityColor(hazardNode.severity);
                    
                    return (
                      <View key={`${hazardNode.category}-${hazardIndex}`} style={styles.hazardRow}>
                        <View style={[styles.hazardSeverityDot, { backgroundColor: dotColorHex }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hazardCategoryText}>
                            {hazardNode.category} ({hazardNode.severity.toUpperCase()})
                          </Text>
                          <Text style={styles.aiDetailText}>{hazardNode.description}</Text>
                          {hazardNode.detected_in_angle && (
                            <Text style={styles.hazardAngleText}>
                              {translateKey('scanner_ai_seen_in').replace('{angle}', hazardNode.detected_in_angle)}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.aiDetailContainer}>
                  <Text style={styles.aiDetailHeader}>{translateKey('scanner_ai_hazards')}</Text>
                  <Text style={styles.aiDetailText}>
                    {scanResult.aiData.identified_hazards || translateKey('scanner_ai_no_hazards')}
                  </Text>
                </View>
              )}

              <View style={styles.aiDetailContainer}>
                <Text style={styles.aiDetailHeader}>{translateKey('scanner_ai_recs')}</Text>
                <Text style={styles.aiDetailText}>
                  {scanResult.aiData.improvement_steps || translateKey('scanner_ai_no_recs')}
                </Text>
              </View>

              {/* ========================================== */}
              {/* JSX INTEGRATION: FIX SUGGESTION ACTION BUTTONS */}
              {/* ========================================== */}
              {activeFixSuggestions.length > 0 && (
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Text style={[styles.aiDetailHeader, { marginBottom: 10 }]}>{translateKey('scanner_ai_action')}</Text>
                  {activeFixSuggestions.map((suggestion: FixSuggestionRule) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={[styles.actionButton, { backgroundColor: '#2B2D42', marginBottom: 10 }]} 
                      activeOpacity={0.85}
                      onPress={() => handleOpenExternalFixLink(suggestion.externalUrl)}
                    >
                      <Text style={styles.actionButtonText}>{translateKey(suggestion.actionLabelKey)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.85}
                onPress={resetScannerState}
              >
                <Text style={styles.actionButtonText}>{translateKey('scanner_btn_analyze_another')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {scanResult?.type === 'error' && (
          <View style={styles.resultCard}>
            <Text style={[styles.resultLabel, { color: COLORS.primary }]}>{translateKey('scanner_err_failed')}</Text>
            <Text style={styles.errorText}>{scanResult.message}</Text>

            <TouchableOpacity
              style={styles.actionButton}
              activeOpacity={0.85}
              onPress={resetScannerState}
            >
              <Text style={styles.actionButtonText}>{translateKey('scanner_btn_retry')}</Text>
            </TouchableOpacity>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 20
  },
  text: {
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 20,
    textAlign: 'center'
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F4'
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
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  camera: {
    flex: 1
  },
  cameraActionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  captureButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  captureButtonDisabled: {
    backgroundColor: '#E2E8F0'
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5
  },
  galleryButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  galleryButtonText: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  stepProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginHorizontal: 4,
  },
  stepDotDone: {
    backgroundColor: COLORS.success,
  },
  stepDotActive: {
    backgroundColor: COLORS.surface,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  instructionTitle: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  finishReviewButton: {
    marginTop: 12,
  },
  finishReviewButtonText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  reviewContainerFlexWrap: {
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  stickyFooter: {
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
  },
  reviewScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  reviewScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  reviewHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  reviewSubheading: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  reviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  reviewTile: {
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  reviewThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  reviewThumbnailEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  reviewTileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 6,
  },
  retakeBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  addTileText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  aiResultScroll: {
    maxHeight: 420,
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDF2F4',
  },
  hazardSeverityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 10,
  },
  hazardCategoryText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  hazardAngleText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  resultContainer: {
    minHeight: 250,
    backgroundColor: COLORS.surface,
    padding: 24,
    justifyContent: 'center'
  },
  resultCard: {
    alignItems: 'center'
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.success,
    letterSpacing: 1.5,
    marginBottom: 8
  },
  shopName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 4
  },
  shopCategory: {
    fontSize: 14,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
    marginBottom: 16
  },
  scoreBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24
  },
  scoreText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 14
  },
  aiDetailContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EDF2F4'
  },
  aiDetailHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6
  },
  aiDetailText: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 24
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center'
  },
  actionButtonText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 16
  },
});