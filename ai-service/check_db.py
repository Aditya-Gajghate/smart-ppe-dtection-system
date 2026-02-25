import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")

async def check_db():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.get_default_database()
    print(f"Connected to DB: {db.name}")
    
    employees = await db.employees.find().to_list(100)
    print(f"Found {len(employees)} employees in DB:")
    for emp in employees:
        print(f" - Name: '{emp.get('name')}', ID: {emp.get('employeeId')}, PPE: {emp.get('ppeRequirements')}")

if __name__ == "__main__":
    asyncio.run(check_db())
