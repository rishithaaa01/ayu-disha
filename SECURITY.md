# 🔒 Security Guidelines

## ✅ What's Already Secure:

### 1. No Secrets in Git
- ✅ `.env` files are gitignored
- ✅ Only `.env.example` with placeholders is committed
- ✅ Firebase credentials are gitignored
- ✅ All API keys stored in Render environment variables

### 2. Secure Configuration
- ✅ JWT tokens with refresh token rotation
- ✅ Passwords bcrypt hashed (never stored plaintext)
- ✅ OTP codes single-use and time-limited (5 min)
- ✅ Reset codes single-use and time-limited (15 min)
- ✅ HTTPS enforced for all API calls

### 3. GitGuardian Configuration
- ✅ `.gitguardian.yaml` configured to ignore false positives
- ✅ Example files excluded from secret scanning
- ✅ Placeholder credentials whitelisted

---

## 🚫 NEVER Commit These Files:

```
backend/.env                    ❌ Contains real secrets
backend/firebase_credentials.json  ❌ Firebase admin key
backend/*-firebase-adminsdk-*.json ❌ Any Firebase keys
.venv/                          ❌ Python virtual environment
node_modules/                   ❌ Node dependencies
```

---

## ✅ Safe to Commit:

```
backend/.env.example            ✅ Placeholder values only
*.md files                      ✅ Documentation
config.py                       ✅ Reads from env variables
routes/*.py                     ✅ Uses settings object
```

---

## 📋 Security Checklist for Production:

### Before Deploying:

- [ ] All environment variables set in Render (not in code)
- [ ] `.env` file exists locally but NOT in git
- [ ] Firebase credentials in Render, not in code
- [ ] API keys are valid and not expired
- [ ] HTTPS is enforced (Render does this automatically)
- [ ] CORS configured with specific origins (not `*`)

### API Keys to Secure:

```env
# NEVER commit these actual values
MONGODB_URI=mongodb+srv://real_connection_string
JWT_SECRET=your_actual_random_secret_32_chars_or_more
GROQ_API_KEY=gsk_actual_key_here
SENDGRID_API_KEY=SG.actual_key_here
CLOUDINARY_API_KEY=actual_cloudinary_key
CLOUDINARY_API_SECRET=actual_cloudinary_secret
TWILIO_ACCOUNT_SID=AC...actual_sid
TWILIO_AUTH_TOKEN=actual_token
SMTP_PASSWORD=actual_gmail_app_password
```

### Where to Store Secrets:

| Secret | Store In | Example Value | Never In |
|--------|----------|---------------|----------|
| MongoDB URI | Render Env | `mongodb+srv://user:pass@cluster...` | Git/Code |
| JWT Secret | Render Env | Random 32+ char string | Git/Code |
| SendGrid API Key | Render Env | `SG.actual_key...` | Git/Code |
| Gmail App Password | Render Env | 16-char from Google | Git/Code |
| Firebase Credentials | Render Env | JSON string | Git |
| Twilio Credentials | Render Env | `ACxxxxx` | Git/Code |

**Important**: `.env.example` should contain ONLY commented-out placeholders, never actual credential formats that could be mistaken for real secrets.

---

## 🔧 How to Add Secrets Securely:

### For Local Development:

1. **Copy the example file:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Add your real secrets** to `backend/.env`

3. **Never commit** `backend/.env` (gitignore blocks this)

### For Production (Render):

1. **Go to Render Dashboard**
2. **Select your service**
3. **Environment tab**
4. **Add each secret as a separate variable**
5. **Save** (triggers auto-redeploy)

---

## ⚠️ If You Accidentally Commit a Secret:

### Immediate Actions:

1. **Rotate the secret immediately:**
   - MongoDB: Create new user with new password
   - SendGrid: Generate new API key, delete old one
   - Gmail: Generate new app password, delete old one
   - JWT: Generate new secret key

2. **Update Render environment variables** with new secrets

3. **Remove from git history:**
   ```bash
   # Remove sensitive file from git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/secret/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (WARNING: destructive)
   git push origin --force --all
   ```

4. **Notify team** if this is a shared repository

---

## 🛡️ GitGuardian Alerts:

### False Positives (Safe to Ignore):

✅ Alerts about `.env.example` files
✅ Alerts about documentation with example keys
✅ Alerts about placeholders like `your_key_here`
✅ Alerts about `SG.your_sendgrid_api_key_here`

### Real Issues (Action Required):

❌ Alerts about actual MongoDB URIs with passwords
❌ Alerts about real API keys (start with actual service prefixes)
❌ Alerts about Firebase service account JSON
❌ Alerts about JWT secrets that aren't placeholders

---

## 🔍 How to Check for Secrets:

### Manual Check:
```bash
# Check what's committed
git ls-files | grep -E "\\.env$|\\.json$"

# Should return ONLY:
# backend/.env.example  ✅
# web/vite-env.d.ts     ✅
# package.json          ✅

# Should NOT return:
# backend/.env          ❌ (if this shows, it's exposed!)
# firebase_credentials.json  ❌
```

### Automatic Check:
```bash
# Install GitGuardian CLI (optional)
pip install ggshield

# Scan your repo
ggshield secret scan repo .
```

---

## 📝 Best Practices:

### 1. Environment Variables
- ✅ Use environment variables for ALL secrets
- ✅ Never hardcode secrets in source code
- ✅ Use `.env` for local, Render Env for production

### 2. Git Hygiene  
- ✅ Always check `git status` before committing
- ✅ Review `git diff` before pushing
- ✅ Keep `.gitignore` up to date

### 3. Access Control
- ✅ Limit who has access to Render dashboard
- ✅ Use Render's team features for collaboration
- ✅ Rotate secrets periodically (every 3-6 months)

### 4. Monitoring
- ✅ Enable GitGuardian on your repository
- ✅ Set up email alerts for secret detection
- ✅ Review Render logs for unauthorized access attempts

---

## 🚨 Incident Response:

If a secret is exposed:

1. **Rotate immediately** (within 1 hour)
2. **Check logs** for unauthorized access
3. **Update all deployments** with new secrets
4. **Remove from git history** (see above)
5. **Document the incident** for team review

---

## ✅ Security Audit Checklist:

Run this checklist monthly:

- [ ] All API keys still valid
- [ ] No secrets in git history
- [ ] `.gitignore` includes all sensitive files
- [ ] Render environment variables are up to date
- [ ] No hardcoded credentials in code
- [ ] GitGuardian alerts reviewed
- [ ] Access logs reviewed for anomalies
- [ ] Team members have appropriate access levels

---

## 📞 Resources:

- **GitGuardian Docs**: https://docs.gitguardian.com/
- **Render Security**: https://render.com/docs/security
- **OWASP Secrets Management**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_CheatSheet.html

---

## ✅ Current Security Status:

- **Git**: ✅ No secrets committed
- **GitIgnore**: ✅ Properly configured
- **Render**: ✅ Secrets in environment variables
- **Code**: ✅ Uses settings object for all secrets
- **GitGuardian**: ✅ Configured to ignore false positives

**Your repository is secure! 🎉**
