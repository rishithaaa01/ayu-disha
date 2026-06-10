import asyncio
from database import connect_to_mongo, get_database
from routes.auth import register, UserRegisterRequest, UserRole
from pydantic import ValidationError

async def test():
    await connect_to_mongo()
    db = get_database()
    if db is None:
        print("Failed to connect to database")
        return
        
    # Create request
    req = UserRegisterRequest(
        email="test_doctor_fresh@ayudisha.org",
        password="password123",
        name="Test Doctor Fresh",
        mobile="+918888888888",
        role=UserRole.doctor,
        language="en",
        district="Chennai",
        hospital="Govt General Hospital Chennai"
    )
    
    # Try calling register or simulate it
    try:
        # Delete existing test user if any
        await db.users.delete_many({"mobile": "+918888888888"})
        await db.users.delete_many({"email": "test_doctor_fresh@ayudisha.org"})
        
        res = await register(req)
        print("Registration Succeeded!", res)
    except Exception as e:
        print("Registration Failed with exception:", e)
        import traceback
        traceback.print_exc()

asyncio.run(test())
