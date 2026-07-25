# 🆓 SendGrid + Gmail Setup Guide - 100% FREE

## What We're Setting Up:
1. **SendGrid** → Email OTP for login (12,000 emails/month FREE)
2. **Gmail** → Password reset emails (500 emails/day FREE)

Total cost: **$0 forever**

---

## Part 1: SendGrid Setup (10 minutes)

### Step 1: Create SendGrid Account

1. Go to: https://sendgrid.com/
2. Click **"Start for Free"**
3. Sign up with your email
4. **No credit card required!**

### Step 2: Verify Your Email

1. Check your inbox for verification email
2. Click the verification link
3. Complete the signup form:
   - First/Last Name
   - Company: "Ayu Disha" or "Personal Project"
   - Website: Your GitHub Pages URL or leave blank
   - Purpose: **"Transactional Emails"**

### Step 3: Create API Key

1. After login, go to: **Settings** → **API Keys**
   - Or direct link: https://app.sendgrid.com/settings/api_keys

2. Click **"Create API Key"**

3. Settings:
   - **Name**: `Ayu Disha Backend`
   - **Permissions**: `Full Access` or `Mail Send`

4. Click **"Create & View"**

5. **COPY THE API KEY NOW** - it looks like:
   ```
   SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ.1234567890abcdefghijklmnopqrstuvwxyz
   ```

6. ⚠️ **Save it somewhere safe** - you can't see it again!

### Step 4: Verify Sender Email (Required)

SendGrid requires sender verification for free accounts:

1. Go to: **Settings** → **Sender Authentication**
   - Or: https://app.sendgrid.com/settings/sender_auth

2. Click **"Verify a Single Sender"**

3. Fill in the form:
   - **From Name**: `Ayu Disha`
   - **From Email**: Your email (e.g., `your_email@gmail.com`)
   - **Reply To**: Same email
   - **Company Address**: Any address (can be home address)
   - **Nickname**: `Ayu Disha OTP`

4. Click **"Create"**

5. Check your email inbox and **verify the sender**

6. ✅ Once verified, you'll see "Verified" status

### Step 5: Add to Render Environment

1. Go to: **Render Dashboard** → Your backend service → **Environment**

2. Add these variables:
   ```
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDGRID_FROM_EMAIL=your_verified_email@gmail.com
   ```

3. Click **"Save Changes"** (auto-redeploys)

---

## Part 2: Gmail Setup for Password Reset (5 minutes)

### Step 1: Enable 2-Step Verification

1. Go to: https://myaccount.google.com/security

2. Scroll to **"How you sign in to Google"**

3. Click **"2-Step Verification"**

4. Follow the setup process:
   - Enter your password
   - Add your phone number
   - Verify with SMS code
   - Turn on 2-Step Verification

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → App Passwords

2. You might need to sign in again

3. Create App Password:
   - **App**: Select **"Mail"**
   - **Device**: Select **"Other"**
   - Name it: `Ayu Disha Backend`

4. Click **"Generate"**

5. **COPY THE 16-CHARACTER PASSWORD**:
   ```
   Example: abcd efgh ijkl mnop
   ```

6. **Remove the spaces**: `abcdefghijklmnop`

### Step 3: Add to Render Environment

1. Go to: **Render Dashboard** → Your backend service → **Environment**

2. Add these variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=abcdefghijklmnop
   SMTP_SENDER=Ayu Disha <your_email@gmail.com>
   ```

3. Click **"Save Changes"** (auto-redeploys)

---

## Part 3: Test Everything

### Test 1: Email OTP Login

1. Wait for Render to redeploy (~2 minutes)

2. Go to your live site: https://rishithaaa01.github.io/ayu-disha/

3. Click **"Login with Email"** (new button)

4. Enter any email address

5. Click **"Send OTP"**

6. ✅ Check your email inbox - you should receive OTP!

7. Enter OTP and complete login

### Test 2: Password Reset

1. On login page, click **"Forgot Password?"**

2. Enter your registered email

3. Click **"Send Reset Code"**

4. ✅ Check your email inbox - you should receive reset code!

5. Enter code and new password

6. ✅ Password reset successful!

---

## What You Get - FREE Forever

### SendGrid Free Tier:
- ✅ **12,000 emails per month**
- ✅ That's ~400 OTP logins per day
- ✅ More than enough for testing & production
- ✅ No credit card, no expiration

### Gmail Free Tier:
- ✅ **500 emails per day**
- ✅ That's 15,000/month for password resets
- ✅ Completely free
- ✅ More reliable than SMS

### Total Monthly Capacity (FREE):
- **12,000 OTP logins** via SendGrid
- **15,000 password resets** via Gmail
- **Total: 27,000 authentication emails/month**
- **Cost: $0**

---

## Troubleshooting

### SendGrid OTP Not Arriving?

1. **Check spam folder** - sometimes first email goes to spam

2. **Verify sender email**:
   - Go to SendGrid → Sender Authentication
   - Ensure email shows "Verified" status

3. **Check Render logs**:
   - Render Dashboard → Your service → Logs
   - Look for: `✅ OTP email sent via SendGrid`
   - Or error messages

4. **Verify API key**:
   - Check it's copied correctly (no extra spaces)
   - Starts with `SG.`

### Gmail Password Reset Not Arriving?

1. **Check spam folder**

2. **Verify App Password**:
   - Must be 16 characters
   - Remove all spaces
   - Use App Password, not regular password

3. **Check 2-Step Verification is ON**:
   - https://myaccount.google.com/security

4. **Check Render logs**:
   - Look for: `✅ Password reset email sent successfully`
   - Or SMTP error messages

### Email Shows in Console Instead?

This means the credentials aren't configured correctly:

1. **Check Render Environment Variables**:
   - Dashboard → Your service → Environment
   - Verify all variables are set
   - No typos in variable names

2. **Redeploy**:
   - Click "Manual Deploy" → "Clear build cache & deploy"

3. **Check logs**:
   - Should see: `✅ OTP email sent via SendGrid`
   - Not: `[EMAIL OTP - Console Mode]`

---

## Security Notes

✅ **OTP expires in 5 minutes** - automatic cleanup
✅ **Reset codes expire in 15 minutes**
✅ **Single-use codes** - deleted after verification
✅ **API keys stored securely** in Render environment
✅ **No passwords in code** - all in environment variables

---

## Quick Reference

### Your Configuration:
```env
# SendGrid (Email OTP)
SENDGRID_API_KEY=SG.your_key_here
SENDGRID_FROM_EMAIL=your_email@gmail.com

# Gmail (Password Reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here
SMTP_SENDER=Ayu Disha <your_email@gmail.com>
```

### API Endpoints:
- Send OTP: `POST /api/auth/send-otp` (supports email & mobile)
- Verify OTP: `POST /api/auth/verify-otp`
- Forgot Password: `POST /api/auth/forgot-password`
- Reset Password: `POST /api/auth/reset-password`

---

## Next Steps

After setup is complete:

1. ✅ Test OTP login with email
2. ✅ Test forgot password flow
3. ✅ Check both work in production
4. 📱 Optional: Keep mobile OTP for rural users (add Twilio if needed)

---

## Cost Comparison

### Our Setup (FREE):
- SendGrid: 12,000 emails/month = **$0**
- Gmail: 15,000 emails/month = **$0**
- **Total: $0/month**

### If You Used SMS:
- Twilio: ~₹0.50 per SMS
- 1000 logins = ₹500/month
- 10,000 logins = ₹5,000/month

### Savings with Email OTP:
- **100% cost reduction** vs SMS
- **More reliable** delivery
- **Faster** delivery (instant vs 2-10 seconds)

---

## Need Help?

**SendGrid Issues:**
- Support: https://support.sendgrid.com/
- Docs: https://docs.sendgrid.com/

**Gmail Issues:**
- App Passwords: https://support.google.com/accounts/answer/185833
- SMTP Guide: https://support.google.com/mail/answer/7126229

**Render Logs:**
```
Dashboard → Your Service → Logs → Look for email status
```

✅ **Everything is now production-ready and 100% FREE!**
