# 🛠️ HabitOwl v2.0 - Exact Commands for Non-Developers

**For Node.js v22.20.0** ✅  
**No deprecated warnings** ✅

---

## ✅ What Changed from v1 to v2

### Updated Versions:
- **Expo SDK**: 49 → 51 (latest stable)
- **React Native**: 0.72.6 → 0.74.2
- **Firebase**: 10.3.1 → 10.12.2
- **All packages**: Updated to latest compatible versions

### Removed Deprecated Packages:
- ❌ `expo-cli` (no longer needed)
- ❌ `@react-native-community/cli` (not needed for Expo)
- ❌ Old deprecated dependencies

### New Commands:
- ✅ `npm run build:web` (instead of expo build:web)
- ✅ Modern Expo workflow (no global CLI)

---

## 📋 Step-by-Step Installation

### Step 1: Install Global Tools (One-time)
**Open Terminal/Command Prompt and run**:

```bash
# Install Firebase Tools (for deployment)
npm install -g firebase-tools

# Install EAS CLI (for mobile builds)
npm install -g eas-cli
```

**That's it!** No expo-cli, no react-native-cli needed.

---

### Step 2: Extract Your App
1. **Extract** `habitowl-app-v2` folder
2. **Open** the folder in VS Code
3. **Open Terminal** in VS Code (View → Terminal)

---

### Step 3: Install Dependencies
**Copy and paste this command**:

```bash
npm install
```

**What happens**:
- Downloads all packages (takes 2-3 minutes)
- Installs latest versions
- No deprecated warnings!

**When successful, you'll see**:
```
added XXX packages, and audited XXX packages in XXs
```

---

### Step 4: Update Firebase Config
**File**: `src/config/firebase.js`

**Replace** this:
```javascript
const firebaseConfig = {
  apiKey: "YOUR-API-KEY-HERE",
  authDomain: "habitowl.firebaseapp.com",
  projectId: "habitowl",
  // ...
};
```

**With your actual config** from Firebase Console:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...", // Your actual key
  authDomain: "habitowl-3405d.firebaseapp.com",
  projectId: "habitowl-3405d",
  storageBucket: "habitowl-3405d.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
};
```

**Save the file** (Ctrl+S or Cmd+S)

---

### Step 5: Test Locally
**Run this command**:

```bash
npm start
```

**What happens**:
- Development server starts
- QR code appears
- Opens in browser automatically

**Press**:
- `w` for web browser
- `a` for Android emulator
- `i` for iOS simulator (Mac only)

**To stop**: Press `Ctrl+C`

---

### Step 6: Build for Web
**Run this command**:

```bash
npm run build:web
```

**What happens**:
- Creates production build
- Outputs to `dist` folder
- Takes 1-2 minutes

**When successful, you'll see**:
```
✓ Exported web app to: dist
```

---

### Step 7: Deploy to Firebase

**First time setup**:
```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init
```

**Follow these answers**:
```
? Which Firebase features? 
→ Press SPACE to select: Hosting
→ Press ENTER

? Use an existing project
→ Press ENTER

? Select project:
→ Select: habitowl-3405d (or your project)
→ Press ENTER

? What directory?
→ Type: dist
→ Press ENTER

? Configure as single-page app?
→ Type: y
→ Press ENTER

? Overwrite index.html?
→ Type: N
→ Press ENTER
```

**Deploy**:
```bash
firebase deploy
```

**When successful, you'll see**:
```
✔ Deploy complete!
Hosting URL: https://habitowl-3405d.web.app
```

**🎉 Your app is live!**

---

### Step 8: Build for Android (Google Play)

**Run these commands**:

```bash
# Login to Expo account
eas login

# Configure build
eas build:configure

# Build Android APK (for testing)
eas build -p android --profile preview

# OR build AAB (for Play Store)
eas build -p android --profile production
```

**What happens**:
- Build happens in the cloud (Expo servers)
- Takes 10-15 minutes
- You get download link when done

**Download**: APK or AAB file for Play Store submission

---

## 🔧 Common Commands Reference

### Development:
```bash
npm start              # Start dev server
npm start -- --clear   # Start with cache cleared
```

### Building:
```bash
npm run build:web      # Build for web
npm run deploy         # Build + deploy to Firebase
```

### Mobile Builds:
```bash
eas build -p android --profile preview     # APK for testing
eas build -p android --profile production  # AAB for store
eas build -p ios --profile production      # iOS (Mac only)
```

### Deployment:
```bash
firebase login         # Login (first time)
firebase deploy        # Deploy to hosting
firebase deploy --only hosting  # Deploy hosting only
```

### Troubleshooting:
```bash
npm cache clean --force              # Clear npm cache
rm -rf node_modules package-lock.json  # Remove deps
npm install                          # Reinstall
expo start -c                        # Clear Expo cache
```

---

## ❌ Commands You DON'T Need

**These are DEPRECATED - Don't use**:
```bash
# DON'T USE:
npm install -g expo-cli              # Old method
npm install -g @react-native-community/cli  # Not needed
expo build:web                       # Old command
react-native run-android             # Not for Expo
```

---

## ✅ Verification Commands

**Check installations**:
```bash
node --version          # Should show: v22.20.0
npm --version           # Should show: 10.x.x or higher
firebase --version      # Should show: 13.x.x or higher
eas --version          # Should show: 7.x.x or higher
```

**Check if app works**:
```bash
cd habitowl-app-v2
npm start
# Press 'w' for web
# Should open in browser without errors
```

---

## 🐛 If You Get Errors

### Error: "Cannot find module"
**Solution**:
```bash
npm install
```

### Error: "npm install" fails
**Solution**:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port already in use"
**Solution**:
```bash
# Kill the process using the port
npx kill-port 8081
npx kill-port 19000
npx kill-port 19001
```

### Error: "Firebase command not found"
**Solution**:
```bash
npm install -g firebase-tools
```

### Error: "eas command not found"
**Solution**:
```bash
npm install -g eas-cli
```

### Error: Building fails
**Solution**:
```bash
# Clear everything and rebuild
npm cache clean --force
rm -rf node_modules dist .expo
npm install
npm run build:web
```

---

## 📱 Firebase Project URL Issue

**Your project**: `habitowl-3405d`  
**Your URL**: `https://habitowl-3405d.web.app`

### Why the "-3405d"?
Firebase adds random characters to ensure global uniqueness.

### Can I remove it?
**No**, but you have options:

1. **Use it as-is** (recommended)
   - Works perfectly
   - Free
   - No setup needed

2. **Buy custom domain**
   - Buy: `habitowl.com` ($12/year)
   - Connect to Firebase
   - Professional look

3. **For Play Store**
   - Your URL doesn't matter!
   - Store only needs APK/AAB file
   - Use Firebase URL for privacy policy

---

## 🎯 Complete Setup Sequence

**Copy and paste these commands one by one**:

```bash
# 1. Install global tools
npm install -g firebase-tools eas-cli

# 2. Navigate to project
cd habitowl-app-v2

# 3. Install dependencies
npm install

# 4. Test locally
npm start
# Press 'w' to open web
# Press Ctrl+C to stop

# 5. Build for production
npm run build:web

# 6. Deploy to Firebase
firebase login
firebase init
firebase deploy

# 7. Done! Your app is live
```

**Total time**: ~10 minutes (excluding build time)

---

## 💡 Pro Tips

### Speed up installs:
```bash
# Use npm ci instead of npm install (faster)
npm ci
```

### Check for updates:
```bash
# Check outdated packages
npm outdated

# Update packages (be careful!)
npm update
```

### Clean project:
```bash
# Remove all generated files
rm -rf node_modules dist .expo .firebase
npm install
```

---

## 🎉 Success Checklist

- [ ] `npm install` completed without errors ✅
- [ ] `npm start` opens in browser ✅
- [ ] Can create account in app ✅
- [ ] `npm run build:web` creates dist folder ✅
- [ ] `firebase deploy` succeeds ✅
- [ ] App accessible at Firebase URL ✅
- [ ] Admin panel visible (if email added) ✅

**If all checked**: You're ready to go! 🚀

---

**🦉 HabitOwl v2.0 - Ready for Production!**

**Need more help?** Check `SIMPLE_SETUP_GUIDE.md` for detailed explanations.