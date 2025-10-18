# HabitOwl - Unity Ads Edition

## ✨ What's New in Version 2.3.0

- **Switched from Google AdMob to Unity Ads** (ironSource Mediation)
- Better ad fill rates and revenue potential
- Improved ad experience for users
- Simpler configuration and setup

---

## 🚀 Quick Start (For Non-Developers)

### Before You Start

**READ THIS FIRST:** 📖 `UNITY_ADS_SETUP_GUIDE.md`

The setup guide has EVERYTHING you need including:
- How to create Unity Ads account
- How to get your Game IDs
- How to configure the app
- Complete installation instructions
- Troubleshooting help

### Quick Installation Steps

1. **Download this package**
2. **Follow the setup guide** (`UNITY_ADS_SETUP_GUIDE.md`)
3. **Update your Unity Ads IDs** in `src/config/unityAdsConfig.js`
4. **Install dependencies:** `npm install`
5. **Start the app:** `npm start`

That's it! 🎉

---

## 📁 What's Included

All your existing files PLUS new Unity Ads integration:

### New Files Added:
```
src/
  config/
    unityAdsConfig.js          ← CONFIGURE YOUR IDs HERE!
  
  services/
    UnityAdsService.js         ← Unity Ads logic
  
  components/
    UnityBannerAd.js           ← Banner ad component
  
  hooks/
    useUnityInterstitialAd.js  ← Interstitial ad hook
    useUnityRewardedAd.js      ← Rewarded ad hook
```

### Files Updated:
```
package.json        ← Added Unity Ads dependency
App.js              ← Added Unity Ads initialization
app.json            ← Updated with Unity configuration
src/screens/HomeScreen.js  ← Using Unity Banner Ads
```

### Files Removed:
```
src/services/AdService.js     ← Old Google AdMob
src/components/BannerAd.js    ← Old AdMob Banner
src/components/AdBanner.js    ← Old AdMob Banner
```

---

## ⚙️ Configuration (IMPORTANT!)

### Step 1: Update Unity Ads Configuration

Open: `src/config/unityAdsConfig.js`

Replace these placeholders with YOUR actual Unity Ads IDs:

```javascript
ANDROID_GAME_ID: 'YOUR_ANDROID_GAME_ID',  // Get from Unity Dashboard
IOS_GAME_ID: 'YOUR_IOS_GAME_ID',          // Get from Unity Dashboard

ANDROID_BANNER: 'YOUR_ANDROID_BANNER_ID',
ANDROID_INTERSTITIAL: 'YOUR_ANDROID_INTERSTITIAL_ID',
ANDROID_REWARDED: 'YOUR_ANDROID_REWARDED_ID',

IOS_BANNER: 'YOUR_IOS_BANNER_ID',
IOS_INTERSTITIAL: 'YOUR_IOS_INTERSTITIAL_ID',
IOS_REWARDED: 'YOUR_IOS_REWARDED_ID',
```

**Don't have these IDs yet?**
→ See `UNITY_ADS_SETUP_GUIDE.md` for how to get them

### Step 2: Update Firebase Configuration (if needed)

If this is a fresh installation, update your Firebase config:

Open: `src/config/firebase.js`

Add your Firebase credentials from Firebase Console.

---

## 🛠️ Installation

### First Time Setup

```bash
# Navigate to the app folder
cd habitowl-unity-ads

# Install all dependencies
npm install

# Start the development server
npm start
```

### Building for Production

**Android (Google Play Store):**
```bash
npx eas build -p android --profile production
```

**iOS (App Store):**
```bash
npx eas build -p ios --profile production
```

---

## 📱 Testing Your App

### Development Testing

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Scan QR code** with Expo Go app

3. **Check Console Logs** for:
   - ✅ "Unity Ads initialized successfully"
   - ✅ "Banner ad loaded"
   - ✅ "Interstitial ad loaded"

### Production Testing

After building:
1. Install the APK/AAB on your device
2. Navigate through the app
3. Complete habits to trigger ads
4. Check Unity Dashboard for impressions

---

## 🎮 How Unity Ads Work in the App

### Banner Ads
- Appear at bottom of screens
- Always visible (except for premium users)
- Automatically load and refresh

### Interstitial Ads
- Full-screen ads between actions
- Show after:
  - Completing habits
  - Creating new habits
  - Navigating to certain screens
- Respectful timing (30 second cooldown)
- Limited to 5 per session

### Rewarded Ads (Optional Feature)
- Users watch video to earn rewards
- Can give bonus features or coins
- User-initiated only

---

## 💰 Revenue Expectations

With Unity Ads, you can expect:

- **Banner Ads:** $0.50 - $2.00 per 1,000 impressions
- **Interstitial Ads:** $2.00 - $5.00 per 1,000 impressions
- **Rewarded Ads:** $5.00 - $15.00 per 1,000 impressions

**Example Revenue (150 active users):**
- 150 users × 10 sessions/day = 1,500 sessions
- ~5,000 banner impressions/day = $2.50 - $10/day
- ~300 interstitial impressions/day = $0.60 - $1.50/day
- **Total: $90 - $350/month** from ads alone

Plus Premium subscriptions: $4.99 × 20 users = $100/month

**Potential Total: $190 - $450/month**

---

## 🔧 Troubleshooting

### "Ads not showing"

**Check:**
1. Did you update `unityAdsConfig.js` with your IDs?
2. Are you testing on a real device (not web)?
3. Is your Unity Ads account activated?
4. Did you enable test mode in Unity Dashboard?

### "Module not found: ironsource-mediation"

```bash
npm install ironsource-mediation
npm start
```

### "Build fails"

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

### More Help

Check the detailed troubleshooting section in:
→ `UNITY_ADS_SETUP_GUIDE.md`

---

## 📚 Documentation

- **Setup Guide:** `UNITY_ADS_SETUP_GUIDE.md` ← START HERE!
- **Unity Ads Docs:** https://docs.unity.com/grow/levelplay
- **ironSource React Native:** https://docs.unity.com/grow/levelplay/sdk/react

---

## 🆘 Support

### If you get stuck:

1. **Read the setup guide:** `UNITY_ADS_SETUP_GUIDE.md`
2. **Check configuration:** Verify all IDs in `unityAdsConfig.js`
3. **Look at console logs:** Any error messages?
4. **Try the troubleshooting section** in the setup guide

### Common Mistakes:

- ❌ Didn't update unityAdsConfig.js
- ❌ Testing on web (Unity Ads only works on native)
- ❌ Forgot to run `npm install`
- ❌ Unity Ads account not set up
- ❌ Wrong Game IDs or Placement IDs

---

## ✅ Pre-Launch Checklist

Before submitting to app stores:

- [ ] Unity Ads account created and verified
- [ ] Game IDs configured in `unityAdsConfig.js`
- [ ] All Placement IDs configured correctly
- [ ] Firebase configuration updated
- [ ] App tested on real device
- [ ] Ads appearing correctly
- [ ] Production build successful
- [ ] Privacy policy updated with Unity Ads
- [ ] App tested thoroughly

---

## 🎉 You're Ready!

Your HabitOwl app now has Unity Ads integrated!

**Next Steps:**
1. Complete the configuration in `unityAdsConfig.js`
2. Test thoroughly
3. Build for production
4. Submit to app stores
5. Monitor revenue in Unity Dashboard

**Good luck with your app! 🚀**

---

## 📞 Technical Details

**Tech Stack:**
- React Native 0.74.5
- Expo SDK 51
- Unity Ads (ironSource Mediation) 3.1.0
- Firebase 10.13.2

**Minimum Requirements:**
- Android 5.0 (API 21+)
- iOS 13.0+
- Node.js 14+

---

**Version:** 2.3.0  
**Last Updated:** 2025  
**License:** MIT
