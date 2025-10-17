/**
 * AdService - Google AdMob Integration
 * Using react-native-google-mobile-ads (Official Google solution for Expo)
 * 
 * SIMPLIFIED VERSION - Works with EAS Build and Expo SDK 51
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AdService {
  constructor() {
    this.isInitialized = false;
    this.isPremium = false;
    this.mobileAds = null;
    this.TestIds = null;
    this.AdEventType = null;
    this.InterstitialAd = null;
    this.RewardedAd = null;
    
    // Your actual AdMob IDs
    this.adConfig = {
      banner: {
        android: 'ca-app-pub-2371616866592450/1677929899',
        ios: 'ca-app-pub-2371616866592450/1677929899', // Add your iOS ID
      },
      interstitial: {
        android: 'ca-app-pub-2371616866592450/8051766556',
        ios: 'ca-app-pub-2371616866592450/8051766556', // Add your iOS ID
      },
      rewarded: {
        android: 'ca-app-pub-2371616866592450/9388898951',
        ios: 'ca-app-pub-2371616866592450/9388898951', // Add your iOS ID
      }
    };
    
    this.lastInterstitialTime = 0;
    this.interstitialCooldown = 30000; // 30 seconds
    this.sessionInterstitialCount = 0;
    this.maxInterstitialsPerSession = 5;
    this.interstitialAd = null;
    this.rewardedAd = null;
  }

  async initialize() {
    try {
      console.log('Initializing AdService...');
      
      // Only initialize on native platforms
      if (Platform.OS === 'web') {
        console.log('AdService: Web platform detected, skipping ads initialization');
        this.isInitialized = true;
        return;
      }

      // Load premium status first
      await this.loadPremiumStatus();
      
      // Try to import react-native-google-mobile-ads
      try {
        const adModule = require('react-native-google-mobile-ads');
        this.mobileAds = adModule.default;
        this.TestIds = adModule.TestIds;
        this.AdEventType = adModule.AdEventType;
        this.InterstitialAd = adModule.InterstitialAd;
        this.RewardedAd = adModule.RewardedAd;
        
        // Initialize the SDK
        await this.mobileAds().initialize();
        console.log('Google Mobile Ads SDK initialized successfully');
        
        // Preload interstitial if not premium
        if (!this.isPremium) {
          this.preloadInterstitial();
        }
        
        this.isInitialized = true;
      } catch (importError) {
        console.warn('react-native-google-mobile-ads not available:', importError.message);
        console.log('Ads will be disabled. This is normal for:');
        console.log('  - Web platform');
        console.log('  - Development builds without the native module');
        console.log('  - Expo Go (AdMob requires custom dev client)');
        this.isInitialized = false;
      }
      
    } catch (error) {
      console.error('AdService initialization error:', error);
      this.isInitialized = false;
    }
  }

  async loadPremiumStatus() {
    try {
      const premium = await AsyncStorage.getItem('user_premium_status');
      this.isPremium = premium === 'true';
      console.log(`Premium status loaded: ${this.isPremium}`);
    } catch (error) {
      console.error('Error loading premium status:', error);
      this.isPremium = false;
    }
  }

  async setPremiumStatus(isPremium) {
    try {
      this.isPremium = isPremium;
      await AsyncStorage.setItem('user_premium_status', isPremium.toString());
      console.log(`Premium status set to: ${isPremium}`);
    } catch (error) {
      console.error('Error setting premium status:', error);
    }
  }

  getBannerAdUnitId() {
    // Use test IDs in development
    if (__DEV__ && this.TestIds) {
      return this.TestIds.BANNER;
    }
    return Platform.OS === 'ios' 
      ? this.adConfig.banner.ios 
      : this.adConfig.banner.android;
  }

  getInterstitialAdUnitId() {
    if (__DEV__ && this.TestIds) {
      return this.TestIds.INTERSTITIAL;
    }
    return Platform.OS === 'ios' 
      ? this.adConfig.interstitial.ios 
      : this.adConfig.interstitial.android;
  }

  getRewardedAdUnitId() {
    if (__DEV__ && this.TestIds) {
      return this.TestIds.REWARDED;
    }
    return Platform.OS === 'ios' 
      ? this.adConfig.rewarded.ios 
      : this.adConfig.rewarded.android;
  }

  shouldShowAds() {
    return this.isInitialized && !this.isPremium && Platform.OS !== 'web';
  }

  // Banner Ad Component Props
  getBannerProps() {
    if (!this.shouldShowAds()) return null;
    
    // Return null if native module not available
    if (!this.mobileAds) return null;
    
    return {
      unitId: this.getBannerAdUnitId(),
      size: 'BANNER', // or 'FULL_BANNER', 'LARGE_BANNER', 'MEDIUM_RECTANGLE'
      requestOptions: {
        requestNonPersonalizedAdsOnly: false,
      },
    };
  }

  // Interstitial Ads
  async preloadInterstitial() {
    if (!this.shouldShowAds() || !this.InterstitialAd) return;

    try {
      this.interstitialAd = this.InterstitialAd.createForAdRequest(
        this.getInterstitialAdUnitId(),
        {
          requestNonPersonalizedAdsOnly: false,
        }
      );

      if (!this.interstitialAd) {
        console.log('Could not create interstitial ad');
        return;
      }

      // Add event listeners
      const loadedListener = this.interstitialAd.addAdEventListener(
        this.AdEventType.LOADED,
        () => {
          console.log('Interstitial ad loaded');
        }
      );

      const errorListener = this.interstitialAd.addAdEventListener(
        this.AdEventType.ERROR,
        (error) => {
          console.error('Interstitial ad error:', error);
        }
      );

      const closedListener = this.interstitialAd.addAdEventListener(
        this.AdEventType.CLOSED,
        () => {
          console.log('Interstitial ad closed');
          // Preload next ad
          setTimeout(() => this.preloadInterstitial(), 1000);
        }
      );

      // Load the ad
      await this.interstitialAd.load();
      
    } catch (error) {
      console.error('Error preloading interstitial:', error);
    }
  }

  async showInterstitial(context = 'general') {
    if (!this.shouldShowAds()) {
      console.log('Ads disabled: premium user or web platform');
      return false;
    }

    if (!this.interstitialAd) {
      console.log('Interstitial ad not initialized');
      return false;
    }

    const now = Date.now();
    
    // Check cooldown
    if (now - this.lastInterstitialTime < this.interstitialCooldown) {
      console.log('Interstitial ad on cooldown');
      return false;
    }
    
    // Check session limits
    if (this.sessionInterstitialCount >= this.maxInterstitialsPerSession) {
      console.log('Max interstitials per session reached');
      return false;
    }

    try {
      const loaded = this.interstitialAd.loaded;
      if (loaded) {
        await this.interstitialAd.show();
        this.lastInterstitialTime = now;
        this.sessionInterstitialCount++;
        
        // Track impression
        await this.trackAdImpression('interstitial', context);
        
        return true;
      } else {
        console.log('Interstitial ad not ready');
        // Try to load a new one
        this.preloadInterstitial();
        return false;
      }
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      return false;
    }
  }

  // Rewarded Ads
  async showRewardedAd(onRewarded, context = 'general') {
    if (!this.isInitialized || !this.RewardedAd) {
      console.log('Rewarded ads not available');
      return false;
    }

    try {
      this.rewardedAd = this.RewardedAd.createForAdRequest(
        this.getRewardedAdUnitId(),
        {
          requestNonPersonalizedAdsOnly: false,
        }
      );
      
      if (!this.rewardedAd) {
        console.log('Could not create rewarded ad');
        return false;
      }

      return new Promise((resolve) => {
        const loadedListener = this.rewardedAd.addAdEventListener(
          this.AdEventType.LOADED,
          () => {
            console.log('Rewarded ad loaded');
            this.rewardedAd.show();
          }
        );

        const rewardListener = this.rewardedAd.addAdEventListener(
          this.AdEventType.EARNED_REWARD,
          (reward) => {
            console.log('User rewarded:', reward);
            if (onRewarded) {
              onRewarded(reward);
            }
            this.trackAdImpression('rewarded', context);
            resolve(true);
          }
        );

        const errorListener = this.rewardedAd.addAdEventListener(
          this.AdEventType.ERROR,
          (error) => {
            console.error('Rewarded ad error:', error);
            resolve(false);
          }
        );

        const closedListener = this.rewardedAd.addAdEventListener(
          this.AdEventType.CLOSED,
          () => {
            console.log('Rewarded ad closed');
            resolve(false);
          }
        );

        // Load the ad
        this.rewardedAd.load();
      });
      
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      return false;
    }
  }

  // Ad placement strategies
  async shouldShowInterstitialAfterAction(actionType) {
    if (!this.shouldShowAds()) return false;

    const adTriggers = {
      'habit_complete': { probability: 0.3, minInterval: 60000 },
      'habit_create': { probability: 0.5, minInterval: 120000 },
      'stats_view': { probability: 0.2, minInterval: 180000 },
      'app_resume': { probability: 0.1, minInterval: 300000 },
    };

    const trigger = adTriggers[actionType];
    if (!trigger) return false;

    const now = Date.now();
    const timeSinceLastAd = now - this.lastInterstitialTime;
    
    if (timeSinceLastAd < trigger.minInterval) return false;
    
    return Math.random() < trigger.probability;
  }

  async trackAdImpression(adType, context) {
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
      console.log(`Ad impression tracked: ${adType} in ${context}`);
    } catch (error) {
      console.error('Error tracking ad impression:', error);
    }
  }

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
      console.error('Error getting ad impression stats:', error);
      return { total: 0, byType: {}, recent: [] };
    }
  }

  // Update ad configuration (for production)
  updateAdConfig(newConfig) {
    this.adConfig = { ...this.adConfig, ...newConfig };
  }

  // Clean up
  cleanup() {
    if (this.interstitialAd) {
      // Remove all listeners if needed
      console.log('Cleaning up AdService');
    }
  }
}

export default new AdService();