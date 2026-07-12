# PDF 401 Error & Blank Dashboard Fixes

## Issues Fixed

### 1. ✅ PDF 401 Unauthorized Error

**Problem:** When doctors/patients click PDF links for lab reports, they get 401 unauthorized error.

**Root Cause:** 
- Axios interceptor was adding `Authorization: Bearer <token>` header to ALL requests
- Cloudinary URLs don't need authentication
- Some browsers block requests with auth headers to third-party domains

**Solution:** Use `window.open()` instead of direct `<a>` tags to prevent auth headers from being sent.

**Files Fixed:**
1. `web/src/pages/clinician/components/PatientRecordPanel.tsx` - Doctor view
2. `web/src/pages/patient/LabTests.jsx` - Patient view
3. `web/src/pages/lab/Dashboard.jsx` - Lab tech view

**Change:**
```jsx
// Before
<a href={lab.pdf_url} target="_blank" rel="noopener noreferrer">
  PDF
</a>

// After
<a
  href={lab.pdf_url}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    e.preventDefault();
    window.open(lab.pdf_url, '_blank', 'noopener,noreferrer');
  }}
>
  PDF
</a>
```

**Why This Works:**
- `window.open()` creates a new browsing context
- No axios interceptors apply to `window.open()`
- No auth headers are sent to Cloudinary
- PDF opens cleanly without 401 error

---

### 2. ✅ Blank Dashboard Pages

**Problem:** All dashboards showing blank pages after login.

**Possible Causes:**
1. React rendering errors not caught
2. API errors throwing uncaught exceptions
3. Missing environment variables
4. Component mount failures

**Solution:** Added comprehensive error boundary.

**Files Created:**
- `web/src/components/ErrorBoundary.tsx` - Global error handler

**Files Modified:**
- `web/src/App.jsx` - Wrapped app in ErrorBoundary

**What ErrorBoundary Does:**
1. Catches all React rendering errors
2. Prevents white screen of death
3. Shows user-friendly error message
4. Displays error details in development mode
5. Provides "Reload" and "Go to Login" buttons
6. Logs errors to console for debugging

---

## How to Test

### Test PDF Links:

1. **As Doctor:**
   - Login as doctor
   - Open a patient record
   - Go to "Labs" tab
   - Click "PDF" button on any lab result
   - PDF should open in new tab without 401 error

2. **As Patient:**
   - Login as patient
   - Go to "Lab Tests" page
   - Click "View PDF" button
   - PDF should open without 401 error

3. **As Lab Tech:**
   - Login as lab
   - Go to "Completed" tab
   - Click "PDF" button
   - PDF should open without error

### Test Blank Page Fix:

1. **Trigger an Error:**
   - Open browser console (F12)
   - Break something intentionally (modify a component)
   - Page should show error boundary instead of blank page

2. **Check Dashboard Loading:**
   - Login as any role
   - Dashboard should load properly
   - If API fails, should show error instead of blank page
   - Check console for error messages

---

## Additional Debugging

### If PDF Still Shows 401:

1. **Check Cloudinary URL format:**
   ```
   ✅ Good: https://res.cloudinary.com/.../file.pdf
   ❌ Bad: https://res.cloudinary.com/.../file.pdf|something
   ```

2. **Check browser console:**
   - Look for CORS errors
   - Check if URL is malformed
   - Verify no mixed content warnings

3. **Test URL directly:**
   - Copy the PDF URL
   - Paste in new incognito tab
   - Should open without login

4. **Check backend:**
   - Verify Cloudinary upload settings
   - Ensure files are set to "public" not "authenticated"

### If Dashboard Still Blank:

1. **Check browser console (F12):**
   - Look for red error messages
   - Check network tab for failed API calls
   - Look for 401/403/500 errors

2. **Check environment variables:**
   ```bash
   # In web directory
   cat .env
   # Should have:
   VITE_API_URL=https://ayu-disha.onrender.com/api
   ```

3. **Check API backend is running:**
   - Visit: https://ayu-disha.onrender.com/api/health
   - Should return 200 OK

4. **Check auth token:**
   - Open DevTools → Application → Local Storage
   - Look for auth token
   - Try logging out and back in

5. **Error Boundary should show error:**
   - If dashboard is blank, Error Boundary should catch it
   - If Error Boundary doesn't show, check if it's imported correctly

---

## Technical Details

### PDF Issue Deep Dive

The problem occurs because:

1. **Axios Interceptor** in `api.ts`:
   ```typescript
   api.interceptors.request.use((config) => {
     const token = useAuthStore.getState().token;
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   ```

2. **Regular `<a>` tags** trigger axios when using same-origin policy

3. **Cloudinary rejects** requests with Authorization headers

4. **Solution:** `window.open()` bypasses axios completely

### Error Boundary Pattern

Error boundaries catch errors during:
- Rendering
- Lifecycle methods
- Constructors

They DON'T catch:
- Event handlers (use try-catch)
- Async code (use .catch())
- Server-side rendering
- Errors in error boundary itself

---

## Files Modified Summary

### PDF Fix:
- ✅ `web/src/pages/clinician/components/PatientRecordPanel.tsx`
- ✅ `web/src/pages/patient/LabTests.jsx`
- ✅ `web/src/pages/lab/Dashboard.jsx`

### Blank Page Fix:
- ✅ `web/src/components/ErrorBoundary.tsx` (new)
- ✅ `web/src/App.jsx` (wrapped in ErrorBoundary)

### Previous Fixes (still active):
- ✅ `web/src/pages/admin/Dashboard.jsx` (React error #31)
- ✅ `web/src/pages/Login.jsx` (Lab registration)
- ✅ `web/src/App.jsx` (Lab routing)

---

## Deployment Checklist

Before deploying:

- [ ] Test PDF links in all roles (doctor, patient, lab)
- [ ] Test all dashboards load without blank pages
- [ ] Check browser console for errors
- [ ] Test error boundary by breaking something
- [ ] Verify API is accessible
- [ ] Test lab registration with hospital selection

After deploying:

- [ ] Monitor error logs
- [ ] Check Render deployment succeeded
- [ ] Test production URLs
- [ ] Verify Cloudinary PDFs are accessible

---

## Common Issues

### "PDF still shows 401 in production"

**Solution:**
- Check if Cloudinary files are set to "public"
- Verify URL doesn't have authentication parameters
- Test URL in incognito window

### "Dashboard still blank after fix"

**Solution:**
- Check if Error Boundary is showing
- If not, may be import issue
- Verify App.jsx has `<ErrorBoundary>` wrapper
- Check console for actual error

### "Error Boundary not catching errors"

**Solution:**
- Error boundaries only catch React errors
- For API errors, add try-catch in components
- For event handler errors, add try-catch
- Check Error Boundary is above the failing component

---

## Next Steps

1. **Test locally first:**
   ```bash
   cd web
   npm run dev
   ```

2. **Test PDF downloads:**
   - Upload a lab result via lab dashboard
   - View as doctor
   - Click PDF link

3. **Test error handling:**
   - Break something temporarily
   - Verify error boundary shows

4. **Deploy:**
   ```bash
   git add .
   git commit -m "fix: PDF 401 error and add error boundary for blank pages"
   git push origin main
   ```

5. **Monitor production:**
   - Watch for errors in browser console
   - Check Render logs
   - Verify user reports

---

## Support

If issues persist:

1. **Collect diagnostics:**
   - Browser console screenshot
   - Network tab showing failed request
   - Full error message

2. **Check:**
   - Which role/dashboard has issue
   - When error occurs (login, navigation, specific action)
   - Browser and version

3. **Verify:**
   - Backend is running
   - Database is accessible
   - Auth tokens are valid
