import requests
import time
from repositories import StoreRepository

def fetch_real_saddar_shops():
    """
    Hits the live OpenStreetMap Overpass API to pull real commercial data for Saddar.
    Bounding Box: South 24.8532, West 67.0000, North 24.8670, East 67.0250
    """
    print("System: Initiating live scrape of Saddar commercial data from OSM...")
    
    # Switched to secure HTTPS
    overpass_url = "https://overpass-api.de/api/interpreter"
    
    # Overpass QL to get all nodes tagged as 'shop' within our Saddar box
    overpass_query = """
    [out:json];
    node["shop"](24.8532, 67.0000, 24.8670, 67.0250);
    out;
    """
    
    # The ID Badge: Tells the OSM server exactly who we are so they don't block us
    headers = {
        "User-Agent": "Aagahi-Prototype/1.0 (Fire Hazard Routing Research in Karachi)"
    }
    
    try:
        # Pass the headers in the POST request
        response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data.get('elements', [])
    except Exception as e:
        print(f"CRITICAL: Scraping failed. Error: {e}")
        return []

if __name__ == "__main__":
    # 1. Initialize the Database Connection
    store_repo = StoreRepository()
    
    # 2. Hardcode the exact Shopkeeper ID you generated earlier
    PROTOTYPE_SHOPKEEPER_ID = "4a0c1b40-76bf-4ffd-9dfd-3aa6f4a0761b"
    
    # 3. Pull the live data
    real_shops = fetch_real_saddar_shops()
    print(f"System: Discovered {len(real_shops)} real shops in Saddar.")
    
    # 4. Inject into Supabase
    success_count = 0
    print("\n--- Beginning Massive Spatial Injection ---")
    
    for element in real_shops:
        # OSM data can be messy, so we extract safely
        tags = element.get('tags', {})
        shop_name = tags.get('name', 'Unnamed Store')
        category = tags.get('shop', 'General')
        lat = element.get('lat')
        lng = element.get('lon')
        
        # We only want shops with actual names to keep the prototype clean
        if shop_name != 'Unnamed Store':
            result = store_repo.register_shop(
                owner_id=PROTOTYPE_SHOPKEEPER_ID,
                name=shop_name,
                category=category,
                lat=lat,
                lng=lng
            )
            if result:
                success_count += 1
            
            # Brief pause to prevent overwhelming your Supabase connection pool
            time.sleep(0.1) 

    print(f"\nSystem: Successfully injected {success_count} real-world Saddar shops into Supabase.")