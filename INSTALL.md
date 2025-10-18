# Quick Installation Guide

## For Non-Developers - Simple Steps

### Step 1: Get Your Unity Ads IDs

1. Go to https://dashboard.unity3d.com/
2. Create account or login
3. Create new project: "HabitOwl"
4. Add Android app → Copy Game ID
5. Add iOS app → Copy Game ID
6. Copy Ad Placement IDs (Banner, Interstitial, Rewarded)

**Save these IDs somewhere safe!**

---

### Step 2: Configure the App

1. Open file: `src/config/unityAdsConfig.js`

2. Replace these lines:
   ```javascript
   ANDROID_GAME_ID: 'YOUR_ANDROID_GAME_ID',
   IOS_GAME_ID: 'YOUR_IOS_GAME_ID',
   ```
   
   With your actual Game IDs:
   ```javascript
   ANDROID_GAME_ID: '1234567',  // Your actual ID
   IOS_GAME_ID: '1234568',      // Your actual ID
   ```

3. Replace the Placement IDs too:
   ```javascript
   ANDROID_BANNER: 'Banner_Android',
   ANDROID_INTERSTITIAL: 'Interstitial_Android',
   ANDROID_REWARDED: 'Rewarded_Android',
   
   IOS_BANNER: 'Banner_iOS',
   IOS_INTERSTITIAL: 'Interstitial_iOS',
   IOS_REWARDED: 'Rewarded_iOS',
   ```

4. Save the file

---

### Step 3: Install and Run

Open Terminal/Command Prompt and run:

```bash
# Go to app folder
cd habitowl-unity-ads

# Install packages (wait 5-10 minutes)
npm install

# Start the app
npm start
```

---

### Step 4: Test

1. Scan QR code with Expo Go app
2. Check if app loads
3. Look for "Unity Ads initialized" in terminal
4. Navigate through app to see ads

---

## That's It! 🎉

For detailed help, see: **UNITY_ADS_SETUP_GUIDE.md**

---

## Quick Troubleshooting

**Ads not showing?**
→ Check if you updated `unityAdsConfig.js` with your IDs

**npm install fails?**
→ Make sure Node.js is installed

**App won't start?**
→ Run: `npm start -- --clear`

**Still stuck?**
→ Read the full guide: `UNITY_ADS_SETUP_GUIDE.md`
