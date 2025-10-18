
## 🎯 For Non-Developers - Step by Step Guide

This guide will help you switch from Google AdMob to Unity Ads in your HabitOwl app. Follow each step carefully.

---

## 📋 What You'll Need

1. **Unity Dashboard Account** (Free - we'll create this)
2. **Your Computer** with Node.js installed
3. **About 30 minutes** of your time

---

## PART 1: Creating Unity Ads Account & Getting Your Keys

### Step 1: Create Unity Account

1. **Go to Unity Ads Dashboard:**
   - Open your browser
   - Visit: https://dashboard.unity3d.com/
   - Click **"Create a Unity ID"** (top right)

2. **Fill in your details:**
   - Email: Your email address
   - Password: Create a strong password
   - Username: Choose a username
   - Full Name: Your name
   - Click **"Create a Unity ID"**

3. **Verify your email:**
   - Check your email inbox
   - Click the verification link from Unity
   - Sign in to Unity Dashboard

### Step 2: Create Your App in Unity Ads

1. **Access Unity Ads:**
   - After logging in, click on **"Unity Ads"** in the left sidebar
   - If prompted, click **"Get Started"** or **"Set up Unity Ads"**

2. **Create New Project:**
   - Click **"Create Project"** or **"New Project"**
   - Name: `HabitOwl`
   - Click **"Create"**

3. **Add Your App:**
   - Click **"Add New App"** or **"Add App"**
   - Choose your platform first (you'll do this twice - once for Android, once for iOS)

4. **For Android:**
   - Platform: Select **"Android"**
   - App Name: `HabitOwl`
   - Google Play URL: Leave blank for now (or add if you have one)
   - Click **"Add App"**
   - **IMPORTANT:** Copy and save your **Android Game ID** (looks like: 1234567)

5. **For iOS (repeat the process):**
   - Click **"Add New App"** again
   - Platform: Select **"iOS"**
   - App Name: `HabitOwl`
   - App Store URL: Leave blank for now
   - Click **"Add App"**
   - **IMPORTANT:** Copy and save your **iOS Game ID** (looks like: 1234568)

### Step 3: Set Up Ad Placements

**For Android App:**

1. In Unity Dashboard, select your Android app
2. Go to **"Monetization"** → **"Ad Placements"**
3. You'll see some default placements. Note them down:
   - **Banner Placement ID** (usually: "Banner_Android" or "banner")
   - **Interstitial Placement ID** (usually: "Interstitial_Android" or "video")
   - **Rewarded Placement ID** (usually: "Rewarded_Android" or "rewardedVideo")

**For iOS App:**

1. Select your iOS app
2. Go to **"Monetization"** → **"Ad Placements"**
3. Note down the placements:
   - **Banner Placement ID**
   - **Interstitial Placement ID**
   - **Rewarded Placement ID**

### Step 4: Save Your Configuration

**Create a text file on your computer and save these details:**

```
UNITY ADS CONFIGURATION
========================

Android Game ID: [Your Android Game ID]
iOS Game ID: [Your iOS Game ID]

Android Placements:
- Banner: [Your Banner ID]
- Interstitial: [Your Interstitial ID]
- Rewarded: [Your Rewarded ID]

iOS Placements:
- Banner: [Your Banner ID]
- Interstitial: [Your Interstitial ID]
- Rewarded: [Your Rewarded ID]
```

**Example:**
```
Android Game ID: 1234567
iOS Game ID: 1234568

Android Placements:
- Banner: Banner_Android
- Interstitial: Interstitial_Android
- Rewarded: Rewarded_Android

iOS Placements:
- Banner: Banner_iOS
- Interstitial: Interstitial_iOS
- Rewarded: Rewarded_iOS
```

---

## PART 2: Installing the Updated App Package

### Step 1: Download and Extract

1. **Download the package:**
   - You'll receive a file called: `habitowl-unity-ads-package.zip`
   - Download it to your computer

2. **Extract the package:**
   - Right-click on the ZIP file
   - Select "Extract All" or "Unzip"
   - Choose a location (like your Desktop)

3. **You should see a folder called:** `habitowl-unity-ads`

### Step 2: Configure Your Unity Ads Keys

1. **Open the configuration file:**
   - Navigate to: `habitowl-unity-ads/src/config/`
   - Find file: `unityAdsConfig.js`
   - Open it with any text editor (Notepad, VS Code, etc.)

2. **Update the configuration:**
   - Find the section that says:
   ```javascript
   // REPLACE THESE WITH YOUR ACTUAL UNITY ADS IDs
   ANDROID_GAME_ID: 'YOUR_ANDROID_GAME_ID',
   IOS_GAME_ID: 'YOUR_IOS_GAME_ID',
   ```
   
   - Replace with your actual IDs:
   ```javascript
   ANDROID_GAME_ID: '1234567',  // Your actual Android Game ID
   IOS_GAME_ID: '1234568',      // Your actual iOS Game ID
   ```

3. **Update Ad Placement IDs:**
   - Scroll down to find:
   ```javascript
   ANDROID_BANNER: 'YOUR_ANDROID_BANNER_ID',
   ANDROID_INTERSTITIAL: 'YOUR_ANDROID_INTERSTITIAL_ID',
   ANDROID_REWARDED: 'YOUR_ANDROID_REWARDED_ID',
   
   IOS_BANNER: 'YOUR_IOS_BANNER_ID',
   IOS_INTERSTITIAL: 'YOUR_IOS_INTERSTITIAL_ID',
   IOS_REWARDED: 'YOUR_IOS_REWARDED_ID',
   ```
   
   - Replace with your actual Placement IDs:
   ```javascript
   ANDROID_BANNER: 'Banner_Android',
   ANDROID_INTERSTITIAL: 'Interstitial_Android',
   ANDROID_REWARDED: 'Rewarded_Android',
   
   IOS_BANNER: 'Banner_iOS',
   IOS_INTERSTITIAL: 'Interstitial_iOS',
   IOS_REWARDED: 'Rewarded_iOS',
   ```

4. **Save the file** (Ctrl+S or Cmd+S)

### Step 3: Replace Your Current App

1. **Backup your current app:**
   - Find your current `habitowl-app` folder
   - Right-click it and select "Copy"
   - Paste it somewhere safe (name it `habitowl-app-backup`)

2. **Replace with new version:**
   - Delete or rename your current `habitowl-app` folder
   - Copy the `habitowl-unity-ads` folder
   - Rename it to `habitowl-app`

### Step 4: Install Dependencies

1. **Open Terminal/Command Prompt:**
   - Windows: Press `Win + R`, type `cmd`, press Enter
   - Mac: Press `Cmd + Space`, type `Terminal`, press Enter

2. **Navigate to your app folder:**
   ```bash
   cd path/to/habitowl-app
   ```
   (Replace `path/to/` with your actual folder location)

3. **Install packages:**
   ```bash
   npm install
   ```
   
   **Wait for installation to complete** (may take 5-10 minutes)

### Step 5: Test Your App

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Test on your device:**
   - Scan the QR code with Expo Go app on your phone
   - Check if ads are loading (may take a few minutes for first load)

3. **Check for errors:**
   - Watch the terminal for any error messages
   - If you see errors, check the Troubleshooting section below

---

## PART 3: Building for Production

### For Android (Google Play Store)

1. **Open Terminal in your app folder**

2. **Login to Expo:**
   ```bash
   npx eas login
   ```

3. **Configure build (first time only):**
   ```bash
   npx eas build:configure
   ```

4. **Build for production:**
   ```bash
   npx eas build -p android --profile production
   ```

5. **Wait for build to complete** (15-30 minutes)

6. **Download your AAB file** from the link provided

### For iOS (App Store)

1. **Build for iOS:**
   ```bash
   npx eas build -p ios --profile production
   ```

2. **Wait for build to complete**

3. **Download your IPA file**

---

## 🔧 Troubleshooting

### Issue: "Module not found: ironsource-mediation"

**Solution:**
```bash
cd habitowl-app
npm install ironsource-mediation
npm start
```

### Issue: "Ads not showing"

**Possible causes:**

1. **Test Mode Active:**
   - Unity Ads may not show immediately in development
   - Try building a production version
   - Check Unity Dashboard to enable test ads

2. **Game ID Wrong:**
   - Double-check your Game IDs in `unityAdsConfig.js`
   - Make sure there are no extra spaces or quotes

3. **Placement ID Wrong:**
   - Verify placement IDs match exactly with Unity Dashboard
   - Check for typos

4. **Account Not Activated:**
   - New Unity Ads accounts may take 24 hours to activate
   - Check your Unity Dashboard for account status

### Issue: "Build fails with Unity Ads error"

**Solution:**
```bash
# Clean installation
rm -rf node_modules package-lock.json
npm install
npm start
```

### Issue: "Firebase config missing"

**Solution:**
- Make sure you copied your Firebase config from your backup
- Update `src/config/firebase.js` with your Firebase credentials

---

## 📊 Verifying Unity Ads Are Working

### In Development:

1. **Check Console Logs:**
   - Look for: `"Unity Ads initialized successfully"`
   - Look for: `"Banner ad loaded"`

2. **Test Ad Display:**
   - Navigate through your app
   - Ads should appear at the bottom of screens
   - Complete a habit to trigger interstitial ads

### In Unity Dashboard:

1. **Go to Unity Dashboard**
2. **Select your app**
3. **Go to "Statistics" or "Revenue"**
4. **Check for:**
   - Impressions (ad views)
   - Clicks
   - Revenue (after ads start serving)

---

## 💰 Revenue Settings

### Enable Real Ads (After Testing)

1. **In Unity Dashboard:**
   - Go to your app settings
   - Find "Test Mode" or "Development Mode"
   - **Disable it** to start serving real ads

2. **Payment Setup:**
   - Go to "Finance" or "Payouts"
   - Add your payment information
   - Set up bank account or PayPal

### Expected Revenue:

- **Banner Ads:** $0.50 - $2.00 per 1,000 impressions
- **Interstitial Ads:** $2.00 - $5.00 per 1,000 impressions
- **Rewarded Ads:** $5.00 - $15.00 per 1,000 impressions

---

## 📝 Important Files You Modified

Here are the files that were changed (for reference):

1. **package.json** - Added Unity Ads dependency
2. **src/config/unityAdsConfig.js** - NEW: Unity configuration
3. **src/services/UnityAdsService.js** - NEW: Unity Ads service
4. **src/components/UnityBannerAd.js** - NEW: Banner ad component
5. **src/hooks/useUnityInterstitialAd.js** - NEW: Interstitial ad hook
6. **src/hooks/useUnityRewardedAd.js** - NEW: Rewarded ad hook
7. **App.js** - Updated to initialize Unity Ads
8. **app.json** - Updated with Unity configuration

**Old Files Removed:**
- src/services/AdService.js (old Google AdMob)
- src/components/BannerAd.js (old AdMob banner)

---

## 🆘 Getting Help

### If you're stuck:

1. **Check the error message** in your terminal
2. **Look at the specific step** where you got stuck
3. **Try the troubleshooting section** for that error
4. **Re-read the instructions** for that step

### Common mistakes:

- ❌ Forgot to update unityAdsConfig.js with your IDs
- ❌ Copy-pasted IDs with extra spaces
- ❌ Didn't run `npm install`
- ❌ Using old folder instead of new package
- ❌ Firebase config not copied from backup

### Still stuck?

- Double-check you followed EVERY step
- Make sure your Unity Ads account is fully set up
- Verify your Game IDs and Placement IDs are correct
- Try starting fresh from Step 1 of Part 2

---

## ✅ Success Checklist

Before you're done, make sure:

- [ ] Unity Ads account created
- [ ] Android and iOS apps added in Unity Dashboard
- [ ] Game IDs copied and saved
- [ ] Ad Placement IDs copied and saved
- [ ] Package downloaded and extracted
- [ ] unityAdsConfig.js updated with your IDs
- [ ] App folder replaced with new package
- [ ] `npm install` completed successfully
- [ ] App starts without errors
- [ ] Can see "Unity Ads initialized" in console
- [ ] Ads appear in the app (may take a few tries)
- [ ] App builds successfully for production

---

## 🎉 You're Done!

Your app now uses Unity Ads instead of Google AdMob!

**Next steps:**
1. Test thoroughly on your device
2. Build production version
3. Enable real ads in Unity Dashboard
4. Submit to app stores
5. Monitor revenue in Unity Dashboard

**Good luck with your app! 🚀**
