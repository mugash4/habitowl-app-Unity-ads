import * as ExpoIap from 'expo-iap';
import { Platform, Alert } from 'react-native';
import FirebaseService from './FirebaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import adMobService from './AdMobService';

// 🔧 IMPORTANT: These MUST match the product IDs you created in
// Google Play Console exactly. Update the actual prices there too:
//   habitowl_premium_monthly  →  $1.99
//   habitowl_premium_yearly   →  $15.99
const SUBSCRIPTION_SKUS = Platform.select({
  ios: [
    'com.habitowl.app.monthly',
    'com.habitowl.app.yearly'
  ],
  android: [
    'habitowl_premium_monthly',
    'habitowl_premium_yearly'
  ]
});

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.subscriptions = [];
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
  }

  // Initialize IAP connection (Google Play Billing v8.0.0 via expo-iap 3.0.4)
  async initialize() {
    try {
      if (this.isInitialized) {
        console.log('IAP already initialized');
        return true;
      }

      console.log('🔧 Initializing In-App Purchases (expo-iap)...');

      const result = await ExpoIap.initConnection();
      console.log('IAP Connection result:', result);

      // Get available subscriptions from store
      const products = await ExpoIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
      this.subscriptions = products || [];

      console.log('✅ Available subscriptions:', this.subscriptions.length);
      this.subscriptions.forEach(product => {
        console.log(`  - ${product.title}: ${product.displayPrice || product.localizedPrice}`);

        // expo-iap 3.0.4 uses subscriptionOfferDetailsAndroid
        if (Platform.OS === 'android' && product.subscriptionOfferDetailsAndroid) {
          console.log(`  Offers for ${product.id || product.productId}:`, product.subscriptionOfferDetailsAndroid.length);
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
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
    }

    this.purchaseUpdateSubscription = ExpoIap.purchaseUpdatedListener(async (purchase) => {
      console.log('📦 Purchase update received:', purchase);

      const receipt = purchase.transactionReceipt || purchase.purchaseToken;

      if (receipt) {
        try {
          await this.verifyPurchase(purchase);

          // Acknowledge purchase (required for Android with Billing v8)
          if (Platform.OS === 'android') {
            try {
              await ExpoIap.acknowledgePurchaseAndroid(purchase.purchaseToken);
              console.log('✅ Purchase acknowledged');
            } catch (ackErr) {
              // expo-iap 3.0.4 may auto-acknowledge; safe to ignore
              console.log('acknowledge skipped:', ackErr.message);
            }
          }

          // Finish transaction (covers both platforms in expo-iap 3.0.4)
          await ExpoIap.finishTransaction(purchase);
          console.log('✅ Transaction finished');

          // Update AdMobService first, then Firebase
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

    this.purchaseErrorSubscription = ExpoIap.purchaseErrorListener((error) => {
      console.error('❌ Purchase error:', error);

      if (error.code === 'E_USER_CANCELLED' || error.code === 'USER_CANCELLED') {
        console.log('User cancelled the purchase');
      } else {
        Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase');
      }
    });
  }

  async checkPendingPurchases() {
    try {
      console.log('🔍 Checking for pending purchases...');

      const availablePurchases = await ExpoIap.getAvailablePurchases();
      console.log('Available purchases:', availablePurchases?.length || 0);

      if (availablePurchases && availablePurchases.length > 0) {
        const latestPurchase = availablePurchases[0];
        console.log('✅ Active subscription found:', latestPurchase.productId);

        await this.verifyPurchase(latestPurchase);
        await adMobService.setPremiumStatus(true, false);
        await FirebaseService.updateUserPremiumStatus(true);
        await AsyncStorage.setItem('premium_status', 'true');
        await AsyncStorage.setItem('subscription_data', JSON.stringify(latestPurchase));

        return true;
      } else {
        console.log('No active subscriptions found');
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

  async verifyPurchase(purchase) {
    try {
      console.log('🔍 Verifying purchase...');
      const productId = purchase.productId;
      const isValid = SUBSCRIPTION_SKUS.includes(productId);

      if (isValid) {
        console.log('✅ Purchase verified successfully');
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

      if (Platform.OS === 'android') {
        const subscription = this.subscriptions.find(
          (sub) => (sub.id || sub.productId) === sku
        );

        if (!subscription) {
          throw new Error(`Subscription ${sku} not found in available products`);
        }

        // expo-iap 3.0.4: subscriptionOfferDetailsAndroid per offer
        const subscriptionOffers = subscription.subscriptionOfferDetailsAndroid || [];

        if (subscriptionOffers.length === 0) {
          throw new Error(`No offers available for subscription ${sku}`);
        }

        const offerToken = subscriptionOffers[0].offerToken;
        console.log(`🎫 Using offer token: ${offerToken.substring(0, 20)}...`);

        await ExpoIap.requestSubscription({
          sku,
          subscriptionOffers: [{ sku, offerToken }]
        });
      } else {
        await ExpoIap.requestSubscription({ sku });
      }

      console.log('✅ Purchase request sent');
      return true;
    } catch (error) {
      console.error('❌ Purchase request error:', error);
      if (error.code === 'E_USER_CANCELLED' || error.code === 'USER_CANCELLED') {
        return false;
      }
      throw error;
    }
  }

  async restorePurchases() {
    try {
      console.log('🔄 Restoring purchases...');
      if (!this.isInitialized) {
        await this.initialize();
      }

      const availablePurchases = await ExpoIap.getAvailablePurchases();
      console.log('Found purchases to restore:', availablePurchases?.length || 0);

      if (availablePurchases && availablePurchases.length > 0) {
        const latestPurchase = availablePurchases[0];
        await this.verifyPurchase(latestPurchase);
        await FirebaseService.updateUserPremiumStatus(true);
        await AsyncStorage.setItem('premium_status', 'true');

        Alert.alert('✅ Restored!', 'Your premium subscription has been restored.', [{ text: 'OK' }]);
        return true;
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.', [{ text: 'OK' }]);
        return false;
      }
    } catch (error) {
      console.error('❌ Restore purchases error:', error);
      Alert.alert('Restore Failed', 'Could not restore purchases. Please try again later.', [{ text: 'OK' }]);
      return false;
    }
  }

  async hasActiveSubscription() {
    try {
      const stored = await AsyncStorage.getItem('premium_status');
      if (stored === 'true') {
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
      await ExpoIap.endConnection();
      this.isInitialized = false;
      console.log('✅ IAP connection closed');
    } catch (error) {
      console.error('Error destroying IAP connection:', error);
    }
  }
}

export default new SubscriptionService();
