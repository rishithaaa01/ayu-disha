# Fix Blank Page - DO THIS NOW

## The Problem
Deployed site shows blank page because old build is cached.

## Solution: Force Rebuild on Render

### Step 1: Go to Render Dashboard
```
https://dashboard.render.com
```

### Step 2: Find Your Frontend Service
Click on your web service (e.g., "ayu-disha-frontend")

### Step 3: Clear Build Cache & Redeploy
1. Click **Settings** tab
2. Scroll to **Build & Deploy**
3. Click **"Clear build cache"** button
4. Go back to service main page
5. Click **"Manual Deploy"** button
6. Select **"Clear build cache & deploy"**
7. Click **"Yes, deploy"**

### Step 4: Wait for Build
- Watch the logs
- Should take 3-5 minutes
- Look for: `✓ built in X seconds`

### Step 5: Test
After deployment completes, visit your site:
- Hard refresh: **Ctrl + Shift + R**
- Or open in incognito: **Ctrl + Shift + N**

---

## Alternative: Check Which URL You're Using

### If Using GitHub Pages:
The fix is already deployed! But you need the `/ayu-disha/` path:

```
https://rishithaaa01.github.io/ayu-disha/
```

NOT:
```
https://rishithaaa01.github.io/
```

### If Using Render:
You need to rebuild (see steps above)

---

## Check Deployment Status

### GitHub Actions:
https://github.com/rishithaaa01/ayu-disha/actions

Should show successful deployment

### Render Dashboard:
https://dashboard.render.com

Check Events tab for deployment status

---

## Still Blank?

### Check Browser Console (F12):

1. Open the blank page
2. Press **F12**
3. Click **Console** tab
4. Look for errors

**Share the error with me!**

### Common Issues:

**404 on /assets/index-xxx.js**
→ Base path wrong, need to rebuild

**CORS error**
→ Backend configuration issue

**No errors at all**
→ Cached old build, do hard refresh

---

## Quick Test

Open browser console (F12) on the blank page and run:

```javascript
console.log(window.location.href);
```

Tell me what URL it shows!

---

## Nuclear Option

If nothing works:

### On Render:
1. Settings → Environment Variables
2. Add: `VITE_BASE_PATH` = `/`
3. Save
4. Manual Deploy with clear cache

### Verify Build Command:
Settings → Build Command should be:
```
cd web && npm install && npm run build
```

### Verify Publish Directory:
Settings → Publish Directory should be:
```
web/dist
```

---

## What URL Are You Testing?

Tell me the exact URL you're opening and I'll help diagnose!
