# 🎯 START HERE FIRST!

## Welcome to HabitOwl with Unity Ads!

**If you're not a developer, don't worry!** This guide will help you step by step.

---

## What is This Package?

This is your **HabitOwl app** updated to use **Unity Ads** instead of Google AdMob.

Everything else works exactly the same:
- ✅ All your app features
- ✅ Same design
- ✅ Same functionality
- ✅ Just different ad provider

---

## Quick Decision: Which Guide Should You Follow?

### 👉 Choose ONE guide below:

1. **INSTALL.md** (5 minutes)
   - Quick and simple
   - For experienced users
   - Just the essential steps

2. **UNITY_ADS_SETUP_GUIDE.md** (30 minutes) ⭐ RECOMMENDED
   - Complete step-by-step guide
   - With screenshots descriptions
   - Covers everything in detail
   - Perfect for first-time users

3. **CHECKLIST.md** (As you go)
   - Follow along with any guide
   - Check off each completed step
   - Track your progress

---

## The 3 Main Things You Need To Do

### 1️⃣ Get Unity Ads Account & IDs (15 minutes)

- Create account at https://dashboard.unity3d.com/
- Create project: "HabitOwl"
- Get your **Game IDs** (you'll need 2: Android + iOS)
- Get your **Placement IDs** (you'll need 6: 3 for Android, 3 for iOS)

**📖 Detailed instructions in:** `UNITY_ADS_SETUP_GUIDE.md` (Part 1)

### 2️⃣ Configure Your App (2 minutes)

- Open file: `src/config/unityAdsConfig.js`
- Copy-paste your Game IDs and Placement IDs
- Save the file

**📖 Detailed instructions in:** `UNITY_ADS_SETUP_GUIDE.md` (Part 2)

### 3️⃣ Install & Test (10 minutes)

- Run: `npm install`
- Run: `npm start`
- Test the app

**📖 Detailed instructions in:** `UNITY_ADS_SETUP_GUIDE.md` (Part 2 & 3)

---

## File Guide - Which Files Do What

### 📱 Files YOU NEED TO UPDATE:

**⚠️ MUST UPDATE:**
- `src/config/unityAdsConfig.js` - Add your Unity Ads IDs here

**Maybe Update (if needed):**
- `src/config/firebase.js` - Your Firebase config (if fresh install)

### 📚 Documentation Files (Read These):

- `START_HERE_FIRST.md` - This file! Your starting point
- `INSTALL.md` - Quick 5-minute installation guide
- `UNITY_ADS_SETUP_GUIDE.md` - Complete detailed guide (BEST for non-developers)
- `CHECKLIST.md` - Track your progress
- `README_UNITY_ADS.md` - Technical overview
- `WHAT_CHANGED.md` - Shows what's different from AdMob version

### 🔧 Code Files (Don't Touch These):

All other files work automatically! Including:
- `App.js` - Main app file
- `package.json` - Dependencies list
- `src/services/UnityAdsService.js` - Unity Ads logic
- `src/components/UnityBannerAd.js` - Banner ad component
- All screens, navigation, etc.

---

## Your Success Path

```
START → Read Guide → Get Unity IDs → Configure App → Install → Test → Build → Launch
  ↑         ↓              ↓              ↓            ↓        ↓       ↓        ↓
 You    SETUP GUIDE    Unity Site    unityAdsConfig  npm   npm start  EAS    App Store
        (30 min)       (15 min)      (2 min)       install (test)   Build   Submit
```

**Total Time: ~1-2 hours**

---

## Common Questions Before You Start

### "I've never done this before. Can I do it?"

**YES!** The guides are written for non-developers. Just follow step by step.

### "What if I make a mistake?"

**Don't worry!** 
- You can't break anything permanently
- You have your old version as backup
- All changes are reversible

### "Do I need coding knowledge?"

**No!** You just need to:
- Create a Unity account
- Copy some IDs
- Paste them into a file
- Run 2 simple commands

### "What if I get stuck?"

**Multiple resources available:**
1. Read the troubleshooting section in any guide
2. Check `WHAT_CHANGED.md` to understand what's different
3. Use `CHECKLIST.md` to see what you might have missed
4. All common problems are covered in the guides

### "How long will this take?"

**Breakdown:**
- Unity account setup: 15 minutes
- Getting IDs: 10 minutes
- Configuring app: 2 minutes
- Installation: 10 minutes
- Testing: 15 minutes
- **Total: ~1 hour** (first time)

### "What if I want to go back to AdMob?"

**Easy!** 
- Keep your old folder as backup
- Or download from your GitHub again
- Swap them back if needed

---

## Ready to Start?

### Step 1: Choose Your Guide

**Recommended for non-developers:** 
→ Open `UNITY_ADS_SETUP_GUIDE.md`

**For quick installation:** 
→ Open `INSTALL.md`

### Step 2: Open the Checklist

→ Open `CHECKLIST.md` in another window

Check off items as you complete them!

### Step 3: Follow the Guide

Read carefully and follow each step.

Don't skip steps!

---

## Important Reminders

### ✅ DO:

- Read instructions carefully
- Follow steps in order
- Save all IDs in a text file
- Test after each major step
- Ask for help if stuck

### ❌ DON'T:

- Skip steps
- Make up IDs
- Change other files
- Panic if something doesn't work immediately
- Give up - it's easier than it looks!

---

## What Happens After Setup?

Once you complete the setup:

1. **Development:**
   - Your app runs with Unity Ads
   - You can test on your device
   - All features work normally

2. **Building:**
   - Create production build with `eas build`
   - Same process as before
   - Takes 15-30 minutes

3. **Launching:**
   - Submit to app stores (Google Play, App Store)
   - Users get Unity Ads instead of AdMob
   - Premium users still see no ads

4. **Monitoring:**
   - Check Unity Dashboard for revenue
   - See ad impressions, clicks, earnings
   - Usually higher than AdMob!

---

## Support Resources

### In This Package:

- `UNITY_ADS_SETUP_GUIDE.md` - Detailed guide
- `INSTALL.md` - Quick guide
- `CHECKLIST.md` - Progress tracker
- `WHAT_CHANGED.md` - Changes from AdMob
- `README_UNITY_ADS.md` - Technical details

### Online Resources:

- Unity Dashboard: https://dashboard.unity3d.com/
- Unity Ads Docs: https://docs.unity.com/grow/levelplay
- ironSource SDK: https://docs.unity.com/grow/levelplay/sdk/react

---

## Let's Begin! 🚀

**Your Next Step:**

1. Open: `UNITY_ADS_SETUP_GUIDE.md`
2. Start with: "PART 1: Creating Unity Ads Account"
3. Follow each step carefully
4. Use `CHECKLIST.md` to track progress

**Good luck!** You've got this! 💪

---

## Quick Reference Card

```
┌─────────────────────────────────────────────┐
│  UNITY ADS QUICK REFERENCE                  │
├─────────────────────────────────────────────┤
│  1. Unity Dashboard:                        │
│     https://dashboard.unity3d.com/          │
│                                             │
│  2. File to Update:                         │
│     src/config/unityAdsConfig.js            │
│                                             │
│  3. Install Command:                        │
│     npm install                             │
│                                             │
│  4. Start Command:                          │
│     npm start                               │
│                                             │
│  5. Build Command:                          │
│     npx eas build -p android --profile production │
│                                             │
│  6. Help Files:                             │
│     - UNITY_ADS_SETUP_GUIDE.md (main)      │
│     - INSTALL.md (quick)                    │
│     - CHECKLIST.md (tracker)                │
└─────────────────────────────────────────────┘
```

**Save this for reference!** ⭐

---

**Version:** 2.3.0  
**Last Updated:** 2025  
**Made for:** Non-Developers 💚
