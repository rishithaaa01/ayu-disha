import os
import pymongo
from dotenv import load_dotenv
import socket

def run_diagnostic():
    print("🔍 Ayu Disha Database Diagnostic")
    print("="*40)
    
    # 1. Load Environment
    load_dotenv()
    uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DATABASE_NAME", "ayu_disha_db")
    
    # 1. Check Network Connectivity
    print("\n[1] Checking Basic Internet...")
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        print("✅ Basic Internet is reachable (Pinged Google).")
    except Exception as e:
        print(f"❌ Internet unreachable: {e}")

    # 2. Check DNS Resolution
    print("\n[2] Checking MongoDB SRV Resolution...")
    host = "ayudisha.ec7scbi.mongodb.net"
    try:
        # Check standard A record
        ip = socket.gethostbyname("google.com")
        print(f"✅ Standard DNS is working (google.com -> {ip})")
        
        # Check SRV record for MongoDB
        print(f"Attempting SRV lookup for: {host}")
        import dns.resolver
        answers = dns.resolver.resolve(f"_mongodb._tcp.{host}", 'SRV')
        for rdata in answers:
            print(f"✅ Found MongoDB Node: {rdata.target}")
    except Exception as e:
        print(f"❌ DNS SRV Failure: {e}")
        print("💡 TIP: Your Wi-Fi or Hotspot is blocking SRV lookups. Try switching to a different Hotspot provider.")

    # 3. Check Python Libraries
    print("\n[3] Checking Python Environment...")
    try:
        import motor
        import dnspython
        print(f"✅ Motor version: {motor.version}")
        print("✅ dnspython is installed.")
    except ImportError as e:
        print(f"❌ Missing library: {e}")

    # 4. Attempt Real Connection (reads URI from environment — never hardcode credentials)
    print("\n[4] Attempting Real MongoDB Connection (5s timeout)...")
    uri = os.environ.get("MONGODB_URI", "")
    if not uri:
        print("❌ ERROR: MONGODB_URI not found in .env file!")
        return

    print(f"📡 Testing connection to: {uri.split('@')[-1] if '@' in uri else 'Hidden URI'}")
    
    # 2. DNS Check
    try:
        host = uri.split('@')[-1].split('/')[0]
        if "+srv" in uri:
            # Simple check if there's a dot in the host
            if "." not in host:
                print("❌ ERROR: Invalid SRV URI format.")
        
        print(f"🌐 Resolving host: {host}...")
        # Note: socket.gethostbyname won't work for SRV, but it's a good basic check
    except Exception as e:
        print(f"⚠️ DNS Resolution warning: {e}")

    # 3. Connection Check
    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Attempt to list databases (this triggers the actual connection)
        dbs = client.list_database_names()
        print(f"✅ SUCCESS! Connected to MongoDB Atlas.")
        print(f"📂 Available Databases: {dbs}")
        
        if db_name in dbs:
            print(f"✨ Found '{db_name}' database.")
        else:
            print(f"ℹ️ '{db_name}' not found yet (will be created on first write).")
            
    except pymongo.errors.ConfigurationError as e:
        print("\n" + "!"*40)
        print("🔴 CONFIGURATION / DNS ERROR")
        print(f"Detail: {e}")
        print("\n💡 ADVICE: Your network is likely blocking MongoDB Atlas DNS records.")
        print("Try switching to a Mobile Hotspot or using a local MongoDB.")
        print("!"*40)
        
    except pymongo.errors.ServerSelectionTimeoutError as e:
        print("\n" + "!"*40)
        print("🔴 CONNECTION TIMEOUT")
        print(f"Detail: {e}")
        print("\n💡 ADVICE: Your IP address is likely not whitelisted in MongoDB Atlas.")
        print("Go to Atlas > Network Access > Add IP > 'Allow Access From Anywhere'.")
        print("!"*40)
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {type(e).__name__}: {e}")
    
    print("="*40)

if __name__ == "__main__":
    run_diagnostic()
