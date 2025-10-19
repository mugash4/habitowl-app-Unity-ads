/**
 * Unity Ads Service
 * Handles all ad operations using IronSource Mediation SDK (Unity Ads)
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

// SDK availability flag
let sdkAvailable = false;

// Try to import the SDK (only available in production builds)
try {
  const ironSourceModule = require('ironsource-mediation');
  LevelPlay = ironSourceModule.LevelPlay;
  LevelPlayInitRequest = ironSourceModule.LevelPlayInitRequest;
  LevelPlayBannerAdView = ironSourceModule.LevelPlayBannerAdView;
  LevelPlayInterstitialAd = ironSourceModule.LevelPlayInterstitialAd;
  LevelPlayRewardedAd = ironSourceModule.LevelPlayRewardedAd;
  AdFormat = ironSourceModule.AdFormat;
  IronSource = ironSourceModule.IronSource;
  sdkAvailable = true;
  console.log('✅ Unity Ads SDK loaded successfully');
} catch (error) {
  console.log('ℹ️ Unity Ads SDK not available in this environment (normal for web/dev)');
  console.log('Error details:', error.message);
}

class UnityAdsService {
  constructor() {
    this.isInitialized = false;
    this.isPremium = false;
    this.isTestMode = __DEV__ && UNITY_ADS_CONFIG.ENABLE_TEST_ADS_IN_DEV;
    
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
  }

  /**
   * Initialize Unity Ads SDK
   * Call this once when the app starts
   */
  async initialize(userId = null) {
    try {
      // Prevent multiple initialization attempts
      if (this.initializationAttempted) {
        this.log('Initialization already attempted');
        return this.isInitialized;
      }
      
      this.initializationAttempted = true;

      // Don't initialize on web platform
      if (Platform.OS === 'web') {
        this.log('Web platform detected, skipping Unity Ads initialization');
        return false;
      }

      // Check if SDK is available
      if (!sdkAvailable || !LevelPlay || !IronSource) {
        this.log('⚠️ Unity Ads SDK not available - Package may not be installed correctly');
        this.log('This is normal in Expo Go or development builds');
        this.log('For production: Build with EAS Build to include native modules');
        this.initializationError = 'SDK not available';
        return false;
      }

      this.log('🚀 Initializing Unity Ads...');

      // Load premium status
      await this.loadPremiumStatus();

      // Get Game ID for current platform
      const gameId = Platform.OS === 'ios' 
        ? UNITY_ADS_CONFIG.IOS_GAME_ID 
        : UNITY_ADS_CONFIG.ANDROID_GAME_ID;

      // Validate Game ID
      if (!gameId || gameId.includes('YOUR_')) {
        console.warn('⚠️ Unity Ads Game ID not configured!');
        console.warn('Please update src/config/unityAdsConfig.js with your actual Game IDs from Unity Dashboard');
        this.initializationError = 'Game ID not configured';
        return false;
      }

      this.log(`Game ID: ${gameId}`);

      // Enable debug mode in development
      if (UNITY_ADS_CONFIG.DEBUG_MODE && IronSource) {
        try {
          await IronSource.setAdaptersDebug(true);
          this.log('Debug mode enabled');
        } catch (e) {
          this.log('Could not enable adapters debug:', e.message);
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
        this.log(`User ID: ${userId}`);
      }

      const initRequest = initRequestBuilder.build();

      // Set up initialization listener
      const initListener = {
        onInitFailed: (error) => {
          this.log('❌ Unity Ads initialization failed:', error);
          this.isInitialized = false;
          this.initializationError = error;
        },
        onInitSuccess: (configuration) => {
          this.log('✅ Unity Ads initialized successfully!');
          this.log('Configuration:', JSON.stringify(configuration));
          this.isInitialized = true;
          this.initializationError = null;
          
          // Setup ad units if not premium
          if (!this.isPremium) {
            this.log('Setting up ad units (non-premium user)');
            this.setupAdUnits();
          } else {
            this.log('Premium user detected - ads disabled');
          }
        }
      };

      // Initialize the SDK
      await LevelPlay.init(initRequest, initListener);
      
      // Wait a bit for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return this.isInitialized;

    } catch (error) {
      this.log('❌ Error initializing Unity Ads:', error);
      this.log('Error stack:', error.stack);
      this.isInitialized = false;
      this.initializationError = error.message;
      return false;
    }
  }

  /**
   * Setup all ad units
   */
  setupAdUnits() {
    this.log('Setting up ad units...');
    
    try {
      this.setupInterstitialAd();
      this.setupRewardedAd();
      this.log('✅ Ad units setup complete');
    } catch (error) {
      this.log('❌ Error setting up ad units:', error);
    }
  }

  /**
   * Setup Interstitial Ads
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

      this.log(`Setting up interstitial ad with placement: ${placementId}`);

      // Create interstitial ad instance
      this.interstitialAd = LevelPlayInterstitialAd.createInterstitialAd(placementId);

      // Set up listeners
      this.interstitialAd.setListener({
        onAdLoaded: (adInfo) => {
          this.log('✅ Interstitial ad loaded', adInfo);
          this.interstitialLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('❌ Interstitial ad failed to load:', error);
          this.interstitialLoaded = false;
          // Try to reload after delay
          setTimeout(() => {
            this.log('Retrying interstitial ad load...');
            this.loadInterstitialAd();
          }, 10000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('👁️ Interstitial ad displayed', adInfo);
          this.trackAdImpression('interstitial');
        },
        onAdDisplayFailed: (error) => {
          this.log('❌ Interstitial ad display failed:', error);
          this.interstitialLoaded = false;
          // Load next ad
          this.loadInterstitialAd();
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Interstitial ad clicked', adInfo);
        },
        onAdClosed: (adInfo) => {
          this.log('🚪 Interstitial ad closed', adInfo);
          this.interstitialLoaded = false;
          // Load next ad
          setTimeout(() => this.loadInterstitialAd(), 1000);
        }
      });

      // Load first ad
      this.loadInterstitialAd();

    } catch (error) {
      this.log('❌ Error setting up interstitial ad:', error);
    }
  }

  /**
   * Setup Rewarded Ads
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

      this.log(`Setting up rewarded ad with placement: ${placementId}`);

      // Create rewarded ad instance
      this.rewardedAd = LevelPlayRewardedAd.createRewardedAd(placementId);

      // Set up listeners
      this.rewardedAd.setListener({
        onAdLoaded: (adInfo) => {
          this.log('✅ Rewarded ad loaded', adInfo);
          this.rewardedLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('❌ Rewarded ad failed to load:', error);
          this.rewardedLoaded = false;
          // Try to reload after delay
          setTimeout(() => {
            this.log('Retrying rewarded ad load...');
            this.loadRewardedAd();
          }, 10000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('👁️ Rewarded ad displayed', adInfo);
        },
        onAdDisplayFailed: (error) => {
          this.log('❌ Rewarded ad display failed:', error);
          this.rewardedLoaded = false;
          // Load next ad
          this.loadRewardedAd();
        },
        onAdClicked: (adInfo) => {
          this.log('👆 Rewarded ad clicked', adInfo);
        },
        onAdClosed: (adInfo) => {
          this.log('🚪 Rewarded ad closed', adInfo);
          this.rewardedLoaded = false;
          // Load next ad
          setTimeout(() => this.loadRewardedAd(), 1000);
        },
        onAdRewarded: (placement, reward) => {
          this.log('🎁 User rewarded:', reward);
          this.trackAdImpression('rewarded');
          
          // Call reward callback if set
          if (this.rewardCallback) {
            this.rewardCallback(reward);
            this.rewardCallback = null;
          }
        }
      });

      // Load first ad
      this.loadRewardedAd();

    } catch (error) {
      this.log('❌ Error setting up rewarded ad:', error);
    }
  }

  /**
   * Load Interstitial Ad
   */
  loadInterstitialAd() {
    if (!this.shouldShowAds() || !this.interstitialAd) {
      this.log('Skipping interstitial load - ads disabled or instance not available');
      return;
    }

    try {
      this.log('📥 Loading interstitial ad...');
      this.interstitialAd.loadAd();
    } catch (error) {
      this.log('❌ Error loading interstitial ad:', error);
    }
  }

  /**
   * Show Interstitial Ad
   */
  async showInterstitialAd(context = 'general') {
    if (!this.shouldShowAds()) {
      this.log('Ads disabled (premium user, web platform, or not initialized)');
      return false;
    }

    if (!this.interstitialAd) {
      this.log('⚠️ Interstitial ad instance not available');
      return false;
    }

    if (!this.interstitialLoaded) {
      this.log('⚠️ Interstitial ad not ready yet');
      // Try to load it
      this.loadInterstitialAd();
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastInterstitialTime < UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
      const remainingTime = Math.ceil((UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN - (now - this.lastInterstitialTime)) / 1000);
      this.log(`⏳ Interstitial ad on cooldown (${remainingTime}s remaining)`);
      return false;
    }

    // Check session limit
    if (this.sessionInterstitialCount >= UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      this.log('⚠️ Max interstitials per session reached');
      return false;
    }

    try {
      this.log(`📺 Showing interstitial ad (context: ${context})...`);
      await this.interstitialAd.showAd(context);
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      this.log(`✅ Interstitial ad shown (${this.sessionInterstitialCount}/${UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION} this session)`);
      return true;
    } catch (error) {
      this.log('❌ Error showing interstitial ad:', error);
      return false;
    }
  }

  /**
   * Load Rewarded Ad
   */
  loadRewardedAd() {
    if (!this.isInitialized || !this.rewardedAd) {
      this.log('Skipping rewarded load - not initialized or instance not available');
      return;
    }

    try {
      this.log('📥 Loading rewarded ad...');
      this.rewardedAd.loadAd();
    } catch (error) {
      this.log('❌ Error loading rewarded ad:', error);
    }
  }

  /**
   * Show Rewarded Ad
   */
  async showRewardedAd(onReward = null) {
    if (!this.isInitialized) {
      this.log('⚠️ Unity Ads not initialized');
      return false;
    }

    if (!this.rewardedAd) {
      this.log('⚠️ Rewarded ad instance not available');
      return false;
    }

    if (!this.rewardedLoaded) {
      this.log('⚠️ Rewarded ad not ready yet');
      // Try to load it
      this.loadRewardedAd();
      return false;
    }

    try {
      // Store reward callback
      this.rewardCallback = onReward;
      
      this.log('📺 Showing rewarded ad...');
      await this.rewardedAd.showAd('reward_screen');
      this.log('✅ Rewarded ad shown');
      return true;
    } catch (error) {
      this.log('❌ Error showing rewarded ad:', error);
      this.rewardCallback = null;
      return false;
    }
  }

  /**
   * Check if rewarded ad is ready
   */
  isRewardedAdReady() {
    return this.isInitialized && this.rewardedLoaded;
  }

  /**
   * Get Banner Ad configuration
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
      size: 'BANNER', // Options: BANNER, LARGE, RECTANGLE, SMART
      Component: LevelPlayBannerAdView
    };
  }

  /**
   * Load premium status from storage
   */
  async loadPremiumStatus() {
    try {
      const premium = await AsyncStorage.getItem('user_premium_status');
      this.isPremium = premium === 'true';
      this.log('Premium status:', this.isPremium);
    } catch (error) {
      this.log('Error loading premium status:', error);
      this.isPremium = false;
    }
  }

  /**
   * Set premium status
   */
  async setPremiumStatus(isPremium) {
    try {
      this.isPremium = isPremium;
      await AsyncStorage.setItem('user_premium_status', isPremium.toString());
      this.log('Premium status updated:', isPremium);
    } catch (error) {
      this.log('Error setting premium status:', error);
    }
  }

  /**
   * Check if ads should be shown
   */
  shouldShowAds() {
    const should = this.isInitialized && !this.isPremium && Platform.OS !== 'web' && sdkAvailable;
    if (!should) {
      const reasons = [];
      if (!this.isInitialized) reasons.push('not initialized');
      if (this.isPremium) reasons.push('premium user');
      if (Platform.OS === 'web') reasons.push('web platform');
      if (!sdkAvailable) reasons.push('SDK not available');
      this.log(`Ads disabled: ${reasons.join(', ')}`);
    }
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

      // Keep only last 100 impressions
      if (impressionArray.length > 100) {
        impressionArray.splice(0, impressionArray.length - 100);
      }

      await AsyncStorage.setItem('ad_impressions', JSON.stringify(impressionArray));
      this.log(`📊 Ad impression tracked: ${adType}`);
    } catch (error) {
      this.log('Error tracking ad impression:', error);
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
      this.log('Error getting ad impression stats:', error);
      return { total: 0, byType: {}, recent: [] };
    }
  }

  /**
   * Get initialization status and diagnostics
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      initializationAttempted: this.initializationAttempted,
      initializationError: this.initializationError,
      isPremium: this.isPremium,
      sdkAvailable: sdkAvailable,
      platform: Platform.OS,
      interstitialLoaded: this.interstitialLoaded,
      rewardedLoaded: this.rewardedLoaded,
      shouldShowAds: this.shouldShowAds(),
      sessionInterstitialCount: this.sessionInterstitialCount,
      config: {
        gameId: Platform.OS === 'ios' ? UNITY_ADS_CONFIG.IOS_GAME_ID : UNITY_ADS_CONFIG.ANDROID_GAME_ID,
        bannerPlacement: Platform.OS === 'ios' ? UNITY_ADS_CONFIG.IOS_BANNER : UNITY_ADS_CONFIG.ANDROID_BANNER,
        interstitialPlacement: Platform.OS === 'ios' ? UNITY_ADS_CONFIG.IOS_INTERSTITIAL : UNITY_ADS_CONFIG.ANDROID_INTERSTITIAL,
        rewardedPlacement: Platform.OS === 'ios' ? UNITY_ADS_CONFIG.IOS_REWARDED : UNITY_ADS_CONFIG.ANDROID_REWARDED,
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
   * Get initialization status (legacy)
   */
  getInitializationStatus() {
    return this.isInitialized;
  }

  /**
   * Clean up
   */
  cleanup() {
    this.log('Cleaning up Unity Ads Service');
    this.interstitialAd = null;
    this.rewardedAd = null;
  }
}

// Create and export singleton instance
const unityAdsService = new UnityAdsService();
export default unityAdsService;

// Also export the class for advanced usage
export { UnityAdsService };
