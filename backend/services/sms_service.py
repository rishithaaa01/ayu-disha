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
        
        # 1. Try Twilio if configured (disabled in debug mode to prevent slow/hanging cloud timeouts)
        if not settings.debug and settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_number:
            print("Attempting to send OTP via Twilio...")
            url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
            auth = (settings.twilio_account_sid, settings.twilio_auth_token)
            data = {
                "To": mobile_clean,
                "From": settings.twilio_from_number,
                "Body": f"Your Ayu Disha verification code is {otp}. Valid for 5 minutes."
            }
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data=data, auth=auth, timeout=3.0)
                    res_json = response.json()
                    if response.status_code == 201:
                        print("SUCCESS: OTP sent via Twilio")
                        return {"status": "success", "provider": "twilio"}
                    else:
                        print("ERROR: Twilio API error")
            except Exception as e:
                print("ERROR: Twilio communication error")
 
        # 2. Try Fast2SMS if configured (disabled in debug mode to prevent slow/hanging cloud timeouts)
        if not settings.debug and settings.fast2sms_api_key:
            print("Attempting to send OTP via Fast2SMS (OTP Route)...")
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
                    response = await client.post(url, json=payload, headers=headers, timeout=3.0)
                    res_json = response.json()
                    if res_json.get("return") is True:
                        print("SUCCESS: OTP sent via Fast2SMS (OTP Route)")
                        return {"status": "success", "provider": "fast2sms"}
                    
                    # If OTP route fails (e.g. website verification needed), try Quick SMS fallback
                    print("WARNING: Fast2SMS OTP route failed. Trying Quick SMS route...")
                    payload_quick = {
                        "route": "q",
                        "message": f"Your Ayu Disha verification code is {otp}. Valid for 5 minutes.",
                        "numbers": number
                    }
                    response_q = await client.post(url, json=payload_quick, headers=headers, timeout=3.0)
                    res_q_json = response_q.json()
                    if res_q_json.get("return") is True:
                        print("SUCCESS: OTP sent via Fast2SMS (Quick SMS Route)")
                        return {"status": "success", "provider": "fast2sms"}
                    else:
                        print("ERROR: Fast2SMS Quick SMS route failed")
            except Exception as e:
                print("ERROR: Fast2SMS communication error")

        # 3. Fallback to Console Logging (Sanitized)
        print("\n" + "I" + "="*50 + "I")
        print("I                [FALLBACK LOGGING]                I")
        print("I OTP generated in console/debug mode              I")
        print("I (Configure TWILIO or FAST2SMS in .env for SMS)   I")
        print("I" + "="*50 + "I\n")
        return {"status": "success", "provider": "console"}

sms_service = SMSService()
