/**
 * Google AdMob Service - FIXED: Working version
 * ✅ Proper initialization sequence
 * ✅ No race conditions
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
    
    // Status change listeners
    this.statusChangeListeners = [];
    this.premiumStatusListeners = [];
    
    // Load premium status first
    this.loadPremiumStatusAsync();
    
    // Then initialize SDK asynchronously
    if (Platform.OS !== 'web' && sdkAvailable && mobileAds) {
      this.initializationPromise = this.initializeSDK();
    } else {
      this.initializationAttempted = true;
      this.initializationPromise = Promise.resolve();
    }
  }

  /**
   * ✅ FIXED: Async premium status load with guaranteed notification
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
      
      // ✅ CRITICAL FIX: ALWAYS notify listeners after initial load
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      
    } catch (error) {
      console.log('[AdMob] ⚠️ Failed to load from storage, using defaults');
      this.isPremium = false;
      this.isAdmin = false;
      this.premiumStatusLoaded = true;
      
      // Still notify with defaults
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(false);
    }
  }

  /**
   * ✅ FIXED: Async SDK initialization
   */
  async initializeSDK() {
    try {
      console.log('[AdMob] 🚀 Initializing SDK...');
      
      // Wait for premium status to load first
      let attempts = 0;
      while (!this.premiumStatusLoaded && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Initialize SDK
      await mobileAds().initialize();
      this.isInitialized = true;
      this.initializationAttempted = true;
      console.log('[AdMob] ✅ SDK initialized');
      
      // Notify listeners
      this.notifyStatusChange();
      
      // Load ads if free user
      if (!this.isPremium && !this.isAdmin && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        setTimeout(() => this.createAndLoadAds(), 500);
      }
      
      console.log('[AdMob] ✅ Initialization complete');
    } catch (error) {
      console.log('[AdMob] ❌ SDK init error:', error.message);
      this.initializationError = error.message;
      this.initializationAttempted = true;
      this.notifyStatusChange();
    }
  }

  /**
   * ✅ Wait for initialization to complete
   */
  async waitForInitialization() {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
    // Also ensure premium status is loaded
    let attempts = 0;
    while (!this.premiumStatusLoaded && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    return this.premiumStatusLoaded;
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
   * Legacy initialize method
   */
  async initialize() {
    console.log('[AdMob] ℹ️ initialize() called (already initializing)');
    await this.waitForInitialization();
    return this.isInitialized;
  }

  /**
   * Create and load ads
   */
  createAndLoadAds() {
    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] ⚠️ Prevented ad creation for premium/admin user');
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
      console.log('[AdMob] 📱 Creating interstitial with unit ID:', adUnitId);
      
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
      console.log('[AdMob] 👑 Premium/Admin - ads disabled');
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
      console.log('[AdMob] ⏸️  Interstitial on cooldown');
      return false;
    }

    if (this.sessionInterstitialCount >= ADMOB_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      console.log('[AdMob] 🛑 Max interstitials reached for session');
      return false;
    }

    try {
      await this.interstitialAd.show();
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      console.log('[AdMob] ✅ Interstitial shown successfully');
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
      console.log('[AdMob] 📱 Creating rewarded with unit ID:', adUnitId);
      
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
      console.log('[AdMob] ✅ Rewarded shown successfully');
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
   * ✅ Get banner config - Returns immediately
   */
  getBannerConfig() {
    if (!BannerAdSize || Platform.OS === 'web') {
      return null;
    }

    // Status is loaded now
    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] 👑 Premium/Admin - no banner config');
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
   * ✅ FIXED: Set premium status with proper notifications
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
      
      // Always notify listeners
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(isPremium || isAdmin);
      
      const newStatus = isPremium || isAdmin;
      const oldStatus = oldPremium || oldAdmin;
      
      if (oldStatus !== newStatus) {
        if (newStatus) {
          console.log('[AdMob] 👑 Upgraded to premium - disabling ads');
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
   * Should show ads (for interstitial/rewarded)
   */
  shouldShowAds() {
    const should = this.isInitialized && 
           !this.isPremium && 
           !this.isAdmin &&
           Platform.OS !== 'web' && 
           sdkAvailable &&
           this.premiumStatusLoaded;
    
    return should;
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
      console.log('[AdMob] 📊 Ad impression tracked:', adType, context);
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

// ✅ Create singleton
const adMobService = new AdMobService();

export default adMobService;
export { AdMobService };
