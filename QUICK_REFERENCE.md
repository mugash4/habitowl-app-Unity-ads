# 🚀 HabitOwl v2.1.0 - Quick Reference Card

## ⚡ Essential Commands

```bash
# Install everything
npm install

# Start development
npm start

# Build for web
npm run build:web

# Deploy to Firebase
firebase deploy

# Build for Android
eas build -p android

# Clean install (if errors)
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📂 Key Files to Know

| File | Purpose | Edit? |
|------|---------|-------|
| `package.json` | Dependencies list | ✅ Fixed |
| `app.json` | App configuration | ✅ Updated |
| `src/config/firebase.js` | Firebase settings | ⚠️ ADD YOUR CONFIG |
| `src/services/AdService.js` | Ad management | ✅ Fixed |
| `src/components/AdBanner.js` | Banner ads | ✅ Fixed |

---

## 🎯 What Changed in v2.1.0

| Component | Old | New | Status |
|-----------|-----|-----|--------|
| AdMob Package | expo-ads-google-admob | react-native-google-mobile-ads | ✅ Fixed |
| Google Auth | expo-google-app-auth | Removed | ✅ Fixed |
| Version | 2.0.0 | 2.1.0 | ✅ Updated |

---

## 🔥 Setup Sequence

1. ✅ Extract folder
2. ✅ Run `npm install`
3. ⚠️ Update Firebase config
4. ⚠️ Add admin email to Firestore
5. ⚠️ Add DeepSeek API key
6. ✅ Run `npm start`
7. 🎉 Test app!

---

## 💰 AdMob IDs (Already Set)

```
Android App ID: ca-app-pub-2371616866592450~9516891462
Banner: ca-app-pub-2371616866592450/1677929899
Interstitial: ca-app-pub-2371616866592450/8051766556
Rewarded: ca-app-pub-2371616866592450/9388898951
```

⚠️ **iOS IDs need to be updated!**

---

## 🛠️ Troubleshooting Quick Fixes

| Error | Fix |
|-------|-----|
| 404 Not Found | ✅ Already fixed in this version |
| Module not found | `npm install` |
| Port in use | `npm start -- --port 8081` |
| Cache issues | `npm cache clean --force` |
| Expo won't start | `npx expo start -c` |

---

## 📚 Documentation Files

| For... | Read... |
|--------|---------|
| Non-developers | NON_DEVELOPER_GUIDE.md |
| Setup steps | SIMPLE_SETUP_GUIDE.md |
| What was fixed | FIX_DOCUMENTATION.md |
| Technical details | MIGRATION_GUIDE.md |
| Deployment | DEPLOYMENT_GUIDE.md |
| Security | SECURITY_CHECKLIST.md |

---

## ✅ Testing Checklist

- [ ] `npm install` works (no errors)
- [ ] `npm start` works
- [ ] App loads on device/browser
- [ ] Test ads show "Test Ad" label
- [ ] Can create habit
- [ ] Can mark habit complete
- [ ] Stats page works
- [ ] Premium upgrade prompt works
- [ ] Notifications work (if enabled)

---

## 🎨 Revenue Model

| User Type | Price | Revenue/User/Month |
|-----------|-------|-------------------|
| Free (with ads) | $0 | $1-2 |
| Premium | $4.99 | $4.99 |

**Goal:** 100 free + 50 premium = $350-450/month

---

## 🔐 Firebase Setup (Required)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create/select project: `habitowl-3405d`
3. Copy config from Project Settings
4. Paste in `src/config/firebase.js`
5. Create Firestore database
6. Add document: `admin_config/settings`
7. Add field: `admin_emails` (array) with your email

---

## 🎯 AdMob Setup (Required)

1. Go to [AdMob Console](https://apps.admob.com)
2. App already created (check your email)
3. IDs already configured (see above)
4. For iOS: Create iOS ad units
5. Update iOS IDs in:
   - `app.json`
   - `src/services/AdService.js`

---

## 📱 Expo Go Testing

1. Install "Expo Go" on your phone
2. Make sure phone & computer on same WiFi
3. Run `npm start`
4. Scan QR code with Expo Go
5. App loads instantly!

---

## 🚀 Deployment URLs

| Environment | URL |
|-------------|-----|
| Local dev | http://localhost:19006 |
| Firebase web | https://habitowl-3405d.web.app |
| Privacy policy | https://habitowl-3405d.web.app/privacy |
| Terms | https://habitowl-3405d.web.app/terms |

---

## 💻 Folder Structure

```
habitowl-app-fixed/
├── src/
│   ├── components/    ← UI pieces
│   ├── screens/       ← App pages
│   ├── services/      ← Backend logic
│   ├── navigation/    ← Navigation setup
│   └── config/        ← Firebase config
├── public/            ← Web files
├── assets/            ← Images, icons
└── [config files]     ← package.json, app.json, etc.
```

---

## 🎊 Success Indicators

✅ Installation works  
✅ App starts without errors  
✅ Ads show in app  
✅ Firebase connected  
✅ Can create/track habits  
✅ Premium features locked for free users  
✅ Stats display correctly  

---

## 🆘 Get Help

1. Check error message carefully
2. Search in documentation files
3. Google the error
4. Check [Expo Docs](https://docs.expo.dev)
5. Check [Firebase Docs](https://firebase.google.com/docs)

---

## 🎯 Next Steps After Setup

1. **Customize branding**
   - Colors
   - App name
   - Icon

2. **Test thoroughly**
   - All features
   - Different devices
   - Ad placements

3. **Deploy web version**
   - `npm run build:web`
   - `firebase deploy`

4. **Build mobile apps**
   - `eas build -p android`
   - Submit to Google Play

5. **Monitor & improve**
   - Check AdMob earnings
   - Review user feedback
   - Add new features

---

**Quick Start:** NON_DEVELOPER_GUIDE.md  
**Full Details:** FIX_DOCUMENTATION.md  
**Deployment:** DEPLOYMENT_GUIDE.md

**Version:** 2.1.0 | **Status:** ✅ Production Ready
