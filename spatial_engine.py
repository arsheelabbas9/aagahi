from typing import Dict, List, Any, Union
from kernel import get_db

class SpatialEngine:
    """
    Acts as the primary algorithmic interface for the Aagahi Routing architecture.
    Bridges the Python application layer with the advanced PostGIS spatial 
    algorithms housed natively within the Supabase PostgreSQL cluster.
    """
    
    def __init__(self) -> None:
        """
        Initializes the SpatialEngine and establishes a connection to the 
        database layer utilizing the resilient connection pool established in the kernel.
        """
        self.db = get_db()

    def scan_danger_zone(self, lat: float, lng: float, radius_meters: int = 1000) -> List[Dict[str, Any]]:
        """
        Executes a highly optimized spatial intersection calculation.
        It accepts geographic coordinates of an active hazard (epicenter) and a blast radius,
        then calls a Remote Procedure Call (RPC) on the database to identify all commercial 
        facilities caught within that exact geometric perimeter.

        Args:
            lat (float): The latitude of the hazard epicenter.
            lng (float): The longitude of the hazard epicenter.
            radius_meters (int, optional): The evacuation perimeter radius measured in meters. Defaults to 1000.

        Returns:
            List[Dict[str, Any]]: A list of dictionaries, where each dictionary represents an affected shop 
                                  containing its compliance score and exact calculated distance from the epicenter.
                                  Returns an empty list on failure or if no shops are detected.
        """
        try:
            # Step 1: Explicitly define the target RPC function located in the PostgreSQL cluster
            rpc_function_name: str = 'get_shops_in_danger_zone'
            
            # Step 2: Construct and map the strict payload arguments required by the PostGIS RPC logic
            rpc_payload_arguments: Dict[str, Union[float, int]] = {
                'h_lat': lat,
                'h_lng': lng,
                'radius_meters': radius_meters
            }
            
            # Step 3: Initialize the query builder using the established database connection
            query_builder = self.db.rpc(rpc_function_name, rpc_payload_arguments)
            
            # Step 4: Execute the query block across the network to the cloud cluster
            response = query_builder.execute()
            
            # Step 5: Extract the raw array data returned from the successful SQL execution
            extracted_spatial_data: List[Dict[str, Any]] = response.data
            
            # Return the exact list of shops so the API controller can format it as a JSON stream
            return extracted_spatial_data
            
        except Exception as e:
            # Step 6: Catch and robustly log any transient database connection errors or RPC missing-function errors
            # This ensures the FastAPI server does not crash during algorithmic failures.
            print(f"CRITICAL ERROR [SpatialEngine.scan_danger_zone]: PostGIS spatial query failed execution. Exception details: {e}")
            
            # Return a safe, empty array fallback to prevent downstream mapping crashes on the mobile frontend
            return []