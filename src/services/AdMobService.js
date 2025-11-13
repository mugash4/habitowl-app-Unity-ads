/**
 * Google AdMob Service - INSTANT BANNER DISPLAY FIX
 * ✅ Premium status loads SYNCHRONOUSLY from cache
 * ✅ Banner displays immediately without loading delay
 * ✅ No flickering - status is ready before UI renders
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
    
    // ✅ CRITICAL FIX: Load premium status synchronously from cache FIRST
    this.loadPremiumStatusSync();
    
    // Then initialize SDK in background
    if (Platform.OS !== 'web' && sdkAvailable && mobileAds) {
      this.initializeSDK();
    }
  }

  /**
   * ✅ SYNCHRONOUS premium status load from cache
   * This ensures status is available BEFORE any UI renders
   */
  loadPremiumStatusSync() {
    // Try to load from cache synchronously (non-async fallback)
    try {
      // Attempt synchronous read (works for cached values)
      const cached = this._getCachedStatus();
      if (cached !== null) {
        this.isPremium = cached.isPremium;
        this.isAdmin = cached.isAdmin;
        this.premiumStatusLoaded = true;
        console.log('[AdMob] ✅ Status loaded from cache:', {
          premium: this.isPremium,
          admin: this.isAdmin
        });
        return;
      }
    } catch (e) {
      // Ignore sync read errors
    }
    
    // Fallback: Load asynchronously but mark as "loading free user" default
    this.isPremium = false;
    this.isAdmin = false;
    this.premiumStatusLoaded = true; // Mark as loaded with defaults
    
    // Then update asynchronously
    AsyncStorage.multiGet(['user_premium_status', 'user_admin_status'])
      .then(([[, premium], [, adminStatus]]) => {
        const wasPremium = this.isPremium;
        const wasAdmin = this.isAdmin;
        
        this.isPremium = premium === 'true';
        this.isAdmin = adminStatus === 'true';
        
        // Only notify if status changed
        if (wasPremium !== this.isPremium || wasAdmin !== this.isAdmin) {
          console.log('[AdMob] ✅ Status updated from AsyncStorage:', {
            premium: this.isPremium,
            admin: this.isAdmin
          });
          this.notifyStatusChange();
          this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
        }
      })
      .catch(error => {
        console.log('[AdMob] AsyncStorage read error:', error);
      });
  }

  /**
   * Try to get cached status from memory (if previously loaded)
   */
  _getCachedStatus() {
    // This will be null on first load, but fast on subsequent loads
    return null; // Could implement in-memory cache here if needed
  }

  /**
   * ✅ Initialize SDK in background (non-blocking)
   */
  async initializeSDK() {
    try {
      console.log('[AdMob] 📡 Initializing SDK...');
      await mobileAds().initialize();
      this.isInitialized = true;
      this.initializationAttempted = true;
      console.log('[AdMob] ✅ SDK initialized');
      
      this.notifyStatusChange();
      
      // Load ads if free user
      if (!this.isPremium && !this.isAdmin && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        setTimeout(() => this.createAndLoadAds(), 500);
      }
    } catch (error) {
      console.log('[AdMob] ❌ SDK init error:', error.message);
      this.initializationError = error.message;
      this.initializationAttempted = true;
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.statusChangeListeners.push(callback);
    
    // Call immediately with current state
    setTimeout(() => {
      if (this.statusChangeListeners.includes(callback)) {
        try {
          callback(this.getStatus());
        } catch (error) {
          console.log('[AdMob] Error in callback:', error);
        }
      }
    }, 0);
    
    return () => {
      this.statusChangeListeners = this.statusChangeListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyStatusChange() {
    const status = this.getStatus();
    this.statusChangeListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.log('[AdMob] Error in listener:', error);
      }
    });
  }

  /**
   * Reload premium status (for explicit refreshes)
   */
  async preloadPremiumStatus() {
    try {
      const [[, premium], [, adminStatus]] = await AsyncStorage.multiGet([
        'user_premium_status',
        'user_admin_status'
      ]);
      
      const wasPremium = this.isPremium;
      const wasAdmin = this.isAdmin;
      
      this.isPremium = premium === 'true';
      this.isAdmin = adminStatus === 'true';
      this.premiumStatusLoaded = true;
      
      if (wasPremium !== this.isPremium || wasAdmin !== this.isAdmin) {
        console.log('[AdMob] ✅ Status refreshed:', {
          premium: this.isPremium,
          admin: this.isAdmin
        });
        this.notifyStatusChange();
        this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      }
    } catch (error) {
      console.log('[AdMob] Error reloading status:', error);
    }
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
   * Notify premium status change
   */
  notifyPremiumStatusChange(isPremiumOrAdmin) {
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
    console.log('[AdMob] ℹ️ initialize() called (already initialized on construction)');
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
   * ✅ Get banner config - Returns immediately
   */
  getBannerConfig() {
    if (!BannerAdSize || Platform.OS === 'web') {
      return null;
    }

    // Status is always loaded (synchronously) now
    if (this.isPremium || this.isAdmin) {
      return null;
    }

    return {
      adUnitId: getAdUnitId('BANNER'),
      size: BannerAdSize.BANNER,
    };
  }

  /**
   * Set premium status
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
          console.log('[AdMob] 👑 Upgraded to premium - disabling ads');
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
   * Should show ads (for interstitial/rewarded)
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

// ✅ Create singleton - initializes immediately
const adMobService = new AdMobService();

export default adMobService;
export { AdMobService };
