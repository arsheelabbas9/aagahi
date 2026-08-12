from typing import Dict, Any, List, Optional
import hashlib  # Retained strictly for deterministic QR Code generation in StoreRepository
import bcrypt   # INJECTED: Industry-standard salted cryptographic hashing for passwords

# Internal Module Imports
from kernel import get_db

# ==========================================
# USER IDENTITY & AUTHENTICATION REPOSITORY
# ==========================================

class UserRepository:
    """
    Manages user profiles, authentication logic, and multi-role access control
    within the public.users table in the Supabase PostgreSQL cluster.
    Upgraded to utilize Bcrypt for salted password encryption, preventing rainbow table attacks.
    """
    
    def __init__(self) -> None:
        """
        Initializes the UserRepository instance.
        Establishes a persistent, thread-safe connection to the database layer 
        by invoking the connection pooling singleton from the kernel.
        """
        self.db: Any = get_db()

    def create_user(self, email: str, password_hash: str, username: str, contact_number: str, role: str) -> Optional[Dict[str, Any]]:
        """
        Executes an atomic insert operation into the public.users database table.
        This function expects the password_hash parameter to be the raw password from the user,
        which it then safely encrypts using Bcrypt before DB insertion.

        Args:
            email (str): The strictly sanitized user email address.
            password_hash (str): The raw string password provided by the user. (Name retained for architectural compatibility).
            username (str): The unique identifier for community routing and geographic chat.
            contact_number (str): The user's active phone line.
            role (str): The system designation (general, shopkeeper, warden).

        Returns:
            Optional[Dict[str, Any]]: A strictly typed dictionary containing the newly created user record, 
                                     or None if the database insertion fails.
        """
        try:
            # --- BCRYPT SECURITY UPGRADE ---
            # Step 1: Encode the raw password string into UTF-8 bytes required by the cryptographic engine.
            raw_password_bytes: bytes = password_hash.encode('utf-8')
            
            # Step 2: Generate a mathematically unique cryptographic salt.
            secure_salt: bytes = bcrypt.gensalt()
            
            # Step 3: Compute the salted hash and decode it back to a transmittable UTF-8 string.
            encrypted_password_bytes: bytes = bcrypt.hashpw(raw_password_bytes, secure_salt)
            final_secure_hash: str = encrypted_password_bytes.decode('utf-8')
            
            # Step 4: Construct the exact data dictionary mapping to the Supabase PostgreSQL columns.
            insert_payload: Dict[str, Any] = {
                "email": email,
                "password_hash": final_secure_hash,
                "username": username,
                "contact_number": contact_number,
                "role": role,
                "trust_score": 0  # Default baseline trust metric
            }
            
            # Step 5: Initialize the table reference via the Titanium kernel.
            target_table: Any = self.db.table("users")
            
            # Step 6: Construct and execute the remote procedure call (RPC).
            insert_query: Any = target_table.insert(insert_payload)
            response: Any = insert_query.execute()
            
            # Step 7: Safely unpack the response array to verify the commit.
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                inserted_record: Dict[str, Any] = response_data[0]
                
                # Step 8: Security Purge - Strip the Bcrypt hash before returning the object to the UI state.
                if "password_hash" in inserted_record:
                    del inserted_record["password_hash"]
                    
                print(f"System: Successfully registered {role.upper()} -> {email} with Username: {username}")
                return inserted_record
                
            return None
            
        except Exception as e:
            # Enhanced Exception Extraction for Supabase PostgREST layer
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Details: {e.details}"
                
            print(f"CRITICAL ERROR [UserRepository.create_user]: Failed to create user profile. {error_message}")
            return None

    def verify_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """
        Authenticates user credentials against the stored Bcrypt records.
        Fetches the user strictly by email, then executes a time-safe cryptographic comparison
        within the Python memory layer.

        Args:
            email (str): The email address of the user attempting to log in.
            password (str): The raw, unencrypted password provided during the login attempt.

        Returns:
            Optional[Dict[str, Any]]: A dictionary containing the user's base identity info if authenticated, 
                                     or None if the credentials fail validation.
        """
        try:
            # Step 1: Initialize a secure query to extract the user's encrypted record based strictly on email.
            target_table: Any = self.db.table("users")
            base_query: Any = target_table.select("id, email, username, role, password_hash")
            email_filtered_query: Any = base_query.eq("email", email)
            
            # Step 2: Execute the query block across the network.
            response: Any = email_filtered_query.execute()
            response_data: List[Dict[str, Any]] = response.data
            
            # Step 3: Verify if the database isolated exactly one identity.
            if not response_data or len(response_data) == 0:
                print(f"System: Authentication failed. Identity {email} not found.")
                return None
                
            # Step 4: Extract the user profile and their secure Bcrypt hash.
            user_profile: Dict[str, Any] = response_data[0]
            stored_secure_hash: str = str(user_profile.get("password_hash", ""))
            
            # Guard clause: Check if the stored hash is empty or malformed
            if not stored_secure_hash:
                print(f"System: Authentication failed for user -> {email}. Missing stored credential hash.")
                return None

            # Step 5: Encode both strings into UTF-8 bytes for the cryptographic engine.
            raw_password_bytes: bytes = password.encode('utf-8')
            stored_hash_bytes: bytes = stored_secure_hash.encode('utf-8')
            
            # Step 6: Execute the mathematically time-safe Bcrypt verification algorithm with exception trapping.
            is_password_valid: bool = False
            try:
                is_password_valid = bcrypt.checkpw(raw_password_bytes, stored_hash_bytes)
            except Exception as crypto_error:
                print(f"CRITICAL ERROR [UserRepository.verify_user]: Cryptographic salt mismatch -> {str(crypto_error)}")
                return None
            
            if is_password_valid:
                # Step 7: Purge the hash from active memory before passing the payload to the frontend.
                del user_profile["password_hash"]
                print(f"System: Successfully authenticated user -> {email}")
                return user_profile
            else:
                print(f"System: Authentication failed for user -> {email}. Invalid passphrase.")
                return None
                
        except Exception as e:
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Details: {e.details}"
            print(f"CRITICAL ERROR [UserRepository.verify_user]: Failed to authenticate user. {error_message}")
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Executes a direct, highly optimized database lookup for a specific user identifier.
        Architected to replace the catastrophic full-table memory leak in the Warden verification pipeline.

        Args:
            user_id (str): The unique database UUID or String identifier.

        Returns:
            Optional[Dict[str, Any]]: The strictly typed user dictionary if found, otherwise None.
        """
        try:
            # Step 1: Initialize the table and base selection criteria.
            target_table: Any = self.db.table("users")
            base_query: Any = target_table.select("id, email, username, role")
            
            # Step 2: Append the strict exact-match equality filter.
            filtered_query: Any = base_query.eq("id", str(user_id))
            
            # Step 3: Execute the optimized database retrieval.
            response: Any = filtered_query.execute()
            data_array: List[Dict[str, Any]] = response.data
            
            # Step 4: Unpack and return the singular matching identity.
            if data_array and len(data_array) > 0:
                extracted_user: Dict[str, Any] = data_array[0]
                return extracted_user
                
            return None
            
        except Exception as e:
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Details: {e.details}"
            print(f"CRITICAL ERROR [UserRepository.get_user_by_id]: Optimized Warden lookup failed: {error_message}")
            return None

    def get_all_users(self) -> List[Dict[str, Any]]:
        """
        Retrieves all registered user profiles from the database.
        Retained for legacy backward compatibility and diagnostic execution testing.

        Returns:
            List[Dict[str, Any]]: A strictly typed list of dictionaries, each representing a user profile. 
                                 Returns an empty list on failure.
        """
        try:
            target_table: Any = self.db.table("users")
            fetch_query: Any = target_table.select("*")
            response: Any = fetch_query.execute()
            
            data_array: List[Dict[str, Any]] = response.data
            return data_array
            
        except Exception as e:
            error_message: str = str(e)
            print(f"CRITICAL ERROR [UserRepository.get_all_users]: Failed to fetch users. {error_message}")
            empty_fallback_list: List[Dict[str, Any]] = []
            return empty_fallback_list


# ==========================================
# COMMERCIAL SPATIAL STORE REPOSITORY
# ==========================================

class StoreRepository:
    """
    Manages the lifecycle of digital storefronts.
    Handles QR cryptography for the Phase 1 spatial routing system.
    """
    
    def __init__(self) -> None:
        self.db: Any = get_db()

    def register_shop(self, owner_id: str, name: str, category: str, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        """
        Registers a commercial shop and converts raw GPS floating-point coordinates 
        into PostGIS-readable WKT (Well-Known Text) spatial data.
        """
        try:
            # Step 1: Construct a raw, deterministic string for QR generation.
            raw_hash_string: str = f"{owner_id}-{name}-{lat}-{lng}"
            raw_hash_bytes: bytes = raw_hash_string.encode('utf-8')
            
            # Step 2: Generate a SHA-256 hash. 
            hash_object: Any = hashlib.sha256(raw_hash_bytes)
            qr_hash: str = hash_object.hexdigest()
            
            # Step 3: Execute PostGIS Spatial Formatting.
            point_wkt: str = f"POINT({lng} {lat})"
            
            # Step 4: Construct the comprehensive data payload.
            data_payload: Dict[str, Any] = {
                "owner_id": owner_id,
                "shop_name": name,
                "shop_category": category,
                "qr_hash": qr_hash,
                "location": point_wkt,
                "safety_score": 100
            }
            
            target_table: Any = self.db.table("shops")
            insert_query: Any = target_table.insert(data_payload)
            response: Any = insert_query.execute()
            
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                inserted_record: Dict[str, Any] = response_data[0]
                return inserted_record
                
            return None
            
        except Exception as e:
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Details: {e.details}"
            print(f"CRITICAL ERROR [StoreRepository.register_shop]: Store Registration Failed. {error_message}")
            return None

    def get_shop_by_qr(self, qr_hash: str) -> Optional[Dict[str, Any]]:
        """
        Fetches a specific shop's detailed spatial profile using its unique QR hash payload.
        """
        try:
            target_table: Any = self.db.table("shops")
            base_query: Any = target_table.select("*")
            filtered_query: Any = base_query.eq("qr_hash", qr_hash)
            
            response: Any = filtered_query.execute()
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                verified_shop: Dict[str, Any] = response_data[0]
                return verified_shop
            else:
                return None
                
        except Exception as e:
            print(f"CRITICAL ERROR [StoreRepository.get_shop_by_qr]: {str(e)}")
            return None

    def update_safety_score(self, shop_id: int, computed_score: int) -> Optional[Dict[str, Any]]:
        """
        Updates the calculated compliance safety score of a specific shop in the central database.
        """
        try:
            update_payload: Dict[str, int] = {
                "safety_score": computed_score
            }
            
            target_table: Any = self.db.table("shops")
            base_query: Any = target_table.update(update_payload)
            filtered_query: Any = base_query.eq("id", shop_id)
            
            response: Any = filtered_query.execute()
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                updated_record: Dict[str, Any] = response_data[0]
                return updated_record
            else:
                return None
                
        except Exception as e:
            print(f"CRITICAL ERROR [StoreRepository.update_safety_score]: {str(e)}")
            return None


# ==========================================
# HAZARD & SPATIAL ROUTING REPOSITORY
# ==========================================

class HazardRepository:
    """
    Handles high-concurrency event reporting for active emergencies and structural blockages.
    Maintains spatial PostGIS geometry required by the central mapping engine.
    """
    
    def __init__(self) -> None:
        self.db: Any = get_db()

    def report_hazard(self, reporter_id: str, hazard_type: str, location_wkt: str, description: str = "") -> Optional[Dict[str, Any]]:
        """
        Logs a real-time hazard utilizing explicitly pre-formatted PostGIS WKT geometry.
        Incorporates highly robust exception trapping to catch Supabase Foreign Key and Type casting rejections.
        """
        try:
            # Step 1: Pre-sanitize the payload to ensure null references do not corrupt the database schema
            safe_reporter_id: Optional[str] = reporter_id if reporter_id != "user_system_default" else None
            
            data_payload: Dict[str, Any] = {
                "hazard_type": hazard_type,
                "location": location_wkt,
                "description": description,
                "status": "pending"
            }
            
            # Only append the reporter_id if it is a genuine UUID to avoid Foreign Key crashes
            if safe_reporter_id:
                data_payload["reporter_id"] = safe_reporter_id
            
            # Step 2: Initialize table and execute the remote procedure call
            target_table: Any = self.db.table("hazards")
            insert_query: Any = target_table.insert(data_payload)
            response: Any = insert_query.execute()
            
            # Step 3: Unpack the response stream
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                inserted_record: Dict[str, Any] = response_data[0]
                print(f"System: CRITICAL HAZARD LOGGED -> '{hazard_type.upper()}' with Spatial Vector {location_wkt}")
                return inserted_record
                
            return None
            
        except Exception as e:
            # Step 4: Deep Error Trace Extraction
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Supabase Details: {e.details}"
            if hasattr(e, 'hint'):
                error_message += f" | DB Hint: {e.hint}"
                
            print(f"CRITICAL ERROR [HazardRepository.report_hazard]: Failed to log hazard. {error_message}")
            return None

    def delete_hazard(self, hazard_id: str) -> Optional[Dict[str, Any]]:
        """
        Permanently deletes a hazard record from the Supabase PostgreSQL 'hazards' table
        using its unique UUID string.
        
        Args:
            hazard_id (str): The unique string UUID of the hazard row.
            
        Returns:
            Optional[Dict[str, Any]]: The deleted record data if successful, or None if failed.
        """
        try:
            # Step 1: Access the active database connection via self.db (Titanium Connection Pool)
            target_table: Any = self.db.table("hazards")
            delete_query: Any = target_table.delete().eq("id", hazard_id)
            response: Any = delete_query.execute()
            
            # Step 2: Validate data return payload
            response_data: List[Dict[str, Any]] = response.data
            if response_data and len(response_data) > 0:
                deleted_record: Dict[str, Any] = response_data[0]
                print(f"System: Hazard {hazard_id} successfully purged from database.")
                return deleted_record
                
            return {"id": hazard_id, "status": "deleted"}
            
        except Exception as e:
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Details: {e.details}"
            print(f"CRITICAL ERROR [HazardRepository.delete_hazard]: Database deletion error: {error_message}")
            return None

    def get_live_hazards(self, is_warden: bool = False) -> List[Dict[str, Any]]:
        """
        Retrieves active hazard reports. Applies strict access control based on warden privileges.
        """
        try:
            target_table: Any = self.db.table("hazards")
            base_query: Any = target_table.select("*")
            
            if not is_warden:
                filtered_query: Any = base_query.eq("status", "verified")
                response: Any = filtered_query.execute()
            else:
                response: Any = base_query.execute()
            
            data_array: List[Dict[str, Any]] = response.data
            return data_array
            
        except Exception as e:
            print(f"CRITICAL ERROR [HazardRepository.get_live_hazards]: {str(e)}")
            return []

    def verify_hazard(self, hazard_id: str, warden_id: str) -> Optional[Dict[str, Any]]:
        """
        Elevated privilege pathway. Mutates state and triggers global routing algorithms.
        """
        try:
            update_payload: Dict[str, str] = {
                "status": "verified"
            }
            
            target_table: Any = self.db.table("hazards")
            base_query: Any = target_table.update(update_payload)
            filtered_query: Any = base_query.eq("id", hazard_id)
            
            response: Any = filtered_query.execute()
            
            audit_description: str = f"Warden {warden_id} verified hazard ID {hazard_id}"
            audit_logger: 'AuditLogger' = AuditLogger()
            audit_logger.log_event(event_type="HAZARD_VERIFIED", description=audit_description)
            
            print(f"System: Hazard {hazard_id} has been officially VERIFIED by Warden {warden_id}.")
            
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                updated_record: Dict[str, Any] = response_data[0]
                return updated_record
            else:
                return None
                
        except Exception as e:
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Details: {e.details}"
            print(f"CRITICAL ERROR [HazardRepository.verify_hazard]: {error_message}")
            return None


# ==========================================
# COMMUNITY CHAT REPOSITORY (PILLAR 2)
# ==========================================

class ChatRepository:
    """
    Architected to eradicate "Frontend Theater" within the Pillar 2 geofenced chat application.
    """

    def __init__(self) -> None:
        self.db: Any = get_db()

    def post_message(self, channel: str, user_id: str, role: str, payload_text: str) -> Optional[Dict[str, Any]]:
        """
        Writes a single message packet into a specific neighborhood zone.
        """
        try:
            data_payload: Dict[str, str] = {
                "channel": channel,
                "sender_id": user_id,
                "sender_role": role,
                "content": payload_text
            }
            
            target_table: Any = self.db.table("messages")
            insert_query: Any = target_table.insert(data_payload)
            response: Any = insert_query.execute()
            
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                inserted_message: Dict[str, Any] = response_data[0]
                return inserted_message
            return None

        except Exception as e:
            error_message: str = str(e)
            if hasattr(e, 'details'):
                error_message += f" | Supabase Hint: {e.details}"
            print(f"CRITICAL ERROR [ChatRepository.post_message]: Database write failed for channel {channel}: {error_message}")
            return None

    def fetch_channel_messages(self, channel: str) -> List[Dict[str, Any]]:
        """
        Retrieves the global chronological timeline for a specific neighborhood channel.
        """
        try:
            target_table: Any = self.db.table("messages")
            base_query: Any = target_table.select("*")
            filtered_query: Any = base_query.eq("channel", channel)
            sorted_query: Any = filtered_query.order("created_at", desc=False)
            
            response: Any = sorted_query.execute()
            data_array: List[Dict[str, Any]] = response.data
            
            return data_array
            
        except Exception as e:
            print(f"CRITICAL ERROR [ChatRepository.fetch_channel_messages]: {str(e)}")
            return []


# ==========================================
# CROWDFUNDING REPOSITORY (PILLAR 3)
# ==========================================

class FundRepository:
    """
    Architected to eradicate "Frontend Theater" within the Pillar 3 fundraising system.
    """

    def __init__(self) -> None:
        self.db: Any = get_db()

    def launch_campaign(self, organizer_id: str, title: str, target_goal: float) -> Optional[Dict[str, Any]]:
        """
        Initializes a brand-new fundraising ledger entry in the database.
        """
        try:
            data_payload: Dict[str, Any] = {
                "organizer_id": organizer_id,
                "title": title,
                "target_amount": target_goal,
                "raised_amount": 0.0
            }
            
            target_table: Any = self.db.table("campaigns")
            insert_query: Any = target_table.insert(data_payload)
            response: Any = insert_query.execute()
            
            response_data: List[Dict[str, Any]] = response.data
            
            if response_data and len(response_data) > 0:
                inserted_campaign: Dict[str, Any] = response_data[0]
                return inserted_campaign
            return None

        except Exception as e:
            print(f"CRITICAL ERROR [FundRepository.launch_campaign]: {str(e)}")
            return None

    def get_global_feed(self) -> List[Dict[str, Any]]:
        """
        Retrieves all active campaigns to populate the global city feed UI.
        """
        try:
            target_table: Any = self.db.table("campaigns")
            fetch_query: Any = target_table.select("*").order("created_at", desc=True)
            response: Any = fetch_query.execute()
            
            data_array: List[Dict[str, Any]] = response.data
            return data_array
            
        except Exception as e:
            print(f"CRITICAL ERROR [FundRepository.get_global_feed]: {str(e)}")
            return []


# ==========================================
# SYSTEM SECURITY & AUDIT LOGGING
# ==========================================

class AuditLogger:
    """
    Writes critical system events, state overrides, and elevated privilege executions to the cloud database.
    """
    
    def __init__(self) -> None:
        self.db: Any = get_db()

    def log_event(self, event_type: str, description: str) -> None:
        """
        Commits an immutable audit event string to the permanent database ledger.
        """
        try:
            data_payload: Dict[str, str] = {
                "event_type": event_type,
                "description": description
            }
            
            target_table: Any = self.db.table("audit_logs")
            insert_query: Any = target_table.insert(data_payload)
            insert_query.execute()
            
        except Exception as e:
            print(f"CRITICAL ERROR [AuditLogger.log_event]: Secure audit logging mechanism failed. {str(e)}")


# ==========================================
# COMPREHENSIVE REPOSITORY DIAGNOSTICS
# ==========================================

if __name__ == "__main__":
    print("\n--- Aagahi Repository System Check ---")
    user_repo: UserRepository = UserRepository()
    store_repo: StoreRepository = StoreRepository()
    hazard_repo: HazardRepository = HazardRepository()
    chat_repo: ChatRepository = ChatRepository()
    fund_repo: FundRepository = FundRepository()
    
    users_array: List[Dict[str, Any]] = user_repo.get_all_users()
    population_count: int = len(users_array)
    print(f"System: Discovered {population_count} active user accounts securely stored in the database.")