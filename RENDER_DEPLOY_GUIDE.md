# Render Auto-Deploy Setup Guide

## Problem
Commits to `main` branch are not triggering automatic deployments on Render.

## Solutions

### Solution 1: Enable Render Auto-Deploy (Easiest)

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Select your **ayu-disha-frontend** service
3. Go to **Settings** tab
4. Scroll to **Build & Deploy** section
5. Ensure these settings:
   - ✅ **Auto-Deploy**: `Yes` (for `main` branch)
   - ✅ **Branch**: `main`
   - ✅ **GitHub Integration**: Connected

6. Check **Event Logs** to see if Render is receiving GitHub webhooks

#### If Auto-Deploy Toggle is Missing:
- Go to **Settings** → **GitHub**
- Click **Reconnect GitHub Account**
- Re-authorize Render to access your repository

---

### Solution 2: Use Deploy Hook with GitHub Actions

If auto-deploy isn't working, trigger deployments manually via webhook:

#### Step 1: Get Render Deploy Hook URL
1. Go to your service on Render
2. Navigate to **Settings** → **Deploy Hook**
3. Copy the **Deploy Hook URL** (looks like: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`)

#### Step 2: Add Deploy Hook to GitHub Secrets
1. Go to GitHub repository: https://github.com/rishithaaa01/ayu-disha
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `RENDER_DEPLOY_HOOK_URL`
5. Value: Paste the Deploy Hook URL from Render
6. Click **Add secret**

#### Step 3: Deploy Hook is Already Configured
The file `.github/workflows/deploy-render.yml` is already created and will:
- Trigger on every push to `main`
- Call Render's Deploy Hook
- Force a new deployment

---

### Solution 3: Use render.yaml (Blueprint)

I've created `render.yaml` in your root directory. To use it:

1. Go to Render Dashboard
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` and configure services automatically
5. All future pushes to `main` will auto-deploy

---

## Current Setup Issue

Your repository has:
- ✅ GitHub Actions deploying to **GitHub Pages** (web frontend)
- ❌ No Render integration configured

You're running two separate deployments:
1. **GitHub Pages**: https://rishithaaa01.github.io/ayu-disha (frontend only)
2. **Render**: Needs configuration for auto-deploy

---

## Recommended Approach

**Choose One:**

### Option A: Keep GitHub Pages (Free, Fast)
- Remove Render frontend deployment
- Keep only Render backend API
- Frontend stays on GitHub Pages (already working)

### Option B: Move Everything to Render
1. Remove GitHub Pages deployment workflow
2. Use render.yaml blueprint (already created)
3. Deploy both frontend and backend on Render

### Option C: Hybrid (Current Setup)
- Backend API on Render
- Frontend on GitHub Pages
- Use Solution 2 (Deploy Hook) to manually trigger backend deploys

---

## Quick Fix: Manual Deploy

To manually trigger a deployment right now:

### Method 1: Via Render Dashboard
1. Go to https://dashboard.render.com
2. Select your service
3. Click **Manual Deploy** → **Deploy latest commit**

### Method 2: Via Deploy Hook (if configured)
```bash
curl -X POST "YOUR_RENDER_DEPLOY_HOOK_URL"
```

---

## Verify Auto-Deploy is Working

After fixing:
1. Make a small commit: `git commit --allow-empty -m "test deploy"`
2. Push: `git push origin main`
3. Watch Render Dashboard → **Events** tab
4. You should see: "Deploy triggered by push to main"

---

## Troubleshooting

### "Not seeing deployments in Render"
- Check **Events** tab for webhook delivery errors
- Verify GitHub integration is connected
- Check that branch name matches exactly (`main` vs `master`)

### "Deploy Hook URL not working"
- Ensure URL includes the `?key=xxxxx` parameter
- Check GitHub Actions logs for HTTP errors
- Verify secret is named exactly `RENDER_DEPLOY_HOOK_URL`

### "render.yaml not detected"
- File must be in repository root
- Commit and push the file
- Create new Blueprint in Render to re-scan

---

## Next Steps

1. Choose your preferred solution above
2. Test with a dummy commit
3. Monitor Render Events tab
4. Verify deployment completes successfully

Let me know which approach you prefer!
