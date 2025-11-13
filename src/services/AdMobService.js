/**
 * ✅ FULLY FIXED: Google AdMob Service with Proper Initialization
 * - Ensures SDK initializes BEFORE ads load
 * - Prevents banner loading race conditions
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMOB_CONFIG, getAdUnitId } from '../config/admobConfig';

// Import AdMob SDK
let mobileAds = null;
let InterstitialAd = null;
let RewardedAd = null;
let BannerAdSize = null;
let TestIds = null;
let AdEventType = null;
let RewardedAdEventType = null;

// SDK availability flag
let sdkAvailable = false;

// Try to import the SDK
try {
  const admobModule = require('react-native-google-mobile-ads');
  mobileAds = admobModule.default;
  InterstitialAd = admobModule.InterstitialAd;
  RewardedAd = admobModule.RewardedAd;
  BannerAdSize = admobModule.BannerAdSize;
  TestIds = admobModule.TestIds;
  AdEventType = admobModule.AdEventType;
  RewardedAdEventType = admobModule.RewardedAdEventType;
  sdkAvailable = true;
  console.log('✅ [AdMob] SDK loaded successfully');
} catch (error) {
  console.log('ℹ️ [AdMob] SDK not available:', error.message);
}

class AdMobService {
  constructor() {
    this.isInitialized = false;
    this.isPremium = false;
    this.premiumStatusLoaded = false;
    this.isAdmin = false;
    
    // Ad instances
    this.interstitialAd = null;
    this.rewardedAd = null;
    
    // Ad state tracking
    this.lastInterstitialTime = 0;
    this.sessionInterstitialCount = 0;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
    this.rewardCallback = null;
    
    // Initialization state
    this.initializationAttempted = false;
    this.initializationError = null;
    this.initializationPromise = null;
    this.initializationComplete = false; // ✅ NEW: Track completion
    
    // Status change listeners
    this.statusChangeListeners = [];
    this.premiumStatusListeners = [];
    
    // ✅ CRITICAL FIX: Initialize in correct order
    this.initializeAsync();
  }

  /**
   * ✅ FIXED: Async initialization with correct order
   */
  async initializeAsync() {
    try {
      console.log('[AdMob] 🚀 Starting initialization...');
      
      // Step 1: Load premium status from storage
      await this.loadPremiumStatusAsync();
      
      // Step 2: Initialize SDK (if available and not web)
      if (Platform.OS !== 'web' && sdkAvailable && mobileAds) {
        this.initializationPromise = this.initializeSDK();
        await this.initializationPromise;
      } else {
        console.log('[AdMob] ℹ️ Skipping SDK init (web or SDK unavailable)');
        this.initializationAttempted = true;
        this.initializationComplete = true;
        this.notifyStatusChange();
      }
      
      console.log('[AdMob] ✅ Initialization complete');
    } catch (error) {
      console.error('[AdMob] ❌ Initialization error:', error);
      this.initializationComplete = true;
      this.notifyStatusChange();
    }
  }

  /**
   * ✅ Load premium status from storage
   */
  async loadPremiumStatusAsync() {
    try {
      console.log('[AdMob] 🔄 Loading premium status...');
      
      const [[, premium], [, adminStatus]] = await AsyncStorage.multiGet([
        'user_premium_status', 
        'user_admin_status'
      ]);
      
      this.isPremium = premium === 'true';
      this.isAdmin = adminStatus === 'true';
      this.premiumStatusLoaded = true;
      
      console.log('[AdMob] ✅ Status loaded:', {
        premium: this.isPremium,
        admin: this.isAdmin
      });
      
      // Notify listeners
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      
    } catch (error) {
      console.log('[AdMob] ⚠️ Failed to load status, using defaults');
      this.isPremium = false;
      this.isAdmin = false;
      this.premiumStatusLoaded = true;
      
      // Still notify with defaults
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(false);
    }
  }

  /**
   * ✅ Initialize SDK
   */
  async initializeSDK() {
    try {
      console.log('[AdMob] 🔧 Initializing Google Mobile Ads SDK...');
      
      // Initialize the SDK
      await mobileAds().initialize();
      
      this.isInitialized = true;
      this.initializationAttempted = true;
      this.initializationComplete = true; // ✅ Mark as complete
      
      console.log('[AdMob] ✅ SDK initialized successfully');
      
      // Notify all listeners
      this.notifyStatusChange();
      
      // Load ads if free user
      if (!this.isPremium && !this.isAdmin && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        // Wait a bit before creating ads
        setTimeout(() => {
          console.log('[AdMob] 📱 Creating ads for free user...');
          this.createAndLoadAds();
        }, 1000);
      }
      
    } catch (error) {
      console.log('[AdMob] ❌ SDK init error:', error.message);
      this.initializationError = error.message;
      this.initializationAttempted = true;
      this.initializationComplete = true;
      this.notifyStatusChange();
    }
  }

  /**
   * ✅ Wait for initialization to complete
   */
  async waitForInitialization() {
    console.log('[AdMob] ⏳ Waiting for initialization...');
    
    // Wait for initialization promise to resolve
    if (this.initializationPromise) {
      try {
        await this.initializationPromise;
      } catch (error) {
        console.log('[AdMob] Warning: Init promise rejected:', error.message);
      }
    }
    
    // Also poll for completion (fallback)
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    while (!this.initializationComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.initializationComplete) {
      console.log('[AdMob] ⚠️ Initialization timeout after 5s');
    } else {
      console.log('[AdMob] ✅ Initialization confirmed complete');
    }
    
    return this.initializationComplete && this.premiumStatusLoaded;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.statusChangeListeners.push(callback);
    
    // Call immediately if loaded
    if (this.premiumStatusLoaded) {
      setTimeout(() => {
        try {
          callback(this.getStatus());
        } catch (error) {
          console.log('[AdMob] Error in callback:', error);
        }
      }, 0);
    }
    
    return () => {
      this.statusChangeListeners = this.statusChangeListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyStatusChange() {
    const status = this.getStatus();
    console.log('[AdMob] 📢 Notifying', this.statusChangeListeners.length, 'listeners');
    
    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.log('[AdMob] Error in listener:', error);
      }
    });
  }

  /**
   * Subscribe to premium status changes
   */
  onPremiumStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.premiumStatusListeners.push(callback);
    
    // Call immediately if loaded
    if (this.premiumStatusLoaded) {
      setTimeout(() => {
        try {
          callback(this.isPremium || this.isAdmin);
        } catch (error) {
          console.log('[AdMob] Error in premium callback:', error);
        }
      }, 0);
    }
    
    return () => {
      this.premiumStatusListeners = this.premiumStatusListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify premium status change
   */
  notifyPremiumStatusChange(isPremiumOrAdmin) {
    console.log('[AdMob] 📢 Notifying', this.premiumStatusListeners.length, 'premium listeners');
    this.premiumStatusListeners.forEach(listener => {
      try {
        listener(isPremiumOrAdmin);
      } catch (error) {
        console.log('[AdMob] Error in premium listener:', error);
      }
    });
  }

  /**
   * Create and load ads
   */
  createAndLoadAds() {
    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] 👑 Premium/Admin user - no ads');
      return;
    }
    
    if (!this.isInitialized) {
      console.log('[AdMob] ⚠️ SDK not initialized - cannot create ads');
      return;
    }
    
    console.log('[AdMob] 🎬 Creating interstitial/rewarded ads...');
    this.createInterstitialAd();
    this.createRewardedAd();
  }

  /**
   * Create interstitial ad
   */
  createInterstitialAd() {
    if (!this.shouldShowAds() || !InterstitialAd) return;

    try {
      const adUnitId = getAdUnitId('INTERSTITIAL');
      console.log('[AdMob] 📱 Creating interstitial:', adUnitId);
      
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, ADMOB_CONFIG.getRequestOptions());

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdMob] ✅ Interstitial loaded');
        this.interstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('[AdMob] ❌ Interstitial error:', error);
        this.interstitialLoaded = false;
        setTimeout(() => {
          if (this.shouldShowAds()) this.createInterstitialAd();
        }, 10000);
      });

      this.interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
        this.trackAdImpression('interstitial');
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.interstitialLoaded = false;
        setTimeout(() => {
          if (this.shouldShowAds()) this.createInterstitialAd();
        }, 1000);
      });

      this.interstitialAd.load();
      console.log('[AdMob] 📥 Loading interstitial...');

    } catch (error) {
      console.log('[AdMob] ❌ Error creating interstitial:', error);
    }
  }

  /**
   * Show interstitial ad
   */
  async showInterstitialAd(placementName = null) {
    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] 👑 Premium/Admin - no ads');
      return false;
    }

    if (!this.shouldShowAds()) {
      console.log('[AdMob] ❌ Ads disabled');
      return false;
    }

    if (!this.interstitialAd || !this.interstitialLoaded) {
      console.log('[AdMob] ⏳ Interstitial not ready');
      if (!this.interstitialAd) this.createInterstitialAd();
      return false;
    }

    const now = Date.now();
    if (now - this.lastInterstitialTime < ADMOB_CONFIG.INTERSTITIAL_COOLDOWN) {
      console.log('[AdMob] ⏸️  Cooldown active');
      return false;
    }

    if (this.sessionInterstitialCount >= ADMOB_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      console.log('[AdMob] 🛑 Max interstitials reached');
      return false;
    }

    try {
      await this.interstitialAd.show();
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      console.log('[AdMob] ✅ Interstitial shown');
      return true;
    } catch (error) {
      console.log('[AdMob] ❌ Show error:', error);
      return false;
    }
  }

  /**
   * Create rewarded ad
   */
  createRewardedAd() {
    if (!this.isInitialized || !RewardedAd) return;

    try {
      const adUnitId = getAdUnitId('REWARDED');
      console.log('[AdMob] 📱 Creating rewarded:', adUnitId);
      
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, ADMOB_CONFIG.getRequestOptions());

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdMob] ✅ Rewarded loaded');
        this.rewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
        console.log('[AdMob] ❌ Rewarded error:', error);
        this.rewardedLoaded = false;
        setTimeout(() => {
          if (this.isInitialized) this.createRewardedAd();
        }, 10000);
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        console.log('[AdMob] 🎁 Reward earned:', reward);
        this.trackAdImpression('rewarded');
        if (this.rewardCallback) {
          this.rewardCallback(reward);
          this.rewardCallback = null;
        }
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        console.log('[AdMob] 🚪 Rewarded closed');
        this.rewardedLoaded = false;
        setTimeout(() => {
          if (this.isInitialized) this.createRewardedAd();
        }, 1000);
      });

      this.rewardedAd.load();
      console.log('[AdMob] 📥 Loading rewarded...');

    } catch (error) {
      console.log('[AdMob] ❌ Error creating rewarded:', error);
    }
  }

  /**
   * Show rewarded ad
   */
  async showRewardedAd(onReward = null, placementName = null) {
    if (!this.isInitialized || !this.rewardedAd || !this.rewardedLoaded) {
      console.log('[AdMob] ⏳ Rewarded not ready');
      return false;
    }

    try {
      this.rewardCallback = onReward;
      await this.rewardedAd.show();
      console.log('[AdMob] ✅ Rewarded shown');
      return true;
    } catch (error) {
      console.log('[AdMob] ❌ Rewarded show error:', error);
      this.rewardCallback = null;
      return false;
    }
  }

  /**
   * Check if rewarded ad is ready
   */
  isRewardedAdReady() {
    return this.isInitialized && this.rewardedLoaded && this.rewardedAd !== null;
  }

  /**
   * ✅ Get banner config - Only returns if SDK is ready
   */
  getBannerConfig() {
    if (!BannerAdSize || Platform.OS === 'web') {
      return null;
    }

    if (!this.isInitialized) {
      console.log('[AdMob] ⚠️ SDK not initialized - no banner config');
      return null;
    }

    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] 👑 Premium/Admin - no banner');
      return null;
    }

    const config = {
      adUnitId: getAdUnitId('BANNER'),
      size: BannerAdSize.BANNER,
    };
    
    console.log('[AdMob] ✅ Banner config:', config.adUnitId);
    return config;
  }

  /**
   * Set premium status
   */
  async setPremiumStatus(isPremium, isAdmin = false) {
    try {
      const oldPremium = this.isPremium;
      const oldAdmin = this.isAdmin;
      
      this.isPremium = isPremium;
      this.isAdmin = isAdmin;
      this.premiumStatusLoaded = true;
      
      await AsyncStorage.multiSet([
        ['user_premium_status', isPremium.toString()],
        ['user_admin_status', isAdmin.toString()]
      ]);
      
      console.log('[AdMob] ✅ Status updated:', {
        premium: isPremium,
        admin: isAdmin
      });
      
      // Notify listeners
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(isPremium || isAdmin);
      
      const newStatus = isPremium || isAdmin;
      const oldStatus = oldPremium || oldAdmin;
      
      if (oldStatus !== newStatus) {
        if (newStatus) {
          console.log('[AdMob] 👑 Upgraded to premium - cleaning up ads');
          this.cleanup();
        } else if (this.isInitialized) {
          console.log('[AdMob] 📉 Downgraded to free - loading ads');
          this.createAndLoadAds();
        }
      }
    } catch (error) {
      console.log('[AdMob] ❌ Error setting status:', error);
    }
  }

  /**
   * Should show ads
   */
  shouldShowAds() {
    return this.isInitialized && 
           !this.isPremium && 
           !this.isAdmin &&
           Platform.OS !== 'web' && 
           sdkAvailable &&
           this.premiumStatusLoaded;
  }

  /**
   * Track ad impression
   */
  async trackAdImpression(adType, context = 'general') {
    try {
      const impression = {
        type: adType,
        context: context,
        timestamp: Date.now(),
        platform: Platform.OS
      };

      const impressions = await AsyncStorage.getItem('ad_impressions') || '[]';
      const impressionArray = JSON.parse(impressions);
      impressionArray.push(impression);

      if (impressionArray.length > 100) {
        impressionArray.splice(0, impressionArray.length - 100);
      }

      await AsyncStorage.setItem('ad_impressions', JSON.stringify(impressionArray));
      console.log('[AdMob] 📊 Tracked:', adType, context);
    } catch (error) {
      console.log('[AdMob] ❌ Track error:', error);
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      initializationAttempted: this.initializationAttempted,
      initializationComplete: this.initializationComplete,
      initializationError: this.initializationError,
      isPremium: this.isPremium,
      isAdmin: this.isAdmin,
      premiumStatusLoaded: this.premiumStatusLoaded,
      sdkAvailable: sdkAvailable,
      platform: Platform.OS,
      interstitialLoaded: this.interstitialLoaded,
      rewardedLoaded: this.rewardedLoaded,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount,
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    console.log('[AdMob] 🧹 Cleaning up ads...');
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
    this.interstitialAd = null;
    this.rewardedAd = null;
  }
}

// ✅ Create singleton instance
const adMobService = new AdMobService();

export default adMobService;
export { AdMobService };
