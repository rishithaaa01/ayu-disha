import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings
import asyncio

class EmailService:
    async def send_reset_code(self, to_email: str, reset_code: str) -> bool:
        if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
            print("⚠️ SMTP credentials not fully configured. Reset code printed to console only.")
            return False

        # Run SMTP sending in a background thread to prevent blocking the event loop (compatible with Python 3.7+)
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._send_email_sync, to_email, reset_code)

    def _send_email_sync(self, to_email: str, reset_code: str) -> bool:
        try:
            sender_email = settings.smtp_sender or settings.smtp_username
            
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

            # Connect and send with a 10s timeout
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587, timeout=10.0) as server:
                server.starttls()
                server.login(settings.smtp_username, settings.smtp_password)
                server.sendmail(sender_email, to_email, message.as_string())
                
            print(f"📩 Password reset email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send reset email to {to_email}: {e}")
            return False

email_service = EmailService()
