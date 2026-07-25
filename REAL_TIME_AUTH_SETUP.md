# Real-Time OTP & Password Reset Setup Guide

This guide explains how to enable **real-time OTP via SMS** and **password reset via email** for the Ayu Disha platform.

## Current Status
- ✅ OTP & Password Reset **code generation working**
- ✅ Codes **print to console/Render logs** (fallback mode)
- ⚠️ SMS/Email delivery **requires configuration** (see below)

---

## Option 1: SMS OTP via Twilio (Recommended)

### Why Twilio?
- **$15 free credits** for new accounts
- Works **globally** (not just India)
- Most reliable SMS delivery
- Easy setup

### Setup Steps:

1. **Sign up at** https://www.twilio.com/try-twilio
2. **Verify your phone number**
3. **Get your credentials** from the Twilio Console:
   - Account SID
   - Auth Token
   - Phone Number (free trial number)

4. **Add to your `.env` file**:
```env
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcd
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+15551234567
```

5. **Restart your backend** (on Render: redeploy or restart service)

6. **Test**: Try logging in with phone OTP - you should receive an SMS!

---

## Option 2: SMS OTP via Fast2SMS (India Only)

### Why Fast2SMS?
- **India-specific** service
- Cheaper for Indian numbers
- Simpler API

### Setup Steps:

1. **Sign up at** https://www.fast2sms.com/
2. **Get API key** from dashboard
3. **Activate OTP route** (may require website verification)

4. **Add to your `.env` file**:
```env
FAST2SMS_API_KEY=your_fast2sms_api_key_here
```

5. **Restart your backend**

6. **Test**: Try logging in with phone OTP

**Note**: If OTP route fails, the system automatically falls back to Quick SMS route.

---

## Email Password Reset Setup

### Option 1: Gmail (Easiest)

1. **Enable 2-Step Verification** on your Google Account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Add to your `.env` file**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_SENDER=Ayu Disha <your_email@gmail.com>
```

4. **Restart your backend**

5. **Test**: Click "Forgot Password" - you should receive an email!

### Option 2: Other SMTP Services

You can use any SMTP service:
- **SendGrid** (12,000 emails/month free)
- **Mailgun** (5,000 emails/month free)
- **Amazon SES** (62,000 emails/month free on EC2)

Just update the SMTP settings in `.env` with your provider's credentials.

---

## Testing Without SMS/Email (Current Mode)

If you don't configure SMS/Email, the system works in **fallback mode**:

### For OTP Login:
1. The API returns the OTP code in the response (in development)
2. Check your backend logs (Render logs) to see the OTP
3. Copy and paste it into the UI

### For Password Reset:
1. The reset code prints in backend logs
2. API response includes: `"reset_code": "123456"`
3. Copy and paste it into the reset form

---

## Deploying to Render

### Add Environment Variables:

1. **Go to your Render dashboard**
2. **Select your backend service**
3. **Go to "Environment"** tab
4. **Add the variables** (choose SMS or Email provider):

```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+15551234567

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_SENDER=Ayu Disha <your_email@gmail.com>
```

5. **Click "Save Changes"** - Render will automatically redeploy

---

## Verification Checklist

- [ ] SMS provider configured (Twilio OR Fast2SMS)
- [ ] Email provider configured (Gmail or other SMTP)
- [ ] Environment variables added to Render
- [ ] Backend redeployed
- [ ] Test OTP login - SMS received?
- [ ] Test Forgot Password - Email received?

---

## Troubleshooting

### OTPs not arriving via SMS:
1. Check Render logs for error messages
2. Verify Twilio credentials are correct
3. Check if your Twilio trial number is verified
4. For Fast2SMS: ensure OTP route is activated

### Password reset emails not arriving:
1. Check spam/junk folder
2. Verify Gmail App Password (not regular password)
3. Check SMTP credentials in Render environment
4. Look for SMTP errors in Render logs

### Still not working:
- The codes always print to logs as a fallback
- Check Render logs under "Logs" tab
- Look for lines with OTP codes or reset codes
- Copy them manually for testing

---

## Cost Estimate

### Free Tier Options:
- **Twilio**: $15 free credits (~200-300 SMS)
- **Fast2SMS**: Varies, check their pricing
- **Gmail**: Free (with daily limits)
- **SendGrid**: 12,000 emails/month free

### Production Costs:
- SMS: $0.005-0.01 per message
- Email: Usually free or very cheap

---

## Security Notes

- ✅ OTPs expire after **5 minutes**
- ✅ Reset codes expire after **15 minutes**
- ✅ Codes are **single-use** (deleted after verification)
- ✅ All passwords are **bcrypt hashed**
- ✅ Tokens use **JWT with refresh token rotation**

---

## Need Help?

Check backend logs in Render:
```
Dashboard → Your Service → Logs → Look for OTP/reset code
```

The system will always work in fallback mode (console logging) even without configuration.
