/**
 * Google AdMob Service - COMPLETE FIX
 * ✅ Aggressive non-blocking initialization
 * ✅ Better status tracking and notification
 * ✅ Immediate premium status loading
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
    this.initializationDetails = [];
    
    // Status change listeners
    this.statusChangeListeners = [];
    this.premiumStatusListeners = [];
    
    // ✅ FIX: Immediately start loading premium status in constructor
    console.log('[AdMob] 🚀 Constructor: Starting immediate premium status load');
    this.preloadPremiumStatus().catch(error => {
      console.log('[AdMob] Premium status load error (non-critical):', error);
    });
    
    // ✅ FIX: Also start AdMob initialization immediately
    if (Platform.OS !== 'web' && sdkAvailable) {
      console.log('[AdMob] 🚀 Constructor: Starting immediate AdMob initialization');
      setTimeout(() => {
        this.initialize().catch(error => {
          console.log('[AdMob] Auto-initialization error (non-critical):', error);
        });
      }, 100); // Small delay to allow app to settle
    }
  }

  /**
   * ✅ Subscribe to status changes
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.statusChangeListeners.push(callback);
    
    // ✅ Call immediately with current state
    setTimeout(() => {
      callback({
        isInitialized: this.isInitialized,
        isPremium: this.isPremium,
        isAdmin: this.isAdmin,
        premiumStatusLoaded: this.premiumStatusLoaded,
        shouldShowAds: this.shouldShowAds()
      });
    }, 0);
    
    return () => {
      this.statusChangeListeners = this.statusChangeListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * ✅ Notify all listeners (call this after ANY status change)
   */
  notifyStatusChange() {
    const status = {
      isInitialized: this.isInitialized,
      isPremium: this.isPremium,
      isAdmin: this.isAdmin,
      premiumStatusLoaded: this.premiumStatusLoaded,
      shouldShowAds: this.shouldShowAds()
    };
    
    console.log('[AdMob] 📢 Broadcasting status to', this.statusChangeListeners.length, 'listeners:', status);
    
    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.log('[AdMob] Error in listener:', error);
      }
    });
  }

  /**
   * ✅ CRITICAL: Pre-load premium/admin status IMMEDIATELY
   */
  async preloadPremiumStatus() {
    try {
      console.log('[AdMob] 📊 Loading premium/admin status from AsyncStorage...');
      
      const [premium, adminStatus] = await Promise.all([
        AsyncStorage.getItem('user_premium_status'),
        AsyncStorage.getItem('user_admin_status')
      ]);
      
      this.isPremium = premium === 'true';
      this.isAdmin = adminStatus === 'true';
      this.premiumStatusLoaded = true;
      
      console.log('[AdMob] ✅ Status loaded from storage:');
      console.log('[AdMob]    - Premium:', this.isPremium);
      console.log('[AdMob]    - Admin:', this.isAdmin);
      console.log('[AdMob]    - Should show ads:', this.shouldShowAds());
      
      // ✅ Notify listeners immediately
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      
      return this.isPremium || this.isAdmin;
    } catch (error) {
      console.log('[AdMob] ⚠️ Error loading status (defaulting to free user):', error);
      this.isPremium = false;
      this.isAdmin = false;
      this.premiumStatusLoaded = true;
      
      // ✅ Still notify listeners
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(false);
      return false;
    }
  }

  /**
   * Subscribe to premium status changes
   */
  onPremiumStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.premiumStatusListeners.push(callback);
    
    if (this.premiumStatusLoaded) {
      setTimeout(() => {
        callback(this.isPremium || this.isAdmin);
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
    console.log('[AdMob] 📢 Broadcasting premium status:', isPremiumOrAdmin, 'to', this.premiumStatusListeners.length, 'listeners');
    
    this.premiumStatusListeners.forEach(listener => {
      try {
        listener(isPremiumOrAdmin);
      } catch (error) {
        console.log('[AdMob] Error in premium listener:', error);
      }
    });
  }

  /**
   * ✅ FIXED: Non-blocking Initialize AdMob SDK
   */
  async initialize() {
    try {
      if (this.initializationAttempted) {
        console.log('[AdMob] ⚠️ Already attempted initialization');
        return this.isInitialized;
      }
      
      this.initializationAttempted = true;
      this.initializationDetails = [];

      // Check platform
      if (Platform.OS === 'web') {
        console.log('[AdMob] ℹ️ Web platform - ads not supported');
        this.initializationDetails.push('Web platform');
        return false;
      }

      // Check SDK
      if (!sdkAvailable || !mobileAds) {
        console.log('[AdMob] ⚠️ SDK not available (requires EAS build)');
        this.initializationDetails.push('SDK not available');
        this.initializationError = 'SDK not available';
        return false;
      }

      console.log('[AdMob] 🚀 Starting AdMob initialization...');

      // ✅ Wait for premium status if not loaded yet
      if (!this.premiumStatusLoaded) {
        console.log('[AdMob] ⏳ Waiting for premium status to load...');
        await this.preloadPremiumStatus();
      }
      
      console.log('[AdMob] 👤 User type:', this.isPremium || this.isAdmin ? 'PREMIUM/ADMIN' : 'FREE');
      this.initializationDetails.push(`Premium: ${this.isPremium}, Admin: ${this.isAdmin}`);

      // Initialize SDK
      console.log('[AdMob] 📡 Calling mobileAds().initialize()...');
      await mobileAds().initialize();
      
      console.log('[AdMob] ✅✅✅ ADMOB INITIALIZED SUCCESSFULLY! ✅✅✅');
      this.isInitialized = true;
      this.initializationError = null;
      this.initializationDetails.push('Initialized successfully');
      
      // ✅ Notify all listeners
      this.notifyStatusChange();
      this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      
      // Load ads for free users
      if (!this.isPremium && !this.isAdmin && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        console.log('[AdMob] 🎯 User is FREE - loading ads...');
        setTimeout(() => this.createAndLoadAds(), 500);
      } else {
        console.log('[AdMob] 👑 Premium/Admin user - ads disabled');
        this.initializationDetails.push('Premium/Admin - ads disabled');
      }
      
      return true;

    } catch (error) {
      console.log('[AdMob] ❌ Initialization error:', error.message);
      console.log('[AdMob] ❌ Error stack:', error.stack);
      this.isInitialized = false;
      this.initializationError = error.message;
      this.initializationDetails.push(`Error: ${error.message}`);
      
      // ✅ Still notify listeners
      this.notifyStatusChange();
      return false;
    }
  }

  /**
   * Create and load ads
   */
  createAndLoadAds() {
    console.log('[AdMob] 🎬 Creating ads...');
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
   * Get banner config
   */
  getBannerConfig() {
    // ✅ FIX: Only check basic requirements, not shouldShowAds
    // The component will handle display logic
    if (!BannerAdSize || Platform.OS === 'web') {
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
      
      await Promise.all([
        AsyncStorage.setItem('user_premium_status', isPremium.toString()),
        AsyncStorage.setItem('user_admin_status', isAdmin.toString())
      ]);
      
      console.log('[AdMob] ✅ Status updated in storage:');
      console.log('[AdMob]    - Premium:', isPremium);
      console.log('[AdMob]    - Admin:', isAdmin);
      
      const newStatus = isPremium || isAdmin;
      if (oldStatus !== newStatus) {
        // ✅ Notify all listeners
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
   * ✅ Check if ads should show
   */
  shouldShowAds() {
    const result = this.isInitialized && 
           !this.isPremium && 
           !this.isAdmin &&
           Platform.OS !== 'web' && 
           sdkAvailable &&
           this.premiumStatusLoaded;
    
    // Log periodically for debugging
    if (Math.random() < 0.1) { // 10% of calls
      console.log('[AdMob] shouldShowAds():', result, {
        isInitialized: this.isInitialized,
        isPremium: this.isPremium,
        isAdmin: this.isAdmin,
        platform: Platform.OS,
        sdkAvailable,
        premiumStatusLoaded: this.premiumStatusLoaded
      });
    }
    
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
      initializationDetails: this.initializationDetails,
      isPremium: this.isPremium,
      isAdmin: this.isAdmin,
      premiumStatusLoaded: this.premiumStatusLoaded,
      sdkAvailable: sdkAvailable,
      platform: Platform.OS,
      interstitialLoaded: this.interstitialLoaded,
      rewardedLoaded: this.rewardedLoaded,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount,
      config: {
        bannerAdUnitId: getAdUnitId('BANNER'),
        interstitialAdUnitId: getAdUnitId('INTERSTITIAL'),
        rewardedAdUnitId: getAdUnitId('REWARDED'),
        debugMode: ADMOB_CONFIG.DEBUG_MODE,
      }
    };
  }

  /**
   * Logging
   */
  log(...args) {
    if (ADMOB_CONFIG.DEBUG_MODE) {
      console.log('[AdMob]', ...args);
    }
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