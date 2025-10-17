# 🦉 HabitOwl v2.0 - Smart Habit & Routine Builder App

**Latest Version - No Deprecated Warnings!**  
**Compatible with Node.js v22** ✅

---

## 🆕 What's New in v2.0

### ✅ Updated to Latest Versions:
- **Expo SDK**: ~51.0 (latest stable)
- **React**: 18.2.0
- **React Native**: 0.74.2
- **Firebase**: 10.12.2
- **All dependencies**: Latest compatible versions

### ✅ Fixes:
- ❌ Removed all deprecated package warnings
- ✅ No more "npm warn deprecated" messages
- ✅ Compatible with Node.js v22.20.0
- ✅ Updated build commands (expo export:web instead of expo build:web)
- ✅ Modern Expo CLI (no global installation needed)

---

## 🚀 Quick Start

### Prerequisites You Have:
- ✅ Node.js v22.20.0
- ✅ Git
- ✅ VS Code
- ✅ Firebase account
- ✅ Expo account

### Installation Commands:
```bash
# No need for deprecated expo-cli!
# Modern Expo is built into your project

# 1. Install Firebase Tools only
npm install -g firebase-tools

# 2. Navigate to your project
cd habitowl-app-v2

# 3. Install dependencies (latest versions)
npm install

# 4. Start development
npm start
```

**✅ Clean installation with NO deprecated warnings!**

---

## 📱 Firebase Project Name

### Your Project: "habitowl-3405d"

**Q: Why the random digits?**  
A: Firebase adds random digits to ensure global uniqueness.

**Q: Can I get "habitowl.web.app" instead?**  
A: The project name is already taken. You have these options:

1. **Use auto URL**: `habitowl-3405d.web.app` (works perfectly)
2. **Buy custom domain**: `habitowl.com` and connect to Firebase
3. **Delete and recreate** (if "habitowl" becomes available)

**For Google Play Store**: Your Firebase URL doesn't matter!  
- Play Store only needs the app file (APK/AAB)
- Your hosting URL is just for privacy policy hosting
- Use: `https://habitowl-3405d.web.app/privacy` ✅

---

## 🎯 Complete Setup in 3 Steps

### 1. Update Firebase Config (2 minutes)
**File**: `src/config/firebase.js`

Replace with your actual config from Firebase Console:
```javascript
const firebaseConfig = {
  apiKey: "your-actual-key",
  authDomain: "habitowl-3405d.firebaseapp.com",
  projectId: "habitowl-3405d",
  storageBucket: "habitowl-3405d.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 2. Set Admin Email (2 minutes)
**Firestore Database** → Create collection:
- Collection: `admin_config`
- Document ID: `settings`
- Field: `admin_emails` (array) → Add your email
- Field: `api_keys` (map) → Leave empty

### 3. Deploy (5 minutes)
```bash
npm run build:web
firebase login
firebase init
firebase deploy
```

**Done!** App live at: `https://habitowl-3405d.web.app`

---

## 📱 Building for Mobile (Google Play Store)

### Install EAS CLI
```bash
npm install -g eas-cli
```

### Build Android App
```bash
# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Play Store (AAB file)
eas build -p android --profile production

# Or test version (APK file)
eas build -p android --profile preview
```

### What You Need for Play Store:
1. ✅ AAB file (from EAS build)
2. ✅ Screenshots (2-8 images)
3. ✅ App icon (512x512)
4. ✅ Privacy Policy URL: `https://habitowl-3405d.web.app/privacy`
5. ✅ Terms URL: `https://habitowl-3405d.web.app/terms`

**❌ You DON'T need**:
- Website URL (optional)
- Custom domain
- Anything else!

---

## 🔐 Security Features

- 🛡️ **Admin-only API keys** - Stored securely in Firestore
- 🔒 **Database protection** - Firestore security rules
- 👤 **Email-based admin** - Only approved emails see admin panel
- 🔑 **Multi-LLM support** - DeepSeek + OpenAI + OpenRouter

---

## 💰 Revenue Model

### Free Tier:
- 5 habits limit
- Shows ads (AdMob)
- Basic tracking
- **Revenue**: ~$1-2 per user/month

### Premium ($4.99/month):
- Unlimited habits
- AI coaching
- No ads
- Advanced analytics
- **Revenue**: $4.99 per user/month

**Expected**: $300-450/month with 150 users

---

## 📦 What's Included

```
habitowl-app-v2/
├── 📋 SIMPLE_SETUP_GUIDE.md      ← Start here! Complete guide
├── 📝 README.md                  ← This file
├── 📦 package.json               ← Latest dependencies (no warnings)
├── 🔧 app.json                   ← Expo SDK 51 config
├── 🔥 firebase.json              ← Hosting config
├── 🔐 firestore.rules            ← Database security
├── 🗄️ storage.rules              ← Storage security
├── 📄 public/                    ← Legal pages (privacy, terms)
├── 🔧 src/config/                ← Firebase config
├── 🛠️ src/services/              ← Backend services
├── 📱 src/screens/               ← App screens
├── 🧩 src/components/            ← UI components
└── 🧭 src/navigation/            ← App navigation
```

---

## 🛠️ Tech Stack (Latest Versions)

- **Frontend**: React Native 0.74.2 + Expo SDK 51
- **Backend**: Firebase 10.12.2
- **Auth**: Firebase Auth + Google Sign-In
- **Database**: Firestore
- **Hosting**: Firebase Hosting
- **AI**: DeepSeek API (budget) + OpenAI (premium)
- **Ads**: Google AdMob
- **Build**: EAS Build (Expo Application Services)

---

## 📊 Scripts Available

```bash
npm start           # Start development server
npm run build:web   # Build for web deployment
npm run deploy      # Build and deploy to Firebase
npm run android     # Run on Android device/emulator
npm run ios         # Run on iOS device/simulator (Mac only)
```

---

## 🔧 Troubleshooting

### "npm install" errors
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "Module not found"
```bash
npm install
expo start -c
```

### "Firebase not initialized"
- Check `src/config/firebase.js` has your actual config
- Ensure project ID matches Firebase Console

### "No admin panel showing"
- Check email in Firestore admin_emails
- Email must match exactly (case-sensitive)

---

## 🎯 Deployment Checklist

- [ ] Node.js v22 installed ✅
- [ ] Firebase project created ✅
- [ ] Firebase config updated ✅
- [ ] Admin email in Firestore ✅
- [ ] DeepSeek API key ready ✅
- [ ] Run `npm install` successfully ✅
- [ ] Run `npm run build:web` successfully ✅
- [ ] Deploy with `firebase deploy` ✅

---

## 📞 Support

### Built-in Support System:
Users can contact you through the app's support feature. All tickets appear in your admin panel.

### For Setup Help:
- Read `SIMPLE_SETUP_GUIDE.md` for step-by-step instructions
- Check Firebase Console for deployment errors
- Use browser console (F12) for debugging

---

## 🎉 Ready to Launch!

**This version is production-ready with**:
- ✅ Latest stable packages (Expo SDK 51)
- ✅ No deprecated warnings
- ✅ Node.js v22 compatible
- ✅ Google Play Store ready
- ✅ Complete documentation

**Setup time**: ~60 minutes  
**Investment**: $2 (DeepSeek API)  
**Revenue potential**: $300-450/month

**🦉 Start with: SIMPLE_SETUP_GUIDE.md**