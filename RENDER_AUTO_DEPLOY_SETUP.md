# Render Auto-Deploy Setup Guide

## Why Auto-Deploy Isn't Working

There are several possible reasons:

1. **Render isn't connected to your GitHub repo**
2. **Auto-deploy is disabled in Render dashboard**
3. **Branch mismatch** (Render watching wrong branch)
4. **Webhook not configured**
5. **Service created manually instead of from Blueprint**

---

## Solution: Enable Auto-Deploy

### Option 1: Enable in Render Dashboard (Quickest)

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Find your service (e.g., `ayu-disha-frontend` or `ayu-disha-backend`)

2. **Check Auto-Deploy Setting:**
   - Click on the service
   - Go to **Settings** tab
   - Scroll to **Build & Deploy** section
   - Look for **Auto-Deploy** toggle

3. **Enable Auto-Deploy:**
   - Toggle **Auto-Deploy** to **Yes**
   - Set **Branch** to `main`
   - Click **Save Changes**

4. **Verify GitHub Connection:**
   - In Settings, check **GitHub** section
   - Should show "Connected to rishithaaa01/ayu-disha"
   - If not connected, click **Connect GitHub Account**

5. **Test:**
   - Make a small commit:
     ```bash
     git commit --allow-empty -m "test auto-deploy"
     git push origin main
     ```
   - Go to Render Dashboard → Check **Events** tab
   - Should see "Deploy triggered by push to main"

---

### Option 2: Use Deploy Hook with GitHub Actions (Automated)

If Render auto-deploy doesn't work, use GitHub Actions to trigger deploys:

#### Step 1: Get Deploy Hook URL

1. Go to Render Dashboard
2. Select your service
3. Go to **Settings** → **Deploy Hook**
4. Click **Create Deploy Hook** (if not exists)
5. Copy the URL (looks like: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`)

#### Step 2: Add to GitHub Secrets

1. Go to GitHub: https://github.com/rishithaaa01/ayu-disha/settings/secrets/actions
2. Click **New repository secret**
3. Name: `RENDER_DEPLOY_HOOK_URL`
4. Value: Paste the Deploy Hook URL
5. Click **Add secret**

#### Step 3: Workflow Already Created

The file `.github/workflows/deploy-render.yml` is already set up!

It will automatically:
- Trigger on every push to `main`
- Call Render's deploy hook
- Force a new deployment

#### Step 4: Test

```bash
git commit --allow-empty -m "trigger render deploy"
git push origin main
```

Check:
- GitHub Actions: https://github.com/rishithaaa01/ayu-disha/actions
- Render Dashboard → Events tab

---

### Option 3: Recreate Service from Blueprint

If you want to use the `render.yaml` file:

1. **Go to Render Dashboard:**
   - https://dashboard.render.com

2. **Create New Blueprint:**
   - Click **New** → **Blueprint**
   - Connect your GitHub repository: `rishithaaa01/ayu-disha`
   - Render will detect `render.yaml`

3. **Configure Services:**
   - Review the detected services
   - Add environment variables (not in render.yaml for security):
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `GROQ_API_KEY`

4. **Deploy:**
   - Click **Apply**
   - Render will create services with auto-deploy enabled

5. **Note:**
   - This creates NEW services
   - Old services won't be deleted automatically
   - You'll need to update DNS/URLs if needed

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] **GitHub connected?**
  - Render Dashboard → Settings → GitHub section shows connected

- [ ] **Auto-Deploy enabled?**
  - Settings → Build & Deploy → Auto-Deploy = Yes

- [ ] **Correct branch?**
  - Settings → Build & Deploy → Branch = `main`

- [ ] **Recent push exists?**
  - Check GitHub: https://github.com/rishithaaa01/ayu-disha/commits/main
  - Latest commit should be there

- [ ] **Webhook working?**
  - GitHub repo → Settings → Webhooks
  - Should see Render webhook
  - Check recent deliveries for errors

- [ ] **Service active?**
  - Render Dashboard shows service as "Live"
  - Not suspended or failed

---

## Manual Deploy (Emergency)

If auto-deploy still doesn't work, you can manually trigger:

### Via Render Dashboard:
1. Go to your service
2. Click **Manual Deploy** button (top right)
3. Select **Deploy latest commit**
4. Click **Deploy**

### Via PowerShell:
```powershell
# Replace with your actual deploy hook URL
$DEPLOY_HOOK_URL = "https://api.render.com/deploy/srv-xxxxx?key=yyyyy"
Invoke-WebRequest -Uri $DEPLOY_HOOK_URL -Method POST
```

### Via curl:
```bash
curl -X POST "https://api.render.com/deploy/srv-xxxxx?key=yyyyy"
```

---

## Troubleshooting

### "Auto-Deploy toggle missing"

**Cause:** Service wasn't created from GitHub integration

**Fix:**
1. Delete current service
2. Create new service via **New Web Service**
3. Select **Connect a repository**
4. Choose your GitHub repo
5. Auto-deploy will be available

---

### "Webhook deliveries failing"

**Cause:** GitHub can't reach Render webhook

**Fix:**
1. GitHub repo → Settings → Webhooks
2. Find Render webhook
3. Click **Edit**
4. Click **Redeliver** on a recent delivery
5. Check response for error details

---

### "Push to main but no deploy triggered"

**Possible causes:**
- Webhook not configured
- Branch mismatch (watching `master` instead of `main`)
- Render GitHub app not authorized
- Service suspended/paused

**Fix:**
1. Check Render **Events** tab for webhook receipts
2. Verify **Settings** → Branch = `main`
3. Check GitHub → Settings → Integrations → Render is authorized
4. Ensure service is not suspended

---

### "Getting 'Deploy hook not found' error"

**Cause:** Deploy hook URL expired or incorrect

**Fix:**
1. Render Dashboard → Settings → Deploy Hook
2. **Delete** old hook
3. **Create** new hook
4. Update GitHub secret with new URL

---

## Best Practice Setup

For the most reliable auto-deploy:

1. **Use Render's GitHub Integration**
   - Not manual service creation
   - This ensures webhooks are configured

2. **Keep render.yaml in root**
   - Helps Render understand your project structure
   - Even if not using Blueprint, it's documentation

3. **Monitor first few deploys**
   - Watch Events tab after pushing
   - Verify deploy triggers within 30 seconds

4. **Set up notifications**
   - Render Dashboard → Service Settings → Notifications
   - Get email/Slack alerts for deploy failures

---

## Current Status

Based on your setup:

✅ **Have:**
- GitHub repo: `rishithaaa01/ayu-disha`
- Latest commits pushed to `main`
- `render.yaml` configuration file
- GitHub Actions workflow for manual trigger

⏳ **Need to verify:**
- Is Render watching your GitHub repo?
- Is Auto-Deploy enabled in Render dashboard?
- Which branch is Render monitoring?

---

## Recommended Next Steps

**Right now, do this:**

1. **Check Render Dashboard:**
   ```
   https://dashboard.render.com
   → Click your service
   → Go to Settings tab
   → Check Auto-Deploy setting
   ```

2. **If Auto-Deploy is OFF:**
   - Turn it ON
   - Set Branch to `main`
   - Save

3. **If Auto-Deploy is already ON:**
   - Get Deploy Hook URL from Settings
   - Add to GitHub Secrets as `RENDER_DEPLOY_HOOK_URL`
   - GitHub Actions will handle deploys

4. **Test immediately:**
   ```bash
   git commit --allow-empty -m "test render deploy"
   git push origin main
   ```

5. **Watch for deploy:**
   - Render Dashboard → Events tab
   - Should see new deploy start within 30 seconds
   - If not, check webhooks or use deploy hook method

---

## Questions to Answer

To help diagnose further, check:

1. **Was the Render service created by:**
   - [ ] GitHub integration (recommended)
   - [ ] Manual creation (doesn't have auto-deploy)
   - [ ] Blueprint (render.yaml)

2. **In Render Settings, Auto-Deploy shows:**
   - [ ] Enabled for `main` branch
   - [ ] Disabled
   - [ ] Option doesn't exist

3. **GitHub Webhooks page shows:**
   - [ ] Render webhook exists
   - [ ] Recent deliveries successful
   - [ ] No webhook exists
   - [ ] Deliveries failing

Share these answers and I can provide more specific guidance!
