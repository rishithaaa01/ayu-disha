# Quick Render Auto-Deploy Diagnostic

## Problem
Commits to `main` branch are NOT triggering Render deployments automatically.

## Quick Fix Steps

### Step 1: Check Render Dashboard (2 minutes)

1. Go to: **https://dashboard.render.com**

2. Find your service (backend or frontend)

3. Click on the service name

4. Look at **top right corner** for:
   ```
   ⚙️ Settings button
   ```

5. Click **Settings**

6. Scroll to **"Build & Deploy"** section

7. Look for **"Auto-Deploy"** setting:

   **If it shows "Yes":**
   - Check the branch name (should be `main`)
   - Auto-deploy should be working
   - Go to Step 2

   **If it shows "No" or toggle is OFF:**
   - Click the toggle to turn it **ON**
   - Set Branch to: `main`
   - Click **Save Changes**
   - ✅ FIXED! Test with a commit

   **If "Auto-Deploy" option doesn't exist:**
   - Your service wasn't created from GitHub
   - Go to Step 3

---

### Step 2: Get Deploy Hook (if Auto-Deploy is ON but not working)

1. Still in **Settings** page

2. Scroll to **"Deploy Hook"** section

3. If no hook exists:
   - Click **"Create Deploy Hook"**

4. Copy the URL (looks like):
   ```
   https://api.render.com/deploy/srv-abc123?key=xyz789
   ```

5. **Add to GitHub Secrets:**
   - Go to: https://github.com/rishithaaa01/ayu-disha/settings/secrets/actions
   - Click **"New repository secret"**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: Paste the deploy hook URL
   - Click **"Add secret"**

6. ✅ FIXED! Push a commit to test

---

### Step 3: Manual Deploy (Right Now)

While you fix auto-deploy, manually deploy:

1. In Render Dashboard, on your service page

2. Click **"Manual Deploy"** button (top right)

3. Select **"Deploy latest commit"**

4. Click **"Yes, deploy"**

5. Watch the deploy logs

---

## Test Auto-Deploy

After making changes above, test it:

```bash
# Make an empty commit
git commit --allow-empty -m "test render auto-deploy"

# Push to main
git push origin main
```

**What to watch for:**

1. **GitHub Actions** (should run deploy hook if secret is set):
   - https://github.com/rishithaaa01/ayu-disha/actions
   - Look for "Deploy to Render" workflow
   - Should complete in ~10 seconds

2. **Render Dashboard** (should start deploy):
   - Go to your service
   - Click **"Events"** tab
   - Should see new event: "Deploy triggered"
   - Within 30-60 seconds

---

## Common Issues

### "Auto-Deploy toggle doesn't exist"

**Why:** Service was created manually (not from GitHub)

**Fix:**
- Use Deploy Hook method (Step 2)
- OR recreate service from GitHub integration

---

### "Deploy Hook secret added but GitHub Action fails"

**Why:** Deploy Hook URL might be wrong

**Check:**
1. Go to GitHub Actions: https://github.com/rishithaaa01/ayu-disha/actions
2. Click on latest "Deploy to Render" run
3. Check the error message
4. If "404" or "unauthorized", regenerate deploy hook

---

### "Push to main but nothing happens"

**Possible causes:**

1. **No secret configured:**
   - Go to: https://github.com/rishithaaa01/ayu-disha/settings/secrets/actions
   - Check if `RENDER_DEPLOY_HOOK_URL` exists
   - If not, add it (see Step 2)

2. **GitHub Actions disabled:**
   - Go to: https://github.com/rishithaaa01/ayu-disha/settings/actions
   - Ensure Actions are enabled

3. **Workflow file not in repo:**
   - Check: `.github/workflows/deploy-render.yml` exists
   - Already exists in your repo ✅

---

## Which Method Should I Use?

### Use **Auto-Deploy** (Render's native feature) if:
- ✅ You created service from GitHub
- ✅ Auto-Deploy toggle exists in Settings
- ✅ Simple and automatic

### Use **Deploy Hook + GitHub Actions** if:
- ✅ Auto-Deploy option missing
- ✅ Service created manually
- ✅ Want more control over when deploys happen

### Use **Manual Deploy** if:
- ⏰ Temporary until you fix auto-deploy
- 🐛 Testing changes infrequently
- 🚀 Deploy on-demand only

---

## Your Current Setup

Based on the files in your repo:

✅ **You have:**
- `.github/workflows/deploy-render.yml` ← GitHub Actions workflow ready
- `render.yaml` ← Blueprint configuration ready
- Commits pushed to `main` branch

⚠️ **You need to:**
- Add `RENDER_DEPLOY_HOOK_URL` to GitHub Secrets
- OR enable Auto-Deploy in Render Dashboard

---

## Do This Right Now

**Option A (Quickest - 2 minutes):**

1. Login to Render Dashboard
2. Go to your service → Settings
3. Turn Auto-Deploy **ON**
4. Set branch to `main`
5. Save
6. ✅ Done!

**Option B (If Option A doesn't work - 5 minutes):**

1. Get Deploy Hook URL from Render Settings
2. Add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`
3. Push a commit
4. ✅ Done!

---

## Need More Help?

Share these details:

1. **In Render Settings → Build & Deploy:**
   - What does Auto-Deploy show? (Yes/No/Not visible)

2. **Service creation method:**
   - Created from GitHub?
   - Created manually?
   - Created from Blueprint?

3. **GitHub Secrets:**
   - Does `RENDER_DEPLOY_HOOK_URL` exist?

4. **Test result:**
   - After pushing commit, check Events tab in Render
   - What does it show?
