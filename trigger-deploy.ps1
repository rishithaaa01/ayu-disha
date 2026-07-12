# Render Deploy Hook Trigger Script
# Usage: ./trigger-deploy.ps1

$DEPLOY_HOOK_URL = Read-Host "Enter your Render Deploy Hook URL"

if ([string]::IsNullOrWhiteSpace($DEPLOY_HOOK_URL)) {
    Write-Host "❌ Deploy Hook URL is required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your Deploy Hook URL:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com" -ForegroundColor Yellow
    Write-Host "2. Select your service" -ForegroundColor Yellow
    Write-Host "3. Settings → Deploy Hook" -ForegroundColor Yellow
    Write-Host "4. Copy the URL" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Triggering Render deployment..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $DEPLOY_HOOK_URL -Method POST -UseBasicParsing
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Check your deployment status at:" -ForegroundColor Yellow
        Write-Host "https://dashboard.render.com" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Unexpected response: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host $response.Content
    }
} catch {
    Write-Host "❌ Failed to trigger deployment!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify:" -ForegroundColor Yellow
    Write-Host "1. Your Deploy Hook URL is correct" -ForegroundColor Yellow
    Write-Host "2. You have internet connection" -ForegroundColor Yellow
    Write-Host "3. The service exists on Render" -ForegroundColor Yellow
}
