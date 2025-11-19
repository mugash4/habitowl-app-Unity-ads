import * as RNIap from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import FirebaseService from './FirebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import adMobService from './AdMobService';

// 🔧 IMPORTANT: Replace these with your actual product IDs from Google Play Console
const SUBSCRIPTION_SKUS = Platform.select({
  ios: [
    'com.habitowl.app.monthly',
    'com.habitowl.app.yearly'
  ],
  android: [
    'habitowl_premium_monthly',  // Must match Google Play Console exactly
    'habitowl_premium_yearly'    // Must match Google Play Console exactly
  ]
});

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.subscriptions = [];
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
  }

  // Initialize IAP connection
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('IAP already initialized');
        return true;
      }

      console.log('🔧 Initializing In-App Purchases...');
      
      const result = await RNIap.initConnection();
      console.log('IAP Connection result:', result);
      
      // Get available subscriptions from store
      const products = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      this.subscriptions = products;
      
      console.log('✅ Available subscriptions:', products.length);
      products.forEach(product => {
        console.log(`  - ${product.title}: ${product.localizedPrice}`);
        
        // 🔑 LOG OFFER TOKENS FOR DEBUGGING (Android only)
        if (Platform.OS === 'android' && product.subscriptionOfferDetails) {
          console.log(`  Offers for ${product.productId}:`, product.subscriptionOfferDetails.length);
          product.subscriptionOfferDetails.forEach((offer, index) => {
            console.log(`    Offer ${index}: ${offer.offerToken.substring(0, 20)}...`);
          });
        }
      });

      // Setup purchase listeners
      this.setupPurchaseListeners();
      
      // Check for any pending purchases
      await this.checkPendingPurchases();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ IAP initialization error:', error);
      return false;
    }
  }

  // Setup listeners for purchase updates
  setupPurchaseListeners() {
    // Remove existing listeners if any
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }

    // Listen for purchase updates
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      console.log('📦 Purchase update received:', purchase);
  
      const receipt = purchase.transactionReceipt || purchase.purchaseToken;
  
      if (receipt) {
        try {
          // Verify purchase with Google Play (in production, verify with your backend)
          await this.verifyPurchase(purchase);
      
          // Acknowledge the purchase (required for Android)
          if (Platform.OS === 'android') {
            await RNIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
            console.log('✅ Purchase acknowledged');
          }
      
          // Finish transaction (for iOS)
          await RNIap.finishTransaction(purchase);
          console.log('✅ Transaction finished');
      
          // ✅ Update AdMobService first, then Firebase
          await adMobService.setPremiumStatus(true, false);
          await FirebaseService.updateUserPremiumStatus(true);
          await AsyncStorage.setItem('premium_status', 'true');
          await AsyncStorage.setItem('subscription_data', JSON.stringify(purchase));
      
          console.log('✅ Premium status activated!');
        } catch (ackErr) {
          console.error('❌ Purchase acknowledgment error:', ackErr);
        }
      }
    });

    // Listen for purchase errors
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('❌ Purchase error:', error);
      
      if (error.code === 'E_USER_CANCELLED') {
        console.log('User cancelled the purchase');
      } else {
        Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase');
      }
    });
  }

  // Check for any pending/unfinished purchases
  async checkPendingPurchases() {
    try {
      console.log('🔍 Checking for pending purchases...');
    
      // Get available purchases (subscriptions that are active)
      const availablePurchases = await RNIap.getAvailablePurchases();
      console.log('Available purchases:', availablePurchases.length);
    
      if (availablePurchases.length > 0) {
        // User has active subscription
        const latestPurchase = availablePurchases[0];
        console.log('✅ Active subscription found:', latestPurchase.productId);
      
        // Update AdMobService first, then Firebase
        await this.verifyPurchase(latestPurchase);
        await adMobService.setPremiumStatus(true, false);
        await FirebaseService.updateUserPremiumStatus(true);
        await AsyncStorage.setItem('premium_status', 'true');
        await AsyncStorage.setItem('subscription_data', JSON.stringify(latestPurchase));
      
        return true;
      } else {
        console.log('No active subscriptions found');
        // Update AdMobService first, then Firebase
        await adMobService.setPremiumStatus(false, false);
        await FirebaseService.updateUserPremiumStatus(false);
        await AsyncStorage.setItem('premium_status', 'false');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking pending purchases:', error);
      return false;
    }
  }

  // Verify purchase (basic client-side verification)
  async verifyPurchase(purchase) {
    try {
      console.log('🔍 Verifying purchase...');
      
      // In production, send the receipt to your backend for verification
      // For now, we'll do basic validation
      
      const productId = purchase.productId;
      const isValid = SUBSCRIPTION_SKUS.includes(productId);
      
      if (isValid) {
        console.log('✅ Purchase verified successfully');
        
        // Track in Firebase
        await FirebaseService.trackEvent('subscription_purchased', {
          productId,
          platform: Platform.OS
        });
        
        return true;
      } else {
        console.error('❌ Invalid product ID:', productId);
        return false;
      }
    } catch (error) {
      console.error('❌ Purchase verification error:', error);
      return false;
    }
  }

  // Get available subscription products
  async getSubscriptions() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      return this.subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  // Request subscription purchase
  async purchaseSubscription(sku) {
    try {
      console.log('🛒 Requesting purchase for:', sku);
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // 🔑 KEY FIX: Get the offer token dynamically from subscription details
      if (Platform.OS === 'android') {
        // Find the subscription product
        const subscription = this.subscriptions.find(sub => sub.productId === sku);
        
        if (!subscription) {
          throw new Error(`Subscription ${sku} not found in available products`);
        }
        
        // Get the first available offer (typically the base plan or trial)
        const subscriptionOffers = subscription.subscriptionOfferDetails;
        
        if (!subscriptionOffers || subscriptionOffers.length === 0) {
          throw new Error(`No offers available for subscription ${sku}`);
        }
        
        // Use the first offer token (this is the base plan or trial offer)
        const offerToken = subscriptionOffers[0].offerToken;
        
        console.log(`🎫 Using offer token: ${offerToken.substring(0, 20)}...`);
        
        // Request subscription with offer token
        await RNIap.requestSubscription({
          sku,
          subscriptionOffers: [
            {
              sku,
              offerToken
            }
          ]
        });
      } else {
        // iOS doesn't need offer token
        await RNIap.requestSubscription({
          sku
        });
      }
      
      console.log('✅ Purchase request sent');
      return true;
    } catch (error) {
      console.error('❌ Purchase request error:', error);
      
      if (error.code === 'E_USER_CANCELLED') {
        return false;
      }
      
      throw error;
    }
  }

  // Restore purchases
  async restorePurchases() {
    try {
      console.log('🔄 Restoring purchases...');
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const availablePurchases = await RNIap.getAvailablePurchases();
      console.log('Found purchases to restore:', availablePurchases.length);
      
      if (availablePurchases.length > 0) {
        // Restore the most recent subscription
        const latestPurchase = availablePurchases[0];
        await this.verifyPurchase(latestPurchase);
        await FirebaseService.updateUserPremiumStatus(true);
        await AsyncStorage.setItem('premium_status', 'true');
        
        Alert.alert(
          '✅ Restored!',
          'Your premium subscription has been restored.',
          [{ text: 'OK' }]
        );
        
        return true;
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found for this account.',
          [{ text: 'OK' }]
        );
        
        return false;
      }
    } catch (error) {
      console.error('❌ Restore purchases error:', error);
      Alert.alert(
        'Restore Failed',
        'Could not restore purchases. Please try again later.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  // Check if user has active subscription
  async hasActiveSubscription() {
    try {
      const stored = await AsyncStorage.getItem('premium_status');
      if (stored === 'true') {
        // Double-check with store
        await this.checkPendingPurchases();
        const updated = await AsyncStorage.getItem('premium_status');
        return updated === 'true';
      }
      return false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Clean up connections
  async destroy() {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }
      
      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }
      
      await RNIap.endConnection();
      this.isInitialized = false;
      console.log('✅ IAP connection closed');
    } catch (error) {
      console.error('Error destroying IAP connection:', error);
    }
  }
}

export default new SubscriptionService();
