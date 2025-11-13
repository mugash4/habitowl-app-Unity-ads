/**
 * Google AdMob Service - FIXED FOR IMMEDIATE BANNER DISPLAY
 * ✅ Banner shows as soon as premium status loads (doesn't wait for full SDK init)
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
  console.log('✅ AdMob SDK loaded successfully');
} catch (error) {
  console.log('ℹ️ AdMob SDK not available:', error.message);
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
    
    // Status change listeners
    this.statusChangeListeners = [];
    this.premiumStatusListeners = [];
    
    // ✅ CRITICAL: Load premium status IMMEDIATELY on construction
    this.loadPremiumStatusSync();
  }

  /**
   * ✅ CRITICAL: Synchronous premium status loading
   */
  loadPremiumStatusSync() {
    console.log('[AdMob] 🚀 Loading premium/admin status from storage...');
    
    // Start loading immediately
    AsyncStorage.multiGet(['user_premium_status', 'user_admin_status'])
      .then(([[, premium], [, adminStatus]]) => {
        this.isPremium = premium === 'true';
        this.isAdmin = adminStatus === 'true';
        this.premiumStatusLoaded = true;
        
        console.log('[AdMob] ✅ Premium status loaded:');
        console.log('[AdMob]    - Premium:', this.isPremium);
        console.log('[AdMob]    - Admin:', this.isAdmin);
        console.log('[AdMob]    - Will show banner:', !this.isPremium && !this.isAdmin);
        
        // ✅ Notify all listeners IMMEDIATELY
        this.notifyStatusChange();
        this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      })
      .catch(error => {
        console.log('[AdMob] ⚠️ Error loading status (defaulting to free user):', error);
        // Default to free user (safe default - shows ads)
        this.isPremium = false;
        this.isAdmin = false;
        this.premiumStatusLoaded = true;
        this.notifyStatusChange();
        this.notifyPremiumStatusChange(false);
      });
  }

  /**
   * ✅ Subscribe to status changes
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.statusChangeListeners.push(callback);
    
    // ✅ Call immediately with current state on next tick
    const currentStatus = this.getStatus();
    setTimeout(() => {
      if (this.statusChangeListeners.includes(callback)) {
        try {
          callback(currentStatus);
        } catch (error) {
          console.log('[AdMob] Error in immediate callback:', error);
        }
      }
    }, 0);
    
    return () => {
      this.statusChangeListeners = this.statusChangeListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * ✅ Notify all listeners of status change
   */
  notifyStatusChange() {
    const status = this.getStatus();
    
    console.log('[AdMob] 📢 Broadcasting status to', this.statusChangeListeners.length, 'listeners');
    
    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.log('[AdMob] Error in listener:', error);
      }
    });
  }

  /**
   * ✅ Pre-load premium/admin status (called on auth state change)
   */
  async preloadPremiumStatus() {
    try {
      console.log('[AdMob] 📊 Reloading premium/admin status...');
      
      const [premium, adminStatus] = await AsyncStorage.multiGet([
        'user_premium_status',
        'user_admin_status'
      ]);
      
      this.isPremium = premium[1] === 'true';
      this.isAdmin = adminStatus[1] === 'true';
      this.premiumStatusLoaded = true;
      
      console.log('[AdMob] ✅ Status reloaded:');
      console.log('[AdMob]    - Premium:', this.isPremium);
      console.log('[AdMob]    - Admin:', this.isAdmin);
      
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      
      return this.isPremium || this.isAdmin;
    } catch (error) {
      console.log('[AdMob] ⚠️ Error reloading status:', error);
      return this.isPremium || this.isAdmin;
    }
  }

  /**
   * Subscribe to premium status changes
   */
  onPremiumStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.premiumStatusListeners.push(callback);
    
    // Call immediately if status already loaded
    if (this.premiumStatusLoaded) {
      setTimeout(() => {
        if (this.premiumStatusListeners.includes(callback)) {
          try {
            callback(this.isPremium || this.isAdmin);
          } catch (error) {
            console.log('[AdMob] Error in premium callback:', error);
          }
        }
      }, 0);
    }
    
    return () => {
      this.premiumStatusListeners = this.premiumStatusListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners of premium status change
   */
  notifyPremiumStatusChange(isPremiumOrAdmin) {
    console.log('[AdMob] 📢 Broadcasting premium status:', isPremiumOrAdmin);
    
    this.premiumStatusListeners.forEach(listener => {
      try {
        listener(isPremiumOrAdmin);
      } catch (error) {
        console.log('[AdMob] Error in premium listener:', error);
      }
    });
  }

  /**
   * ✅ Initialize AdMob SDK
   */
  async initialize() {
    try {
      if (this.initializationAttempted) {
        console.log('[AdMob] ⚠️ Already attempted initialization');
        return this.isInitialized;
      }
      
      this.initializationAttempted = true;

      // Check platform
      if (Platform.OS === 'web') {
        console.log('[AdMob] ℹ️ Web platform - ads not supported');
        return false;
      }

      // Check SDK
      if (!sdkAvailable || !mobileAds) {
        console.log('[AdMob] ⚠️ SDK not available (requires EAS build)');
        this.initializationError = 'SDK not available';
        return false;
      }

      console.log('[AdMob] 🚀 Starting AdMob SDK initialization...');

      // ✅ Ensure premium status is loaded before proceeding
      if (!this.premiumStatusLoaded) {
        console.log('[AdMob] ⏳ Waiting for premium status to load...');
        await this.preloadPremiumStatus();
      }
      
      console.log('[AdMob] 👤 User type:', this.isPremium || this.isAdmin ? 'PREMIUM/ADMIN' : 'FREE');

      // ✅ Initialize SDK
      console.log('[AdMob] 📡 Initializing AdMob SDK...');
      await mobileAds().initialize();
      
      console.log('[AdMob] ✅✅✅ ADMOB SDK INITIALIZED SUCCESSFULLY! ✅✅✅');
      this.isInitialized = true;
      this.initializationError = null;
      
      // ✅ Notify all listeners that initialization is complete
      this.notifyStatusChange();
      
      // Load interstitial/rewarded ads only for free users
      if (!this.isPremium && !this.isAdmin && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        console.log('[AdMob] 🎯 Loading interstitial/rewarded ads for FREE user...');
        setTimeout(() => this.createAndLoadAds(), 500);
      } else {
        console.log('[AdMob] 👑 Premium/Admin user - skipping interstitial/rewarded ads');
      }
      
      return true;

    } catch (error) {
      console.log('[AdMob] ❌ SDK initialization error:', error.message);
      this.isInitialized = false;
      this.initializationError = error.message;
      this.notifyStatusChange();
      return false;
    }
  }

  /**
   * Create and load ads (only for free users)
   */
  createAndLoadAds() {
    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] ⚠️ Prevented ad creation for premium/admin user');
      return;
    }
    
    console.log('[AdMob] 🎬 Creating interstitial/rewarded ads for FREE user...');
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
      console.log('[AdMob] 👑 Premium/Admin user - ads disabled');
      return false;
    }

    if (!this.shouldShowAds()) {
      console.log('[AdMob] ❌ Ads disabled');
      return false;
    }

    if (!this.interstitialAd || !this.interstitialLoaded) {
      console.log('[AdMob] ⚠️ Interstitial not ready');
      if (!this.interstitialAd) this.createInterstitialAd();
      return false;
    }

    const now = Date.now();
    if (now - this.lastInterstitialTime < ADMOB_CONFIG.INTERSTITIAL_COOLDOWN) {
      return false;
    }

    if (this.sessionInterstitialCount >= ADMOB_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      return false;
    }

    try {
      await this.interstitialAd.show();
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
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
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, ADMOB_CONFIG.getRequestOptions());

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.rewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
        this.rewardedLoaded = false;
        setTimeout(() => {
          if (this.isInitialized) this.createRewardedAd();
        }, 10000);
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        this.trackAdImpression('rewarded');
        if (this.rewardCallback) {
          this.rewardCallback(reward);
          this.rewardCallback = null;
        }
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        this.rewardedLoaded = false;
        setTimeout(() => {
          if (this.isInitialized) this.createRewardedAd();
        }, 1000);
      });

      this.rewardedAd.load();

    } catch (error) {
      console.log('[AdMob] ❌ Error creating rewarded:', error);
    }
  }

  /**
   * Show rewarded ad
   */
  async showRewardedAd(onReward = null, placementName = null) {
    if (!this.isInitialized || !this.rewardedAd || !this.rewardedLoaded) {
      return false;
    }

    try {
      this.rewardCallback = onReward;
      await this.rewardedAd.show();
      return true;
    } catch (error) {
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
   * ✅ Get banner config - Returns config for FREE users (doesn't wait for SDK init)
   */
  getBannerConfig() {
    if (!BannerAdSize || Platform.OS === 'web') {
      return null;
    }

    // ✅ FIXED: Only check premium status, not initialization status
    // Banner can show even while SDK is initializing - the BannerAd component handles its own loading
    if (this.isPremium || this.isAdmin) {
      return null;
    }

    return {
      adUnitId: getAdUnitId('BANNER'),
      size: BannerAdSize.BANNER,
    };
  }

  /**
   * ✅ Set premium status and notify
   */
  async setPremiumStatus(isPremium, isAdmin = false) {
    try {
      const oldStatus = this.isPremium || this.isAdmin;
      this.isPremium = isPremium;
      this.isAdmin = isAdmin;
      this.premiumStatusLoaded = true;
      
      await AsyncStorage.multiSet([
        ['user_premium_status', isPremium.toString()],
        ['user_admin_status', isAdmin.toString()]
      ]);
      
      console.log('[AdMob] ✅ Status updated:');
      console.log('[AdMob]    - Premium:', isPremium);
      console.log('[AdMob]    - Admin:', isAdmin);
      
      const newStatus = isPremium || isAdmin;
      if (oldStatus !== newStatus) {
        this.notifyStatusChange();
        this.notifyPremiumStatusChange(newStatus);
        
        if (newStatus) {
          console.log('[AdMob] 👑 Upgraded to premium/admin - disabling ads');
          this.cleanup();
        } else if (this.isInitialized) {
          console.log('[AdMob] 📉 Downgraded to free - loading ads');
          this.createAndLoadAds();
        }
      }
    } catch (error) {
      console.log('[AdMob] Error setting status:', error);
    }
  }

  /**
   * ✅ Check if ads should show (for interstitial/rewarded only)
   */
  shouldShowAds() {
    const result = this.isInitialized && 
           !this.isPremium && 
           !this.isAdmin &&
           Platform.OS !== 'web' && 
           sdkAvailable &&
           this.premiumStatusLoaded;
    
    return result;
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
    } catch (error) {
      console.log('[AdMob] Track error:', error);
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
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
    this.interstitialAd = null;
    this.rewardedAd = null;
  }
}

// Export singleton
const adMobService = new AdMobService();
export default adMobService;
export { AdMobService };
