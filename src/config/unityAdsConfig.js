/**
 * Unity Ads Configuration - COMPLETE FIX FOR FREE PLAN
 * 
 * ✅ FIXED ISSUES:
 * - Proper test mode configuration for development
 * - Simplified placement configuration
 * - Better documentation for free plan users
 * 
 * 🎮 YOUR GAME IDs: 5966553 (Android), 5966552 (iOS)
 */

export const UNITY_ADS_CONFIG = {
  // ==========================================
  // GAME IDs (✅ These are correct!)
  // ==========================================
  ANDROID_GAME_ID: '5966553',
  IOS_GAME_ID: '5966552',
  
  // ==========================================
  // AD BEHAVIOR SETTINGS
  // ==========================================
  
  // Cooldown between interstitial ads (milliseconds)
  INTERSTITIAL_COOLDOWN: 30000, // 30 seconds
  
  // Max interstitials per session
  MAX_INTERSTITIALS_PER_SESSION: 5,
  
  // Enable verbose logging (helpful for debugging)
  DEBUG_MODE: true,
  
  // ==========================================
  // TEST MODE CONFIGURATION
  // ==========================================
  // ⚠️ CRITICAL: Set to TRUE during development to see test ads
  // ⚠️ Set to FALSE before publishing to app stores!
  // 
  // Free plan users: Keep this TRUE until you're ready to publish
  FORCE_TEST_MODE: true, // 🔧 Set to false for production!
  
  // Auto-load ads after initialization
  AUTO_LOAD_ADS: true,
};

export default UNITY_ADS_CONFIG;
