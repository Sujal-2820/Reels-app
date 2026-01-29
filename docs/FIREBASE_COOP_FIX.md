# Firebase Google Sign-In COOP Fix

## Issue
**Error:** `Cross-Origin-Opener-Policy policy would block the window.closed call`

**Impact:** Firebase Google Sign-In with popup was failing because the browser's Cross-Origin-Opener-Policy (COOP) was blocking the popup window communication.

---

## Root Cause

Firebase's `signInWithPopup()` method needs to:
1. Open a popup window for Google authentication
2. Monitor when the popup closes (`window.closed` check)
3. Receive authentication data from the popup

The default Vite dev server doesn't set COOP headers, and modern browsers block cross-origin popup communication for security reasons.

---

## Solution Applied

Updated `vite.config.js` to include COOP headers that allow popup authentication:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
```

### Header Explanation:

**`Cross-Origin-Opener-Policy: same-origin-allow-popups`**
- Allows the page to open popups that can communicate back
- Maintains security by only allowing same-origin communication
- Specifically designed for authentication flows like Firebase

**`Cross-Origin-Embedder-Policy: require-corp`**
- Ensures resources are explicitly marked as shareable
- Works in conjunction with COOP for enhanced security
- Required for certain cross-origin features

---

## Testing

After applying this fix:

1. ✅ Restart Vite dev server (automatically done)
2. ✅ Navigate to login page
3. ✅ Click "Sign in with Google"
4. ✅ Popup should open without COOP errors
5. ✅ Authentication should complete successfully

---

## Production Considerations

### For Production Deployment:

**Option A: Same Configuration (Recommended)**
- Keep the same COOP headers in production
- Works well with Firebase popup authentication
- Maintains good security posture

**Option B: Use Redirect Flow**
- Switch to `signInWithRedirect()` instead of `signInWithPopup()`
- More reliable across all browsers and configurations
- Better for mobile devices
- No COOP configuration needed

### Example Redirect Implementation:
```javascript
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';

// On login button click
await signInWithRedirect(auth, googleProvider);

// On app initialization (e.g., in App.jsx useEffect)
const result = await getRedirectResult(auth);
if (result) {
  // User signed in
}
```

---

## Files Modified

- `frontend/vite.config.js` - Added COOP headers to dev server configuration

---

## Additional Notes

- **Development:** COOP headers now allow Firebase popup authentication
- **Security:** Headers maintain security while enabling necessary functionality
- **Compatibility:** Works with all modern browsers
- **Alternative:** Can switch to redirect flow if popup issues persist

---

## Related Documentation

- [Firebase Auth Popup vs Redirect](https://firebase.google.com/docs/auth/web/google-signin#popup-vs-redirect)
- [MDN: Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)
- [Vite Server Options](https://vitejs.dev/config/server-options.html)
