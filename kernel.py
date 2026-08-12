import os
import toml
from typing import Optional, Any
from supabase import create_client, Client

# ==========================================
# PHASE 1: TITANIUM DATA ORCHESTRATOR
# ==========================================

class DatabaseAdapter:
    """
    Singleton class managing the HTTPS connection to the live Supabase PostgreSQL cluster.
    Implements 'Lazy Loading' to protect the application from transient network blips 
    and connection throttling during aggressive read/write scaling.
    Upgraded for cloud production to support both local TOML configurations and 
    Render environment variables seamlessly.
    """
    
    # Internal tracking for the singleton instance lock
    _instance: Optional['DatabaseAdapter'] = None
    
    # Stores the active Supabase connection pipeline
    client: Optional[Client] = None

    def __new__(cls) -> 'DatabaseAdapter':
        """
        Overrides the native object creation mathematical flow to enforce the Singleton pattern.
        Guarantees that only one active database socket is created globally, preventing memory leaks.
        """
        if cls._instance is None:
            # Step 1: Allocate memory for the single instance
            cls._instance = super(DatabaseAdapter, cls).__new__(cls)
            
            # Step 2: Trigger the network initialization handshake
            cls._instance._init_connection()
            
        return cls._instance

    def _init_connection(self) -> None:
        """
        Orchestrates the extraction of cryptographic secrets and initializes the master Supabase client.
        Automatically checks for a local secrets.toml file first; if missing (such as in cloud 
        deployments on Render), it reads directly from secure host environment variables.
        
        Raises:
            Exception: Fatal error if credentials are missing, malformed, or network drops.
        """
        try:
            supabase_url: Optional[str] = None
            supabase_key: Optional[str] = None

            # Step 1: Resolve the absolute file path dynamically for local development
            current_directory: str = os.path.dirname(os.path.abspath(__file__))
            secrets_file_path: str = os.path.join(current_directory, "secrets.toml")
            
            # Step 2: Dual-path configuration detection (Local TOML vs Cloud Environment Variables)
            if os.path.exists(secrets_file_path):
                # Local environment: parse strict configuration boundaries from the TOML file
                config_data: dict[str, Any] = toml.load(secrets_file_path)
                supabase_url = config_data.get('SUPABASE', {}).get('URL')
                supabase_key = config_data.get('SUPABASE', {}).get('SERVICE_ROLE_KEY')
            else:
                # Cloud production environment (Render): retrieve directly from platform environment variables
                supabase_url = os.environ.get("SUPABASE_URL")
                supabase_key = os.environ.get("SUPABASE_KEY")

            # Step 3: Guard clause to ensure credentials were successfully acquired from one of the sources
            if not supabase_url or not supabase_key:
                raise ValueError("Supabase credentials are missing. Verify secrets.toml exists locally or Render Environment Variables are set.")

            # Step 4: Initialize the master Supabase client and bind it to the class state
            self.client = create_client(supabase_url, supabase_key)
            print("System: Backend Orchestrator successfully connected to Supabase.")
            
        except Exception as e:
            # Step 5: Catch catastrophic initialization failures gracefully before the API spins up
            exception_message: str = f"CRITICAL: Failed to initialize database connection. Error: {str(e)}"
            print(exception_message)
            raise e

    def get_db(self) -> Client:
        """
        Safely returns the active Supabase client instance to requesting repository modules.
        
        Returns:
            Client: The established Supabase connection pipeline.
        """
        if self.client is None:
            raise RuntimeError("DatabaseAdapter client was not initialized properly.")
        return self.client

# ==========================================
# EXPORTED GLOBAL UTILITY
# ==========================================

def get_db() -> Client:
    """
    Global abstraction wrapper for the DatabaseAdapter.
    Permits clean, immediate imports across repository modules without manual instantiations.
    
    Returns:
        Client: The active Supabase client.
    """
    adapter_instance: DatabaseAdapter = DatabaseAdapter()
    return adapter_instance.get_db()

# --- Quick Diagnostic Boot Test ---
if __name__ == "__main__":
    try:
        active_db: Client = get_db()
        # Attempt a lightweight read operation to mathematically verify the Service Role key is bypassing RLS
        diagnostic_response: Any = active_db.table("users").select("*").limit(1).execute()
        print("Diagnostic Output Success:", diagnostic_response.data)
    except Exception as diagnostic_error:
        print("Diagnostic Boot Failed:", str(diagnostic_error))