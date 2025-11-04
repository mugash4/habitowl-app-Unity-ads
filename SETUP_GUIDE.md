🛠️ Complete Setup Guide - HabitOwl
For Non-Developers | Node.js v20.18.0 | Expo Managed Project

This guide will take you from zero to a deployed app in ~80 minutes. Just copy and paste the commands!

📋 What You Already Have ✅
Node.js v20.18.0 installed
Git installed
VS Code installed
A computer (Windows/Mac/Linux)
🎯 Part 1: Install Global Tools (5 minutes)
Open your terminal (in VS Code: Terminal → New Terminal) and run:

Copy# Install Firebase CLI
npm install -g firebase-tools

# Install EAS CLI (for building mobile app)
npm install -g eas-cli

# Verify installations
firebase --version
eas --version
node --version
Expected output: You should see version numbers for all three commands.

📦 Part 2: Set Up Project (10 minutes)
Copy# Clone or navigate to your project
cd habitowl-app-Unity-ads

# Install all dependencies
npm install

# This takes 2-3 minutes
# You'll see: "added XXX packages" when done
✅ Success: No error messages, just dependency installation logs.

🔥 Part 3: Configure Firebase (15 minutes)
A. Create Firebase Project
Go to: https://console.firebase.google.com
Click "Add project"
Project name: habitowl (or any name)
Firebase will add random digits: e.g., habitowl-3405d
This is normal and fine!
Disable Google Analytics (optional) → Create project
Wait 30 seconds for project creation
B. Get Firebase Config
In Firebase Console → Project Settings (⚙️ gear icon)
Scroll to "Your apps" section
Click "Web" button (</>)
App nickname: HabitOwl Web
✅ Check: "Also set up Firebase Hosting"
Click "Register app"
Copy the entire firebaseConfig object
C. Update Your App Config
Open: src/config/firebase.js in VS Code
Replace lines with your config:
Copyconst firebaseConfig = {
  apiKey: "YOUR-ACTUAL-API-KEY",
  authDomain: "habitowl-XXXXX.firebaseapp.com",
  projectId: "habitowl-XXXXX",
  storageBucket: "habitowl-XXXXX.appspot.com",
  messagingSenderId: "YOUR-SENDER-ID",
  appId: "YOUR-APP-ID"
};
Save the file (Ctrl+S or Cmd+S)
D. Enable Authentication
Firebase Console → Authentication → Get started
Sign-in method tab
Email/Password: Click → Enable → Save
Google: Click → Enable → Add support email → Save
E. Create Firestore Database
Firebase Console → Firestore Database → Create database
Start in production mode → Next
Select location (choose closest to you) → Enable
Wait 30 seconds for database creation
F. Update Firestore Security Rules
Firestore Database → Rules tab
Replace all content with:
Copyrules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin config - only admins can read
    match /admin_config/{document=**} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/admin_config/settings).data.admin_emails.hasAny([request.auth.token.email]);
      allow write: if false;
    }
    
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Habits - users can only access their own
    match /habits/{habitId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Support tickets
    match /support_tickets/{ticketId} {
      allow read, write: if request.auth != null;
    }
  }
}
Publish the rules
G. Set Up Admin Access
Firestore Database → Data tab
Start collection: admin_config
Document ID: settings
Add fields:
Field Name	Type	Value
admin_emails	array	Click "Add string" → enter YOUR email
api_keys	map	Leave empty {}
Save
⚠️ Important: Use the EXACT email you'll use to sign up in the app!

🤖 Part 4: Get DeepSeek API Key (5 minutes)
Go to: https://platform.deepseek.com
Sign up (free)
Click "API Keys" → "Create new key"
Copy the key (starts with sk-)
Add $2 credit to your account:
Click "Billing" → "Add Credit"
Minimum: $2
Save this key somewhere - you'll add it later through the admin panel
Cost: $2 covers ~1000 AI coaching requests (several months of testing)

🌐 Part 5: Deploy Web Version (15 minutes)
A. Build Your App
Copy# In your project folder
npm run build:web
Wait 2-3 minutes. You'll see a dist folder created.

B. Login to Firebase
Copyfirebase login
Your browser will open → Sign in with your Google account → Allow access

C. Initialize Firebase Hosting
Copyfirebase init
Follow these prompts exactly:

? Which Firebase features? 
→ Select: Hosting (press SPACE to select, then ENTER)

? Please select an option:
→ Select: Use an existing project
→ Press ENTER

? Select a default Firebase project:
→ Select your project (e.g., habitowl-3405d)
→ Press ENTER

? What do you want to use as your public directory?
→ Type: dist
→ Press ENTER

? Configure as a single-page app?
→ Type: y
→ Press ENTER

? Set up automatic builds and deploys with GitHub?
→ Type: n
→ Press ENTER

? File dist/index.html already exists. Overwrite?
→ Type: N
→ Press ENTER
D. Deploy!
Copyfirebase deploy
Wait 1-2 minutes. You'll see:

✔ Deploy complete!

Hosting URL: https://habitowl-XXXXX.web.app
🎉 Your web app is now LIVE!

✅ Part 6: Test Your App (10 minutes)
A. Visit Your App
Open your hosting URL: https://habitowl-XXXXX.web.app

B. Create Admin Account
Click "Sign Up"
Use the EXACT email you added to admin_emails
Create password → Sign up
You should see: "Admin" tab in the navigation
If no Admin tab appears: Your email doesn't match. Check Firestore admin_emails.

C. Add API Key Through Admin Panel
Click "Admin" tab
API Configuration section
Add New API Key:
Provider: deepseek
API Key: [paste your DeepSeek key]
Model: deepseek-chat
✅ Check: "Set as default"
Save
D. Test Features
Create a habit: Click "+" → Add habit details → Save
Mark complete: Check off the habit
Test AI: Click on a habit → "Get AI Advice" (should work with DeepSeek key)
Sign out/in: Test authentication
Google Sign-In: Try signing in with Google
Everything working? ✅ You're ready for mobile!

📱 Part 7: Build Android App (20 minutes)
A. Login to Expo
Copyeas login
Enter your Expo account credentials (create free account at expo.dev if you don't have one)

B. Configure EAS Build
Copyeas build:configure
Follow prompts:

Select: Android
Generate new Android keystore: Yes
C. Build APK for Testing
Copy# Build APK (for direct installation on your phone)
eas build -p android --profile preview
This takes 10-15 minutes. You'll see:

✔ Build complete!
Build artifact: https://expo.dev/artifacts/[unique-url]
D. Download & Install
Click the artifact link → Download APK
Transfer to your Android phone
Install (you may need to allow "Install from Unknown Sources")
Test the app on your phone!
🏪 Part 8: Build for Play Store (10 minutes)
When you're ready to publish:

Copy# Build AAB (required for Play Store)
eas build -p android --profile production
Wait 10-15 minutes → Download the AAB file

Play Store Submission Checklist:
You'll need:

✅ AAB file (from EAS build)
✅ App icon 512x512px (create in Canva)
✅ 2-8 screenshots (take from your phone)
✅ Short description (80 chars)
✅ Full description (4000 chars)
✅ Privacy Policy URL: https://habitowl-XXXXX.web.app/privacy
✅ Terms URL: https://habitowl-XXXXX.web.app/terms
Go to: https://play.google.com/console

Create app
Upload AAB → Internal testing or Production
Fill in all details
Submit for review
Review time: Usually 3-7 days

🎨 Optional: Configure AdMob (10 minutes)
Skip this if you want to add ads later

A. Create AdMob Account
Go to: https://admob.google.com
Sign up → Add your first app
B. Create Ad Units
Select: Android
App name: HabitOwl
Create these ad units:
Banner ad
Interstitial ad
Rewarded ad
Copy all 3 ad unit IDs
C. Update App Config
Open: src/services/AdService.js
Replace lines 8-12:
Copyconst adUnitIds = {
  banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};
Save → Rebuild app with EAS
🎉 You're Done!
What You've Accomplished:
✅ Deployed web version to Firebase Hosting
✅ Built Android APK/AAB
✅ Configured Firebase backend
✅ Set up AI coaching
✅ Ready for Play Store submission
✅ Revenue systems configured
Your App URLs:
Web: https://habitowl-XXXXX.web.app
Admin Panel: https://habitowl-XXXXX.web.app (sign in with admin email)
Privacy: https://habitowl-XXXXX.web.app/privacy
Terms: https://habitowl-XXXXX.web.app/terms
💡 Next Steps
Test thoroughly: Try all features on both web and mobile
Customize: Update colors, branding in src/config/
Get users: Share your web app link
Submit to Play Store: Use the AAB file from EAS
Monitor: Check Firebase Analytics & AdMob dashboard
📞 Need Help?
Issues during setup? → Check TROUBLESHOOTING.md

Everything working? → You're ready to launch! 🚀

Total Setup Time: ~80 minutes
Investment: $27 ($2 API + $25 Play Store)
Revenue Potential: $300-450/month with 150 users