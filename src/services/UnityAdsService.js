/**
 * Unity Ads Service - COMPLETE FIX FOR FREE PLAN
 * 
 * ✅ FIXED ISSUES:
 * - Correct LevelPlay API usage (no constructors with placement IDs)
 * - Removed problematic withLegacyAdFormats()
 * - Automatic ad loading after initialization
 * - Proper error handling and logging
 * - Test mode support
 * 
 * CRITICAL FIXES:
 * 1. Use LevelPlayInterstitialAd.loadAd() directly (no placement ID in constructor)
 * 2. Use LevelPlayRewardedAd.loadAd() directly (no placement ID in constructor)
 * 3. Removed withLegacyAdFormats() call
 * 4. Added automatic ad preloading
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UNITY_ADS_CONFIG } from '../config/unityAdsConfig';

// Import IronSource SDK components
let LevelPlay = null;
let LevelPlayInitRequest = null;
let LevelPlayBannerAdView = null;
let LevelPlayInterstitialAd = null;
let LevelPlayRewardedAd = null;
let LevelPlayBannerAdViewMethods = null;
let IronSource = null;
let LevelPlayAdSize = null;

// SDK availability flag
let sdkAvailable = false;

// Try to import the SDK
try {
  const ironSourceModule = require('ironsource-mediation');
  LevelPlay = ironSourceModule.LevelPlay;
  LevelPlayInitRequest = ironSourceModule.LevelPlayInitRequest;
  LevelPlayBannerAdView = ironSourceModule.LevelPlayBannerAdView;
  LevelPlayInterstitialAd = ironSourceModule.LevelPlayInterstitialAd;
  LevelPlayRewardedAd = ironSourceModule.LevelPlayRewardedAd;
  LevelPlayBannerAdViewMethods = ironSourceModule.LevelPlayBannerAdViewMethods;
  IronSource = ironSourceModule.IronSource;
  LevelPlayAdSize = ironSourceModule.LevelPlayAdSize;
  sdkAvailable = true;
  console.log('✅ Unity Ads SDK loaded successfully');
} catch (error) {
  console.log('ℹ️ Unity Ads SDK not available:', error.message);
  console.log('   This is normal for Expo Go or web builds');
  console.log('   For production: Build with EAS Build');
}

class UnityAdsService {
  constructor() {
    this.isInitialized = false;
    this.isPremium = false;
    this.premiumStatusLoaded = false;
    this.isTestMode = __DEV__ || UNITY_ADS_CONFIG.FORCE_TEST_MODE;
    
    // Ad state tracking
    this.lastInterstitialTime = 0;
    this.sessionInterstitialCount = 0;
    this.interstitialAvailable = false;
    this.rewardedAvailable = false;
    this.rewardCallback = null;
    
    // Initialization state
    this.initializationAttempted = false;
    this.initializationError = null;
    this.initializationDetails = [];
    
    // Premium status listeners
    this.premiumStatusListeners = [];
    
    // Setup listeners BEFORE initialization
    this.setupInterstitialListeners();
    this.setupRewardedListeners();
  }

  /**
   * Pre-load premium status BEFORE initialization
   */
  async preloadPremiumStatus() {
    try {
      this.log('📊 Loading premium status...');
      const premium = await AsyncStorage.getItem('user_premium_status');
      this.isPremium = premium === 'true';
      this.premiumStatusLoaded = true;
      this.log(`✅ Premium status loaded: ${this.isPremium ? 'PREMIUM' : 'FREE'}`);
      
      // Notify listeners
      this.notifyPremiumStatusChange(this.isPremium);
      
      return this.isPremium;
    } catch (error) {
      this.log('⚠️ Error loading premium status:', error);
      this.isPremium = false;
      this.premiumStatusLoaded = true;
      return false;
    }
  }

  /**
   * Subscribe to premium status changes
   */
  onPremiumStatusChange(callback) {
    this.premiumStatusListeners.push(callback);
    if (this.premiumStatusLoaded) {
      callback(this.isPremium);
    }
    return () => {
      this.premiumStatusListeners = this.premiumStatusListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners of premium status change
   */
  notifyPremiumStatusChange(isPremium) {
    this.premiumStatusListeners.forEach(listener => {
      try {
        listener(isPremium);
      } catch (error) {
        this.log('Error in premium status listener:', error);
      }
    });
  }

  /**
   * Initialize Unity Ads SDK - FIXED VERSION
   * ✅ NO withLegacyAdFormats()
   * ✅ Correct initialization sequence
   */
  async initialize(userId = null) {
    try {
      // Prevent multiple initialization
      if (this.initializationAttempted) {
        this.log('⚠️ Initialization already attempted');
        return this.isInitialized;
      }
      
      this.initializationAttempted = true;
      this.initializationDetails = [];

      // Check platform
      if (Platform.OS === 'web') {
        const msg = 'Web platform - Unity Ads not supported';
        this.log(`ℹ️ ${msg}`);
        this.initializationDetails.push(msg);
        return false;
      }

      // Check SDK availability
      if (!sdkAvailable || !LevelPlay || !IronSource) {
        const msg = 'SDK not available - Need EAS build for production';
        this.log(`⚠️ ${msg}`);
        this.initializationDetails.push(msg);
        this.initializationError = 'SDK not available';
        return false;
      }

      this.log('🚀 Initializing Unity Ads...');

      // Ensure premium status is loaded
      if (!this.premiumStatusLoaded) {
        this.log('⏳ Waiting for premium status...');
        await this.preloadPremiumStatus();
      }

      // Get Game ID
      const gameId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_GAME_ID 
        : UNITY_ADS_CONFIG.ANDROID_GAME_ID;

      // Validate Game ID
      if (!gameId || gameId.includes('YOUR_')) {
        const msg = 'Game ID not configured in unityAdsConfig.js';
        console.warn(`⚠️ ${msg}`);
        this.initializationDetails.push(msg);
        this.initializationError = 'Invalid Game ID';
        return false;
      }

      this.log(`🎮 Game ID: ${gameId}`);
      this.log(`👤 User: ${this.isPremium ? 'PREMIUM' : 'FREE'}`);
      this.log(`🧪 Test Mode: ${this.isTestMode ? 'ENABLED' : 'DISABLED'}`);
      
      this.initializationDetails.push(`Game ID: ${gameId}`);
      this.initializationDetails.push(`Premium: ${this.isPremium}`);
      this.initializationDetails.push(`Test Mode: ${this.isTestMode}`);

      // ✅ CRITICAL FIX: Simple initialization without withLegacyAdFormats
      const initRequestBuilder = LevelPlayInitRequest.builder(gameId);

      // Add user ID if provided
      if (userId) {
        initRequestBuilder.withUserId(userId);
        this.log(`👤 User ID: ${userId}`);
        this.initializationDetails.push(`User ID: ${userId}`);
      }

      const initRequest = initRequestBuilder.build();

      // Set up initialization listener
      const initListener = {
        onInitFailed: (error) => {
          const errorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
          this.log('❌ Unity Ads initialization failed:', errorMsg);
          this.isInitialized = false;
          this.initializationError = errorMsg;
          this.initializationDetails.push(`Init Failed: ${errorMsg}`);
        },
        onInitSuccess: (configuration) => {
          this.log('✅ Unity Ads initialized successfully!');
          this.log('Configuration:', JSON.stringify(configuration));
          this.isInitialized = true;
          this.initializationError = null;
          this.initializationDetails.push('✅ Initialized successfully');
          
          // Start loading ads if not premium
          if (!this.isPremium && UNITY_ADS_CONFIG.AUTO_LOAD_ADS) {
            this.log('🎯 Non-premium user: Starting ad preload');
            setTimeout(() => {
              this.startAdPreloading();
            }, 1000);
          } else if (this.isPremium) {
            this.log('👑 Premium user: Ads disabled');
            this.initializationDetails.push('Premium user - ads disabled');
          }
        }
      };

      // Initialize the SDK
      this.log('📡 Calling LevelPlay.init...');
      await LevelPlay.init(initRequest, initListener);
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (this.isInitialized) {
        this.log('✅ Unity Ads ready!');
      } else {
        this.log('⚠️ Unity Ads initialization pending...');
      }
      
      return this.isInitialized;

    } catch (error) {
      const errorMsg = error.message || String(error);
      this.log('❌ Error initializing Unity Ads:', errorMsg);
      this.log('Stack:', error.stack);
      this.isInitialized = false;
      this.initializationError = errorMsg;
      this.initializationDetails.push(`Error: ${errorMsg}`);
      return false;
    }
  }

  /**
   * ✅ CRITICAL FIX: Setup interstitial listeners WITHOUT placement ID
   */
  setupInterstitialListeners() {
    try {
      if (!LevelPlayInterstitialAd) {
        this.log('⚠️ LevelPlayInterstitialAd not available');
        return;
      }

      this.log('🎬 Setting up interstitial listeners');

      // ✅ CORRECT: Set listeners on the CLASS, not an instance
      LevelPlayInterstitialAd.setListener({
        onAdLoaded: (adInfo) => {
          this.log('✅ Interstitial loaded:', JSON.stringify(adInfo));
          this.interstitialAvailable = true;
        },
        onAdLoadFailed: (error) => {
          this.log('❌ Interstitial load failed:', JSON.stringify(error));
          this.interstitialAvailable = false;
          // Retry after delay
          setTimeout(() => {
            if (this.shouldShowAds() && this.isInitialized) {
              this.log('🔄 Retrying interstitial load...');
              this.loadInterstitialAd();
            }
          }, 10000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('👁️ Interstitial displayed');
          this.trackAdImpression('interstitial');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('❌ Interstitial display failed:', JSON.stringify(error));
          this.interstitialAvailable = false;
          this.loadInterstitialAd();
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Interstitial clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('🚪 Interstitial closed');
          this.interstitialAvailable = false;
          // Reload next ad
          setTimeout(() => {
            if (this.shouldShowAds() && this.isInitialized) {
              this.loadInterstitialAd();
            }
          }, 1000);
        },
        onAdInfoChanged: (adInfo) => {
          this.log('🔄 Interstitial info changed:', JSON.stringify(adInfo));
        }
      });

    } catch (error) {
      this.log('❌ Error setting up interstitial listeners:', error);
    }
  }

  /**
   * ✅ CRITICAL FIX: Setup rewarded listeners WITHOUT placement ID
   */
  setupRewardedListeners() {
    try {
      if (!LevelPlayRewardedAd) {
        this.log('⚠️ LevelPlayRewardedAd not available');
        return;
      }

      this.log('🎁 Setting up rewarded listeners');

      // ✅ CORRECT: Set listeners on the CLASS, not an instance
      LevelPlayRewardedAd.setListener({
        onAdLoaded: (adInfo) => {
          this.log('✅ Rewarded loaded:', JSON.stringify(adInfo));
          this.rewardedAvailable = true;
        },
        onAdLoadFailed: (error) => {
          this.log('❌ Rewarded load failed:', JSON.stringify(error));
          this.rewardedAvailable = false;
          setTimeout(() => {
            if (this.isInitialized) {
              this.log('🔄 Retrying rewarded load...');
              this.loadRewardedAd();
            }
          }, 10000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('👁️ Rewarded displayed');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('❌ Rewarded display failed:', JSON.stringify(error));
          this.rewardedAvailable = false;
          this.loadRewardedAd();
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Rewarded clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('🚪 Rewarded closed');
          this.rewardedAvailable = false;
          // Reload next ad
          setTimeout(() => {
            if (this.isInitialized) {
              this.loadRewardedAd();
            }
          }, 1000);
        },
        onAdRewarded: (reward, adInfo) => {
          this.log('🎁 User rewarded:', JSON.stringify(reward));
          this.trackAdImpression('rewarded');
          
          if (this.rewardCallback) {
            this.rewardCallback(reward);
            this.rewardCallback = null;
          }
        },
        onAdInfoChanged: (adInfo) => {
          this.log('🔄 Rewarded info changed:', JSON.stringify(adInfo));
        }
      });

    } catch (error) {
      this.log('❌ Error setting up rewarded listeners:', error);
    }
  }

  /**
   * ✅ NEW: Start preloading all ad types
   */
  startAdPreloading() {
    this.log('🎯 Starting ad preloading...');
    this.loadInterstitialAd();
    this.loadRewardedAd();
  }

  /**
   * ✅ CRITICAL FIX: Load interstitial WITHOUT placement ID
   */
  async loadInterstitialAd() {
    if (!this.shouldShowAds() || !LevelPlayInterstitialAd) {
      return;
    }

    try {
      this.log('📥 Loading interstitial...');
      // ✅ CORRECT: Call loadAd() directly on the class
      await LevelPlayInterstitialAd.loadAd();
      this.log('✅ Interstitial load requested');
    } catch (error) {
      this.log('❌ Error loading interstitial:', error);
    }
  }

  /**
   * ✅ CRITICAL FIX: Show interstitial WITHOUT placement ID
   */
  async showInterstitialAd(placementName = 'DefaultInterstitial') {
    if (!this.shouldShowAds()) {
      this.log('Ads disabled');
      return false;
    }

    if (!LevelPlayInterstitialAd) {
      this.log('⚠️ Interstitial not available');
      return false;
    }

    // Check if ad is ready
    try {
      const isReady = await LevelPlayInterstitialAd.isAdReady();
      if (!isReady) {
        this.log('⚠️ Interstitial not ready');
        this.loadInterstitialAd();
        return false;
      }
    } catch (error) {
      this.log('⚠️ Error checking interstitial ready state:', error);
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastInterstitialTime < UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
      const remaining = Math.ceil((UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN - (now - this.lastInterstitialTime)) / 1000);
      this.log(`⏳ Cooldown: ${remaining}s`);
      return false;
    }

    // Check session limit
    if (this.sessionInterstitialCount >= UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      this.log('⚠️ Session limit reached');
      return false;
    }

    try {
      this.log(`📺 Showing interstitial (${placementName})...`);
      // ✅ CORRECT: Call showAd() on the class
      await LevelPlayInterstitialAd.showAd(placementName);
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      this.log(`✅ Shown (${this.sessionInterstitialCount}/${UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION})`);
      return true;
    } catch (error) {
      this.log('❌ Error showing interstitial:', error);
      return false;
    }
  }

  /**
   * ✅ CRITICAL FIX: Load rewarded WITHOUT placement ID
   */
  async loadRewardedAd() {
    if (!this.isInitialized || !LevelPlayRewardedAd) {
      return;
    }

    try {
      this.log('📥 Loading rewarded...');
      // ✅ CORRECT: Call loadAd() directly on the class
      await LevelPlayRewardedAd.loadAd();
      this.log('✅ Rewarded load requested');
    } catch (error) {
      this.log('❌ Error loading rewarded:', error);
    }
  }

  /**
   * ✅ CRITICAL FIX: Show rewarded WITHOUT placement ID
   */
  async showRewardedAd(onReward = null, placementName = 'DefaultRewarded') {
    if (!this.isInitialized || !LevelPlayRewardedAd) {
      this.log('⚠️ Rewarded not available');
      return false;
    }

    // Check if ad is ready
    try {
      const isReady = await LevelPlayRewardedAd.isAdReady();
      if (!isReady) {
        this.log('⚠️ Rewarded not ready');
        this.loadRewardedAd();
        return false;
      }
    } catch (error) {
      this.log('⚠️ Error checking rewarded ready state:', error);
      return false;
    }

    try {
      this.rewardCallback = onReward;
      this.log(`📺 Showing rewarded (${placementName})...`);
      // ✅ CORRECT: Call showAd() on the class
      await LevelPlayRewardedAd.showAd(placementName);
      this.log('✅ Rewarded shown');
      return true;
    } catch (error) {
      this.log('❌ Error showing rewarded:', error);
      this.rewardCallback = null;
      return false;
    }
  }

  /**
   * Check if rewarded ad is ready
   */
  async isRewardedAdReady() {
    if (!this.isInitialized || !LevelPlayRewardedAd) {
      return false;
    }
    
    try {
      return await LevelPlayRewardedAd.isAdReady();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Banner Ad configuration
   */
  getBannerConfig() {
    if (!this.shouldShowAds() || !LevelPlayBannerAdView) {
      return null;
    }

    return {
      placementId: 'DefaultBanner',
      adSize: LevelPlayAdSize ? LevelPlayAdSize.BANNER : 'BANNER',
      Component: LevelPlayBannerAdView
    };
  }

  /**
   * Set premium status
   */
  async setPremiumStatus(isPremium) {
    try {
      const oldStatus = this.isPremium;
      this.isPremium = isPremium;
      this.premiumStatusLoaded = true;
      await AsyncStorage.setItem('user_premium_status', isPremium.toString());
      this.log('Premium status updated:', isPremium);
      
      if (oldStatus !== isPremium) {
        this.notifyPremiumStatusChange(isPremium);
        
        if (isPremium) {
          this.log('User upgraded - ads disabled');
        } else if (this.isInitialized) {
          this.log('User downgraded - starting ad preload');
          this.startAdPreloading();
        }
      }
    } catch (error) {
      this.log('Error setting premium status:', error);
    }
  }

  /**
   * Check if ads should be shown
   */
  shouldShowAds() {
    return this.isInitialized && 
           !this.isPremium && 
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
      this.log(`📊 Tracked: ${adType}`);
    } catch (error) {
      this.log('Error tracking impression:', error);
    }
  }

  /**
   * Get ad impression statistics
   */
  async getAdImpressionStats() {
    try {
      const impressions = await AsyncStorage.getItem('ad_impressions') || '[]';
      const impressionArray = JSON.parse(impressions);

      const stats = impressionArray.reduce((acc, impression) => {
        const type = impression.type;
        if (!acc[type]) acc[type] = 0;
        acc[type]++;
        return acc;
      }, {});

      return {
        total: impressionArray.length,
        byType: stats,
        recent: impressionArray.slice(-10)
      };
    } catch (error) {
      this.log('Error getting stats:', error);
      return { total: 0, byType: {}, recent: [] };
    }
  }

  /**
   * Get comprehensive status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      initializationAttempted: this.initializationAttempted,
      initializationError: this.initializationError,
      initializationDetails: this.initializationDetails,
      isPremium: this.isPremium,
      premiumStatusLoaded: this.premiumStatusLoaded,
      sdkAvailable: sdkAvailable,
      platform: Platform.OS,
      isTestMode: this.isTestMode,
      interstitialAvailable: this.interstitialAvailable,
      rewardedAvailable: this.rewardedAvailable,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount,
      config: {
        gameId: Platform.OS === 'ios' ? UNITY_ADS_CONFIG.IOS_GAME_ID : UNITY_ADS_CONFIG.ANDROID_GAME_ID,
        testMode: UNITY_ADS_CONFIG.FORCE_TEST_MODE,
        debugMode: UNITY_ADS_CONFIG.DEBUG_MODE,
      }
    };
  }

  /**
   * Logging helper
   */
  log(...args) {
    if (UNITY_ADS_CONFIG.DEBUG_MODE) {
      console.log('[Unity Ads]', ...args);
    }
  }

  /**
   * Clean up
   */
  cleanup() {
    this.log('Cleaning up');
    this.interstitialAvailable = false;
    this.rewardedAvailable = false;
  }
}

// Create and export singleton
const unityAdsService = new UnityAdsService();
export default unityAdsService;
export { UnityAdsService };
