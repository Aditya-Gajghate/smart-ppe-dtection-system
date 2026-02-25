import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")

async def check_attendance():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["smart-ppe-attendance"]
    
    # Try different collection names just in case
    for coll_name in ["attendances", "attendance"]:
        print(f"Checking collection: {coll_name}")
        records = await db[coll_name].find().to_list(100)
        print(f"Found {len(records)} records.")
        for r in records:
            print(f" - {r.get('employeeId')} | {r.get('status')} | {r.get('timestamp')}")

if __name__ == "__main__":
    asyncio.run(check_attendance())
