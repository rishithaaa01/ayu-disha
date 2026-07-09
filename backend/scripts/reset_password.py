"""
Quick script to reset a user's password directly in MongoDB.
Run: python scripts/reset_password.py meherr17@gmail.com NewPassword123
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pymongo import MongoClient
import bcrypt

# Load env
from dotenv import load_dotenv
load_dotenv()
MONGODB_URI = os.environ.get("MONGODB_URI")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "ayu_disha")

def reset_password(email: str, new_password: str):
    print(f"Connecting to MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]

    email_clean = email.strip().lower()
    user = db.users.find_one({"email": email_clean})
    if not user:
        print(f"❌ No user found with email: {email_clean}")
        client.close()
        return

    print(f"✅ Found user: {user.get('name', '—')} | Role: {user.get('role', '—')}")

    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.users.update_one({"email": email_clean}, {"$set": {"password_hash": hashed}})
    print(f"✅ Password reset successfully for {email_clean}")
    print(f"   New password: {new_password}")
    client.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/reset_password.py <email> <new_password>")
        sys.exit(1)
    reset_password(sys.argv[1], sys.argv[2])
