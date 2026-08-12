import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Platform,
  Alert,
  TextInput,
  Linking
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
 * Defines strict structural typing for the System Theme colors.
 * Ensures consistent UI representation across the fundraising interface.
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
 * Defines the structured data interface for an active community fundraising campaign,
 * matching the exact payload returned by the PostgreSQL backend ledger.
 */
interface CampaignData {
  id: number;
  title: string;
  district: string;
  target_amount: number;
  raised_amount: number;
  gofundme_url: string;
  status: 'active' | 'funded' | 'pending_review';
  organizer_id?: string;
}

/**
 * Defines the strict schema expected by the FastAPI backend when creating a new campaign.
 */
interface CampaignSubmissionPayload {
  organizer_id: string;
  title: string;
  district: string;
  target_amount: number;
  raised_amount: number;
  gofundme_url: string;
}

/**
 * Defines the expected server response structure when fetching the global campaign array.
 */
interface FetchCampaignsResponse {
  status: string;
  data: CampaignData[];
  detail?: string;
}

// System Theme instantiation explicitly typed and strictly assigned
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

// ==========================================
// COMPONENT: FUNDRAISING & CAMPAIGN PORTAL
// ==========================================

/**
 * FundScreen Component
 * Provides a secure portal for community fundraising, connecting local infrastructure
 * repair causes directly to external GoFundMe links while tracking progress bars inside the app.
 * Upgraded to actively synchronize with the centralized PostgreSQL database.
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Fundraising Interface.
 */
export default function FundScreen(): React.JSX.Element {
  
  // --- Global Identity Extraction ---
  // Replaces the "Identity Amnesia" bug by fetching the persistent user session.
  const { user } = useAuth();

  // --- Explicitly Typed State Management ---
  
  // Initializes as an empty array to mathematically prevent "Frontend Theater" dummy data rendering.
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  
  // Network locking states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State toggles for opening the "Start a Fundraiser" creation panel
  const [isCreatingCampaign, setIsCreatingCampaign] = useState<boolean>(false);
  
  // Form input states for new campaigns
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDistrict, setFormDistrict] = useState<string>('');
  const [formTarget, setFormTarget] = useState<string>('');
  const [formRaised, setFormRaised] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');

  /**
   * React lifecycle hook.
   * Automatically triggers a network refresh of the global funding feed when the view mounts.
   */
  useEffect(() => {
    fetchGlobalCampaigns();
  }, []);

  /**
   * Orchestrates the secure retrieval of all active community campaigns from the database.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the network fetch cycle concludes.
   */
  const fetchGlobalCampaigns = async (): Promise<void> => {
    try {
      // Step 1: Lock the interface to indicate active data synchronization
      setIsLoading(true);

      // Step 2: Construct the REST endpoint dynamically
      const fetchEndpoint: string = `${API_BASE_URL}/api/fund/campaigns`;
      
      // Step 3: Execute the asynchronous network GET request
      const response: Response = await fetch(fetchEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      // Step 4: Unpack and cast the response into active memory
      const rawJsonResponse: any = await response.json();
      const parsedResponse: FetchCampaignsResponse = rawJsonResponse as FetchCampaignsResponse;
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess && parsedResponse.data) {
        // Step 5: Hydrate the local state array with the verified cloud data
        const liveCampaigns: CampaignData[] = parsedResponse.data;
        setCampaigns(liveCampaigns);
      } else {
        console.warn("[FundScreen.fetchGlobalCampaigns] Backend returned empty or malformed ledger data.");
      }

    } catch (error: unknown) {
      // Step 6: Catch and securely log network failures without crashing the primary thread
      let errorMessage: string = "Failed to sync global campaign feed.";
      if (error instanceof Error) {
        errorMessage = `Timeline Exception: ${error.message}`;
      }
      console.error("[FundScreen.fetchGlobalCampaigns] CRITICAL ERROR: ", errorMessage);
    } finally {
      // Step 7: Release the loading lock globally
      setIsLoading(false);
    }
  };

  /**
   * Orchestrates the secure redirection of the user to the external GoFundMe campaign page
   * so they can donate over there, after which funds can be reflected in the progress bar.
   * 
   * @async
   * @param {string} urlString - The destination GoFundMe web URL.
   * @returns {Promise<void>} Resolves when the browser link opens.
   */
  const handleOpenGoFundMe = async (urlString: string): Promise<void> => {
    try {
      // Step 1: Sanitize URL string
      const sanitizedUrl: string = urlString.trim();
      const fallbackUrl: string = "https://www.gofundme.com";
      const targetDestination: string = sanitizedUrl.length > 0 ? sanitizedUrl : fallbackUrl;

      // Step 2: Check if device can handle the external URL scheme
      const canOpenLink: boolean = await Linking.canOpenURL(targetDestination);

      if (canOpenLink) {
        // Step 3: Open browser window directly to the GoFundMe campaign page
        await Linking.openURL(targetDestination);
        console.log(`[FundScreen.handleOpenGoFundMe] Successfully redirected user to: ${targetDestination}`);
      } else {
        Alert.alert("Navigation Error", "Your device is unable to open this external link.");
      }
    } catch (error: unknown) {
      console.error("[FundScreen.handleOpenGoFundMe] Failed to launch external link: ", error);
      Alert.alert("Error", "Could not route to the GoFundMe web page.");
    }
  };

  /**
   * Handles the creation of a new fundraiser entry linked to GoFundMe and transmits 
   * it securely to the Python backend to be saved in the PostgreSQL database.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the cloud database commits the record.
   */
  const handleCreateFundraiser = async (): Promise<void> => {
    try {
      // Step 1: Unpack and aggressively sanitize inputs
      const title: string = formTitle.trim();
      const district: string = formDistrict.trim();
      const targetStr: string = formTarget.trim();
      const raisedStr: string = formRaised.trim();
      const url: string = formUrl.trim();

      // Step 2: Pre-flight validation to prevent malformed database entries
      if (title === '' || district === '' || targetStr === '' || url === '') {
        Alert.alert("Validation Error", "Please complete all required fields including the GoFundMe link.");
        return;
      }

      // Step 3: Mathematically validate financial float inputs
      const parsedTarget: number = parseFloat(targetStr);
      const parsedRaised: number = raisedStr !== '' ? parseFloat(raisedStr) : 0;

      if (isNaN(parsedTarget) || parsedTarget <= 0) {
        Alert.alert("Validation Error", "Please provide a valid numeric target amount.");
        return;
      }

      // Step 4: Lock the interface to prevent duplicate submissions
      setIsSubmitting(true);

      // Step 5: Extract genuine identity context (curing Identity Amnesia)
      const currentUserId: string = user ? String(user.id) : "system_default";

      // Step 6: Construct the exact JSON payload expected by the FastAPI backend schema
      const submissionPayload: CampaignSubmissionPayload = {
        organizer_id: currentUserId,
        title: title,
        district: district,
        target_amount: parsedTarget,
        raised_amount: parsedRaised,
        gofundme_url: url
      };

      const payloadString: string = JSON.stringify(submissionPayload);
      const postEndpoint: string = `${API_BASE_URL}/api/fund/campaigns`;

      // Step 7: Execute the network POST request to commit the campaign
      const response: Response = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString
      });

      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 8: Reset form inputs and close panel on successful cloud sync
        setFormTitle('');
        setFormDistrict('');
        setFormTarget('');
        setFormRaised('');
        setFormUrl('');
        setIsCreatingCampaign(false);

        Alert.alert("Success", "Your fundraiser has been successfully listed on the application feed.");
        
        // Step 9: Re-sync the global feed to immediately display the newly minted campaign
        await fetchGlobalCampaigns();
      } else {
        const rawJsonResponse: any = await response.json();
        const serverErrorMessage: string = rawJsonResponse.detail || "Database transmission rejected.";
        Alert.alert("Submission Error", serverErrorMessage);
      }

    } catch (error: unknown) {
      console.error("[FundScreen.handleCreateFundraiser] Failed to create fundraiser entry: ", error);
      Alert.alert("Error", "An unexpected error occurred while saving the fundraiser to the network.");
    } finally {
      // Step 10: Release the submission lock globally
      setIsSubmitting(false);
    }
  };

  /**
   * Sub-render component to format individual campaign cards within the FlatList.
   * Explicitly typed to prevent runtime rendering exceptions.
   * 
   * @param {Object} props - The FlatList render parameters container.
   * @param {CampaignData} props.item - The campaign data object.
   * @returns {React.JSX.Element} The rendered Campaign Card.
   */
  const renderCampaignItem = ({ item }: { item: CampaignData }): React.JSX.Element => {
    try {
      // Step 1: Unpack and calculate progress metrics mathematically
      const currentRaised: number = item.raised_amount;
      const targetGoal: number = item.target_amount;
      
      const rawRatio: number = targetGoal > 0 ? currentRaised / targetGoal : 0;
      const clampedRatio: number = Math.min(rawRatio, 1);
      const roundedPercentage: number = Math.round(clampedRatio * 100);
      
      const progressPercentageString: string = `${roundedPercentage}%`;
      const isFunded: boolean = item.status === 'funded';
      const dynamicProgressBarColor: string = isFunded ? COLORS.success : COLORS.primary;

      // Step 2: Construct explicitly typed inline styles to resolve TypeScript style checks
      const dynamicProgressBarStyle = {
        width: progressPercentageString as `${number}%`,
        backgroundColor: dynamicProgressBarColor,
      };

      return (
        <TouchableOpacity 
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => handleOpenGoFundMe(item.gofundme_url)}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.badge, isFunded ? styles.badgeSuccess : styles.badgeWarning]}>
              <Text style={[styles.badgeText, isFunded ? styles.badgeTextSuccess : styles.badgeTextWarning]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.districtText}>{item.district}</Text>
          </View>

          <Text style={styles.campaignTitle}>{item.title}</Text>

          {/* Progress Bar Track Layer (Increases with increasing funds) */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, dynamicProgressBarStyle]} />
          </View>

          <View style={styles.financialContainer}>
            <Text style={styles.financialText}>
              Raised: <Text style={styles.financialHighlight}>Rs. {item.raised_amount.toLocaleString()}</Text>
            </Text>
            <Text style={styles.financialText}>Target: Rs. {item.target_amount.toLocaleString()}</Text>
          </View>

          <View style={styles.externalLinkContainer}>
            <MaterialCommunityIcons name="open-in-new" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.externalLinkText}>Donate on GoFundMe Page</Text>
          </View>
        </TouchableOpacity>
      );
    } catch (renderError: unknown) {
      console.error("[FundScreen.renderCampaignItem] Render error encountered: ", renderError);
      return <View><Text>Error loading campaign item.</Text></View>;
    }
  };

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Top Header Navigation Section */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Crowdfunding</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.container}>
        
        {/* Header Action Bar */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Active GoFundMe Campaigns</Text>
          <TouchableOpacity 
            style={styles.startFundraiserButton}
            activeOpacity={0.85}
            onPress={() => setIsCreatingCampaign(!isCreatingCampaign)}
          >
            <MaterialCommunityIcons 
              name={isCreatingCampaign ? "close" : "plus-circle-outline"} 
              size={18} 
              color={COLORS.surface} 
              style={{ marginRight: 6 }} 
            />
            <Text style={styles.startFundraiserButtonText}>
              {isCreatingCampaign ? "Close Form" : "Start a Fundraiser"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- DYNAMIC START A FUNDRAISER FORM PANEL --- */}
        {isCreatingCampaign && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>List Your GoFundMe Campaign</Text>
            <Text style={styles.formSubtitle}>Enter details so community members can find and support your cause.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Campaign Title</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Relief Fund for Local Area"
                placeholderTextColor={COLORS.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>District / Neighborhood</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. Saddar Zone"
                placeholderTextColor={COLORS.textMuted}
                value={formDistrict}
                onChangeText={setFormDistrict}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount (Rs.)</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 100000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={formTarget}
                onChangeText={setFormTarget}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Raised Amount (Optional)</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 15000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={formRaised}
                onChangeText={setFormRaised}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GoFundMe Campaign Link (URL)</Text>
              <TextInput 
                style={styles.input}
                placeholder="https://www.gofundme.com/f/your-campaign"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                value={formUrl}
                onChangeText={setFormUrl}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitFormButton, isSubmitting && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleCreateFundraiser}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.surface} size="small" />
              ) : (
                <Text style={styles.submitFormButtonText}>PUBLISH TO APP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={campaigns}
            keyExtractor={(item: CampaignData) => item.id.toString()}
            renderItem={renderCampaignItem}
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
  container: { 
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
    fontSize: 15, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  startFundraiserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  startFundraiserButtonText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitFormButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitFormButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  loader: { 
    marginTop: 40 
  },
  flatListContent: { 
    padding: 16 
  },
  card: { 
    backgroundColor: COLORS.surface, 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  badgeWarning: { 
    backgroundColor: 'rgba(245, 158, 11, 0.1)' 
  },
  badgeSuccess: { 
    backgroundColor: 'rgba(16, 185, 129, 0.1)' 
  },
  badgeText: { 
    fontSize: 10, 
    fontWeight: '800', 
    letterSpacing: 1 
  },
  badgeTextWarning: { 
    color: COLORS.warning 
  },
  badgeTextSuccess: { 
    color: COLORS.success 
  },
  districtText: { 
    fontSize: 12, 
    color: COLORS.textMuted, 
    fontWeight: '600' 
  },
  campaignTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.textDark, 
    marginBottom: 16, 
    lineHeight: 22 
  },
  progressTrack: { 
    height: 8, 
    backgroundColor: COLORS.background, 
    borderRadius: 4, 
    overflow: 'hidden', 
    marginBottom: 12 
  },
  progressBar: { 
    height: '100%', 
    borderRadius: 4 
  },
  financialContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  financialText: { 
    fontSize: 13, 
    color: COLORS.textMuted, 
    fontWeight: '500' 
  },
  financialHighlight: { 
    color: COLORS.textDark, 
    fontWeight: '700' 
  },
  externalLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  externalLinkText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  }
});