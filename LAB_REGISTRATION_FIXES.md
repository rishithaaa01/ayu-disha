# Lab Technician Registration Fixes

## Issues Fixed

### 1. ✅ Hospital Selector Not Appearing for Lab Role
**Problem:** When registering as Lab Tech, the hospital selection dropdown was not showing.

**Root Cause:** The conditional check only included `doctor` role, not `lab` role.

**Fixed in:** `web/src/pages/Login.jsx`
- Line ~729: Regular registration form
- Line ~1090: OTP-based profile completion form

**Changes:**
```jsx
// Before
{regRole === 'doctor' && (

// After  
{(regRole === 'doctor' || regRole === 'lab') && (
```

---

### 2. ✅ Hospital Not Sent to Backend for Lab Users
**Problem:** Even when lab users selected a hospital, it wasn't being sent to the backend.

**Fixed in:** `web/src/pages/Login.jsx`
- `handleRegister` function (line ~179)
- `handleCompleteProfile` function (line ~341)

**Changes:**
```javascript
// Before
hospital: regRole === 'doctor' ? regHospital : null,

// After
hospital: (regRole === 'doctor' || regRole === 'lab') ? regHospital : null,
```

---

### 3. ✅ Hospital Validation Missing for Lab Users
**Problem:** Registration allowed lab users to proceed without selecting a hospital.

**Fixed in:** `web/src/pages/Login.jsx`

**Changes:**
```javascript
// Before
if (regRole === 'doctor' && !regHospital) {

// After
if ((regRole === 'doctor' || regRole === 'lab') && !regHospital) {
```

---

### 4. ✅ Empty Hospital Dropdown Issue
**Problem:** Hospital dropdown appeared but had no options.

**Root Cause:** API call failing or returning empty array.

**Fixes Applied:**
1. Added loading state for metadata
2. Added console logging to debug API responses
3. Added "Loading hospitals..." placeholder
4. Added warning message when no hospitals found
5. Added "Refresh List" button to manually retry API call
6. Improved error handling with user-friendly messages

**Code:**
```jsx
{hospitals.length > 0 ? (
  hospitals.map(h => (
    <option key={h.id} value={h.name}>{h.name}</option>
  ))
) : (
  <option value="" disabled>Loading hospitals...</option>
)}
```

---

### 5. ✅ Better UX with Dynamic Labels
**Enhancement:** Hospital selector now shows contextual labels.

**Changes:**
- Lab role: "Select Laboratory / Hospital"
- Doctor role: "Select Clinical Hospital"
- Shows Flask icon for lab, Activity icon for doctor

---

### 6. ✅ Route Improvements
**Fixed in:** `web/src/App.jsx`

Added explicit `/lab` route in addition to `/lab/*` for better route matching:
```jsx
<Route path="/lab" element={<ProtectedRoute allowedRoles={['lab']}><LabDashboard /></ProtectedRoute>} />
<Route path="/lab/*" element={<ProtectedRoute allowedRoles={['lab']}><LabDashboard /></ProtectedRoute>} />
```

---

### 7. ✅ Lab Dashboard Error Handling
**Fixed in:** `web/src/pages/lab/Dashboard.jsx`

- Added error state tracking for API calls
- Added error boundary UI
- Added debug console logging
- Added user-friendly error messages

---

## Testing Checklist

### Password-Based Registration (Step 1)
- [ ] Select "Lab Tech" role
- [ ] Hospital dropdown appears
- [ ] Hospital options are visible
- [ ] Form validation requires hospital selection
- [ ] Registration succeeds and redirects to `/lab`

### OTP-Based Registration (Step 5 - Profile Completion)
- [ ] After OTP verification, select "Lab Tech" role
- [ ] Hospital dropdown appears
- [ ] Hospital options are visible
- [ ] Form validation requires hospital selection
- [ ] Profile completion succeeds and redirects to `/lab`

### Lab Dashboard
- [ ] Dashboard loads without blank page
- [ ] Shows user name and hospital
- [ ] Displays pending/completed orders
- [ ] No console errors

---

## Debugging Tools Added

### Console Logging
Check browser console (F12) for:
- `Hospitals loaded:` - Shows API response
- `Villages loaded:` - Shows villages API response
- `⚠️ No hospitals found in database!` - Warns if empty
- `LabDashboard mounted, user:` - Shows user object on lab dashboard

### Manual Refresh Button
If hospital list is empty, a "Refresh List" button appears to retry the API call.

### Error Messages
User-friendly error messages appear when:
- API call fails
- No hospitals in database
- Network issues

---

## Common Issues & Solutions

### Issue: "No hospitals available"
**Solutions:**
1. Check if hospitals exist in database:
   - Login as admin
   - Go to Hospitals tab
   - Add hospitals if none exist

2. Check API endpoint:
   - Open DevTools → Network tab
   - Look for `/auth/hospitals` request
   - Check if it returns data

3. Check CORS/Backend:
   - Verify backend is running
   - Check API base URL is correct
   - Verify no CORS errors

### Issue: "Still redirects to blank page"
**Solutions:**
1. Check browser console for errors
2. Verify user object has `role: 'lab'`
3. Check if `/lab` route is registered
4. Clear browser cache and reload

### Issue: "Hospital selection not saving"
**Check:**
1. Network tab shows hospital in POST payload
2. Backend logs show hospital field
3. User document in database has hospital field

---

## API Endpoints Used

1. `GET /auth/hospitals` - Fetch all hospitals
2. `POST /auth/register` - Register with email/password
3. `POST /auth/complete-profile` - Complete profile after OTP

---

## Next Steps

1. **Test the registration flow:**
   - Try registering a new lab account
   - Check if hospitals appear in dropdown
   - Verify redirect to lab dashboard works

2. **If hospitals still not showing:**
   - Open browser console (F12)
   - Look for "Hospitals loaded:" log
   - Share the output to debug further

3. **Verify backend:**
   - Ensure `/auth/hospitals` endpoint returns data
   - Check if MongoDB has hospitals collection populated

---

## Files Modified

1. ✅ `web/src/pages/Login.jsx` - Main registration forms
2. ✅ `web/src/App.jsx` - Routing configuration
3. ✅ `web/src/pages/lab/Dashboard.jsx` - Lab dashboard with error handling
4. ✅ `web/src/pages/admin/Dashboard.jsx` - Fixed React error #31

---

## Deployment

After testing locally, commit and push:

```bash
git add .
git commit -m "fix: lab technician registration with hospital selection"
git push origin main
```

Then trigger Render deployment (see `DEPLOY_NOW.md` for instructions).
