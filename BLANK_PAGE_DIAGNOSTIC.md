# Blank Dashboard Pages - Diagnostic Guide

## Problem
All dashboards showing blank white pages after login.

## Quick Diagnostic Steps

### Step 1: Open Browser Console (MOST IMPORTANT)

1. **Open the blank dashboard page**

2. **Press F12** (or right-click → Inspect)

3. **Click "Console" tab**

4. **Look for error messages in RED**

5. **Take a screenshot or copy the error text**

Common errors you might see:
- `Failed to fetch` - API connection issue
- `Cannot read property 'X' of undefined` - Data structure issue
- `Component X is not defined` - Import error
- `Network error` - Backend is down

---

### Step 2: Check Network Tab

1. **Still in DevTools (F12)**

2. **Click "Network" tab**

3. **Reload the page (Ctrl+R)**

4. **Look for RED requests** (failed API calls)

Common issues:
- `/api/...` requests returning 401/403/500
- `CORS error`
- `ERR_CONNECTION_REFUSED`

---

### Step 3: Check What You Should See

With the debugging I added, you should see in console:

```
🚀 App component rendering
🔐 ProtectedRoute check: { isAuthenticated: true, userRole: 'admin', ... }
✅ Access granted, rendering protected content
```

**If you see:**
- `❌ Not authenticated` → Auth token missing/invalid
- `❌ Role not allowed` → User role doesn't match
- Nothing at all → JavaScript error before React renders

---

## Common Causes & Fixes

### Cause 1: API Backend is Down

**Symptoms:**
- Console shows `Failed to fetch`
- Network tab shows `ERR_CONNECTION_REFUSED`
- All API calls fail

**Fix:**
```bash
# Check if backend is running
curl https://ayu-disha.onrender.com/api/health

# Should return 200 OK
# If not, backend is down - restart it in Render dashboard
```

---

### Cause 2: Invalid Auth Token

**Symptoms:**
- Console shows `401 Unauthorized`
- Redirects back to login immediately
- `isAuthenticated: false` in console

**Fix:**
1. Logout completely
2. Clear browser cache (Ctrl+Shift+Del)
3. Close all tabs
4. Login again fresh

---

### Cause 3: CORS Error

**Symptoms:**
- Console shows: `Access to fetch... has been blocked by CORS policy`
- Network tab shows requests in red

**Fix:**
Backend needs to allow your frontend URL in CORS settings.

---

### Cause 4: Component Import Error

**Symptoms:**
- Console shows: `Component X is not defined`
- Error before anything renders

**Fix:**
Check the specific component mentioned in error - likely a missing import or typo.

---

### Cause 5: Environment Variable Missing

**Symptoms:**
- API calls going to wrong URL
- `undefined` in API URLs

**Check:**
```bash
cd web
cat .env

# Should have:
VITE_API_URL=https://ayu-disha.onrender.com/api
```

---

## Step-by-Step Debugging

### 1. Test Login First

If login works but dashboard is blank:
- Auth is working
- Problem is in dashboard component or API

If login is also blank:
- Bigger React/build issue
- Check console for errors

### 2. Test Different Roles

Try logging in as different roles:
- Admin
- Doctor  
- Patient
- ASHA
- Lab

If ALL are blank → common issue (API/auth)
If SOME are blank → specific component issue

### 3. Test API Directly

Open these URLs in browser:

```
https://ayu-disha.onrender.com/api/health
https://ayu-disha.onrender.com/api/admin/stats
https://ayu-disha.onrender.com/api/pho/stats
```

Should return JSON, not error.

If you get login page → API requires auth (normal)
If you get error → API is down

---

## What to Share for Help

If still stuck, share:

1. **Console errors (screenshot or text)**

2. **Network tab screenshot** showing failed requests

3. **What you see:**
   - Completely blank white page?
   - Loading spinner that never stops?
   - Partial content then blank?

4. **Which role:**
   - What user role are you logged in as?
   - Does it happen with all roles?

5. **Console logs:**
   - Copy the `🚀`, `🔐`, `✅`, `❌` messages

---

## Quick Fixes to Try

### Fix 1: Hard Refresh
```
Ctrl + Shift + R
```
Clears cache and reloads

### Fix 2: Clear All Storage
```
F12 → Application tab → Clear storage → Clear site data
```
Then login again

### Fix 3: Incognito Mode
```
Ctrl + Shift + N
```
Test in fresh incognito window

### Fix 4: Different Browser
Try in different browser to isolate issue

---

## Is ErrorBoundary Working?

ErrorBoundary should catch React errors and show:
- Red warning icon
- "Something went wrong" message
- Reload button
- Error details (in development)

**If you see ErrorBoundary screen:**
✅ Good! It caught the error
→ Share the error details shown

**If you see blank page (no ErrorBoundary):**
❌ Error is before React renders
→ Check console for JavaScript errors
→ Might be build/import issue

---

## Development vs Production

### In Development (npm run dev):
- Errors show in overlay
- Console has more details
- Hot reload enabled

### In Production (deployed):
- Errors might be silent
- Need to check console manually
- May need source maps for debugging

---

## Nuclear Option (If Nothing Else Works)

```bash
# 1. Clear everything
cd web
rm -rf node_modules dist

# 2. Reinstall
npm install

# 3. Rebuild
npm run build

# 4. Test locally
npm run dev

# 5. If works locally, redeploy
git add .
git commit -m "rebuild"
git push origin main
```

---

## Most Likely Causes (In Order)

1. **API Backend Down** (check Render dashboard)
2. **Auth Token Invalid** (logout/login again)
3. **API Call Failing** (check Network tab)
4. **Component Error** (check Console)
5. **Import Error** (check Console for "not defined")

---

## Next Steps

1. **Open browser console (F12)** ← DO THIS FIRST!
2. **Copy any RED error messages**
3. **Share screenshot of console**
4. **Share screenshot of Network tab**
5. **Tell me which role has the issue**

With console output, I can give you exact fix! 🔧
