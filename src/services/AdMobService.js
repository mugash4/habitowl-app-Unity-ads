/**
 * Google AdMob Service
 * Handles all ad functionality using Google Mobile Ads SDK
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
  console.log('   This is normal for Expo Go or web builds');
  console.log('   For production: Build with EAS Build');
}

class AdMobService {
  constructor() {
    this.isInitialized = false;
    this.isPremium = false;
    this.premiumStatusLoaded = false;
    
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
    
    // Premium status listeners
    this.premiumStatusListeners = [];
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
   * Initialize AdMob SDK
   */
  async initialize() {
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
        const msg = 'Web platform - AdMob not supported';
        this.log(`ℹ️ ${msg}`);
        this.initializationDetails.push(msg);
        return false;
      }

      // Check SDK availability
      if (!sdkAvailable || !mobileAds) {
        const msg = 'SDK not available - Need EAS build for production';
        this.log(`⚠️ ${msg}`);
        this.initializationDetails.push(msg);
        this.initializationError = 'SDK not available';
        return false;
      }

      this.log('🚀 Initializing AdMob...');

      // Ensure premium status is loaded
      if (!this.premiumStatusLoaded) {
        this.log('⏳ Waiting for premium status...');
        await this.preloadPremiumStatus();
      }

      this.log(`👤 User: ${this.isPremium ? 'PREMIUM' : 'FREE'}`);
      this.initializationDetails.push(`Premium: ${this.isPremium}`);

      // Initialize AdMob
      this.log('📡 Calling mobileAds().initialize()...');
      await mobileAds().initialize();
      
      this.log('✅ AdMob initialized successfully!');
      this.isInitialized = true;
      this.initializationError = null;
      this.initializationDetails.push('✅ Initialized successfully');
      
      // Create and load ads if not premium
      if (!this.isPremium && ADMOB_CONFIG.AUTO_LOAD_ADS) {
        this.log('🎯 Non-premium user: Starting ad preload');
        setTimeout(() => {
          this.createAndLoadAds();
        }, 1000);
      } else if (this.isPremium) {
        this.log('👑 Premium user: Ads disabled');
        this.initializationDetails.push('Premium user - ads disabled');
      }
      
      return true;

    } catch (error) {
      const errorMsg = error.message || String(error);
      this.log('❌ Error initializing AdMob:', errorMsg);
      this.log('Stack:', error.stack);
      this.isInitialized = false;
      this.initializationError = errorMsg;
      this.initializationDetails.push(`Error: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Create and load all ad instances
   */
  createAndLoadAds() {
    this.log('🎬 Creating ad instances...');
    
    // Create and load interstitial
    this.createInterstitialAd();
    
    // Create and load rewarded
    this.createRewardedAd();
  }

  /**
   * Create interstitial ad instance
   */
  createInterstitialAd() {
    if (!this.shouldShowAds() || !InterstitialAd) {
      return;
    }

    try {
      const adUnitId = getAdUnitId('INTERSTITIAL');
      this.log(`Creating interstitial with Ad Unit ID: ${adUnitId}`);

      // Create new interstitial ad
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, ADMOB_CONFIG.getRequestOptions());

      // Set up event listeners
      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        this.log('✅ Interstitial loaded');
        this.interstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        this.log('❌ Interstitial error:', error);
        this.interstitialLoaded = false;
        // Retry after delay
        setTimeout(() => {
          if (this.shouldShowAds() && this.isInitialized) {
            this.log('🔄 Retrying interstitial load...');
            this.createInterstitialAd();
          }
        }, 10000);
      });

      this.interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
        this.log('👁️ Interstitial opened');
        this.trackAdImpression('interstitial');
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        this.log('🚪 Interstitial closed');
        this.interstitialLoaded = false;
        // Create new ad for next time
        setTimeout(() => {
          if (this.shouldShowAds() && this.isInitialized) {
            this.createInterstitialAd();
          }
        }, 1000);
      });

      // Start loading
      this.interstitialAd.load();
      this.log('📥 Interstitial loading...');

    } catch (error) {
      this.log('❌ Error creating interstitial:', error);
    }
  }

  /**
   * Show interstitial ad
   */
  async showInterstitialAd(placementName = null) {
    if (!this.shouldShowAds()) {
      this.log('Ads disabled');
      return false;
    }

    if (!this.interstitialAd || !this.interstitialLoaded) {
      this.log('⚠️ Interstitial not ready');
      if (!this.interstitialAd) {
        this.createInterstitialAd();
      }
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastInterstitialTime < ADMOB_CONFIG.INTERSTITIAL_COOLDOWN) {
      const remaining = Math.ceil((ADMOB_CONFIG.INTERSTITIAL_COOLDOWN - (now - this.lastInterstitialTime)) / 1000);
      this.log(`⏳ Cooldown: ${remaining}s`);
      return false;
    }

    // Check session limit
    if (this.sessionInterstitialCount >= ADMOB_CONFIG.MAX_INTERSTITIALS_PER_SESSION) {
      this.log('⚠️ Session limit reached');
      return false;
    }

    try {
      this.log(`📺 Showing interstitial${placementName ? ` (${placementName})` : ''}...`);
      await this.interstitialAd.show();
      this.lastInterstitialTime = now;
      this.sessionInterstitialCount++;
      this.log(`✅ Shown (${this.sessionInterstitialCount}/${ADMOB_CONFIG.MAX_INTERSTITIALS_PER_SESSION})`);
      return true;
    } catch (error) {
      this.log('❌ Error showing interstitial:', error);
      return false;
    }
  }

  /**
   * Create rewarded ad instance
   */
  createRewardedAd() {
    if (!this.isInitialized || !RewardedAd) {
      return;
    }

    try {
      const adUnitId = getAdUnitId('REWARDED');
      this.log(`Creating rewarded with Ad Unit ID: ${adUnitId}`);

      // Create new rewarded ad
      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, ADMOB_CONFIG.getRequestOptions());

      // Set up event listeners
      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.log('✅ Rewarded loaded');
        this.rewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.ERROR, (error) => {
        this.log('❌ Rewarded error:', error);
        this.rewardedLoaded = false;
        // Retry after delay
        setTimeout(() => {
          if (this.isInitialized) {
            this.log('🔄 Retrying rewarded load...');
            this.createRewardedAd();
          }
        }, 10000);
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.OPENED, () => {
        this.log('👁️ Rewarded opened');
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        this.log('🎁 User rewarded:', reward);
        this.trackAdImpression('rewarded');
        
        if (this.rewardCallback) {
          this.rewardCallback(reward);
          this.rewardCallback = null;
        }
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        this.log('🚪 Rewarded closed');
        this.rewardedLoaded = false;
        // Create new ad for next time
        setTimeout(() => {
          if (this.isInitialized) {
            this.createRewardedAd();
          }
        }, 1000);
      });

      // Start loading
      this.rewardedAd.load();
      this.log('📥 Rewarded loading...');

    } catch (error) {
      this.log('❌ Error creating rewarded:', error);
    }
  }

  /**
   * Show rewarded ad
   */
  async showRewardedAd(onReward = null, placementName = null) {
    if (!this.isInitialized) {
      this.log('⚠️ AdMob not initialized');
      return false;
    }

    if (!this.rewardedAd || !this.rewardedLoaded) {
      this.log('⚠️ Rewarded not ready');
      if (!this.rewardedAd) {
        this.createRewardedAd();
      }
      return false;
    }

    try {
      this.rewardCallback = onReward;
      this.log(`📺 Showing rewarded${placementName ? ` (${placementName})` : ''}...`);
      await this.rewardedAd.show();
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
  isRewardedAdReady() {
    return this.isInitialized && this.rewardedLoaded && this.rewardedAd !== null;
  }

  /**
   * Get Banner Ad configuration
   */
  getBannerConfig() {
    if (!this.shouldShowAds() || !BannerAdSize) {
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
          // Clean up ads
          this.cleanup();
        } else if (this.isInitialized) {
          this.log('User downgraded - starting ad preload');
          this.createAndLoadAds();
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
   * Logging helper
   */
  log(...args) {
    if (ADMOB_CONFIG.DEBUG_MODE) {
      console.log('[AdMob]', ...args);
    }
  }

  /**
   * Clean up
   */
  cleanup() {
    this.log('Cleaning up');
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;
    this.interstitialAd = null;
    this.rewardedAd = null;
  }
}

// Create and export singleton
const adMobService = new AdMobService();
export default adMobService;
export { AdMobService };
