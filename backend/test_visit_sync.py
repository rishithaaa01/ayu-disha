"""
Test script to verify visit sync payload format
"""
import json

# Simulate what the mobile app is sending
test_payload = {
    "household_id": "507f1f77bcf86cd799439011",  # Example ObjectId
    "member_id": "John Doe",  # This might be the issue - should be a patient ID, not a name
    "visit_type": "general",
    "observations": {
        "fever": "Yes",
        "duration": "2-3 days"
    },
    "voice_notes": "Patient has fever",
    "risk_level": "WATCH",
    "ai_reasoning": "Routine checkup",
    "ai_recommendation": "Monitor condition"
}

print("Testing visit payload:")
print(json.dumps(test_payload, indent=2))

# Check types
print("\nType checks:")
print(f"household_id type: {type(test_payload['household_id'])}")
print(f"member_id type: {type(test_payload['member_id'])}")
print(f"observations type: {type(test_payload['observations'])}")
print(f"observations is dict: {isinstance(test_payload['observations'], dict)}")
print(f"observations is not list: {not isinstance(test_payload['observations'], list)}")

# Validate observations is a dict
if not isinstance(test_payload['observations'], dict):
    print("❌ ERROR: observations must be a dict/object!")
else:
    print("✅ observations is valid dict")

# Validate required fields
required_fields = ['household_id', 'member_id', 'visit_type', 'observations', 'risk_level', 'ai_reasoning', 'ai_recommendation']
for field in required_fields:
    if field not in test_payload:
        print(f"❌ Missing required field: {field}")
    else:
        value = test_payload[field]
        if value is None or value == '':
            print(f"⚠️  Field {field} is empty or None")
        else:
            print(f"✅ {field}: {type(value).__name__}")
