# Migration Guide: expo-ads-google-admob → react-native-google-mobile-ads

## 🔄 Why This Migration?

The `expo-ads-google-admob` package was **deprecated** by Expo team and is no longer maintained or available on npm. The replacement `react-native-google-mobile-ads` is:

- ✅ Actively maintained by Invertase (trusted React Native library developers)
- ✅ More features and better performance
- ✅ Better documentation and community support
- ✅ Compatible with latest Expo SDK and React Native versions
- ✅ Supports newer Google Mobile Ads SDK features

---

## 📊 API Changes Comparison

### Import Statements

**OLD (expo-ads-google-admob):**
```javascript
import { 
  BannerAd, 
  InterstitialAd, 
  RewardedInterstitialAd,
  TestIds,
  AdEventType,
  BannerAdSize
} from 'expo-ads-google-admob';
```

**NEW (react-native-google-mobile-ads):**
```javascript
import mobileAds, {
  BannerAd,
  BannerAdSize,
  TestIds,
  InterstitialAd,
  RewardedInterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
```

---

### Initialization

**OLD:**
```javascript
// No explicit initialization needed
```

**NEW:**
```javascript
await mobileAds().initialize();
```

---

### Banner Ad Props

**OLD:**
```javascript
<BannerAd
  adUnitID="ca-app-pub-xxxxx"
  size={BannerAdSize.FULL_BANNER}
  onDidFailToReceiveAdWithError={(error) => {}}
  onAdViewDidReceiveAd={() => {}}
/>
```

**NEW:**
```javascript
<BannerAd
  unitId="ca-app-pub-xxxxx"
  size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
  onAdFailedToLoad={(error) => {}}
  onAdLoaded={() => {}}
/>
```

**Key Changes:**
- `adUnitID` → `unitId`
- `onDidFailToReceiveAdWithError` → `onAdFailedToLoad`
- `onAdViewDidReceiveAd` → `onAdLoaded`
- Recommended to use `ANCHORED_ADAPTIVE_BANNER` for better responsiveness

---

### Interstitial Ads

**OLD:**
```javascript
const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: false,
});

if (interstitial.isLoaded) {
  await interstitial.show();
}
```

**NEW:**
```javascript
const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: false,
});

if (interstitial.loaded) {  // Changed from isLoaded to loaded
  await interstitial.show();
}
```

**Key Changes:**
- `isLoaded` property → `loaded` property

---

### Event Listeners

**OLD:**
```javascript
interstitial.addAdEventListener(AdEventType.LOADED, () => {});
interstitial.addAdEventListener(AdEventType.ERROR, (error) => {});
interstitial.addAdEventListener(AdEventType.OPENED, () => {});
interstitial.addAdEventListener(AdEventType.CLOSED, () => {});
```

**NEW:**
```javascript
// Same API - No changes needed!
interstitial.addAdEventListener(AdEventType.LOADED, () => {});
interstitial.addAdEventListener(AdEventType.ERROR, (error) => {});
interstitial.addAdEventListener(AdEventType.OPENED, () => {});
interstitial.addAdEventListener(AdEventType.CLOSED, () => {});
```

---

### App.json Configuration

**OLD:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-ads-google-admob",
        {
          "androidAppId": "ca-app-pub-xxxxx~xxxxx",
          "iosAppId": "ca-app-pub-xxxxx~xxxxx"
        }
      ]
    ]
  }
}
```

**NEW:**
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMobileAdsAppId": "ca-app-pub-xxxxx~xxxxx"
      }
    },
    "android": {
      "config": {
        "googleMobileAdsAppId": "ca-app-pub-xxxxx~xxxxx"
      }
    },
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxx~xxxxx",
          "iosAppId": "ca-app-pub-xxxxx~xxxxx"
        }
      ]
    ]
  }
}
```

---

## 🛠️ Step-by-Step Migration Process

### 1. Update package.json

Remove old dependency:
```bash
npm uninstall expo-ads-google-admob
```

Install new dependency:
```bash
npm install react-native-google-mobile-ads
```

### 2. Update app.json

See the configuration changes above.

### 3. Update Imports

Find and replace in all files:
```javascript
// OLD
from 'expo-ads-google-admob'

// NEW
from 'react-native-google-mobile-ads'
```

### 4. Add Initialization

In your main App.js or where you initialize services:
```javascript
import mobileAds from 'react-native-google-mobile-ads';

// Before using any ads
await mobileAds().initialize();
```

### 5. Update Banner Components

Replace prop names:
- `adUnitID` → `unitId`
- `onDidFailToReceiveAdWithError` → `onAdFailedToLoad`
- `onAdViewDidReceiveAd` → `onAdLoaded`

### 6. Update Interstitial Logic

Replace property:
- `interstitial.isLoaded` → `interstitial.loaded`

### 7. Test Thoroughly

```bash
npm start
```

Test all ad types:
- Banner ads
- Interstitial ads
- Rewarded ads

---

## 🧪 Testing Checklist

After migration, verify:

- [ ] Banner ads display correctly
- [ ] Interstitial ads load and show
- [ ] Rewarded ads work and trigger rewards
- [ ] Test IDs work in development
- [ ] Production IDs configured (for release)
- [ ] No console errors or warnings
- [ ] Ads respect premium user status
- [ ] Ad frequency limits work correctly
- [ ] Error handling works properly

---

## 🚨 Common Migration Issues

### Issue 1: "Module not found"
**Solution:** Clear cache and reinstall
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue 2: "isLoaded is not a function"
**Solution:** Change `isLoaded` to `loaded`
```javascript
// OLD
if (interstitial.isLoaded) {}

// NEW
if (interstitial.loaded) {}
```

### Issue 3: "adUnitID prop not recognized"
**Solution:** Change to `unitId`
```javascript
// OLD
<BannerAd adUnitID="..." />

// NEW
<BannerAd unitId="..." />
```

### Issue 4: Ads not showing
**Solution:** 
1. Check if SDK is initialized: `await mobileAds().initialize()`
2. Verify AdMob IDs are correct
3. Wait 24 hours after creating new ad units
4. Use test IDs during development

---

## 📈 Performance Improvements

The new SDK offers:

1. **Better Banner Sizes**
   - `ANCHORED_ADAPTIVE_BANNER` - Automatically adjusts to screen size
   - Better fill rates and revenue

2. **Improved Loading**
   - Faster ad loading times
   - Better caching mechanism
   - More efficient memory usage

3. **Enhanced Error Reporting**
   - More detailed error messages
   - Better debugging capabilities
   - Improved logging

---

## 💰 Revenue Impact

**No negative impact!** Your existing:
- AdMob account
- Ad unit IDs
- Revenue tracking
- Payment methods

All continue to work exactly the same. This is purely a technical SDK update.

---

## 🔗 Useful Links

### Documentation
- [react-native-google-mobile-ads Docs](https://docs.page/invertase/react-native-google-mobile-ads)
- [Google Mobile Ads SDK](https://developers.google.com/admob/android/quick-start)
- [Expo Config Plugin](https://docs.expo.dev/versions/latest/sdk/google-mobile-ads/)

### GitHub
- [react-native-google-mobile-ads Repo](https://github.com/invertase/react-native-google-mobile-ads)
- [Issue Tracker](https://github.com/invertase/react-native-google-mobile-ads/issues)

### Community
- [Discord Server](https://discord.gg/C9aK28N)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native-google-mobile-ads)

---

## ✅ Migration Complete!

Once you've completed all steps:

1. Test the app thoroughly
2. Check all ad placements
3. Verify ad revenue tracking
4. Deploy to production when ready

**The migration is complete when:**
- ✅ No errors during `npm install`
- ✅ App starts without warnings
- ✅ All ad types load and display
- ✅ Test ads show "Test Ad" label
- ✅ Premium users see no ads

---

**Happy coding! 🎉**
