# 🚀 HabitOwl v2.0 - Installation Instructions

## Quick Start (3 Steps)

### Step 1: Clean Installation
```bash
# Navigate to the project directory
cd habitowl-app-fixed

# Clear any existing cache and dependencies
npm cache clean --force
rm -rf node_modules package-lock.json

# Install dependencies (fixed versions)
npm install
```

### Step 2: Start Development
```bash
# Start the development server
npm start

# Or start specific platform
npm run web      # Web browser
npm run android  # Android device/emulator
npm run ios      # iOS device/simulator (Mac only)
```

### Step 3: Configure Firebase (Optional for Testing)
If you want to use your own Firebase project:

1. **Get Firebase Config:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project `habitowl-3405d`
   - Go to Project Settings → Your apps → Web app
   - Copy the config object

2. **Update Config File:**
   ```javascript
   // Edit: src/config/firebase.js
   const firebaseConfig = {
     apiKey: "your-actual-api-key",
     authDomain: "habitowl-3405d.firebaseapp.com",
     projectId: "habitowl-3405d",
     storageBucket: "habitowl-3405d.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

## What Was Fixed

### ✅ Dependency Conflicts Resolved
- **React version mismatch:** Fixed React/react-dom compatibility
- **expo-ads-admob deprecated:** Replaced with expo-ads-google-admob
- **Expo SDK outdated:** Updated to latest stable version (51.0.28)
- **All packages updated:** Latest compatible versions installed

### ✅ Build System Updated
- **Web build command:** `expo build:web` → `expo export:web`
- **Firebase hosting:** Updated to use `dist` folder
- **Metro config:** Updated for latest Expo SDK

### ✅ AdMob Integration Fixed
- **New AdMob API:** Updated to use latest Google AdMob package
- **Plugin configuration:** Added to app.json
- **Service layer:** Updated AdService.js with new API

## Expected Results

After running `npm install`, you should see:
```
✅ No peer dependency warnings
✅ No deprecated package warnings
✅ All packages installed successfully
✅ Compatible with Node.js 18+ and 20+
```

After running `npm start`, you should see:
```
✅ Expo development server starts
✅ QR code appears for mobile testing
✅ Web version opens in browser
✅ No console errors
```

## Troubleshooting

### Problem: npm install still shows errors
**Solution:**
```bash
# Use legacy peer deps flag (temporary)
npm install --legacy-peer-deps

# Or force the installation
npm install --force

# Then clear cache and reinstall normally
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Problem: Expo start fails
**Solution:**
```bash
# Clear Expo cache
npx expo start --clear

# Update Expo CLI
npm install -g @expo/cli@latest

# Try again
npm start
```

### Problem: Module not found errors
**Solution:**
```bash
# Reinstall node modules
rm -rf node_modules
npm install

# Clear Metro cache
npx expo start --clear
```

### Problem: Firebase connection fails
**Solution:**
1. Check your Firebase config in `src/config/firebase.js`
2. Ensure your project ID matches: `habitowl-3405d`
3. Verify your API key is correct
4. Check Firebase console for any restrictions

## Development Workflow

### For Web Development:
```bash
npm run web
# Opens http://localhost:8081 in browser
```

### For Mobile Development:
```bash
npm start
# Scan QR code with Expo Go app
# Or use simulator/emulator
```

### For Production Build:
```bash
# Web deployment
npm run build:web
firebase deploy

# Mobile build
npx expo install --fix
eas build --platform android
eas build --platform ios
```

## File Structure (Updated)
```
habitowl-app-fixed/
├── package.json          # ✅ Fixed dependencies
├── app.json              # ✅ Updated Expo SDK 51
├── firebase.json         # ✅ Updated build folder
├── src/
│   ├── components/
│   │   └── AdBanner.js   # ✅ Updated AdMob API
│   ├── services/
│   │   └── AdService.js  # ✅ Updated AdMob API
│   └── config/
│       └── firebase.js   # ✅ Your project config
└── README.md
```

## Next Steps

1. **Test Locally:** Make sure everything works in development
2. **Update Firebase Config:** Add your actual Firebase project details
3. **Update AdMob IDs:** Replace test IDs with your real AdMob IDs
4. **Deploy to Firebase:** Use `npm run deploy` for web deployment
5. **Build Mobile Apps:** Use EAS Build for app store deployment

## Support

If you need help:

1. **Check the logs:** Look for specific error messages
2. **Verify Node.js version:** `node --version` (should be 18+ or 20+)
3. **Check Expo CLI version:** `npx expo --version`
4. **Clear all caches:** Follow the troubleshooting steps above

---

## 🎉 Success Indicators

When everything is working correctly:
- ✅ `npm install` completes without warnings
- ✅ `npm start` opens development server
- ✅ App loads in browser/mobile
- ✅ No console errors in development
- ✅ Firebase authentication works (if configured)
- ✅ App navigation works smoothly

Your HabitOwl app is now ready for development and deployment!