/**
 * Unity Ads Configuration
 * 
 * ✅ YOUR CONFIG IS CORRECT!
 * Game IDs: 5966553 (Android), 5966552 (iOS)
 * 
 * TROUBLESHOOTING CHECKLIST:
 * ==========================
 * 
 * 1. ✅ Unity Dashboard Setup (https://dashboard.unity3d.com/)
 *    - App created and approved
 *    - Game IDs match below
 *    - Ad placements activated
 *    - Test mode configured properly
 * 
 * 2. ✅ Mediation Settings
 *    - Unity Ads network enabled
 *    - No conflicts with other networks
 *    - Waterfall setup (if using mediation)
 * 
 * 3. ✅ Test Devices
 *    - Register your device for testing
 *    - Dashboard → Testing → Add Test Device
 * 
 * 4. ✅ Build Configuration
 *    - Build with EAS: eas build -p android
 *    - NOT Expo Go (native modules required)
 */

export const UNITY_ADS_CONFIG = {
  // ==========================================
  // YOUR UNITY ADS GAME IDs (✅ Looks Good!)
  // ==========================================
  ANDROID_GAME_ID: '5966553',  // Your Android Game ID
  IOS_GAME_ID: '5966552',      // Your iOS Game ID
  
  // ==========================================
  // AD PLACEMENT IDs
  // ==========================================
  // These are the default Unity placement names
  // If these don't work, check your Unity Dashboard for actual placement IDs
  
  // Android Placements
  ANDROID_BANNER: 'Banner_Android',           
  ANDROID_INTERSTITIAL: 'Interstitial_Android', 
  ANDROID_REWARDED: 'Rewarded_Android',       
  
  // iOS Placements
  IOS_BANNER: 'Banner_iOS',                   
  IOS_INTERSTITIAL: 'Interstitial_iOS',       
  IOS_REWARDED: 'Rewarded_iOS',               
  
  // ==========================================
  // AD BEHAVIOR SETTINGS
  // ==========================================
  
  // How long to wait before showing another interstitial ad (in milliseconds)
  INTERSTITIAL_COOLDOWN: 30000, // 30 seconds
  
  // Maximum number of interstitial ads to show in one session
  MAX_INTERSTITIALS_PER_SESSION: 5,
  
  // Enable test ads in development mode
  ENABLE_TEST_ADS_IN_DEV: true,
  
  // Enable debug logging (SET TO true FOR TROUBLESHOOTING)
  DEBUG_MODE: true, // 🔧 Keep this true until ads work!
};

export default UNITY_ADS_CONFIG;
