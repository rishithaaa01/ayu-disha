import httpx
from config import settings

class SMSService:
    async def send_otp(self, mobile: str, otp: str) -> dict:
        """
        Sends an OTP using Twilio or Fast2SMS based on which credentials are provided in settings.
        If neither is configured, prints to console and returns status information.
        """
        # Clean mobile number
        mobile_clean = mobile.strip().replace(" ", "")
        
        # 1. Try Twilio if configured
        if settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number:
            print(f"📡 Attempting to send OTP via Twilio to {mobile_clean}...")
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
            auth = (settings.twilio_account_sid, settings.twilio_auth_token)
            data = {
                "To": mobile_clean,
                "From": settings.twilio_from_number,
                "Body": f"Your Ayu Disha verification code is {otp}. Valid for 5 minutes."
            }
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, auth=auth, timeout=10.0)
                    res_json = response.json()
                    if response.status_code == 201:
                        print(f"✅ OTP sent via Twilio to {mobile_clean}")
                        return {"status": "success", "provider": "twilio"}
                    else:
                        print(f"❌ Twilio API error: {res_json}")
            except Exception as e:
                print(f"❌ Twilio communication error: {e}")

        # 2. Try Fast2SMS if configured
        if settings.fast2sms_api_key:
            print(f"📡 Attempting to send OTP via Fast2SMS (OTP Route) to {mobile_clean}...")
            # Fast2SMS requires 10 digit number (remove +91 prefix)
            number = mobile_clean.replace("+91", "")
            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": settings.fast2sms_api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": number
            }
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                    res_json = response.json()
                    if res_json.get("return") is True:
                        print(f"✅ OTP sent via Fast2SMS (OTP Route) to {mobile_clean}")
                        return {"status": "success", "provider": "fast2sms"}
                    
                    # If OTP route fails (e.g. website verification needed), try Quick SMS fallback
                    print(f"⚠️ Fast2SMS OTP route failed: {res_json}. Trying Quick SMS route...")
                    payload_quick = {
                        "route": "q",
                        "message": f"Your Ayu Disha verification code is {otp}. Valid for 5 minutes.",
                        "numbers": number
                    }
                    response_q = await client.post(url, json=payload_quick, headers=headers, timeout=10.0)
                    res_q_json = response_q.json()
                    if res_q_json.get("return") is True:
                        print(f"✅ OTP sent via Fast2SMS (Quick SMS Route) to {mobile_clean}")
                        return {"status": "success", "provider": "fast2sms"}
                    else:
                        print(f"❌ Fast2SMS Quick SMS route failed: {res_q_json}")
            except Exception as e:
                print(f"❌ Fast2SMS communication error: {e}")

        # 3. Fallback to Console Logging
        print("\n" + "╔" + "═"*50 + "╗")
        print("║                [FALLBACK LOGGING]                ║")
        print(f"║ Mobile: {mobile_clean:<18} OTP Code: {otp:<13} ║")
        print("║ (Configure TWILIO or FAST2SMS in .env for SMS)   ║")
        print("╚" + "═"*50 + "╝\n")
        return {"status": "success", "provider": "console"}

sms_service = SMSService()
