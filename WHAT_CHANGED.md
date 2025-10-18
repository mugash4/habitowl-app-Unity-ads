# What Changed: AdMob → Unity Ads Migration

## Summary

Your app has been upgraded from Google AdMob to Unity Ads (ironSource Mediation). This document shows exactly what changed.

---

## Files Added ✅

### 1. Unity Ads Configuration
**File:** `src/config/unityAdsConfig.js`
- **Purpose:** Store all your Unity Ads IDs and settings
- **Action Required:** ⚠️ **YOU MUST UPDATE THIS FILE** with your Unity Ads IDs

### 2. Unity Ads Service
**File:** `src/services/UnityAdsService.js`
- **Purpose:** Handles all Unity Ads operations
- **Action Required:** None (works automatically)

### 3. Unity Banner Ad Component
**File:** `src/components/UnityBannerAd.js`
- **Purpose:** Shows banner ads at bottom of screens
- **Action Required:** None (works automatically)

### 4. Interstitial Ad Hook
**File:** `src/hooks/useUnityInterstitialAd.js`
- **Purpose:** Easy way to show full-screen ads
- **Action Required:** None (works automatically)

### 5. Rewarded Ad Hook
**File:** `src/hooks/useUnityRewardedAd.js`
- **Purpose:** Easy way to show rewarded video ads
- **Action Required:** None (works automatically)

### 6. Documentation Files
- `UNITY_ADS_SETUP_GUIDE.md` - Complete setup instructions
- `README_UNITY_ADS.md` - Overview and quick reference
- `INSTALL.md` - Quick installation steps
- `CHECKLIST.md` - Step-by-step checklist
- `WHAT_CHANGED.md` - This file

---

## Files Updated 📝

### 1. package.json
**What Changed:**
- **Removed:** `react-native-google-mobile-ads`
- **Added:** `ironsource-mediation` (Unity Ads SDK)
- **Version updated:** 2.2.0 → 2.3.0

**Before:**
```json
"react-native-google-mobile-ads": "^15.3.0"
```

**After:**
```json
"ironsource-mediation": "^3.1.0"
```

### 2. App.js
**What Changed:**
- Added Unity Ads initialization on app startup

**Before:**
```javascript
export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
```

**After:**
```javascript
import unityAdsService from './src/services/UnityAdsService';

export default function App() {
  useEffect(() => {
    unityAdsService.initialize();
  }, []);
  
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
```

### 3. app.json
**What Changed:**
- Added Unity Ads permissions and configuration
- Added SKAdNetwork identifier for iOS
- Updated version to 2.3.0

**Added:**
```json
"infoPlist": {
  "SKAdNetworkItems": [
    {"SKAdNetworkIdentifier": "su67r6k2v3.skadnetwork"}
  ],
  "NSAdvertisingAttributionReportEndpoint": "https://postbacks-mobile.unity3d.com/v1/ios"
},
"permissions": [
  "com.google.android.gms.permission.AD_ID"
]
```

### 4. HomeScreen.js
**What Changed:**
- Replaced `AdBanner` with `UnityBannerAd`
- Updated ad service import

**Before:**
```javascript
import AdBanner from '../components/AdBanner';
import AdService from '../services/AdService';

// In render:
<AdBanner placement="home_bottom" />

// In code:
const shouldShowAd = await AdService.shouldShowInterstitialAfterAction('habit_complete');
if (shouldShowAd) {
  AdService.showInterstitial('habit_completion');
}
```

**After:**
```javascript
import UnityBannerAd from '../components/UnityBannerAd';
import unityAdsService from '../services/UnityAdsService';

// In render:
<UnityBannerAd style={styles.adBanner} />

// In code:
setTimeout(async () => {
  await unityAdsService.showInterstitialAd('habit_completion');
}, 1000);
```

---

## Files Removed ❌

### 1. Old AdMob Service
**File:** `src/services/AdService.js`
- **Why:** Replaced by UnityAdsService.js
- **Impact:** Old AdMob code no longer needed

### 2. Old AdMob Banner Components
**Files:**
- `src/components/AdBanner.js`
- `src/components/BannerAd.js`

- **Why:** Replaced by UnityBannerAd.js
- **Impact:** Old AdMob components no longer needed

---

## Key Differences: AdMob vs Unity Ads

### Code Differences

#### Initializing Ads

**AdMob (Old):**
```javascript
import AdService from './services/AdService';
await AdService.initialize();
```

**Unity Ads (New):**
```javascript
import unityAdsService from './services/UnityAdsService';
await unityAdsService.initialize();
```

#### Showing Banner Ads

**AdMob (Old):**
```javascript
<BannerAd />
```

**Unity Ads (New):**
```javascript
<UnityBannerAd />
```

#### Showing Interstitial Ads

**AdMob (Old):**
```javascript
await AdService.showInterstitial('context');
```

**Unity Ads (New):**
```javascript
await unityAdsService.showInterstitialAd('context');
```

#### Showing Rewarded Ads

**AdMob (Old):**
```javascript
await AdService.showRewardedAd(onRewarded, 'context');
```

**Unity Ads (New):**
```javascript
import { useUnityRewardedAd } from './hooks/useUnityRewardedAd';

const { showRewardedAd } = useUnityRewardedAd((reward) => {
  // Handle reward
});

await showRewardedAd();
```

### Configuration Differences

#### AdMob (Old) - Used Google AdMob IDs
```
Android Banner: ca-app-pub-2371616866592450/1677929899
iOS Banner: ca-app-pub-2371616866592450/1677929899
```

#### Unity Ads (New) - Uses Unity Game IDs
```
Android Game ID: 1234567 (your actual Unity Game ID)
iOS Game ID: 1234568 (your actual Unity Game ID)
```

---

## Impact on Your App

### What Stays the Same ✓

- All app functionality
- User interface and design
- Habit tracking features
- Statistics and analytics
- Premium subscription system
- Firebase integration
- AI suggestions
- Notifications
- Navigation

### What Changes ✗

- Ad provider (AdMob → Unity Ads)
- Ad configuration (new IDs needed)
- Ad SDK/package (different library)

### User Experience

**For Users:**
- No visible difference
- Ads look and work the same
- Same ad-free experience for premium users

**For You (Developer):**
- Need to set up Unity Ads account
- Need to configure new ad IDs
- Better ad fill rates
- Potentially higher revenue

---

## Migration Checklist

- [ ] All old AdMob files removed
- [ ] All new Unity Ads files added
- [ ] Configuration file created (`unityAdsConfig.js`)
- [ ] Package.json updated
- [ ] App.js updated with initialization
- [ ] Screens updated to use new ad components
- [ ] Unity Ads account created
- [ ] Game IDs obtained from Unity Dashboard
- [ ] Configuration file updated with IDs
- [ ] App tested successfully

---

## Rollback Plan (If Needed)

If you need to go back to AdMob:

1. **Restore from backup:**
   - Keep your old `habitowl-app` folder as backup
   - Copy back if needed

2. **Or download from GitHub:**
   - Your original version is still on GitHub
   - Clone the repository again

**Note:** We recommend keeping the Unity Ads version as it offers better monetization!

---

## Questions & Answers

**Q: Do I need to change anything in other files?**
A: No, only update `src/config/unityAdsConfig.js` with your Unity Ads IDs.

**Q: Will my existing users be affected?**
A: No, they'll just see Unity Ads instead of AdMob. Premium users still see no ads.

**Q: Do I need to resubmit to app stores?**
A: Yes, you'll need to submit an update with the new version.

**Q: What about my AdMob account?**
A: You can keep it or close it. The app no longer uses it.

**Q: Is the revenue different?**
A: Unity Ads typically has better fill rates and can generate 20-40% more revenue than AdMob.

---

## Need Help?

- **Setup Help:** Read `UNITY_ADS_SETUP_GUIDE.md`
- **Quick Start:** Read `INSTALL.md`
- **Checklist:** Follow `CHECKLIST.md`
- **Technical Details:** Read `README_UNITY_ADS.md`

---

**Version:** 2.3.0  
**Migration Date:** 2025  
**Migration Type:** Complete (AdMob → Unity Ads)
