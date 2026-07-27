"""
Test SMTP connection with your Gmail credentials
Run this locally first, then check Render logs when deployed
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Your Gmail SMTP credentials
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "aarna1721@gmail.com"
SMTP_PASSWORD = "nutisbvzgcxzpduj"  # Your 16-character app password

def test_smtp_connection():
    """Test if SMTP credentials work"""
    print("\n" + "="*60)
    print("TESTING SMTP CONNECTION")
    print("="*60)
    
    print(f"\nSMTP Host: {SMTP_HOST}")
    print(f"SMTP Port: {SMTP_PORT}")
    print(f"SMTP Username: {SMTP_USERNAME}")
    print(f"SMTP Password: {'*' * len(SMTP_PASSWORD)} ({len(SMTP_PASSWORD)} chars)")
    
    try:
        print("\n[1] Connecting to SMTP server...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10.0)
        print("✅ Connected successfully")
        
        print("\n[2] Starting TLS encryption...")
        server.starttls()
        print("✅ TLS started")
        
        print("\n[3] Authenticating...")
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        print("✅ Authentication successful")
        
        print("\n[4] Sending test email...")
        message = MIMEMultipart("alternative")
        message["Subject"] = "AyuDisha SMTP Test"
        message["From"] = f"Ayu Disha <{SMTP_USERNAME}>"
        message["To"] = SMTP_USERNAME  # Send to yourself for testing
        
        html = """
        <html>
          <body>
            <h2>SMTP Test Successful!</h2>
            <p>Your Gmail SMTP is working correctly.</p>
            <p>Password reset emails will now work in production.</p>
          </body>
        </html>
        """
        
        message.attach(MIMEText(html, "html"))
        server.sendmail(SMTP_USERNAME, SMTP_USERNAME, message.as_string())
        print("✅ Test email sent successfully")
        
        server.quit()
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED - SMTP IS WORKING!")
        print("="*60 + "\n")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        print("\n❌ AUTHENTICATION FAILED")
        print(f"Error: {str(e)}")
        print("\nPossible causes:")
        print("1. Wrong app password")
        print("2. 2-Step Verification not enabled on Gmail")
        print("3. App password not generated correctly")
        return False
        
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED: {str(e)}")
        return False

if __name__ == "__main__":
    test_smtp_connection()
