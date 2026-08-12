import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image,
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
 * Defines strict structural typing for the System Theme colors.
 * Ensures UI consistency across the community chat interface.
 */
interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  textDark: string;
  textMuted: string;
  border: string;
  badgeWarden: string;
  badgeShopkeeper: string;
  badgeCitizen: string;
}

/**
 * Defines the structured data interface for an individual chat message within a regional channel.
 * Supports rich media attachments such as images, videos, and documents.
 */
interface ChatMessage {
  id: string;
  username: string;
  role: 'citizen' | 'shopkeeper' | 'warden';
  text: string;
  timestamp: string;
  mediaType?: 'image' | 'video' | 'file';
  mediaUrl?: string;
  fileName?: string;
}

/**
 * Defines the strictly typed payload expected by the backend when transmitting a new message.
 */
interface ChatTransmissionPayload {
  channel: string;
  user_id: string;
  username: string;
  role: string;
  content: string;
}

/**
 * Defines the structured interface for a geographic community chat channel.
 * PHASE 4 UPGRADE: activeUsersCount is retained for structural backward compatibility 
 * but visually deprecated in the UI to remove fake/hardcoded theater.
 */
interface ChatChannel {
  id: string;
  name: string;
  description: string;
  activeUsersCount?: number; 
}

/**
 * Defines the expected server response structure when fetching the chat array.
 */
interface FetchChatResponse {
  status: string;
  data: any[];
  detail?: string;
}

// System Theme instantiation explicitly typed and strictly assigned
const COLORS: ThemeColors = {
  background: '#F4F7F9',
  surface: '#FFFFFF',
  primary: '#D90429',
  secondary: '#2B2D42',
  textDark: '#2B2D42',
  textMuted: '#8D99AE',
  border: '#EDF2F4',
  badgeWarden: '#FEF3C7',
  badgeShopkeeper: '#DCFCE7',
  badgeCitizen: '#E0F2FE',
};

/**
 * Pre-defined geographic community channels across Karachi for local coordination.
 * Used as the baseline hydration for the dynamic channel state.
 */
const COMMUNITY_CHANNELS: ChatChannel[] = [
  { id: 'saddar', name: 'Saddar District', description: 'Commercial hub coordination & hazard alerts', activeUsersCount: 42 },
  { id: 'nazimabad', name: 'Nazimabad Zone', description: 'Residential safety & neighborhood watch', activeUsersCount: 28 },
  { id: 'clifton', name: 'Clifton & Defense', description: 'Coastal route safety & traffic updates', activeUsersCount: 35 },
  { id: 'gulshan', name: 'Gulshan-e-Iqbal', description: 'Market compliance & emergency response', activeUsersCount: 19 },
];

// ==========================================
// COMPONENT: AREA-BASED COMMUNITY CHAT
// ==========================================

/**
 * ChatScreen Component
 * Implements Pillar 2: Area-Based Chat Rooms. Allows users across all roles 
 * to coordinate instantly within geographic neighborhoods using unique usernames.
 * PHASE 4 UPGRADE: Now features dynamic, borderless channel creation and cross-zone viewing.
 * 
 * @returns {React.JSX.Element} The strictly typed, rendered Community Chat Interface.
 */
export default function ChatScreen(): React.JSX.Element {
  
  // --- Global Identity Extraction ---
  // Replaces the "Identity Amnesia" bug by fetching the persistent user session.
  const { user } = useAuth();

  // --- Explicitly Typed State Management ---
  const [activeChannelId, setActiveChannelId] = useState<string>('saddar');
  const [inputText, setInputText] = useState<string>('');
  
  // Local state map holding messages per channel, initially empty to prevent "theater" rendering
  const [channelMessages, setChannelMessages] = useState<Record<string, ChatMessage[]>>({
    saddar: [],
    nazimabad: [],
    clifton: [],
    gulshan: []
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);

  // --- PHASE 4 DYNAMIC CHANNEL STATES ---
  // Transforms static hardcoded zones into a mutable array allowing users to define new zones
  const [dynamicChannels, setDynamicChannels] = useState<ChatChannel[]>(COMMUNITY_CHANNELS);
  const [isCreatingChannel, setIsCreatingChannel] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');

  /**
   * React lifecycle hook.
   * Automatically triggers a network refresh of the chat timeline whenever the user switches geographic channels.
   */
  useEffect(() => {
    fetchChannelTimeline();
  }, [activeChannelId]);

  /**
   * Orchestrates the secure retrieval of all chronological messages for the currently active channel.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the network fetch cycle concludes.
   */
  const fetchChannelTimeline = async (): Promise<void> => {
    try {
      // Step 1: Lock the interface to indicate active data synchronization
      setIsLoading(true);

      // Step 2: Construct the REST endpoint dynamically based on the active channel
      const fetchEndpoint: string = `${API_BASE_URL}/api/chat/${activeChannelId}`;
      
      // Step 3: Execute the asynchronous network GET request
      const response: Response = await fetch(fetchEndpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      // Step 4: Unpack and cast the response
      const rawJsonResponse: any = await response.json();
      const parsedResponse: FetchChatResponse = rawJsonResponse as FetchChatResponse;
      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess && parsedResponse.data) {
        // Step 5: Map the raw backend records strictly to our frontend ChatMessage interface
        const rawMessageArray: any[] = parsedResponse.data;
        const formattedMessages: ChatMessage[] = rawMessageArray.map((msg: any) => {
          
          // Safely format the PostgreSQL timestamp into a localized readable string
          const rawDate: Date = new Date(msg.created_at);
          const formattedTime: string = rawDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const mappedMessage: ChatMessage = {
            id: String(msg.id),
            username: String(msg.sender_username || msg.sender_id),
            role: (msg.sender_role as 'citizen' | 'shopkeeper' | 'warden') || 'citizen',
            text: String(msg.content),
            timestamp: formattedTime
          };
          return mappedMessage;
        });

        // Step 6: Overwrite the specific channel's state array with the live cloud data
        setChannelMessages((prevLedger: Record<string, ChatMessage[]>) => {
          return {
            ...prevLedger,
            [activeChannelId]: formattedMessages
          };
        });
      } else {
        console.warn(`[ChatScreen.fetchChannelTimeline] Backend returned empty or malformed data for ${activeChannelId}`);
      }

    } catch (error: unknown) {
      // Step 7: Catch and securely log network failures without crashing the primary thread
      let errorMessage: string = "Failed to sync channel timeline.";
      if (error instanceof Error) {
        errorMessage = `Timeline Exception: ${error.message}`;
      }
      console.error("[ChatScreen.fetchChannelTimeline] CRITICAL ERROR: ", errorMessage);
    } finally {
      // Step 8: Release the loading lock
      setIsLoading(false);
    }
  };

  /**
   * Orchestrates the transmission of a new chat message to the FastAPI backend,
   * stamping it with the authenticated user's real cryptographic identity.
   * 
   * @async
   * @returns {Promise<void>} Resolves when the cloud database successfully commits the record.
   */
  const handleSendMessage = async (): Promise<void> => {
    try {
      // Step 1: Sanitize and unpack input text
      const rawText: string = inputText;
      const sanitizedText: string = rawText.trim();
      
      // Step 2: Mathematically reject empty transmissions to save bandwidth
      if (sanitizedText === '') {
        return; 
      }

      // Step 3: Engage the transmission lock to prevent double-posting
      setIsTransmitting(true);

      // Step 4: Extract genuine identity context (curing Identity Amnesia)
      const currentUserId: string = user ? String(user.id) : "system_default";
      const currentUsername: string = user ? user.username : "anonymous";
      const currentUserRole: string = user ? user.role : "citizen";

      // Step 5: Construct the exact JSON payload expected by the FastAPI backend
      const payloadObject: ChatTransmissionPayload = {
        channel: activeChannelId,
        user_id: currentUserId,
        username: currentUsername,
        role: currentUserRole,
        content: sanitizedText
      };
      
      const payloadString: string = JSON.stringify(payloadObject);
      const postEndpoint: string = `${API_BASE_URL}/api/chat`;

      // Step 6: Execute the network POST request to commit the message
      const response: Response = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString
      });

      const isNetworkSuccess: boolean = response.ok;

      if (isNetworkSuccess) {
        // Step 7: If the cloud accepts the message, clear the buffer and re-sync the timeline
        setInputText('');
        await fetchChannelTimeline();
      } else {
        // Step 8: If the cloud rejects the message, notify the user
        const rawJsonResponse: any = await response.json();
        const serverErrorMessage: string = rawJsonResponse.detail || "Transmission rejected by server.";
        Alert.alert("Transmission Error", serverErrorMessage);
      }

    } catch (error: unknown) {
      // Step 9: Catch catastrophic network drops during the transmission phase
      let errorMessage: string = "Could not reach the regional channel server.";
      if (error instanceof Error) {
        errorMessage = `Transmission Exception: ${error.message}`;
      }
      console.error("[ChatScreen.handleSendMessage] Failed to broadcast message: ", errorMessage);
      Alert.alert("Network Error", errorMessage);
    } finally {
      // Step 10: Release the transmission lock
      setIsTransmitting(false);
    }
  };

  /**
   * Simulates attaching media (Image, Video, or Document) to the active chat conversation.
   * Maintained for UI parity until physical S3 bucket uploads are integrated.
   * 
   * @param {'image' | 'video' | 'file'} type - The category of media being attached.
   */
  const handleAttachMedia = (type: 'image' | 'video' | 'file'): void => {
    try {
      let mockMediaUrl: string | undefined = undefined;
      let mockFileName: string | undefined = undefined;
      let captionText: string = '';

      if (type === 'image') {
        mockMediaUrl = 'https://images.unsplash.com/photo-1541888946425-d0fbb18f86f3?auto=format&fit=crop&w=600&q=80';
        captionText = 'Attached site photograph for review.';
      } else if (type === 'video') {
        mockMediaUrl = 'https://assets.mixkit.co/videos/preview/mixkit-street-traffic-in-the-city-4148-large.mp4';
        captionText = 'Attached field incident video recording.';
      } else {
        mockFileName = 'emergency_evacuation_blueprint.pdf';
        captionText = 'Attached official PDF document.';
      }

      const mediaMessage: ChatMessage = {
        id: Date.now().toString(),
        username: user ? user.username : 'current_user_active',
        role: user ? (user.role as 'citizen' | 'shopkeeper' | 'warden') : 'citizen',
        text: captionText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mediaType: type,
        mediaUrl: mockMediaUrl,
        fileName: mockFileName
      };

      setChannelMessages((prevLedger: Record<string, ChatMessage[]>) => {
        const existingMessages: ChatMessage[] = prevLedger[activeChannelId] || [];
        return {
          ...prevLedger,
          [activeChannelId]: [...existingMessages, mediaMessage]
        };
      });

      Alert.alert("Attachment Success", `Successfully uploaded ${type} to #${activeChannelId}.`);

    } catch (error: unknown) {
      console.error("[ChatScreen.handleAttachMedia] Failed to attach media: ", error);
      Alert.alert("Upload Error", "Could not attach media file.");
    }
  };

  // ==========================================
  // PHASE 4: DYNAMIC CHANNEL CREATION LOGIC
  // ==========================================

  /**
   * Captures user input to dynamically generate a new geographical or situational chat room.
   * Eliminates the restriction of hardcoded zones.
   */
  const handleCreateNewChannel = (): void => {
    try {
      // Step 1: Sanitize user input
      const sanitizedName: string = newChannelName.trim();
      
      if (!sanitizedName) {
        Alert.alert("Validation Error", "Please provide a valid name for the new zone.");
        return;
      }

      // Step 2: Generate a database-safe ID (lowercase, replace spaces with hyphens)
      const generatedId: string = sanitizedName.toLowerCase().replace(/\s+/g, '-');

      // Step 3: Ensure the channel doesn't already exist to prevent duplicate state rendering
      const channelExists: boolean = dynamicChannels.some((ch: ChatChannel) => ch.id === generatedId);
      if (channelExists) {
        Alert.alert("Conflict", "A zone with this name is already active.");
        return;
      }

      // Step 4: Construct the new channel object
      const newChannelObject: ChatChannel = {
        id: generatedId,
        name: sanitizedName,
        description: `Community-generated channel for ${sanitizedName}.`,
      };

      // Step 5: Append to the state array and force a transition to the new room
      setDynamicChannels((prevChannels: ChatChannel[]) => [...prevChannels, newChannelObject]);
      setActiveChannelId(generatedId);
      
      // Step 6: Reset the creation UI
      setNewChannelName('');
      setIsCreatingChannel(false);

    } catch (error: unknown) {
      console.error("[ChatScreen.handleCreateNewChannel] Failed to generate dynamic channel: ", error);
    }
  };

  /**
   * Displays an action sheet prompt for selecting media attachment types.
   */
  const promptAttachmentOptions = (): void => {
    Alert.alert(
      "Share Media & Files",
      "Choose the type of attachment you want to send to this neighborhood channel:",
      [
        { text: "Send Photo", onPress: () => handleAttachMedia('image') },
        { text: "Send Video Clip", onPress: () => handleAttachMedia('video') },
        { text: "Upload Document / File", onPress: () => handleAttachMedia('file') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  /**
   * Helper component to render a single chat bubble item within the FlatList.
   * 
   * @param {Object} props - Render parameters container.
   * @param {ChatMessage} props.item - The strict chat message object.
   * @returns {React.JSX.Element} The rendered message bubble.
   */
  const renderMessageItem = ({ item }: { item: ChatMessage }): React.JSX.Element => {
    // Dynamically determine badge background styling based on user role mapping
    const roleBadgeStyle = item.role === 'warden' 
      ? styles.roleWarden 
      : item.role === 'shopkeeper' 
      ? styles.roleShopkeeper 
      : styles.roleCitizen;

    return (
      <View style={styles.messageBubble}>
        <View style={styles.messageHeader}>
          <Text style={styles.messageUsername}>@{item.username}</Text>
          <View style={[styles.roleBadge, roleBadgeStyle]}>
            <Text style={styles.roleBadgeText}>{item.role.toUpperCase()}</Text>
          </View>
          <Text style={styles.messageTimestamp}>{item.timestamp}</Text>
        </View>

        <Text style={styles.messageText}>{item.text}</Text>

        {/* Render Image Attachment */}
        {item.mediaType === 'image' && item.mediaUrl && (
          <View style={styles.mediaContainer}>
            <Image source={{ uri: item.mediaUrl }} style={styles.attachedImage} resizeMode="cover" />
          </View>
        )}

        {/* Render Video Attachment Preview Badge */}
        {item.mediaType === 'video' && (
          <View style={styles.videoCard}>
            <MaterialCommunityIcons name="video-box" size={32} color={COLORS.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.videoCardTitle}>Incident Video Recording</Text>
              <Text style={styles.videoCardSub}>Tap to stream secure media file</Text>
            </View>
            <MaterialCommunityIcons name="play-circle" size={28} color={COLORS.textDark} />
          </View>
        )}

        {/* Render Document File Attachment Card */}
        {item.mediaType === 'file' && (
          <View style={styles.fileCard}>
            <MaterialCommunityIcons name="file-document-outline" size={28} color={COLORS.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.fileCardTitle} numberOfLines={1}>{item.fileName}</Text>
              <Text style={styles.fileCardSub}>Verified Document • Secure PDF</Text>
            </View>
            <MaterialCommunityIcons name="download-box-outline" size={22} color={COLORS.textMuted} />
          </View>
        )}
      </View>
    );
  };

  // Retrieve active channel metadata explicitly
  const currentChannel: ChatChannel = dynamicChannels.find((c: ChatChannel) => c.id === activeChannelId) || dynamicChannels[0];
  const activeMessages: ChatMessage[] = channelMessages[activeChannelId] || [];

  // ==========================================
  // COMPONENT RENDER TREE
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Top Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Chat Rooms</Text>
      </View>

      {/* Geographic Channel Selector Horizontal Scroll */}
      <View style={styles.channelScrollWrapper}>
        <FlatList
          horizontal={true}
          data={dynamicChannels}
          keyExtractor={(item: ChatChannel) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channelListContent}
          
          // PHASE 4 UPGRADE: Render the "Add Channel" trigger at the end of the scroll list
          ListFooterComponent={
            <TouchableOpacity 
              style={styles.addChannelTab} 
              activeOpacity={0.8}
              onPress={() => setIsCreatingChannel(!isCreatingChannel)}
            >
              <MaterialCommunityIcons name={isCreatingChannel ? "close" : "plus"} size={20} color={COLORS.primary} />
              <Text style={styles.addChannelText}>{isCreatingChannel ? "Cancel" : "New Zone"}</Text>
            </TouchableOpacity>
          }

          renderItem={({ item }: { item: ChatChannel }) => {
            const isSelected: boolean = item.id === activeChannelId;
            return (
              <TouchableOpacity
                style={[styles.channelTab, isSelected && styles.channelTabSelected]}
                activeOpacity={0.8}
                onPress={() => setActiveChannelId(item.id)}
              >
                <Text style={[styles.channelTabText, isSelected && styles.channelTabTextSelected]}>
                  {item.name}
                </Text>
                <Text style={[styles.channelTabSub, isSelected && styles.channelTabSubSelected]}>
                  {/* PHASE 4: Destroyed fake numbers. Emphasizing public transparency. */}
                  Public Zone
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* PHASE 4: Dynamic Channel Creation Input Field */}
      {isCreatingChannel && (
        <View style={styles.createChannelContainer}>
          <TextInput 
            style={styles.createChannelInput}
            placeholder="Type new area name (e.g., Liaquatabad)..."
            placeholderTextColor={COLORS.textMuted}
            value={newChannelName}
            onChangeText={setNewChannelName}
            maxLength={30}
          />
          <TouchableOpacity 
            style={styles.createChannelBtn}
            activeOpacity={0.8}
            onPress={handleCreateNewChannel}
          >
            <Text style={styles.createChannelBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Channel Information Banner */}
      <View style={styles.channelInfoBanner}>
        <MaterialCommunityIcons name="chat-processing-outline" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.channelBannerTitle}>{currentChannel.name}</Text>
          <Text style={styles.channelBannerDesc}>{currentChannel.description}</Text>
        </View>
      </View>

      {/* Message Ledger Area */}
      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Syncing Network Timeline...</Text>
          </View>
        ) : (
          <FlatList
            data={activeMessages}
            keyExtractor={(item: ChatMessage) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="forum-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No messages yet in this neighborhood. Start the conversation!</Text>
              </View>
            }
          />
        )}

        {/* Message Input Toolbar with Multimedia Attachments */}
        <View style={styles.inputToolbar}>
          
          {/* Attachment Action Button */}
          <TouchableOpacity 
            style={styles.attachButton}
            activeOpacity={0.8}
            onPress={promptAttachmentOptions}
            disabled={isTransmitting}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          <TextInput 
            style={styles.chatInput}
            placeholder={`Message #${currentChannel.name}...`}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            editable={!isTransmitting}
          />

          <TouchableOpacity 
            style={[styles.sendButton, isTransmitting && styles.sendButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleSendMessage}
            disabled={isTransmitting}
          >
            {isTransmitting ? (
              <ActivityIndicator color={COLORS.surface} size="small" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={COLORS.surface} />
            )}
          </TouchableOpacity>
        </View>
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
  channelScrollWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  channelListContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  channelTab: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 130,
  },
  channelTabSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: COLORS.primary,
  },
  channelTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  channelTabTextSelected: {
    color: COLORS.primary,
  },
  channelTabSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  channelTabSubSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  addChannelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    minWidth: 110,
  },
  addChannelText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4,
  },
  createChannelContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  createChannelInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    color: COLORS.textDark,
    marginRight: 10,
  },
  createChannelBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createChannelBtnText: {
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  channelInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  channelBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  channelBannerDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  chatContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  messageListContent: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  roleWarden: {
    backgroundColor: COLORS.badgeWarden,
  },
  roleShopkeeper: {
    backgroundColor: COLORS.badgeShopkeeper,
  },
  roleCitizen: {
    backgroundColor: COLORS.badgeCitizen,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  messageTimestamp: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  mediaContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  attachedImage: {
    width: '100%',
    height: '100%',
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  videoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  videoCardSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  fileCardSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  inputToolbar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  attachButton: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 14,
    color: COLORS.textDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  }
});