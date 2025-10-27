/**
 * Unity Ads Service - COMPLETE FIX FOR FREE PLAN
 * 
 * ✅ FIXED ISSUES:
 * - Corrected API usage for LevelPlayInterstitialAd and LevelPlayRewardedAd
 * - Fixed placement ID handling
 * - Proper initialization sequence
 * - Better error handling and logging
 * 
 * CRITICAL FIX: Changed from createInterstitialAd/createRewardedAd to proper constructor usage
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
let AdFormat = null;
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
  AdFormat = ironSourceModule.AdFormat;
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
    
    // Placement tracking
    this.activePlacements = {
      banner: null,
      interstitial: null,
      rewarded: null
    };
    
    // Premium status listeners
    this.premiumStatusListeners = [];
  }

  /**
   * 🆕 Pre-load premium status BEFORE initialization
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

      // 🆕 Enable test mode if configured
      if (this.isTestMode) {
        try {
          this.log('🧪 Enabling test mode...');
          
          // Enable test mode in SDK
          if (IronSource && IronSource.validateIntegration) {
            await IronSource.validateIntegration();
            this.log('✅ Integration validated');
          }
          
          // Enable adapters debug
          if (IronSource && IronSource.setAdaptersDebug) {
            await IronSource.setAdaptersDebug(true);
            this.log('✅ Adapters debug enabled');
          }
          
          // Enable console logs (if available)
          if (IronSource && IronSource.setConsoleLogLevel) {
            await IronSource.setConsoleLogLevel('DEBUG');
            this.log('✅ Console log level set to DEBUG');
          }
        } catch (error) {
          this.log('⚠️ Could not enable full test mode:', error.message);
          // Continue anyway
        }
      }

      // Create initialization request
      const initRequestBuilder = LevelPlayInitRequest.builder(gameId)
        .withLegacyAdFormats([
          AdFormat.REWARDED,
          AdFormat.INTERSTITIAL,
          AdFormat.BANNER
        ]);

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
          
          // Setup ad units if not premium
          if (!this.isPremium) {
            this.log('🎯 Non-premium user: Setting up ad units');
            this.setupAdUnits();
          } else {
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
   * 🆕 Get placement ID with fallback support
   */
  getPlacementId(adType) {
    const platform = Platform.OS;
    const prefix = platform === 'ios' ? 'IOS' : 'ANDROID';
    const type = adType.toUpperCase();
    
    // Try default placement first
    const defaultKey = `${prefix}_${type}`;
    const defaultPlacement = UNITY_ADS_CONFIG[defaultKey];
    
    // Try fallback placement
    const fallbackKey = `${prefix}_${type}_FALLBACK`;
    const fallbackPlacement = UNITY_ADS_CONFIG[fallbackKey];
    
    // Use default, or fallback if default doesn't exist
    const placement = defaultPlacement || fallbackPlacement;
    
    this.log(`📍 Placement for ${adType}: ${placement} (${defaultKey})`);
    
    return placement;
  }

  /**
   * Setup all ad units - CRITICAL FIX HERE
   */
  setupAdUnits() {
    this.log('Setting up ad units...');
    
    try {
      this.setupInterstitialAd();
      this.setupRewardedAd();
      this.log('✅ Ad units setup complete');
      this.initializationDetails.push('✅ Ad units configured');
    } catch (error) {
      this.log('❌ Error setting up ad units:', error);
      this.initializationDetails.push(`Ad setup error: ${error.message}`);
    }
  }

  /**
   * Setup Interstitial Ads - FIXED API USAGE
   */
  setupInterstitialAd() {
    try {
      if (!LevelPlayInterstitialAd) {
        this.log('⚠️ LevelPlayInterstitialAd not available');
        return;
      }

      const placementId = this.getPlacementId('INTERSTITIAL');
      this.activePlacements.interstitial = placementId;

      this.log(`🎬 Setting up interstitial: ${placementId}`);

      // ✅ CRITICAL FIX: Use "new" constructor instead of "createInterstitialAd"
      this.interstitialAd = new LevelPlayInterstitialAd(placementId);

      // Set up listeners
      const listener = {
        onAdLoaded: (adInfo) => {
          this.log('✅ Interstitial loaded:', JSON.stringify(adInfo));
          this.interstitialLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('❌ Interstitial load failed:', JSON.stringify(error));
          this.interstitialLoaded = false;
          // Retry after delay
          setTimeout(() => {
            if (this.shouldShowAds()) {
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
          this.interstitialLoaded = false;
          this.loadInterstitialAd();
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Interstitial clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('🚪 Interstitial closed');
          this.interstitialLoaded = false;
          setTimeout(() => this.loadInterstitialAd(), 1000);
        },
        onAdInfoChanged: (adInfo) => {
          this.log('🔄 Interstitial info changed:', JSON.stringify(adInfo));
        }
      };

      this.interstitialAd.setListener(listener);

      // Load first ad
      this.loadInterstitialAd();

    } catch (error) {
      this.log('❌ Error setting up interstitial:', error);
    }
  }

  /**
   * Setup Rewarded Ads - FIXED API USAGE
   */
  setupRewardedAd() {
    try {
      if (!LevelPlayRewardedAd) {
        this.log('⚠️ LevelPlayRewardedAd not available');
        return;
      }

      const placementId = this.getPlacementId('REWARDED');
      this.activePlacements.rewarded = placementId;

      this.log(`🎁 Setting up rewarded: ${placementId}`);

      // ✅ CRITICAL FIX: Use "new" constructor instead of "createRewardedAd"
      this.rewardedAd = new LevelPlayRewardedAd(placementId);

      // Set up listeners
      const listener = {
        onAdLoaded: (adInfo) => {
          this.log('✅ Rewarded loaded:', JSON.stringify(adInfo));
          this.rewardedLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('❌ Rewarded load failed:', JSON.stringify(error));
          this.rewardedLoaded = false;
          setTimeout(() => {
            this.log('🔄 Retrying rewarded load...');
            this.loadRewardedAd();
          }, 10000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('👁️ Rewarded displayed');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('❌ Rewarded display failed:', JSON.stringify(error));
          this.rewardedLoaded = false;
          this.loadRewardedAd();
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Rewarded clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('🚪 Rewarded closed');
          this.rewardedLoaded = false;
          setTimeout(() => this.loadRewardedAd(), 1000);
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
      };

      this.rewardedAd.setListener(listener);

      // Load first ad
      this.loadRewardedAd();

    } catch (error) {
      this.log('❌ Error setting up rewarded:', error);
    }
  }

  /**
   * Load Interstitial Ad
   */
  async loadInterstitialAd() {
    if (!this.shouldShowAds() || !this.interstitialAd) {
      return;
    }

    try {
      this.log('📥 Loading interstitial...');
      await this.interstitialAd.loadAd();
    } catch (error) {
      this.log('❌ Error loading interstitial:', error);
    }
  }

  /**
   * Show Interstitial Ad
   */
  async showInterstitialAd(placementName = 'DefaultInterstitial') {
    if (!this.shouldShowAds()) {
      this.log('Ads disabled');
      return false;
    }

    if (!this.interstitialAd) {
      this.log('⚠️ Interstitial not available');
      return false;
    }

    // Check if ad is ready
    try {
      const isReady = await this.interstitialAd.isAdReady();
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
      await this.interstitialAd.showAd(placementName);
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
   * Load Rewarded Ad
   */
  async loadRewardedAd() {
    if (!this.isInitialized || !this.rewardedAd) {
      return;
    }

    try {
      this.log('📥 Loading rewarded...');
      await this.rewardedAd.loadAd();
    } catch (error) {
      this.log('❌ Error loading rewarded:', error);
    }
  }

  /**
   * Show Rewarded Ad
   */
  async showRewardedAd(onReward = null, placementName = 'DefaultRewarded') {
    if (!this.isInitialized || !this.rewardedAd) {
      this.log('⚠️ Rewarded not available');
      return false;
    }

    // Check if ad is ready
    try {
      const isReady = await this.rewardedAd.isAdReady();
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
      await this.rewardedAd.showAd(placementName);
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
    if (!this.isInitialized || !this.rewardedAd) {
      return false;
    }
    
    try {
      return await this.rewardedAd.isAdReady();
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

    const placementId = this.getPlacementId('BANNER');
    this.activePlacements.banner = placementId;

    return {
      placementId,
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
          this.log('User upgraded - cleaning up ads');
          this.cleanup();
        } else if (this.isInitialized) {
          this.log('User downgraded - setting up ads');
          this.setupAdUnits();
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
      interstitialLoaded: this.interstitialLoaded,
      rewardedLoaded: this.rewardedLoaded,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount,
      activePlacements: this.activePlacements,
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
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
  }
}

// Create and export singleton
const unityAdsService = new UnityAdsService();
export default unityAdsService;
export { UnityAdsService };