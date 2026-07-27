import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
import asyncio
import httpx

class EmailService:
    async def send_otp_email(self, to_email: str, otp: str) -> bool:
        """
        Send OTP via email using SendGrid API (if configured) or Gmail SMTP fallback
        """
        # Try SendGrid first (preferred for OTP)
        if settings.sendgrid_api_key:
            return await self._send_via_sendgrid_otp(to_email, otp)
        
        # Fallback to Gmail SMTP
        if settings.smtp_host and settings.smtp_username and settings.smtp_password:
            return await self._send_via_smtp_otp(to_email, otp)
        
        # Console fallback
        print("\n" + "=" * 52)
        print("  [EMAIL OTP - Console Mode]")
        print(f"  To    : {to_email}")
        print(f"  OTP   : {otp}")
        print("  Valid for 5 minutes")
        print("=" * 52 + "\n")
        return False
    
    async def _send_via_sendgrid_otp(self, to_email: str, otp: str) -> bool:
        """Send OTP using SendGrid API"""
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {settings.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            sender_email = settings.sendgrid_from_email or "noreply@ayudisha.com"
            
            html_content = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2ddd8; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #1b6ca8; border-bottom: 2px solid #1b6ca8; padding-bottom: 10px; margin-top: 0;">Ayu Disha Login</h2>
                  <p>Hello,</p>
                  <p>Your verification code for logging into Ayu Disha is:</p>
                  <div style="background-color: #f7f3ee; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #e2ddd8;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1b6ca8;">{otp}</span>
                  </div>
                  <p>This code is valid for <strong>5 minutes</strong>.</p>
                  <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #e2ddd8; padding-top: 15px;">
                    If you did not request this code, please ignore this email.
                  </p>
                </div>
              </body>
            </html>
            """
            
            payload = {
                "personalizations": [
                    {
                        "to": [{"email": to_email}],
                        "subject": "Your Ayu Disha Verification Code"
                    }
                ],
                "from": {
                    "email": sender_email,
                    "name": "Ayu Disha"
                },
                "content": [
                    {
                        "type": "text/html",
                        "value": html_content
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, headers=headers, timeout=10.0)
                
                if response.status_code in [200, 201, 202]:
                    print(f"✅ OTP email sent via SendGrid to {to_email}")
                    return True
                else:
                    print(f"⚠️ SendGrid API error: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ SendGrid error: {str(e)}")
            return False
    
    async def _send_via_smtp_otp(self, to_email: str, otp: str) -> bool:
        """Send OTP using Gmail SMTP"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._send_smtp_otp_sync, to_email, otp)
    
    def _send_smtp_otp_sync(self, to_email: str, otp: str) -> bool:
        """Synchronous SMTP OTP send"""
        try:
            sender_email = settings.smtp_sender or settings.smtp_username
            
            print(f"[SMTP DEBUG] Host: {settings.smtp_host}")
            print(f"[SMTP DEBUG] Port: {settings.smtp_port}")
            print(f"[SMTP DEBUG] Username: {settings.smtp_username}")
            print(f"[SMTP DEBUG] Password Length: {len(settings.smtp_password) if settings.smtp_password else 0}")
            
            message = MIMEMultipart("alternative")
            message["Subject"] = "Your Ayu Disha Verification Code"
            message["From"] = f"Ayu Disha <{sender_email}>"
            message["To"] = to_email
            
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2ddd8; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #1b6ca8;">Ayu Disha Login</h2>
                  <p>Your verification code is:</p>
                  <div style="background-color: #f7f3ee; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1b6ca8;">{otp}</span>
                  </div>
                  <p>Valid for <strong>5 minutes</strong>.</p>
                </div>
              </body>
            </html>
            """
            
            message.attach(MIMEText(html, "html"))
            
            print("[SMTP DEBUG] Connecting to SMTP server...")
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587, timeout=10.0) as server:
                print("[SMTP DEBUG] Starting TLS...")
                server.starttls()
                print("[SMTP DEBUG] Logging in...")
                server.login(settings.smtp_username, settings.smtp_password)
                print("[SMTP DEBUG] Sending email...")
                server.sendmail(sender_email, to_email, message.as_string())
            
            print(f"✅ OTP email sent via SMTP to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ SMTP Authentication Failed: {str(e)}")
            return False
        except smtplib.SMTPException as e:
            print(f"❌ SMTP Error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ SMTP OTP error: {str(e)}")
            print(f"   Error type: {type(e).__name__}")
            return False

    async def send_reset_code(self, to_email: str, reset_code: str) -> bool:
        if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
            # Always print to console so it shows in Render logs
            print("\n" + "=" * 52)
            print("  [PASSWORD RESET CODE]")
            print(f"  Email : {to_email}")
            print(f"  Code  : {reset_code}")
            print("  Valid for 15 minutes")
            print("=" * 52 + "\n")
            return False

        # Run SMTP sending in a background thread to prevent blocking the event loop (compatible with Python 3.7+)
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._send_email_sync, to_email, reset_code)

    def _send_email_sync(self, to_email: str, reset_code: str) -> bool:
        try:
            sender_email = settings.smtp_sender or settings.smtp_username
            
            print(f"[SMTP DEBUG] Host: {settings.smtp_host}")
            print(f"[SMTP DEBUG] Port: {settings.smtp_port}")
            print(f"[SMTP DEBUG] Username: {settings.smtp_username}")
            print(f"[SMTP DEBUG] Password Length: {len(settings.smtp_password) if settings.smtp_password else 0}")
            print(f"[SMTP DEBUG] Sender: {sender_email}")
            
            message = MIMEMultipart("alternative")
            message["Subject"] = "Ayu Disha - Password Reset Code"
            message["From"] = f"Ayu Disha <{sender_email}>"
            message["To"] = to_email

            # Create text and HTML content
            text = f"Hello,\n\nYou requested a password reset. Your 6-digit verification code is: {reset_code}\n\nThis code is valid for 15 minutes.\n\nIf you did not request this, please ignore this email."
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2ddd8; border-radius: 12px; background-color: #ffffff;">
                  <h2 style="color: #1b6ca8; border-bottom: 2px solid #1b6ca8; padding-bottom: 10px; margin-top: 0;">Ayu Disha Password Reset</h2>
                  <p>Hello,</p>
                  <p>You requested a password reset for your Ayu Disha account. Please use the following 6-digit verification code to reset your password:</p>
                  <div style="background-color: #f7f3ee; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px solid #e2ddd8;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #d35400;">{reset_code}</span>
                  </div>
                  <p>This code is valid for <strong>15 minutes</strong>.</p>
                  <p style="font-size: 12px; color: #888; margin-top: 30px; border-top: 1px solid #e2ddd8; padding-top: 15px;">
                    If you did not request this, please ignore this email.
                  </p>
                </div>
              </body>
            </html>
            """

            part1 = MIMEText(text, "plain")
            part2 = MIMEText(html, "html")
            message.attach(part1)
            message.attach(part2)

            print("[SMTP DEBUG] Connecting to SMTP server...")
            # Connect and send with a 10s timeout
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587, timeout=10.0) as server:
                print("[SMTP DEBUG] Starting TLS...")
                server.starttls()
                print("[SMTP DEBUG] Logging in...")
                server.login(settings.smtp_username, settings.smtp_password)
                print("[SMTP DEBUG] Sending email...")
                server.sendmail(sender_email, to_email, message.as_string())
                
            print("✅ Password reset email sent successfully")
            return True
        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ SMTP Authentication Failed: {str(e)}")
            print(f"   Check your Gmail app password is correct")
            return False
        except smtplib.SMTPException as e:
            print(f"❌ SMTP Error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Failed to send reset email: {str(e)}")
            print(f"   Error type: {type(e).__name__}")
            return False

email_service = EmailService()
