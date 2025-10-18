# HabitOwl Unity Ads - Setup Checklist

## Before You Start

- [ ] I have Node.js installed on my computer
- [ ] I have downloaded and extracted this package
- [ ] I have read INSTALL.md or UNITY_ADS_SETUP_GUIDE.md
- [ ] I understand I need to get Unity Ads IDs

---

## Part 1: Unity Ads Account Setup

### Creating Account
- [ ] Visited https://dashboard.unity3d.com/
- [ ] Created Unity account or logged in
- [ ] Email verified

### Creating Project
- [ ] Created new project named "HabitOwl"
- [ ] Project is visible in Unity Dashboard

### Adding Android App
- [ ] Added Android app to project
- [ ] App name: HabitOwl
- [ ] **Android Game ID copied and saved**
- [ ] Noted Android Banner Placement ID
- [ ] Noted Android Interstitial Placement ID
- [ ] Noted Android Rewarded Placement ID

### Adding iOS App
- [ ] Added iOS app to project
- [ ] App name: HabitOwl
- [ ] **iOS Game ID copied and saved**
- [ ] Noted iOS Banner Placement ID
- [ ] Noted iOS Interstitial Placement ID
- [ ] Noted iOS Rewarded Placement ID

### My Unity Ads Configuration:

```
Android Game ID: ____________________
iOS Game ID: ____________________

Android Placements:
- Banner: ____________________
- Interstitial: ____________________
- Rewarded: ____________________

iOS Placements:
- Banner: ____________________
- Interstitial: ____________________
- Rewarded: ____________________
```

---

## Part 2: App Configuration

### File Updates
- [ ] Opened `src/config/unityAdsConfig.js`
- [ ] Replaced `YOUR_ANDROID_GAME_ID` with my actual Android Game ID
- [ ] Replaced `YOUR_IOS_GAME_ID` with my actual iOS Game ID
- [ ] Replaced Android Banner Placement ID
- [ ] Replaced Android Interstitial Placement ID
- [ ] Replaced Android Rewarded Placement ID
- [ ] Replaced iOS Banner Placement ID
- [ ] Replaced iOS Interstitial Placement ID
- [ ] Replaced iOS Rewarded Placement ID
- [ ] **Saved the file**
- [ ] No typos or extra spaces in IDs

### Firebase Configuration (if needed)
- [ ] Have Firebase credentials
- [ ] Updated `src/config/firebase.js` (if needed)

---

## Part 3: Installation

### Installing Dependencies
- [ ] Opened Terminal/Command Prompt
- [ ] Navigated to app folder: `cd habitowl-unity-ads`
- [ ] Ran `npm install`
- [ ] Installation completed without errors
- [ ] No "peer dependency" errors

---

## Part 4: Testing

### Development Testing
- [ ] Ran `npm start`
- [ ] App started without errors
- [ ] QR code appeared
- [ ] Scanned QR code with Expo Go app
- [ ] App loaded on my device
- [ ] Saw "Unity Ads initialized" in console
- [ ] Saw "Banner ad loaded" in console
- [ ] Banner ads visible in app
- [ ] Completed a habit to test interstitial ad

### Checking for Errors
- [ ] No red error messages in Terminal
- [ ] No error messages in Expo Go app
- [ ] App navigates smoothly between screens
- [ ] All features working as expected

---

## Part 5: Production Build

### EAS Build Setup
- [ ] Ran `npx eas login`
- [ ] Logged in successfully
- [ ] Ran `npx eas build:configure` (first time only)
- [ ] Configuration file created

### Building Android
- [ ] Ran `npx eas build -p android --profile production`
- [ ] Build queued successfully
- [ ] Waited for build to complete (15-30 minutes)
- [ ] Downloaded AAB file
- [ ] Tested AAB file on device

### Building iOS (if needed)
- [ ] Ran `npx eas build -p ios --profile production`
- [ ] Build queued successfully
- [ ] Waited for build to complete
- [ ] Downloaded IPA file
- [ ] Tested IPA file on device

---

## Part 6: Final Checks

### Unity Dashboard
- [ ] Logged into Unity Dashboard
- [ ] Can see my apps (Android & iOS)
- [ ] Ad placements are visible
- [ ] Test mode is enabled (for testing)

### App Verification
- [ ] App installs successfully
- [ ] All features work correctly
- [ ] Ads are loading (may take first few tries)
- [ ] Premium features work
- [ ] Habit tracking works
- [ ] Statistics show correctly
- [ ] AI suggestions work (if configured)

### Pre-Launch
- [ ] Test mode will be disabled after testing
- [ ] Privacy policy updated with Unity Ads mention
- [ ] Terms of service updated
- [ ] App store listings prepared
- [ ] Screenshots ready
- [ ] App description ready

---

## Troubleshooting Reference

If you checked a box but it didn't work:

- **Unity Ads not initializing:**
  → Verify Game IDs in `unityAdsConfig.js`
  
- **Ads not showing:**
  → Check Placement IDs match Unity Dashboard
  
- **Build fails:**
  → Run `rm -rf node_modules package-lock.json && npm install`
  
- **Module not found:**
  → Run `npm install ironsource-mediation`
  
- **Firebase error:**
  → Update Firebase config in `src/config/firebase.js`

For detailed troubleshooting:
→ See **UNITY_ADS_SETUP_GUIDE.md**

---

## Success! 🎉

When all boxes are checked, you're ready to:

1. **Disable test mode** in Unity Dashboard
2. **Submit to app stores**
3. **Monitor revenue** in Unity Dashboard
4. **Celebrate your launch!** 🚀

---

**Remember:** Unity Ads may take 24-48 hours to show real ads after account activation. Test ads should work immediately.

**Good luck!** 💪
