🔧 Troubleshooting Guide - HabitOwl
Common issues and their solutions. Copy and paste the fixes!

🚨 Installation Issues
Problem: "npm install" fails with errors
Solution:

Copy# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
Problem: Node version mismatch errors
You have Node v20.18.0 which is perfect! If you see warnings:

Copy# Check your Node version
node --version

# Should show: v20.18.0
If different: Reinstall Node.js v20.18.0 from https://nodejs.org

Problem: "Module not found" errors
Solution:

Copy# Reinstall dependencies
npm install

# Clear Expo cache and restart
npx expo start -c
🔥 Firebase Issues
Problem: "Firebase not initialized" error
Check these:

Config file: Open src/config/firebase.js
Verify: Your Firebase config is filled in (not placeholder values)
Project ID: Must match your Firebase Console project
Fix:

Copy// src/config/firebase.js
const firebaseConfig = {
  apiKey: "AIza...", // Real value, not "your-api-key"
  authDomain: "habitowl-3405d.firebaseapp.com",
  projectId: "habitowl-3405d", // Must match Firebase Console
  // ... other real values
};
Problem: Admin panel not showing after login
Causes:

Email in Firestore doesn't match login email
Email is case-sensitive
Solution:

Go to Firebase Console → Firestore
Open admin_config/settings
Check admin_emails array
Must exactly match your login email (including capitalization)
Example:

❌ Wrong: Admin@Email.com (in Firestore) vs admin@email.com (login)
✅ Right: admin@email.com (both match exactly)
Problem: "Permission denied" errors in Firestore
Solution: Update Firestore rules

Firebase Console → Firestore Database → Rules tab
Replace all content with the rules from SETUP_GUIDE.md Part 3F
Publish
🌐 Deployment Issues
Problem: "firebase deploy" fails
Solution 1 - Not logged in:

Copyfirebase logout
firebase login
firebase deploy
Solution 2 - Wrong project:

Copy# Check current project
firebase projects:list

# Set correct project
firebase use habitowl-3405d
firebase deploy
Solution 3 - Build not created:

Copy# Rebuild first
npm run build:web
firebase deploy
Problem: Deployed site shows blank page
Causes:

Firebase config not set correctly
Build failed but you didn't notice
Solution:

Copy# Delete old build
rm -rf dist

# Rebuild
npm run build:web

# Check for errors in output
# If no errors, deploy
firebase deploy
Test locally first:

Copy# After build
npx serve dist

# Open: http://localhost:3000
# Should see your app working
📱 EAS Build Issues
Problem: "eas build" fails
Solution 1 - Not logged in:

Copyeas logout
eas login
eas build -p android --profile preview
Solution 2 - Project not configured:

Copyeas build:configure
eas build -p android --profile preview
Solution 3 - Check logs:

Copy# EAS gives you a build URL
# Click it to see detailed error logs
Problem: Built APK won't install on phone
Causes:

"Install from Unknown Sources" disabled
Corrupted download
Solution:

Android phone:
1. Settings → Security
2. Enable "Unknown Sources" or "Install Unknown Apps"
3. Allow your browser/file manager to install apps

Then re-download and install the APK
Problem: "eas login" asks for credentials but fails
Solution:

Copy# Create Expo account first
# Go to: https://expo.dev
# Sign up for free

# Then login
eas login
🤖 AI/API Issues
Problem: AI coaching not working
Check:

DeepSeek API key is added through admin panel
You have credit in your DeepSeek account ($2 minimum)
API key is set as "default"
Solution:

Admin panel → API Configuration
Verify: DeepSeek key is there and marked as default
Test: Go to DeepSeek dashboard (platform.deepseek.com)
Check: Account balance > $0
If still failing:

Copy# Check browser console for errors
# In browser: Press F12 → Console tab
# Try AI feature → Look for error messages
🎨 AdMob Issues
Problem: Ads not showing in the app
This is NORMAL during testing!

Why:

AdMob uses test ads initially
Real ads need app approval (takes days)
Test ads might not always load
To see test ads:

Open: src/services/AdService.js
Verify: You're using test ad unit IDs OR your real IDs
Test ads: Only show on real devices (not simulators)
Real ads will show after:

App is approved by AdMob (~24 hours)
App has some traffic
Ad units are verified
💳 Premium Subscription Issues
Problem: Premium upgrade not working
This requires additional setup:

Premium subscriptions need:

Google Play Developer account ($25)
App published to Play Store
In-app products configured in Play Console
For now: Premium features are configured but payment processing needs Play Store setup.

🔐 Authentication Issues
Problem: Google Sign-In not working
Causes:

Google auth not enabled in Firebase
SHA-1 certificate not added (for Android)
Solution for Web:

Firebase Console → Authentication
Sign-in method → Google
Enable → Add your email → Save
Solution for Android (after EAS build):

Copy# Get your SHA-1 certificate
eas credentials

# Copy the SHA-1 hash
# Add it to Firebase Console:
# Project Settings → Your apps → Android app → Add fingerprint
🐛 General App Issues
Problem: App crashes on startup
Check:

Copy# View error logs
npx expo start

# Or for built app
adb logcat
Common fixes:

Copy# Clear everything and rebuild
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npx expo start -c
Problem: "Expo Go" shows errors
Important: This is an Expo managed project with EAS Build

❌ Don't use Expo Go app for testing
✅ Use EAS Build to create APK/AAB

Why: Expo Go has limitations with native modules (like AdMob)

Solution:

Copy# Always build with EAS
eas build -p android --profile preview

# Then install the APK on your phone
📊 Performance Issues
Problem: Web app loads slowly
Solutions:

Copy# Optimize build
npm run build:web

# The built files in /dist are optimized
# Firebase Hosting serves them with CDN (automatically fast)
Problem: Mobile app is slow
Check:

Test on actual device (not emulator)
Use production build (not preview)
Copy# Build optimized version
eas build -p android --profile production
🆘 Still Having Issues?
Check These First:
Node.js: v20.18.0 installed
Dependencies: npm install ran successfully
Firebase: Config filled in correctly
Internet: Stable connection
Browser Console: Press F12, check for errors
Get Specific Error Messages:
In browser:

Press F12 → Console tab → Look for red error messages
In terminal:

Copy# Run with verbose logging
npm start
# Watch for error messages
🎯 Quick Diagnostic Commands
Copy and run these to check your setup:

Copy# Check versions
node --version          # Should be v20.18.0
npm --version           # Should be 10.x.x
firebase --version      # Should be installed
eas --version           # Should be installed

# Check project
cd habitowl-app-Unity-ads
ls                      # Should see package.json, App.js, etc.

# Check dependencies
npm list --depth=0      # Shows installed packages

# Check Firebase project
firebase projects:list  # Shows your Firebase projects
📚 Additional Resources
Expo Docs: https://docs.expo.dev
Firebase Docs: https://firebase.google.com/docs
EAS Build: https://docs.expo.dev/build/introduction/
Node.js: https://nodejs.org
Most issues are fixed by:

Clearing cache: npm cache clean --force
Reinstalling: rm -rf node_modules && npm install
Restarting: npx expo start -c
If nothing works: Delete the entire project folder, re-download, and start fresh!