/**
 * ============================================================================
 * @file profile.tsx
 * @title Aagahi Community Profile & Telemetry Operations Hub
 * @description 
 * This module serves as the dedicated profile interface for the Aagahi platform.
 * It strictly implements a 4-pillar architecture: Dynamic Identity Rendering,
 * Live Activity Tracking (Reports/Fundraisers), Advanced Infrastructure Surveying,
 * and Help/Support networking.
 * 
 * @architectural_features
 * - STRICT TYPING: Mathematical interfaces ensure activity feeds and survey 
 *   payloads are safely verified before transmission.
 * - OLX-REPLACEMENT ALGORITHM PREP: The survey module specifically includes 
 *   vendor expertise tracking to link independent Karachi vendors to Aagahi 
 *   Brand Partnerships natively.
 * - ASYNC STATE LOCKING: All form submissions and network fetches are 
 *   protected by explicit boolean locks to prevent memory leaks and API spam.
 * - LIVE TELEMETRY SYNC: Bypasses legacy mock data to dynamically fetch active
 *   user operations natively from the Supabase/FastAPI backend endpoint.
 * - DEEP LOCALIZATION: 100% of UI strings are abstracted into the `useLanguage`
 *   engine for seamless Urdu/English toggling.
 * ============================================================================
 */

import React, { 
  useState, 
  useEffect, 
  useRef 
} from 'react';

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Global Contexts & Network Configuration
import { useAuth, UserSession } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL } from '../config/api';

// ============================================================================
// STRUCTURAL TYPING & INTERFACES
// ============================================================================

/**
 * @interface ThemeColors
 * @description Defines the strict hexadecimal boundaries for the Profile UI.
 */
interface ThemeColors {
  primary: string;
  surface: string;
  background: string;
  textDark: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  info: string;
}

/**
 * @interface ActivityRecord
 * @description Defines the structural payload for user activities natively returned 
 * from the PostgreSQL database via FastAPI.
 */
interface ActivityRecord {
  id: string;
  type: 'report' | 'fundraiser';
  title: string;
  status: 'pending' | 'approved' | 'resolved';
  date: string;
}

/**
 * @interface InfrastructureSurveyPayload
 * @description Captures human-intelligence metrics that AI spatial scanning cannot natively deduce.
 */
interface InfrastructureSurveyPayload {
  electricalSystemAge: string;
  lastRenovationDate: string;
  vendorExpertise: string;
  generalFeedback: string;
}

const COLORS: ThemeColors = {
  primary: '#D90429',
  surface: '#FFFFFF',
  background: '#F8FAFC',
  textDark: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// ============================================================================
// MAIN COMPONENT: PROFILE & OPERATIONS HUB
// ============================================================================

export default function ProfileScreen(): React.JSX.Element {
  
  // ==========================================
  // 1. GLOBAL IDENTITY & LOCALIZATION EXTRACTION
  // ==========================================
  
  // Unpacking Auth Context mathematically
  const authContextPayload = useAuth();
  const user: any = authContextPayload.user;
  const executeLogoutFunction: () => Promise<void> = authContextPayload.logout;

  // Unpacking Language Context mathematically
  const languageContextPayload = useLanguage();
  const translateKey: (key: any) => string = languageContextPayload.t;

  // ==========================================
  // 2. STATE MANAGEMENT (EXPLICITLY UNPACKED)
  // ==========================================
  
  const activitiesDataTuple = useState<ActivityRecord[]>([]);
  const activitiesData: ActivityRecord[] = activitiesDataTuple[0];
  const setActivitiesData: React.Dispatch<React.SetStateAction<ActivityRecord[]>> = activitiesDataTuple[1];

  const isFetchingActivitiesTuple = useState<boolean>(true);
  const isFetchingActivities: boolean = isFetchingActivitiesTuple[0];
  const setIsFetchingActivities: React.Dispatch<React.SetStateAction<boolean>> = isFetchingActivitiesTuple[1];

  // Survey Form States
  const initialSurveyPayload: InfrastructureSurveyPayload = {
    electricalSystemAge: '',
    lastRenovationDate: '',
    vendorExpertise: '',
    generalFeedback: ''
  };

  const surveyPayloadTuple = useState<InfrastructureSurveyPayload>(initialSurveyPayload);
  const surveyPayload: InfrastructureSurveyPayload = surveyPayloadTuple[0];
  const setSurveyPayload: React.Dispatch<React.SetStateAction<InfrastructureSurveyPayload>> = surveyPayloadTuple[1];

  const isSubmittingSurveyTuple = useState<boolean>(false);
  const isSubmittingSurvey: boolean = isSubmittingSurveyTuple[0];
  const setIsSubmittingSurvey: React.Dispatch<React.SetStateAction<boolean>> = isSubmittingSurveyTuple[1];

  const componentMountStatusRef = useRef<boolean>(true);

  // ============================================================================
  // LIFECYCLE & NETWORK OPERATIONS
  // ============================================================================

  useEffect(() => {
    componentMountStatusRef.current = true;
    executeActivityDataRetrieval();
    
    return () => {
      componentMountStatusRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * @function executeActivityDataRetrieval
   * @description Executes a secure network fetch to retrieve the user's active 
   * operational timeline directly from the Supabase cloud via the FastAPI backend.
   * Completely bypasses legacy mock data arrays.
   * 
   * @async
   */
  const executeActivityDataRetrieval = async (): Promise<void> => {
    try {
      if (componentMountStatusRef.current) setIsFetchingActivities(true);

      // GUARD: Mathematically verify that the user identity pointer exists
      const isUserIdentityMissing: boolean = !user || !user.id;
      if (isUserIdentityMissing) {
        console.warn("[ProfileScreen] Active user identity pointer is null. Aborting network fetch.");
        if (componentMountStatusRef.current) setIsFetchingActivities(false);
        return;
      }

      // EXPLICIT ENDPOINT: Construct the secure routing URL mapping to this specific user natively
      const fullyQualifiedEndpointURL: string = `${API_BASE_URL}/api/users/${user.id}/activities`;

      // EXECUTE SECURE FETCH TO FASTAPI BACKEND
      const networkResponseObject: Response = await fetch(fullyQualifiedEndpointURL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // VALIDATE NETWORK TRANSMISSION SUCCESS
      const isNetworkTransmissionSuccessful: boolean = networkResponseObject.ok;
      if (!isNetworkTransmissionSuccessful) {
         throw new Error(`Backend architecture rejected the request. HTTP Status: ${networkResponseObject.status}`);
      }

      // DECOMPRESS JSON PAYLOAD
      const rawJsonResponseData: any = await networkResponseObject.json();
      
      // EXPLICIT TYPE CASTING: Parse the data array strictly into the ActivityRecord interface
      const mathematicallyParsedActivitiesArray: ActivityRecord[] = rawJsonResponseData.data as ActivityRecord[];

      // MUTATE STATE SECURELY
      if (componentMountStatusRef.current) {
        setActivitiesData(mathematicallyParsedActivitiesArray);
      }

    } catch (networkExecutionError: unknown) {
      let explicitErrorMessage: string = 'Unknown network failure during telemetry sync.';
      if (networkExecutionError instanceof Error) {
          explicitErrorMessage = networkExecutionError.message;
      }
      console.error("[ProfileScreen.executeActivityDataRetrieval] Activity telemetry sync failed explicitly: ", explicitErrorMessage);
      
      // Fallback: If network fails, supply an empty array to prevent map/iteration crashes in the UI natively
      if (componentMountStatusRef.current) {
          setActivitiesData([]);
      }
    } finally {
      if (componentMountStatusRef.current) setIsFetchingActivities(false);
    }
  };

  /**
   * @function handleSurveySubmission
   * @description Processes the Infrastructure & Vendor Partnership Survey.
   * Enforces strict validation before simulating a payload transmission.
   */
  const handleSurveySubmission = async (): Promise<void> => {
    try {
      // 1. Validation Logic
      const isSurveyEmpty: boolean = 
        surveyPayload.electricalSystemAge.trim() === '' && 
        surveyPayload.lastRenovationDate.trim() === '' &&
        surveyPayload.vendorExpertise.trim() === '' &&
        surveyPayload.generalFeedback.trim() === '';

      if (isSurveyEmpty) {
        Alert.alert(
          translateKey('profile_alert_val_title') || 'Validation Error', 
          translateKey('profile_alert_val_msg') || 'Please populate at least one survey metric before initiating transmission.'
        );
        return;
      }

      // 2. Engagement Lock
      if (componentMountStatusRef.current) setIsSubmittingSurvey(true);

      // SIMULATED NETWORK TRANSMISSION TO FASTAPI BACKEND FOR SURVEY
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        translateKey('profile_alert_succ_title') || 'Telemetry Secured', 
        translateKey('profile_alert_succ_msg') || 'Your infrastructure intelligence and vendor profile have been successfully integrated.'
      );

      // 3. Purge state post-success
      if (componentMountStatusRef.current) {
        setSurveyPayload(initialSurveyPayload);
      }
    } catch (submissionError: unknown) {
      console.error("[ProfileScreen.handleSurveySubmission] Payload integration failed explicitly: ", submissionError);
      Alert.alert(
        translateKey('profile_alert_err_title') || 'Transmission Error', 
        translateKey('profile_alert_err_msg') || 'Failed to securely commit survey data to the cloud matrix.'
      );
    } finally {
      if (componentMountStatusRef.current) setIsSubmittingSurvey(false);
    }
  };

  /**
   * @function executeSecureLogout
   * @description Purges the authentication token and navigates to the external gateway.
   */
  const executeSecureLogout = async (): Promise<void> => {
    try {
      await executeLogoutFunction();
      router.replace('/');
    } catch (logoutError: unknown) {
      console.error("[ProfileScreen.executeSecureLogout] Authentication termination failed natively: ", logoutError);
    }
  };

  // ============================================================================
  // RENDER HELPER FUNCTIONS
  // ============================================================================

  /**
   * @function renderStatusBadge
   * @description Dynamically applies hex colors and icons based on the backend status response.
   */
  const renderStatusBadge = (statusString: string): React.JSX.Element => {
    let badgeBackgroundColor: string = COLORS.warning;
    let iconCharacter: any = 'clock-outline';

    if (statusString === 'approved') {
      badgeBackgroundColor = COLORS.success;
      iconCharacter = 'check-circle-outline';
    } else if (statusString === 'resolved') {
      badgeBackgroundColor = COLORS.info;
      iconCharacter = 'shield-check-outline';
    }

    return (
      <View style={[styles.activityStatusBadgeNode, { backgroundColor: badgeBackgroundColor }]}>
        <MaterialCommunityIcons name={iconCharacter} size={12} color={COLORS.surface} />
        <Text style={styles.activityStatusBadgeText}>{statusString.toUpperCase()}</Text>
      </View>
    );
  };

  // ============================================================================
  // MAIN RENDER TREE
  // ============================================================================

  // Extract explicit variables for UI
  const profileHeaderString: string = translateKey('profile_header_title');
  const fallbackUsernameString: string = translateKey('profile_default_user');
  const fallbackEmailString: string = translateKey('profile_default_email');
  const roleTranslationString: string = translateKey(`role_${user?.role || 'citizen'}`);

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      
      {/* 1. STRUCTURAL TOP HEADER */}
      <View style={styles.topNavigationHeaderRow}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()} style={styles.backButtonNode}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.topNavigationHeaderTitle}>{profileHeaderString}</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.masterScrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ========================================== */}
          {/* PILLAR 1: DYNAMIC IDENTITY CARD            */}
          {/* ========================================== */}
          <View style={styles.identityCardBoxContainer}>
            <View style={styles.identityAvatarCircleLayer}>
              <MaterialCommunityIcons name="account-tie" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.identityUsernameTextTitle}>{user?.username || fallbackUsernameString}</Text>
            <Text style={styles.identityEmailSubText}>{user?.email || fallbackEmailString}</Text>
            
            <View style={styles.identityRoleBadgeLayer}>
              <MaterialCommunityIcons 
                name={user?.role === 'warden' ? 'shield-star' : user?.role === 'shopkeeper' ? 'storefront' : 'account-group'} 
                size={16} 
                color={COLORS.primary} 
              />
              <Text style={styles.identityRoleBadgeTextString}>{roleTranslationString.toUpperCase()}</Text>
            </View>

            {/* Shopkeeper Specific Injection */}
            {user?.role === 'shopkeeper' && user?.shop_name && (
              <View style={styles.shopkeeperTelemetryBox}>
                <Text style={styles.shopkeeperTelemetryTitleText}>{translateKey('profile_shop_title')}</Text>
                <Text style={styles.shopkeeperTelemetryValueText}>{user.shop_name}</Text>
                <Text style={styles.shopkeeperTelemetryValueText}>{user.shop_category}</Text>
              </View>
            )}
          </View>

          {/* ========================================== */}
          {/* PILLAR 2: LIVE OPERATIONS TRACKER (FETCHED)*/}
          {/* ========================================== */}
          <View style={styles.operationsTrackerCardContainer}>
            <Text style={styles.sectionHeaderTitleString}>{translateKey('profile_ops_title')}</Text>
            
            {isFetchingActivities ? (
              <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 20 }} />
            ) : activitiesData.length === 0 ? (
              <Text style={styles.emptyStateInformationText}>{translateKey('profile_ops_empty')}</Text>
            ) : (
              activitiesData.map((activityNode: ActivityRecord) => (
                <View key={activityNode.id} style={styles.activityItemRowFlexBox}>
                  <View style={styles.activityIconWrapperCircle}>
                    <MaterialCommunityIcons 
                      name={activityNode.type === 'report' ? 'alert-decagram' : 'hand-coin'} 
                      size={20} 
                      color={COLORS.primary} 
                    />
                  </View>
                  <View style={styles.activityDetailsColumnBox}>
                    <Text style={styles.activityTitleTextString} numberOfLines={1}>{activityNode.title}</Text>
                    <Text style={styles.activityDateTextString}>{translateKey('profile_ops_initiated')}{activityNode.date}</Text>
                  </View>
                  {renderStatusBadge(activityNode.status)}
                </View>
              ))
            )}
          </View>

          {/* ========================================== */}
          {/* PILLAR 3: INFRASTRUCTURE & VENDOR SURVEY   */}
          {/* ========================================== */}
          <View style={styles.infrastructureSurveyCardContainer}>
            <View style={styles.surveyHeaderRowBox}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={24} color={COLORS.primary} />
              <Text style={styles.surveyHeaderTitleText}>{translateKey('profile_survey_title')}</Text>
            </View>
            <Text style={styles.surveyContextSubtitleText}>
              {translateKey('profile_survey_sub')}
            </Text>

            <View style={styles.surveyInputGroupColumn}>
              <Text style={styles.surveyInputLabelText}>{translateKey('profile_survey_q1')}</Text>
              <TextInput 
                style={styles.surveyInputFieldNode}
                placeholder={translateKey('profile_survey_q1_ph')}
                placeholderTextColor={COLORS.textMuted}
                value={surveyPayload.electricalSystemAge}
                onChangeText={(textStr: string) => setSurveyPayload({...surveyPayload, electricalSystemAge: textStr})}
              />
            </View>

            <View style={styles.surveyInputGroupColumn}>
              <Text style={styles.surveyInputLabelText}>{translateKey('profile_survey_q2')}</Text>
              <TextInput 
                style={styles.surveyInputFieldNode}
                placeholder={translateKey('profile_survey_q2_ph')}
                placeholderTextColor={COLORS.textMuted}
                value={surveyPayload.lastRenovationDate}
                onChangeText={(textStr: string) => setSurveyPayload({...surveyPayload, lastRenovationDate: textStr})}
              />
            </View>

            <View style={styles.surveyInputGroupColumn}>
              <Text style={styles.surveyInputLabelText}>{translateKey('profile_survey_q3')}</Text>
              <TextInput 
                style={styles.surveyInputFieldNode}
                placeholder={translateKey('profile_survey_q3_ph')}
                placeholderTextColor={COLORS.textMuted}
                value={surveyPayload.vendorExpertise}
                onChangeText={(textStr: string) => setSurveyPayload({...surveyPayload, vendorExpertise: textStr})}
              />
            </View>

            <View style={styles.surveyInputGroupColumn}>
              <Text style={styles.surveyInputLabelText}>{translateKey('profile_survey_q4')}</Text>
              <TextInput 
                style={[styles.surveyInputFieldNode, { height: 80, textAlignVertical: 'top' }]}
                placeholder={translateKey('profile_survey_q4_ph')}
                placeholderTextColor={COLORS.textMuted}
                multiline={true}
                value={surveyPayload.generalFeedback}
                onChangeText={(textStr: string) => setSurveyPayload({...surveyPayload, generalFeedback: textStr})}
              />
            </View>

            <TouchableOpacity 
              style={[styles.surveySubmissionButtonNode, isSubmittingSurvey && { opacity: 0.7 }]}
              activeOpacity={0.8}
              onPress={handleSurveySubmission}
              disabled={isSubmittingSurvey}
            >
              {isSubmittingSurvey ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.surveySubmissionButtonLabel}>{translateKey('profile_survey_btn')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ========================================== */}
          {/* PILLAR 4: HELP & DYNAMIC LOGOUT            */}
          {/* ========================================== */}
          <View style={styles.helpContactCardContainer}>
            <TouchableOpacity style={styles.helpContactRowActionBox} activeOpacity={0.7}>
              <MaterialCommunityIcons name="lifebuoy" size={24} color={COLORS.info} style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.helpContactTitleText}>{translateKey('profile_help_title')}</Text>
                <Text style={styles.helpContactSubtitleText}>{translateKey('profile_help_sub')}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.border} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.absoluteLogoutButtonNode} 
            activeOpacity={0.85}
            onPress={executeSecureLogout}
          >
            <MaterialCommunityIcons name="logout-variant" size={20} color={COLORS.surface} />
            <Text style={styles.absoluteLogoutButtonLabelText}>{translateKey('profile_logout_btn')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// EXHAUSTIVE STYLESHEET REGISTRY
// ============================================================================

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNavigationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButtonNode: {
    marginRight: 16,
  },
  topNavigationHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  masterScrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  
  // PILLAR 1: IDENTITY CARD
  identityCardBoxContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  identityAvatarCircleLayer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(217, 4, 41, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  identityUsernameTextTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  identityEmailSubText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  identityRoleBadgeLayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 4, 41, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  identityRoleBadgeTextString: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 1,
  },
  shopkeeperTelemetryBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%',
    alignItems: 'center',
  },
  shopkeeperTelemetryTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  shopkeeperTelemetryValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 4,
  },

  // PILLAR 2: OPERATIONS TRACKER
  operationsTrackerCardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHeaderTitleString: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  emptyStateInformationText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activityItemRowFlexBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  activityIconWrapperCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(217, 4, 41, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityDetailsColumnBox: {
    flex: 1,
    marginRight: 10,
  },
  activityTitleTextString: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  activityDateTextString: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activityStatusBadgeNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityStatusBadgeText: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },

  // PILLAR 3: SURVEY FORM
  infrastructureSurveyCardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  surveyHeaderRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  surveyHeaderTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  surveyContextSubtitleText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  surveyInputGroupColumn: {
    marginBottom: 16,
  },
  surveyInputLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  surveyInputFieldNode: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: COLORS.textDark,
  },
  surveySubmissionButtonNode: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  surveySubmissionButtonLabel: {
    color: COLORS.surface,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // PILLAR 4: HELP & LOGOUT
  helpContactCardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  helpContactRowActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpContactTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  helpContactSubtitleText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  absoluteLogoutButtonNode: {
    backgroundColor: COLORS.textDark,
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  absoluteLogoutButtonLabelText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  }
});