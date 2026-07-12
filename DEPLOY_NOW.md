# Quick Deploy to Render

## Method 1: Using PowerShell Script

```powershell
.\trigger-deploy.ps1
```

Then paste your Deploy Hook URL when prompted.

---

## Method 2: One-Line Command (PowerShell)

Replace `YOUR_DEPLOY_HOOK_URL` with your actual URL:

```powershell
Invoke-WebRequest -Uri "YOUR_DEPLOY_HOOK_URL" -Method POST
```

---

## Method 3: One-Line Command (CMD)

```cmd
curl -X POST "YOUR_DEPLOY_HOOK_URL"
```

---

## Method 4: GitHub Actions (Automatic)

The workflow `.github/workflows/deploy-render.yml` is already set up!

**Setup Steps:**

1. **Get your Deploy Hook URL from Render:**
   - Go to: https://dashboard.render.com
   - Select your service (e.g., `ayu-disha-backend` or `ayu-disha-frontend`)
   - Click **Settings** tab
   - Scroll to **Deploy Hook** section
   - Click **Create Deploy Hook** (if not exists)
   - Copy the URL (looks like: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`)

2. **Add Deploy Hook to GitHub Secrets:**
   - Go to: https://github.com/rishithaaa01/ayu-disha/settings/secrets/actions
   - Click **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: Paste the Deploy Hook URL
   - Click **Add secret**

3. **Push any commit to trigger auto-deploy:**
   ```bash
   git commit --allow-empty -m "trigger deploy"
   git push origin main
   ```

4. **Check GitHub Actions:**
   - Go to: https://github.com/rishithaaa01/ayu-disha/actions
   - You should see "Deploy to Render" workflow running

---

## Verify Deployment

After triggering:

1. Check Render Dashboard: https://dashboard.render.com
2. Look for your service in the list
3. Click on it to see **Event Logs** and **Deploy status**

---

## Troubleshooting

### "Nothing happens after triggering deploy hook"

Check if:
- The Deploy Hook URL is complete (includes `?key=xxxxx`)
- Your service is not already deploying
- Check Render Dashboard → Events tab for errors

### "GitHub Actions workflow not running"

- Verify the secret name is exactly `RENDER_DEPLOY_HOOK_URL`
- Check repository has Actions enabled
- Push a new commit to trigger

### "Want to deploy specific services"

If you have multiple services (backend + frontend), create separate deploy hooks:

1. Get deploy hooks for both services
2. Add as separate secrets:
   - `RENDER_BACKEND_DEPLOY_HOOK`
   - `RENDER_FRONTEND_DEPLOY_HOOK`
3. Update workflow to call both

---

## Current Status

- ✅ GitHub Actions workflow created: `.github/workflows/deploy-render.yml`
- ⏳ Waiting for `RENDER_DEPLOY_HOOK_URL` secret
- ⏳ First manual deploy needed to test

