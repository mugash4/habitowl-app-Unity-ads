/**
 * Unity Ads Service - CRASH FIX VERSION
 * Fixed to prevent ClassCastException crashes
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
      this.log(`✅ Premium: ${this.isPremium ? 'YES' : 'NO'}`);
      this.notifyPremiumStatusChange(this.isPremium);
      return this.isPremium;
    } catch (error) {
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
   * Initialize Unity Ads - CRASH-SAFE VERSION
   */
  async initialize(userId = null) {
    // Prevent multiple initialization attempts
    if (this.initializationAttempted) {
      this.log('Already attempted initialization');
      return this.isInitialized;
    }
    
    this.initializationAttempted = true;

    try {
      // Check platform
      if (Platform.OS === 'web') {
        this.log('Web platform - ads not supported');
        return false;
      }

      // Check SDK availability
      if (!sdkAvailable || !LevelPlay || !IronSource) {
        this.log('SDK not available');
        return false;
      }

      // Ensure premium status is loaded
      if (!this.premiumStatusLoaded) {
        await this.preloadPremiumStatus();
      }

      // Don't initialize for premium users
      if (this.isPremium) {
        this.log('Premium user - skipping ads');
        return false;
      }

      this.log('🚀 Initializing Unity Ads...');

      // Get Game ID
      const gameId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_GAME_ID 
        : UNITY_ADS_CONFIG.ANDROID_GAME_ID;

      if (!gameId || gameId.includes('YOUR_')) {
        this.log('Invalid Game ID');
        return false;
      }

      this.log(`Game ID: ${gameId}`);
      this.log(`Test Mode: ${this.isTestMode}`);

      // ✅ FIX: Wrap initialization in try-catch to prevent crashes
      try {
        // Enable test mode if needed
        if (this.isTestMode && IronSource.setMetaData) {
          try {
            await IronSource.setMetaData('is_test_suite', 'enable');
            this.log('Test mode enabled');
          } catch (metaError) {
            this.log('Test mode setup failed (continuing)');
          }
        }

        // Create init request with proper error handling
        const initRequestBuilder = LevelPlayInitRequest.builder(gameId);
        
        // ✅ FIX: Only add ad formats if they exist
        if (AdFormat) {
          try {
            const adFormats = [AdFormat.BANNER, AdFormat.INTERSTITIAL, AdFormat.REWARDED];
            initRequestBuilder.withLegacyAdFormats(adFormats);
          } catch (formatError) {
            this.log('Ad formats setup failed (continuing)');
          }
        }

        // Add user ID if provided
        if (userId) {
          try {
            initRequestBuilder.withUserId(userId);
          } catch (userIdError) {
            this.log('User ID setup failed (continuing)');
          }
        }

        const initRequest = initRequestBuilder.build();

        // ✅ FIX: Create listener with proper error handling
        const initListener = {
          onInitFailed: (error) => {
            this.log('Init failed:', JSON.stringify(error));
            this.isInitialized = false;
            this.initializationError = JSON.stringify(error);
          },
          onInitSuccess: (configuration) => {
            this.log('✅ Init successful');
            this.isInitialized = true;
            this.initializationError = null;
            
            // Setup ads in background
            setTimeout(() => {
              try {
                this.setupAdUnits();
              } catch (setupError) {
                this.log('Ad setup failed (non-critical)');
              }
            }, 1000);
          }
        };

        // ✅ FIX: Initialize with timeout protection
        const initPromise = LevelPlay.init(initRequest, initListener);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 10000)
        );

        await Promise.race([initPromise, timeoutPromise]);
        
        // Wait for callback
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return this.isInitialized;

      } catch (initError) {
        this.log('Init error:', initError.message);
        this.initializationError = initError.message;
        return false;
      }

    } catch (error) {
      this.log('Fatal init error:', error.message);
      this.initializationError = error.message;
      return false;
    }
  }

  /**
   * Setup ad units - CRASH-SAFE
   */
  setupAdUnits() {
    this.log('Setting up ad units...');
    
    try {
      this.setupInterstitialAd();
    } catch (error) {
      this.log('Interstitial setup failed');
    }
    
    try {
      this.setupRewardedAd();
    } catch (error) {
      this.log('Rewarded setup failed');
    }
    
    this.log('Ad units setup complete');
  }

  /**
   * Setup Interstitial - CRASH-SAFE
   */
  setupInterstitialAd() {
    try {
      if (!LevelPlayInterstitialAd) return;

      const placementId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_INTERSTITIAL 
        : UNITY_ADS_CONFIG.ANDROID_INTERSTITIAL;

      this.log(`Interstitial: ${placementId}`);

      // ✅ FIX: Try factory method first, fallback to constructor
      try {
        if (LevelPlayInterstitialAd.createInterstitialAd) {
          this.interstitialAd = LevelPlayInterstitialAd.createInterstitialAd(placementId);
        } else {
          this.interstitialAd = new LevelPlayInterstitialAd(placementId);
        }
      } catch (createError) {
        this.log('Interstitial creation failed');
        return;
      }

      // Set up listeners
      const listener = {
        onAdLoaded: (adInfo) => {
          this.log('Interstitial loaded');
          this.interstitialLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('Interstitial load failed');
          this.interstitialLoaded = false;
        },
        onAdDisplayed: (adInfo) => {
          this.log('Interstitial displayed');
          this.trackAdImpression('interstitial');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('Interstitial display failed');
          this.interstitialLoaded = false;
        },
        onAdClicked: (adInfo) => {
          this.log('Interstitial clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('Interstitial closed');
          this.interstitialLoaded = false;
          setTimeout(() => this.loadInterstitialAd(), 1000);
        },
        onAdInfoChanged: (adInfo) => {
          this.log('Interstitial info changed');
        }
      };

      this.interstitialAd.setListener(listener);
      this.loadInterstitialAd();

    } catch (error) {
      this.log('Interstitial setup error:', error.message);
    }
  }

  /**
   * Setup Rewarded - CRASH-SAFE
   */
  setupRewardedAd() {
    try {
      if (!LevelPlayRewardedAd) return;

      const placementId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_REWARDED 
        : UNITY_ADS_CONFIG.ANDROID_REWARDED;

      this.log(`Rewarded: ${placementId}`);

      // ✅ FIX: Try factory method first, fallback to constructor
      try {
        if (LevelPlayRewardedAd.createRewardedAd) {
          this.rewardedAd = LevelPlayRewardedAd.createRewardedAd(placementId);
        } else {
          this.rewardedAd = new LevelPlayRewardedAd(placementId);
        }
      } catch (createError) {
        this.log('Rewarded creation failed');
        return;
      }

      // Set up listeners
      const listener = {
        onAdLoaded: (adInfo) => {
          this.log('Rewarded loaded');
          this.rewardedLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('Rewarded load failed');
          this.rewardedLoaded = false;
        },
        onAdDisplayed: (adInfo) => {
          this.log('Rewarded displayed');
        },
        onAdDisplayFailed: (error, adInfo) => {
          this.log('Rewarded display failed');
          this.rewardedLoaded = false;
        },
        onAdClicked: (adInfo) => {
          this.log('Rewarded clicked');
        },
        onAdClosed: (adInfo) => {
          this.log('Rewarded closed');
          this.rewardedLoaded = false;
          setTimeout(() => this.loadRewardedAd(), 1000);
        },
        onAdRewarded: (reward, adInfo) => {
          this.log('User rewarded');
          this.trackAdImpression('rewarded');
          
          if (this.rewardCallback) {
            this.rewardCallback(reward);
            this.rewardCallback = null;
          }
        },
        onAdInfoChanged: (adInfo) => {
          this.log('Rewarded info changed');
        }
      };

      this.rewardedAd.setListener(listener);
      this.loadRewardedAd();

    } catch (error) {
      this.log('Rewarded setup error:', error.message);
    }
  }

  /**
   * Load Interstitial
   */
  async loadInterstitialAd() {
    if (!this.shouldShowAds() || !this.interstitialAd) return;

    try {
      this.log('Loading interstitial...');
      await this.interstitialAd.loadAd();
    } catch (error) {
      this.log('Load error:', error.message);
    }
  }

  /**
   * Show Interstitial
   */
  async showInterstitialAd(placementName = 'DefaultInterstitial') {
    if (!this.shouldShowAds() || !this.interstitialAd) {
      return false;
    }

    try {
      const isReady = await this.interstitialAd.isAdReady();
      if (!isReady) {
        this.loadInterstitialAd();
        return false;
      }

      // Check cooldown
      const now = Date.now();
      if (now - this.lastInterstitialTime < UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
        return false;
      }

      // Check session limit
      if (this.sessionInterstitialCount >= UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
        return false;
      }

      await this.interstitialAd.showAd(placementName);
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      return true;
    } catch (error) {
      this.log('Show error:', error.message);
      return false;
    }
  }

  /**
   * Load Rewarded
   */
  async loadRewardedAd() {
    if (!this.isInitialized || !this.rewardedAd) return;

    try {
      this.log('Loading rewarded...');
      await this.rewardedAd.loadAd();
    } catch (error) {
      this.log('Load error:', error.message);
    }
  }

  /**
   * Show Rewarded
   */
  async showRewardedAd(onReward = null, placementName = 'DefaultRewarded') {
    if (!this.isInitialized || !this.rewardedAd) {
      return false;
    }

    try {
      const isReady = await this.rewardedAd.isAdReady();
      if (!isReady) {
        this.loadRewardedAd();
        return false;
      }

      this.rewardCallback = onReward;
      await this.rewardedAd.showAd(placementName);
      return true;
    } catch (error) {
      this.log('Show error:', error.message);
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
   * Get Banner config
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
      this.log('Premium updated:', isPremium);
      
      if (oldStatus !== isPremium) {
        this.notifyPremiumStatusChange(isPremium);
        
        if (isPremium) {
          this.cleanup();
        } else if (this.isInitialized) {
          this.setupAdUnits();
        }
      }
    } catch (error) {
      this.log('Set premium error:', error);
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
    } catch (error) {
      this.log('Track error:', error);
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
      premiumStatusLoaded: this.premiumStatusLoaded,
      sdkAvailable: sdkAvailable,
      platform: Platform.OS,
      isTestMode: this.isTestMode,
      interstitialLoaded: this.interstitialLoaded,
      rewardedLoaded: this.rewardedLoaded,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount
    };
  }

  /**
   * Logging
   */
  log(...args) {
    if (UNITY_ADS_CONFIG.DEBUG_MODE) {
      console.log('[Unity Ads]', ...args);
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
  }
}

// Export singleton
const unityAdsService = new UnityAdsService();
export default unityAdsService;
export { UnityAdsService };
