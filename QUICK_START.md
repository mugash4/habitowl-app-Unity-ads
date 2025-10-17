# 🚀 HabitOwl v2.0 - Quick Start Guide

## ⚡ 3-Step Installation

### 1. Install Dependencies
```bash
cd habitowl-app-fixed
npm install
```

### 2. Start Development
```bash
npm start
```

### 3. Open in Browser/Mobile
- **Web:** Opens automatically at http://localhost:8081
- **Mobile:** Scan QR code with Expo Go app

## 🔧 What Was Fixed

### ✅ React Dependency Conflict
- Fixed React 18.2.0 vs react-dom ^18.3.1 mismatch
- Both now use compatible versions

### ✅ expo-ads-admob Deprecated Package
- Replaced with expo-ads-google-admob@~3.0.0
- Updated AdBanner.js and AdService.js

### ✅ Expo SDK Updated
- Updated from SDK 49 → SDK 51 (latest stable)
- All dependencies updated to latest compatible versions

## 📱 Expected Results

**npm install output:**
```
✅ Dependencies installed successfully
✅ No peer dependency warnings
✅ No deprecated package warnings
```

**npm start output:**
```
✅ Expo development server started
✅ QR code for mobile testing
✅ Web version at http://localhost:8081
```

## 🐛 If You See Errors

### Error: "npm install fails"
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Error: "Module not found"
```bash
npx expo start --clear
```

### Error: "Firebase connection failed"
Update `src/config/firebase.js` with your actual Firebase config

## 🎯 Production Ready

Your app is now ready for:
- ✅ Development testing
- ✅ Web deployment to Firebase
- ✅ Mobile app building with EAS
- ✅ Google Play Store submission

## 📞 Support

All issues fixed! Your app should now run without dependency conflicts.

**Next Steps:**
1. Test locally: `npm start`
2. Configure Firebase: Update config in `src/config/firebase.js`
3. Deploy: `npm run deploy`

---
*HabitOwl v2.0 - Smart Habit & Routine Builder*