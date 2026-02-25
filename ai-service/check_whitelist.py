import os
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from dotenv import load_dotenv

load_dotenv()
uri = os.getenv("MONGODB_URI")

def test_atlas():
    print(f"Testing connection to: {uri.split('@')[-1]}")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    try:
        client.admin.command('ping')
        print("✅ SUCCESS: Your IP is whitelisted and connection is successful!")
    except ServerSelectionTimeoutError:
        print("❌ FAIL: Connection Timeout.")
        print("Possible causes:")
        print("1. Your current IP is NOT whitelisted in MongoDB Atlas.")
        print("2. Your firewall or network is blocking the connection (Port 27017).")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    test_atlas()
