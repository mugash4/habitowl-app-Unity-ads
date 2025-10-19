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
  console.log('Unity Ads SDK loaded successfully');
} catch (error) {
  console.log('Unity Ads SDK not available in this environment (normal for web/dev)');
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
  }

  /**
   * Initialize Unity Ads SDK
   * Call this once when the app starts
   */
  async initialize(userId = null) {
    try {
      // Don't initialize on web platform
      if (Platform.OS === 'web') {
        this.log('Web platform detected, skipping Unity Ads initialization');
        return;
      }

      // Check if SDK is available
      if (!LevelPlay || !IronSource) {
        this.log('Unity Ads SDK not available');
        return;
      }

      this.log('Initializing Unity Ads...');

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
        return;
      }

      // Enable debug mode in development
      if (UNITY_ADS_CONFIG.DEBUG_MODE && IronSource) {
        try {
          IronSource.setAdaptersDebug(true);
        } catch (e) {
          this.log('Could not enable adapters debug:', e);
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
      }

      const initRequest = initRequestBuilder.build();

      // Set up initialization listener
      const initListener = {
        onInitFailed: (error) => {
          this.log('Unity Ads initialization failed:', error);
          this.isInitialized = false;
        },
        onInitSuccess: (configuration) => {
          this.log('Unity Ads initialized successfully!', configuration);
          this.isInitialized = true;
          
          // Setup ad units if not premium
          if (!this.isPremium) {
            this.setupAdUnits();
          }
        }
      };

      // Initialize the SDK
      await LevelPlay.init(initRequest, initListener);

    } catch (error) {
      this.log('Error initializing Unity Ads:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Setup all ad units
   */
  setupAdUnits() {
    this.log('Setting up ad units...');
    this.setupInterstitialAd();
    this.setupRewardedAd();
  }

  /**
   * Setup Interstitial Ads
   */
  setupInterstitialAd() {
    try {
      if (!LevelPlayInterstitialAd) return;

      const placementId = Platform.OS === 'ios'
        ? UNITY_ADS_CONFIG.IOS_INTERSTITIAL
        : UNITY_ADS_CONFIG.ANDROID_INTERSTITIAL;

      this.log('Setting up interstitial ad with placement:', placementId);

      // Create interstitial ad instance
      this.interstitialAd = LevelPlayInterstitialAd.createInterstitialAd(placementId);

      // Set up listeners
      this.interstitialAd.setListener({
        onAdLoaded: (adInfo) => {
          this.log('Interstitial ad loaded', adInfo);
          this.interstitialLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('Interstitial ad failed to load:', error);
          this.interstitialLoaded = false;
          // Try to reload after delay
          setTimeout(() => this.loadInterstitialAd(), 5000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('Interstitial ad displayed', adInfo);
          this.trackAdImpression('interstitial');
        },
        onAdDisplayFailed: (error) => {
          this.log('Interstitial ad display failed:', error);
          this.interstitialLoaded = false;
          // Load next ad
          this.loadInterstitialAd();
        },
        onAdClicked: (adInfo) => {
          this.log('Interstitial ad clicked', adInfo);
        },
        onAdClosed: (adInfo) => {
          this.log('Interstitial ad closed', adInfo);
          this.interstitialLoaded = false;
          // Load next ad
          setTimeout(() => this.loadInterstitialAd(), 1000);
        }
      });

      // Load first ad
      this.loadInterstitialAd();

    } catch (error) {
      this.log('Error setting up interstitial ad:', error);
    }
  }

  /**
   * Setup Rewarded Ads
   */
  setupRewardedAd() {
    try {
      if (!LevelPlayRewardedAd) return;

      const placementId = Platform.OS === 'ios'
        ? UNITY_ADS_CONFIG.IOS_REWARDED
        : UNITY_ADS_CONFIG.ANDROID_REWARDED;

      this.log('Setting up rewarded ad with placement:', placementId);

      // Create rewarded ad instance
      this.rewardedAd = LevelPlayRewardedAd.createRewardedAd(placementId);

      // Set up listeners
      this.rewardedAd.setListener({
        onAdLoaded: (adInfo) => {
          this.log('Rewarded ad loaded', adInfo);
          this.rewardedLoaded = true;
        },
        onAdLoadFailed: (error) => {
          this.log('Rewarded ad failed to load:', error);
          this.rewardedLoaded = false;
          // Try to reload after delay
          setTimeout(() => this.loadRewardedAd(), 5000);
        },
        onAdDisplayed: (adInfo) => {
          this.log('Rewarded ad displayed', adInfo);
        },
        onAdDisplayFailed: (error) => {
          this.log('Rewarded ad display failed:', error);
          this.rewardedLoaded = false;
          // Load next ad
          this.loadRewardedAd();
        },
        onAdClicked: (adInfo) => {
          this.log('Rewarded ad clicked', adInfo);
        },
        onAdClosed: (adInfo) => {
          this.log('Rewarded ad closed', adInfo);
          this.rewardedLoaded = false;
          // Load next ad
          setTimeout(() => this.loadRewardedAd(), 1000);
        },
        onAdRewarded: (placement, reward) => {
          this.log('User rewarded:', reward);
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
      this.log('Error setting up rewarded ad:', error);
    }
  }

  /**
   * Load Interstitial Ad
   */
  loadInterstitialAd() {
    if (!this.shouldShowAds() || !this.interstitialAd) return;

    try {
      this.log('Loading interstitial ad...');
      this.interstitialAd.loadAd();
    } catch (error) {
      this.log('Error loading interstitial ad:', error);
    }
  }

  /**
   * Show Interstitial Ad
   */
  async showInterstitialAd(context = 'general') {
    if (!this.shouldShowAds()) {
      this.log('Ads disabled (premium user or web platform)');
      return false;
    }

    if (!this.interstitialAd || !this.interstitialLoaded) {
      this.log('Interstitial ad not ready');
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastInterstitialTime < UNITY_ADS_CONFIG.INTERSTITIAL_COOLDOWN) {
      this.log('Interstitial ad on cooldown');
      return false;
    }

    // Check session limit
    if (this.sessionInterstitialCount >= UNITY_ADS_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      this.log('Max interstitials per session reached');
      return false;
    }

    try {
      this.log('Showing interstitial ad...');
      await this.interstitialAd.showAd(context);
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      return true;
    } catch (error) {
      this.log('Error showing interstitial ad:', error);
      return false;
    }
  }

  /**
   * Load Rewarded Ad
   */
  loadRewardedAd() {
    if (!this.isInitialized || !this.rewardedAd) return;

    try {
      this.log('Loading rewarded ad...');
      this.rewardedAd.loadAd();
    } catch (error) {
      this.log('Error loading rewarded ad:', error);
    }
  }

  /**
   * Show Rewarded Ad
   */
  async showRewardedAd(onReward = null) {
    if (!this.isInitialized) {
      this.log('Unity Ads not initialized');
      return false;
    }

    if (!this.rewardedAd || !this.rewardedLoaded) {
      this.log('Rewarded ad not ready');
      return false;
    }

    try {
      // Store reward callback
      this.rewardCallback = onReward;
      
      this.log('Showing rewarded ad...');
      await this.rewardedAd.showAd('reward_screen');
      return true;
    } catch (error) {
      this.log('Error showing rewarded ad:', error);
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
    return this.isInitialized && !this.isPremium && Platform.OS !== 'web';
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
      this.log(`Ad impression tracked: ${adType}`);
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
   * Logging helper
   */
  log(...args) {
    if (UNITY_ADS_CONFIG.DEBUG_MODE) {
      console.log('[Unity Ads]', ...args);
    }
  }

  /**
   * Get initialization status
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
