/**
 * Unity Ads Configuration
 * 
 * INSTRUCTIONS FOR NON-DEVELOPERS:
 * =================================
 * 
 * 1. Go to https://dashboard.unity3d.com/
 * 2. Create an account or login
 * 3. Create a new project called "HabitOwl"
 * 4. Add your Android app and get the Android Game ID
 * 5. Add your iOS app and get the iOS Game ID
 * 6. For each app, note the Ad Placement IDs (Banner, Interstitial, Rewarded)
 * 7. Replace the values below with YOUR actual IDs
 */

export const UNITY_ADS_CONFIG = {
  // ==========================================
  // STEP 1: REPLACE THESE WITH YOUR GAME IDs
  // ==========================================
  // These are the main IDs for your app in Unity Dashboard
  // Example: ANDROID_GAME_ID: '1234567'
  
  ANDROID_GAME_ID: '5966553',  // Replace with your Android Game ID
  IOS_GAME_ID: '5966552',          // Replace with your iOS Game ID
  
  // ==========================================
  // STEP 2: REPLACE AD PLACEMENT IDs
  // ==========================================
  // These are the specific ad unit IDs from Unity Dashboard
  // Go to: Your App → Monetization → Ad Placements
  
  // Android Ad Placements
  ANDROID_BANNER: 'Banner_Android',           // Usually: Banner_Android or banner
  ANDROID_INTERSTITIAL: 'Interstitial_Android', // Usually: Interstitial_Android or video
  ANDROID_REWARDED: 'Rewarded_Android',       // Usually: Rewarded_Android or rewardedVideo
  
  // iOS Ad Placements
  IOS_BANNER: 'Banner_iOS',                   // Usually: Banner_iOS or banner
  IOS_INTERSTITIAL: 'Interstitial_iOS',       // Usually: Interstitial_iOS or video
  IOS_REWARDED: 'Rewarded_iOS',               // Usually: Rewarded_iOS or rewardedVideo
  
  // ==========================================
  // AD BEHAVIOR SETTINGS
  // ==========================================
  // Don't change these unless you know what you're doing
  
  // How long to wait before showing another interstitial ad (in milliseconds)
  INTERSTITIAL_COOLDOWN: 30000, // 30 seconds
  
  // Maximum number of interstitial ads to show in one session
  MAX_INTERSTITIALS_PER_SESSION: 5,
  
  // Enable test ads in development mode
  ENABLE_TEST_ADS_IN_DEV: true,
  
  // Enable debug logging
  DEBUG_MODE: true,
};

/**
 * EXAMPLE CONFIGURATION (After you get your IDs from Unity):
 * 
 * export const UNITY_ADS_CONFIG = {
 *   ANDROID_GAME_ID: '1234567',
 *   IOS_GAME_ID: '1234568',
 *   
 *   ANDROID_BANNER: 'Banner_Android',
 *   ANDROID_INTERSTITIAL: 'Interstitial_Android',
 *   ANDROID_REWARDED: 'Rewarded_Android',
 *   
 *   IOS_BANNER: 'Banner_iOS',
 *   IOS_INTERSTITIAL: 'Interstitial_iOS',
 *   IOS_REWARDED: 'Rewarded_iOS',
 *   
 *   INTERSTITIAL_COOLDOWN: 30000,
 *   MAX_INTERSTITIALS_PER_SESSION: 5,
 *   ENABLE_TEST_ADS_IN_DEV: true,
 *   DEBUG_MODE: true,
 * };
 */

export default UNITY_ADS_CONFIG;
