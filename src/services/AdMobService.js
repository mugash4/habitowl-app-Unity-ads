/**
 * ✅ COMPLETELY FIXED: Google AdMob Service
 * - More aggressive initialization
 * - Better status tracking
 * - Guaranteed readiness for banner ads
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
  console.log('✅ [AdMob] SDK modules loaded');
} catch (error) {
  console.log('ℹ️ [AdMob] SDK not available (normal in Expo Go):', error.message);
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
    
    // ✅ CRITICAL FIX: Better initialization tracking
    this.initializationInProgress = false;
    this.initializationAttempted = false;
    this.initializationError = null;
    this.initializationPromise = null;
    this.initializationComplete = false; // NEW: Explicit complete flag
    
    // Status change listeners
    this.statusChangeListeners = [];
    this.premiumStatusListeners = [];
    
    console.log('[AdMob] 🎬 Service created, starting initialization...');
    this.initializeAsync();
  }

  /**
   * ✅ FIXED: More robust async initialization
   */
  async initializeAsync() {
    if (this.initializationInProgress || this.initializationComplete) {
      console.log('[AdMob] ⚠️ Init already in progress or completed');
      return this.initializationPromise;
    }

    this.initializationInProgress = true;
    
    this.initializationPromise = (async () => {
      try {
        console.log('[AdMob] 🚀 Starting initialization sequence...');
        
        // Step 1: Load premium status from storage FIRST
        console.log('[AdMob] Step 1/4: Loading premium status...');
        await this.loadPremiumStatusAsync();
        console.log('[AdMob] ✅ Premium status loaded:', {
          premium: this.isPremium,
          admin: this.isAdmin
        });
        
        // ✅ FIX: Add delay after loading status
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Initialize SDK (if available and not web)
        if (Platform.OS !== 'web' && sdkAvailable && mobileAds) {
          console.log('[AdMob] Step 2/4: Initializing AdMob SDK...');
          await this.initializeSDK();
          
          // ✅ FIX: Wait for SDK to be fully ready
          console.log('[AdMob] Step 3/4: Waiting for SDK to be fully ready...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log('[AdMob] Step 2/4: Skipping SDK init (web or SDK unavailable)');
        }
        
        // Step 3: Mark as complete
        console.log('[AdMob] Step 4/4: Finalization...');
        this.initializationAttempted = true;
        this.initializationInProgress = false;
        this.initializationComplete = true; // ✅ NEW: Set complete flag
        
        // Notify all listeners
        this.notifyStatusChange();
        
        console.log('[AdMob] ✅ ✅ ✅ INITIALIZATION COMPLETE!');
        console.log('[AdMob] Final status:', this.getStatus());
        
        return true;
      } catch (error) {
        console.error('[AdMob] ❌ Initialization error:', error);
        this.initializationError = error.message;
        this.initializationAttempted = true;
        this.initializationInProgress = false;
        
        this.notifyStatusChange();
        return false;
      }
    })();

    return this.initializationPromise;
  }

  /**
   * ✅ Load premium status from storage
   */
  async loadPremiumStatusAsync() {
    try {
      const [[, premium], [, adminStatus]] = await AsyncStorage.multiGet([
        'user_premium_status', 
        'user_admin_status'
      ]);
      
      this.isPremium = premium === 'true';
      this.isAdmin = adminStatus === 'true';
      this.premiumStatusLoaded = true;
      
      console.log('[AdMob] Premium status loaded from storage:', {
        premium: this.isPremium,
        admin: this.isAdmin
      });
      
      // Notify premium listeners immediately
      this.notifyPremiumStatusChange(this.isPremium || this.isAdmin);
      
    } catch (error) {
      console.log('[AdMob] ⚠️ Failed to load status from storage, using defaults');
      this.isPremium = false;
      this.isAdmin = false;
      this.premiumStatusLoaded = true;
      
      // Still notify with defaults
      this.notifyPremiumStatusChange(false);
    }
  }

  /**
   * ✅ Initialize AdMob SDK
   */
  async initializeSDK() {
    try {
      console.log('[AdMob] 🔧 Initializing Google Mobile Ads SDK...');
      
      // Initialize the SDK
      await mobileAds().initialize();
      
      this.isInitialized = true;
      
      console.log('[AdMob] ✅ SDK initialized successfully');
      
      // ✅ FIX: Load ads after longer delay for free users
      if (!this.isPremium && !this.isAdmin && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        setTimeout(() => {
          console.log('[AdMob] 📱 Creating ads for free user...');
          this.createAndLoadAds();
        }, 2500); // Increased delay
      } else {
        console.log('[AdMob] ℹ️ Skipping ad creation (premium/admin or auto-load disabled)');
      }
      
    } catch (error) {
      console.log('[AdMob] ❌ SDK init error:', error.message);
      this.initializationError = error.message;
      throw error;
    }
  }

  /**
   * ✅ IMPROVED: Wait for initialization with better tracking
   */
  async waitForInitialization() {
    console.log('[AdMob] ⏳ Wait requested...');
    
    // If completely done, return immediately
    if (this.initializationComplete && this.premiumStatusLoaded) {
      console.log('[AdMob] ✅ Already fully initialized');
      return {
        success: true,
        isInitialized: this.isInitialized,
        premiumStatusLoaded: this.premiumStatusLoaded
      };
    }
    
    // If promise exists, wait for it
    if (this.initializationPromise) {
      console.log('[AdMob] ⏳ Waiting for initialization promise...');
      try {
        await this.initializationPromise;
      } catch (error) {
        console.log('[AdMob] ⚠️ Promise rejected:', error.message);
      }
    }
    
    // ✅ FIX: More aggressive polling
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max (100ms intervals)
    
    while (!this.initializationComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`[AdMob] Still waiting... (${attempts * 100}ms)`);
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('[AdMob] ⚠️ Timeout after 10s');
    }
    
    const status = {
      success: this.initializationComplete || attempts >= maxAttempts,
      isInitialized: this.isInitialized,
      premiumStatusLoaded: this.premiumStatusLoaded,
      error: this.initializationError
    };
    
    console.log('[AdMob] ✅ Wait complete:', status);
    return status;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback) {
    if (typeof callback !== 'function') return () => {};
    
    console.log('[AdMob] 📢 Status listener registered');
    this.statusChangeListeners.push(callback);
    
    // Call immediately if loaded
    if (this.premiumStatusLoaded && this.initializationComplete) {
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
    console.log('[AdMob] 📢 Notifying', this.statusChangeListeners.length, 'status listeners');
    
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
    
    console.log('[AdMob] 📢 Premium listener registered');
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
    console.log('[AdMob] 📢 Notifying', this.premiumStatusListeners.length, 'premium listeners:', isPremiumOrAdmin);
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
   * ✅ FIXED: Get banner config - Only returns when FULLY ready
   */
  getBannerConfig() {
    if (!BannerAdSize || Platform.OS === 'web') {
      console.log('[AdMob] ⚠️ BannerAdSize not available or web platform');
      return null;
    }

    if (this.isPremium || this.isAdmin) {
      console.log('[AdMob] 👑 Premium/Admin - no banner');
      return null;
    }

    // ✅ FIX: Check complete initialization
    if (!this.initializationComplete) {
      console.log('[AdMob] ⏳ Initialization not complete yet');
      return null;
    }

    if (!this.premiumStatusLoaded) {
      console.log('[AdMob] ⏳ Premium status not loaded yet');
      return null;
    }

    if (!this.isInitialized) {
      console.log('[AdMob] ⏳ SDK not initialized yet');
      return null;
    }

    const config = {
      adUnitId: getAdUnitId('BANNER'),
      size: BannerAdSize.BANNER,
    };
    
    console.log('[AdMob] ✅ Banner config ready:', config.adUnitId);
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
           this.premiumStatusLoaded &&
           this.initializationComplete; // ✅ NEW: Check complete flag
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
      initializationInProgress: this.initializationInProgress,
      initializationComplete: this.initializationComplete, // ✅ NEW
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
