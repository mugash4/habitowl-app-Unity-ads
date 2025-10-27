/**
 * Unity Ads Service - COMPLETE ClassCastException FIX
 * 
 * ✅ FIXED: Removed withLegacyAdFormats() which causes ClassCastException
 * ✅ FIXED: Removed unused AdFormat import that could cause issues
 * The SDK automatically detects all ad formats without explicit configuration
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
// ✅ REMOVED: AdFormat - not needed and can cause issues
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
  // ✅ REMOVED: AdFormat = ironSourceModule.AdFormat;
  IronSource = ironSourceModule.IronSource;
  LevelPlayAdSize = ironSourceModule.LevelPlayAdSize;
  sdkAvailable = true;
  console.log('✅ Unity Ads SDK loaded');
} catch (error) {
  console.log('ℹ️ Unity Ads SDK not available:', error.message);
  sdkAvailable = false;
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
    
    // Premium status listeners
    this.premiumStatusListeners = [];
  }

  /**
   * Pre-load premium status
   */
  async preloadPremiumStatus() {
    try {
      const premium = await AsyncStorage.getItem('user_premium_status');
      this.isPremium = premium === 'true';
      this.premiumStatusLoaded = true;
      this.log(`✅ Premium status loaded: ${this.isPremium ? 'YES' : 'NO'}`);
      this.notifyPremiumStatusChange(this.isPremium);
      return this.isPremium;
    } catch (error) {
      this.log('Premium status load warning:', error.message);
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
        this.log('Listener error:', error);
      }
    });
  }

  /**
   * Initialize Unity Ads - FIXED: No more ClassCastException!
   */
  async initialize(userId = null) {
    // Prevent multiple initialization attempts
    if (this.initializationAttempted) {
      this.log('⚠️ Already attempted initialization');
      return this.isInitialized;
    }
    
    this.initializationAttempted = true;

    try {
      // Check platform
      if (Platform.OS === 'web') {
        this.log('ℹ️ Web platform - ads not supported');
        return false;
      }

      // Check SDK availability
      if (!sdkAvailable || !LevelPlay || !IronSource) {
        this.log('⚠️ SDK not available - ads disabled');
        return false;
      }

      // Ensure premium status is loaded
      if (!this.premiumStatusLoaded) {
        await this.preloadPremiumStatus();
      }

      // Don't initialize for premium users
      if (this.isPremium) {
        this.log('ℹ️ Premium user - skipping ads initialization');
        return false;
      }

      this.log('🚀 Initializing Unity Ads...');

      // Get Game ID
      const gameId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_GAME_ID 
        : UNITY_ADS_CONFIG.ANDROID_GAME_ID;

      if (!gameId || gameId.includes('YOUR_')) {
        this.log('❌ Invalid Game ID configuration');
        return false;
      }

      this.log(`Game ID: ${gameId}`);
      this.log(`Test Mode: ${this.isTestMode}`);
      this.log(`Platform: ${Platform.OS}`);

      // ✅ CRITICAL FIX: Simplified initialization without withLegacyAdFormats()
      try {
        // Enable test mode if needed
        if (this.isTestMode && IronSource.setMetaData) {
          try {
            await IronSource.setMetaData('is_test_suite', 'enable');
            this.log('✅ Test mode enabled');
          } catch (metaError) {
            this.log('⚠️ Test mode setup warning:', metaError.message);
          }
        }

        // ✅ FIX: Create init request WITHOUT withLegacyAdFormats()
        // The SDK automatically detects and initializes all ad formats
        const initRequestBuilder = LevelPlayInitRequest.builder(gameId);
        
        // Add user ID if provided
        if (userId) {
          try {
            initRequestBuilder.withUserId(userId);
            this.log(`✅ User ID set: ${userId}`);
          } catch (userIdError) {
            this.log('⚠️ User ID setup warning:', userIdError.message);
          }
        }

        const initRequest = initRequestBuilder.build();
        this.log('✅ Init request created successfully');

        // Create initialization listener
        const initListener = {
          onInitFailed: (error) => {
            const errorMsg = error ? JSON.stringify(error) : 'Unknown error';
            this.log('❌ Initialization failed:', errorMsg);
            this.isInitialized = false;
            this.initializationError = errorMsg;
          },
          onInitSuccess: (configuration) => {
            this.log('✅ ✅ ✅ Initialization SUCCESS! ✅ ✅ ✅');
            this.isInitialized = true;
            this.initializationError = null;
            
            // Setup ads after successful initialization
            setTimeout(() => {
              try {
                this.log('Setting up ad units...');
                this.setupAdUnits();
              } catch (setupError) {
                this.log('⚠️ Ad setup warning:', setupError.message);
              }
            }, 500);
          }
        };

        // Initialize SDK
        this.log('Calling LevelPlay.init()...');
        await LevelPlay.init(initRequest, initListener);
        
        // Wait for callback
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const status = this.isInitialized ? '✅ SUCCESS' : '⏳ PENDING';
        this.log(`Initialization status: ${status}`);
        
        return this.isInitialized;

      } catch (initError) {
        this.log('❌ Initialization error:', initError.message);
        this.log('Error stack:', initError.stack);
        this.initializationError = initError.message;
        this.isInitialized = false;
        return false;
      }

    } catch (error) {
      this.log('❌ Fatal initialization error:', error.message);
      this.log('Error stack:', error.stack);
      this.initializationError = error.message;
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Setup ad units - CRASH-SAFE
   */
  setupAdUnits() {
    this.log('📱 Setting up ad units...');
    
    try {
      this.setupInterstitialAd();
      this.log('✅ Interstitial ad unit setup attempted');
    } catch (error) {
      this.log('⚠️ Interstitial setup error:', error.message);
    }
    
    try {
      this.setupRewardedAd();
      this.log('✅ Rewarded ad unit setup attempted');
    } catch (error) {
      this.log('⚠️ Rewarded setup error:', error.message);
    }
    
    this.log('✅ Ad units setup complete');
  }

  /**
   * Setup Interstitial Ad - CRASH-SAFE
   */
  setupInterstitialAd() {
    try {
      if (!LevelPlayInterstitialAd) {
        this.log('⚠️ LevelPlayInterstitialAd not available');
        return;
      }

      const placementId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_INTERSTITIAL 
        : UNITY_ADS_CONFIG.ANDROID_INTERSTITIAL;

      this.log(`🎬 Setting up Interstitial: ${placementId}`);

      // Create interstitial ad instance
      this.interstitialAd = new LevelPlayInterstitialAd(placementId);

      // Set up event listeners
      const listener = {
        onAdLoaded: (adInfo) => {
          this.log('✅ Interstitial ad loaded successfully');
          this.interstitialLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('⚠️ Interstitial load failed:', JSON.stringify(error));
          this.interstitialLoaded = false;
        },
        onAdDisplayed: (adInfo) => {
          this.log('📺 Interstitial ad displayed');
          this.trackAdImpression('interstitial');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('⚠️ Interstitial display failed:', JSON.stringify(error));
          this.interstitialLoaded = false;
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Interstitial ad clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('❌ Interstitial ad closed');
          this.interstitialLoaded = false;
          // Reload after close
          setTimeout(() => this.loadInterstitialAd(), 1000);
        },
        onAdInfoChanged: (adInfo) => {
          this.log('ℹ️ Interstitial ad info changed');
        }
      };

      this.interstitialAd.setListener(listener);
      
      // Load the first ad
      this.loadInterstitialAd();

    } catch (error) {
      this.log('❌ Interstitial setup failed:', error.message);
      this.interstitialAd = null;
    }
  }

  /**
   * Setup Rewarded Ad - CRASH-SAFE
   */
  setupRewardedAd() {
    try {
      if (!LevelPlayRewardedAd) {
        this.log('⚠️ LevelPlayRewardedAd not available');
        return;
      }

      const placementId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_REWARDED 
        : UNITY_ADS_CONFIG.ANDROID_REWARDED;

      this.log(`🎁 Setting up Rewarded: ${placementId}`);

      // Create rewarded ad instance
      this.rewardedAd = new LevelPlayRewardedAd(placementId);

      // Set up event listeners
      const listener = {
        onAdLoaded: (adInfo) => {
          this.log('✅ Rewarded ad loaded successfully');
          this.rewardedLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('⚠️ Rewarded load failed:', JSON.stringify(error));
          this.rewardedLoaded = false;
        },
        onAdDisplayed: (adInfo) => {
          this.log('📺 Rewarded ad displayed');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('⚠️ Rewarded display failed:', JSON.stringify(error));
          this.rewardedLoaded = false;
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Rewarded ad clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('❌ Rewarded ad closed');
          this.rewardedLoaded = false;
          // Reload after close
          setTimeout(() => this.loadRewardedAd(), 1000);
        },
        onAdRewarded: (reward, adInfo) => {
          this.log('🎉 ✅ User earned reward!', reward);
          this.trackAdImpression('rewarded');
          
          if (this.rewardCallback) {
            this.rewardCallback(reward);
            this.rewardCallback = null;
          }
        },
        onAdInfoChanged: (adInfo) => {
          this.log('ℹ️ Rewarded ad info changed');
        }
      };

      this.rewardedAd.setListener(listener);
      
      // Load the first ad
      this.loadRewardedAd();

    } catch (error) {
      this.log('❌ Rewarded setup failed:', error.message);
      this.rewardedAd = null;
    }
  }

  /**
   * Load Interstitial Ad
   */
  async loadInterstitialAd() {
    if (!this.shouldShowAds() || !this.interstitialAd) return;

    try {
      this.log('⏳ Loading interstitial ad...');
      await this.interstitialAd.loadAd();
    } catch (error) {
      this.log('⚠️ Interstitial load error:', error.message);
    }
  }

  /**
   * Show Interstitial Ad
   */
  async showInterstitialAd(placementName = 'DefaultInterstitial') {
    if (!this.shouldShowAds() || !this.interstitialAd) {
      this.log('⚠️ Cannot show interstitial: conditions not met');
      return false;
    }

    try {
      const isReady = await this.interstitialAd.isAdReady();
      if (!isReady) {
        this.log('⚠️ Interstitial not ready, loading...');
        this.loadInterstitialAd();
        return false;
      }

      // Check cooldown
      const now = Date.now();
      const cooldownRemaining = UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN - (now - this.lastInterstitialTime);
      if (cooldownRemaining > 0) {
        this.log(`⏰ Interstitial cooldown: ${Math.ceil(cooldownRemaining / 1000)}s remaining`);
        return false;
      }

      // Check session limit
      if (this.sessionInterstitialCount >= UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
        this.log('⚠️ Interstitial session limit reached');
        return false;
      }

      this.log('📺 Showing interstitial ad...');
      await this.interstitialAd.showAd(placementName);
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      return true;
    } catch (error) {
      this.log('❌ Interstitial show error:', error.message);
      return false;
    }
  }

  /**
   * Load Rewarded Ad
   */
  async loadRewardedAd() {
    if (!this.isInitialized || !this.rewardedAd) return;

    try {
      this.log('⏳ Loading rewarded ad...');
      await this.rewardedAd.loadAd();
    } catch (error) {
      this.log('⚠️ Rewarded load error:', error.message);
    }
  }

  /**
   * Show Rewarded Ad
   */
  async showRewardedAd(onReward = null, placementName = 'DefaultRewarded') {
    if (!this.isInitialized || !this.rewardedAd) {
      this.log('⚠️ Cannot show rewarded: not initialized or unavailable');
      return false;
    }

    try {
      const isReady = await this.rewardedAd.isAdReady();
      if (!isReady) {
        this.log('⚠️ Rewarded ad not ready, loading...');
        this.loadRewardedAd();
        return false;
      }

      this.log('📺 Showing rewarded ad...');
      this.rewardCallback = onReward;
      await this.rewardedAd.showAd(placementName);
      return true;
    } catch (error) {
      this.log('❌ Rewarded show error:', error.message);
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
   * Get Banner configuration
   */
  getBannerConfig() {
    if (!this.shouldShowAds() || !LevelPlayBannerAdView) {
      return null;
    }

    const placementId = Platform.OS === 'ios' 
      ? UNITY_ADS_CONFIG.IOS_BANNER 
      : UNITY_ADS_CONFIG.ANDROID_BANNER;

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
      this.log(`✅ Premium status updated: ${isPremium}`);
      
      if (oldStatus !== isPremium) {
        this.notifyPremiumStatusChange(isPremium);
        
        if (isPremium) {
          this.log('💎 User upgraded to premium - cleaning up ads');
          this.cleanup();
        } else if (this.isInitialized) {
          this.log('📱 User downgraded - setting up ads');
          this.setupAdUnits();
        }
      }
    } catch (error) {
      this.log('❌ Set premium error:', error.message);
    }
  }

  /**
   * Check if ads should be shown
   */
  shouldShowAds() {
    const result = this.isInitialized && 
           !this.isPremium && 
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

      // Keep only last 100 impressions
      if (impressionArray.length > 100) {
        impressionArray.splice(0, impressionArray.length - 100);
      }

      await AsyncStorage.setItem('ad_impressions', JSON.stringify(impressionArray));
      this.log(`✅ Tracked ${adType} impression`);
    } catch (error) {
      this.log('⚠️ Track impression error:', error.message);
    }
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      initializationAttempted: this.initializationAttempted,
      initializationError: this.initializationError,
      isPremium: this.isPremium,
      premiumStatusLoaded: this.premiumStatusLoaded,
      sdkAvailable: sdkAvailable,
      platform: Platform.OS,
      isTestMode: this.isTestMode,
      interstitialLoaded: this.interstitialLoaded,
      rewardedLoaded: this.rewardedLoaded,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount,
      lastInterstitialTime: this.lastInterstitialTime
    };
  }

  /**
   * Logging with timestamp
   */
  log(...args) {
    if (UNITY_ADS_CONFIG.DEBUG_MODE) {
      const timestamp = new Date().toISOString().substr(11, 8);
      console.log(`[Unity Ads ${timestamp}]`, ...args);
    }
  }

  /**
   * Cleanup ad instances
   */
  cleanup() {
    this.log('🧹 Cleaning up ad instances...');
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
    this.log('✅ Cleanup complete');
  }
}

// Export singleton instance
const unityAdsService = new UnityAdsService();
export default unityAdsService;
export { UnityAdsService };