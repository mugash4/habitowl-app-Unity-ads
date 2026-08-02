import * as ExpoIap from 'expo-iap';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FirebaseService from './FirebaseService';
import adMobService from './AdMobService';

// These must match Google Play / App Store product IDs exactly
const SUBSCRIPTION_SKUS =
  Platform.select({
    ios: ['com.habitowl.app.monthly', 'com.habitowl.app.yearly'],
    android: ['habitowl_premium_monthly', 'habitowl_premium_yearly'],
  }) || [];

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
    this.subscriptions = [];
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
  }

  isNativePlatform() {
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getMicrosValue(phase) {
    const raw = phase?.priceAmountMicros;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  }

  isFreePhase(phase) {
    const micros = this.getMicrosValue(phase);
    const formatted = String(phase?.formattedPrice || '').toLowerCase();
    return micros === 0 || formatted === 'free' || formatted.includes('free');
  }

  getPurchaseProductId(purchase) {
    if (!purchase) return null;
    if (purchase.productId) return purchase.productId;
    if (purchase.id && SUBSCRIPTION_SKUS.includes(purchase.id)) return purchase.id;
    if (Array.isArray(purchase.ids) && purchase.ids.length > 0) {
      const firstMatching = purchase.ids.find((id) => SUBSCRIPTION_SKUS.includes(id));
      return firstMatching || purchase.ids[0];
    }
    return null;
  }

  getAndroidOfferInfos(product) {
    const offers = product?.subscriptionOfferDetailsAndroid || [];
    if (!Array.isArray(offers) || offers.length === 0) return [];

    return offers.map((offer) => {
      const phases = offer?.pricingPhases?.pricingPhaseList || [];
      const paidPhases = phases.filter((phase) => this.getMicrosValue(phase) > 0);

      // Usually Google returns trial phase first, then the real recurring paid phase.
      // We want the REAL paid phase for UI price display.
      const recurringPaidPhase =
        paidPhases.length > 0 ? paidPhases[paidPhases.length - 1] : null;

      const hasFreeTrial = phases.some((phase) => this.isFreePhase(phase));

      return {
        offer,
        phases,
        recurringPaidPhase,
        hasFreeTrial,
      };
    });
  }

  pickBestAndroidOfferInfo(product) {
    const infos = this.getAndroidOfferInfos(product);
    if (infos.length === 0) return null;

    // Prefer an eligible free-trial offer that still has a paid recurring phase.
    const freeTrialOffer = infos.find(
      (info) => info.hasFreeTrial && info.recurringPaidPhase
    );
    if (freeTrialOffer) return freeTrialOffer;

    // Otherwise use any offer with a paid phase.
    const paidOffer = infos.find((info) => info.recurringPaidPhase);
    if (paidOffer) return paidOffer;

    // Last fallback: first available offer.
    return infos[0];
  }

  getDisplayPriceForProduct(product) {
    if (!product) return '';

    if (Platform.OS === 'android') {
      const offerInfo = this.pickBestAndroidOfferInfo(product);
      const recurringPrice = offerInfo?.recurringPaidPhase?.formattedPrice;
      if (recurringPrice) return recurringPrice;
    }

    return product.displayPrice || product.localizedPrice || '';
  }

  normalizeSubscriptionProduct(product) {
    const productId = product?.productId || product?.id || '';
    const bestAndroidOfferInfo =
      Platform.OS === 'android' ? this.pickBestAndroidOfferInfo(product) : null;

    const actualDisplayPrice = this.getDisplayPriceForProduct(product);

    return {
      ...product,

      // expo-iap v3 returns `id`; your screen expects `productId`
      id: productId,
      productId,

      // Keep these fields so the existing PremiumScreen works without UI changes
      displayPrice: actualDisplayPrice,
      localizedPrice: actualDisplayPrice,

      // Helpful normalized metadata for purchasing
      selectedOfferToken: bestAndroidOfferInfo?.offer?.offerToken || null,
      selectedBasePlanId: bestAndroidOfferInfo?.offer?.basePlanId || null,
      selectedOfferId: bestAndroidOfferInfo?.offer?.offerId || null,
      hasFreeTrial: !!bestAndroidOfferInfo?.hasFreeTrial,
      pricingPhaseList: bestAndroidOfferInfo?.phases || [],
    };
  }

  async fetchStoreSubscriptions() {
    const rawProducts = await ExpoIap.fetchProducts({
      skus: SUBSCRIPTION_SKUS,
      type: 'subs',
    });

    return (rawProducts || [])
      .map((product) => this.normalizeSubscriptionProduct(product))
      .filter((product) => !!product?.productId);
  }

  async loadSubscriptionsWithRetry() {
    let products = await this.fetchStoreSubscriptions();

    // Small retry helps when Play billing responds slowly on first connection
    if (Platform.OS === 'android' && products.length === 0) {
      await this.delay(1200);
      products = await this.fetchStoreSubscriptions();
    }

    this.subscriptions = products;

    console.log('✅ Available subscriptions:', this.subscriptions.length);
    this.subscriptions.forEach((product) => {
      console.log(
        `  - ${product.productId}: ${product.displayPrice} | freeTrial=${product.hasFreeTrial}`
      );
    });

    return this.subscriptions;
  }

  setupPurchaseListeners() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    this.purchaseUpdateSubscription = ExpoIap.purchaseUpdatedListener(
      async (purchase) => {
        console.log('📦 Purchase update received:', purchase);

        try {
          const verified = await this.verifyPurchase(purchase);
          if (!verified) {
            throw new Error('Purchase verification failed');
          }

          // expo-iap v3 expects an object: { purchase, isConsumable }
          await ExpoIap.finishTransaction({
            purchase,
            isConsumable: false,
          });

          await adMobService.setPremiumStatus(true, false);
          await FirebaseService.updateUserPremiumStatus(true);
          await AsyncStorage.setItem('premium_status', 'true');
          await AsyncStorage.setItem('subscription_data', JSON.stringify(purchase));

          console.log('✅ Premium status activated!');
        } catch (error) {
          console.error('❌ Purchase handling error:', error);
        }
      }
    );

    this.purchaseErrorSubscription = ExpoIap.purchaseErrorListener((error) => {
      console.error('❌ Purchase error:', error);

      const code = String(error?.code || '');
      if (code === 'E_USER_CANCELLED' || code === 'USER_CANCELLED') {
        console.log('User cancelled the purchase');
        return;
      }

      Alert.alert(
        'Purchase Failed',
        error?.message || 'An error occurred during purchase',
        [{ text: 'OK' }]
      );
    });
  }

  async initialize() {
    if (!this.isNativePlatform()) {
      console.log('IAP not supported on this platform');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();

    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async _initialize() {
    try {
      console.log('🔧 Initializing In-App Purchases (expo-iap v3)...');

      this.setupPurchaseListeners();

      const connected = await ExpoIap.initConnection();
      console.log('IAP connection result:', connected);

      if (!connected) {
        throw new Error('Google Play / App Store billing connection returned false');
      }

      await this.loadSubscriptionsWithRetry();
      await this.checkPendingPurchases();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ IAP initialization error:', error);

      if (Platform.OS === 'android') {
        console.log(
          'Android billing checklist: use the Play Console package name, test with Google Play on the device, and use Internal Testing or a license tester account.'
        );
      }

      this.isInitialized = false;
      return false;
    }
  }

  getSubscriptionBySku(sku) {
    return (
      this.subscriptions.find(
        (sub) => (sub.productId || sub.id) === sku
      ) || null
    );
  }

  async getSubscriptions() {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) return [];
      }

      return this.subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  async purchaseSubscription(sku) {
    try {
      console.log('🛒 Requesting purchase for:', sku);

      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Billing is not initialized');
        }
      }

      const subscription = this.getSubscriptionBySku(sku);
      if (!subscription) {
        throw new Error(`Subscription ${sku} not found in available products`);
      }

      const androidRequest = {
        skus: [sku],
      };

      if (Platform.OS === 'android') {
        const offerToken =
          subscription.selectedOfferToken ||
          this.pickBestAndroidOfferInfo(subscription)?.offer?.offerToken;

        if (offerToken) {
          androidRequest.subscriptionOffers = [{ sku, offerToken }];
        }
      }

      await ExpoIap.requestPurchase({
        request: {
          ios: { sku },
          android: androidRequest,
        },
        type: 'subs',
      });

      console.log('✅ Purchase request sent');
      return true;
    } catch (error) {
      console.error('❌ Purchase request error:', error);

      const code = String(error?.code || '');
      if (code === 'E_USER_CANCELLED' || code === 'USER_CANCELLED') {
        return false;
      }

      throw error;
    }
  }

  async checkPendingPurchases() {
    try {
      console.log('🔍 Checking for pending purchases...');

      const availablePurchases = await ExpoIap.getAvailablePurchases();
      const relevantPurchases = (availablePurchases || [])
        .filter((purchase) => {
          const productId = this.getPurchaseProductId(purchase);
          return !!productId && SUBSCRIPTION_SKUS.includes(productId);
        })
        .sort((a, b) => (b?.transactionDate || 0) - (a?.transactionDate || 0));

      console.log('Available purchases:', relevantPurchases.length);

      if (relevantPurchases.length > 0) {
        const latestPurchase = relevantPurchases[0];
        const productId = this.getPurchaseProductId(latestPurchase);

        console.log('✅ Active subscription found:', productId);

        await this.verifyPurchase(latestPurchase);
        await adMobService.setPremiumStatus(true, false);
        await FirebaseService.updateUserPremiumStatus(true);
        await AsyncStorage.setItem('premium_status', 'true');
        await AsyncStorage.setItem(
          'subscription_data',
          JSON.stringify(latestPurchase)
        );

        return true;
      }

      console.log('No active subscriptions found');
      await adMobService.setPremiumStatus(false, false);
      await FirebaseService.updateUserPremiumStatus(false);
      await AsyncStorage.setItem('premium_status', 'false');

      return false;
    } catch (error) {
      console.error('❌ Error checking pending purchases:', error);
      return false;
    }
  }

  async verifyPurchase(purchase) {
    try {
      console.log('🔍 Verifying purchase...');

      const productId = this.getPurchaseProductId(purchase);
      const isValid = !!productId && SUBSCRIPTION_SKUS.includes(productId);

      if (!isValid) {
        console.error('❌ Invalid product ID:', productId);
        return false;
      }

      console.log('✅ Purchase verified successfully');

      try {
        await FirebaseService.trackEvent('subscription_purchased', {
          productId,
          platform: Platform.OS,
        });
      } catch (analyticsError) {
        console.log('Analytics tracking skipped:', analyticsError?.message);
      }

      return true;
    } catch (error) {
      console.error('❌ Purchase verification error:', error);
      return false;
    }
  }

  async restorePurchases() {
    try {
      console.log('🔄 Restoring purchases...');

      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Billing is not initialized');
        }
      }

      const availablePurchases = await ExpoIap.getAvailablePurchases();
      const relevantPurchases = (availablePurchases || [])
        .filter((purchase) => {
          const productId = this.getPurchaseProductId(purchase);
          return !!productId && SUBSCRIPTION_SKUS.includes(productId);
        })
        .sort((a, b) => (b?.transactionDate || 0) - (a?.transactionDate || 0));

      console.log('Found purchases to restore:', relevantPurchases.length);

      if (relevantPurchases.length > 0) {
        const latestPurchase = relevantPurchases[0];

        await this.verifyPurchase(latestPurchase);
        await adMobService.setPremiumStatus(true, false);
        await FirebaseService.updateUserPremiumStatus(true);
        await AsyncStorage.setItem('premium_status', 'true');
        await AsyncStorage.setItem(
          'subscription_data',
          JSON.stringify(latestPurchase)
        );

        Alert.alert(
          '✅ Restored!',
          'Your premium subscription has been restored.',
          [{ text: 'OK' }]
        );
        return true;
      }

      Alert.alert(
        'No Purchases Found',
        'No previous purchases were found for this account.',
        [{ text: 'OK' }]
      );
      return false;
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

  async hasActiveSubscription() {
    try {
      return await this.checkPendingPurchases();
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

      try {
        await ExpoIap.endConnection();
      } catch (endError) {
        console.log('endConnection skipped:', endError?.message);
      }

      this.isInitialized = false;
      this.subscriptions = [];
      console.log('✅ IAP connection closed');
    } catch (error) {
      console.error('Error destroying IAP connection:', error);
    }
  }
}

export default new SubscriptionService();
