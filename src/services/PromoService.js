/**
 * PromoService - FIXED: Metrics now update properly
 * All tracking functions use updateDoc + increment()
 */

import { 
  collection, 
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query, 
  where,
  orderBy,
  limit,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

let FirebaseService = null;
try {
  FirebaseService = require('./FirebaseService').default;
} catch (error) {
  console.log('PromoService: FirebaseService not available');
}

class PromoService {
  constructor() {
    console.log('✅ PromoService: Initializing...');
    this.isInitializing = false;
    this.isInitialized = false;
    
    this.PROMO_TEMPLATES = [
      {
        title: "🔥 Weekend Flash Sale!",
        description: "Get Premium at 50% OFF this weekend only! Unlock unlimited habits & AI coaching.",
        discount: "50% OFF",
        durationDays: 3,
        type: "weekend_flash"
      },
      {
        title: "⚡ Early Bird Special",
        description: "Start your week right! Premium membership at 40% discount. Limited time offer!",
        discount: "40% OFF",
        durationDays: 5,
        type: "early_bird"
      },
      {
        title: "🎯 Build Better Habits Sale",
        description: "Join thousands of successful habit builders! Get 45% OFF Premium today.",
        discount: "45% OFF",
        durationDays: 7,
        type: "habit_builder"
      },
      {
        title: "💎 Premium Launch Deal",
        description: "Celebrate with us! Exclusive 55% OFF for our amazing community members.",
        discount: "55% OFF",
        durationDays: 4,
        type: "launch_special"
      },
      {
        title: "🌟 Success Accelerator",
        description: "Achieve your goals faster with Premium! Get 50% OFF + bonus AI coaching sessions.",
        discount: "50% OFF + Bonus",
        durationDays: 6,
        type: "accelerator"
      }
    ];
    
    setTimeout(() => {
      this.initializePromoSystemBackground();
    }, 2000);
  }

  async initializePromoSystemBackground() {
    if (this.isInitializing || this.isInitialized) {
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🔄 PromoService: Background init starting...');
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Init timeout')), 10000)
      );

      const initPromise = (async () => {
        const needsUpdate = await this.checkIfOffersNeedUpdate();
        
        if (needsUpdate) {
          console.log('📝 PromoService: Creating new offer...');
          await this.createWeeklyPromoOffers();
        } else {
          console.log('✅ PromoService: Active offers exist');
        }
        
        this.cleanupExpiredOffers().catch(err => 
          console.log('Cleanup error (non-critical):', err.message)
        );
        
        return true;
      })();

      await Promise.race([initPromise, timeoutPromise]);
      
      this.isInitialized = true;
      console.log('✅ PromoService: Initialized successfully');
    } catch (error) {
      console.log('⚠️ PromoService: Init error (non-critical):', error.message);
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  async checkIfOffersNeedUpdate() {
    try {
      const now = Timestamp.now();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '>', now),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      const needsUpdate = snapshot.empty;
      
      console.log(`PromoService: Active offers - ${needsUpdate ? 'NEEDS UPDATE' : 'EXISTS'}`);
      return needsUpdate;
    } catch (error) {
      console.error('PromoService: Check offers error:', error);
      if (error.code === 'permission-denied' || error.message.includes('index')) {
        console.log('⚠️ Collection may not exist or missing index. Will create offer.');
        return true;
      }
      return false;
    }
  }

  async createWeeklyPromoOffers() {
    try {
      const template = this.PROMO_TEMPLATES[
        Math.floor(Math.random() * this.PROMO_TEMPLATES.length)
      ];
      
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + template.durationDays);
      
      const offerId = `promo_${now.getTime()}_${template.type}`;
      const offerData = {
        title: template.title,
        description: template.description,
        discount: template.discount,
        type: template.type,
        isActive: true,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        createdBy: 'auto_system',
        impressions: 0,
        clicks: 0,
        conversions: 0,
        lastImpressionAt: null,
        lastClickAt: null,
        lastConversionAt: null
      };
      
      await setDoc(doc(db, 'promo_offers', offerId), offerData);
      
      console.log('✅ PromoService: Created offer:', template.title);
      console.log('   Duration:', template.durationDays, 'days');
      console.log('   Expires:', expiresAt.toLocaleDateString());
      
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_offer_auto_created', {
          offer_type: template.type,
          duration_days: template.durationDays
        }).catch(() => {});
      }
      
      return offerData;
    } catch (error) {
      console.error('❌ PromoService: Create offer error:', error);
      throw error;
    }
  }

  async cleanupExpiredOffers() {
    try {
      const now = Timestamp.now();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '<', now)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`🧹 PromoService: Cleaning ${snapshot.size} expired offers`);
        
        const updatePromises = snapshot.docs.map(docSnapshot =>
          updateDoc(doc(db, 'promo_offers', docSnapshot.id), {
            isActive: false,
            deactivatedAt: Timestamp.now(),
            deactivatedBy: 'auto_cleanup'
          })
        );
        
        await Promise.all(updatePromises);
        console.log('✅ Cleanup completed');
      }
      
      return true;
    } catch (error) {
      console.error('PromoService: Cleanup error:', error);
      return false;
    }
  }

  async getPersonalizedOffer(userStats = {}) {
    try {
      console.log('📋 PromoService: Fetching personalized offer...');
      
      const now = Timestamp.now();
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Fetch timeout')), 3000)
      );
      
      const fetchPromise = (async () => {
        const q = query(
          collection(db, 'promo_offers'),
          where('isActive', '==', true),
          where('expiresAt', '>', now),
          orderBy('expiresAt', 'asc'),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const offer = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          };
          
          if (offer.createdAt?.toDate) {
            offer.createdAt = offer.createdAt.toDate().toISOString();
          }
          if (offer.expiresAt?.toDate) {
            offer.expiresAt = offer.expiresAt.toDate().toISOString();
          }
          
          console.log('✅ PromoService: Found offer:', offer.title);
          
          this.trackOfferImpression(offer.id).catch(err =>
            console.log('Impression tracking failed:', err.message)
          );
          
          return offer;
        }
        
        console.log('ℹ️ PromoService: No active offers available');
        return null;
      })();
      
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('PromoService: Get offer error:', error);
      return null;
    }
  }

  /**
   * ✅ CRITICAL FIX: Use updateDoc with increment() for atomic updates
   */
  async trackOfferImpression(offerId) {
    if (!offerId || offerId === 'fallback') {
      console.log('⚠️ trackOfferImpression: Skipping fallback offer');
      return false;
    }

    try {
      console.log('📊 Tracking impression for offer:', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ CRITICAL: Use updateDoc with increment() for atomic updates
      await updateDoc(offerRef, {
        impressions: increment(1),
        lastImpressionAt: Timestamp.now()
      });
      
      console.log('✅ Impression tracked successfully for:', offerId);
      
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_impression', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌ Track impression error for', offerId, ':', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      return false;
    }
  }

  /**
   * ✅ CRITICAL FIX: Use updateDoc with increment() for atomic updates
   */
  async trackOfferClick(offerId) {
    if (!offerId || offerId === 'fallback') {
      console.log('⚠️ trackOfferClick: Skipping fallback offer');
      return false;
    }

    try {
      console.log('👆 Tracking click for offer:', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ CRITICAL: Use updateDoc with increment() for atomic updates
      await updateDoc(offerRef, {
        clicks: increment(1),
        lastClickAt: Timestamp.now()
      });
      
      console.log('✅ Click tracked successfully for:', offerId);
      
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_click', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌ Track click error for', offerId, ':', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      return false;
    }
  }

  /**
   * ✅ CRITICAL FIX: Use updateDoc with increment() for atomic updates
   */
  async trackOfferConversion(offerId) {
    if (!offerId || offerId === 'fallback') {
      console.log('⚠️ trackOfferConversion: Skipping fallback offer');
      return false;
    }

    try {
      console.log('💰 Tracking conversion for offer:', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ CRITICAL: Use updateDoc with increment() for atomic updates
      await updateDoc(offerRef, {
        conversions: increment(1),
        lastConversionAt: Timestamp.now()
      });
      
      console.log('✅ Conversion tracked successfully for:', offerId);
      
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_conversion', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌ Track conversion error for', offerId, ':', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      return false;
    }
  }

  async forceCreateNewOffer() {
    console.log('🔧 PromoService: Force creating new offer...');
    try {
      const offer = await this.createWeeklyPromoOffers();
      console.log('✅ Offer created successfully:', offer.title);
      return offer;
    } catch (error) {
      console.error('❌ Force create offer failed:', error);
      throw error;
    }
  }

  async getAllActiveOffers() {
    try {
      const now = Timestamp.now();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
        };
      });
    } catch (error) {
      console.error('PromoService: Get all offers error:', error);
      return [];
    }
  }

  /**
   * ✅ Get offer statistics with proper calculation
   */
  async getOfferStatistics() {
    try {
      console.log('📊 PromoService: Calculating statistics...');
      
      const allOffersQuery = collection(db, 'promo_offers');
      const snapshot = await getDocs(allOffersQuery);
      
      const stats = {
        totalOffers: snapshot.size,
        activeOffers: 0,
        expiredOffers: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: '0.00',
        clickThroughRate: '0.00'
      };
      
      const now = Timestamp.now();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt;
        
        if (data.isActive && expiresAt && expiresAt.toMillis() > now.toMillis()) {
          stats.activeOffers++;
        } else if (!data.isActive || (expiresAt && expiresAt.toMillis() <= now.toMillis())) {
          stats.expiredOffers++;
        }
        
        // ✅ CRITICAL: Sum up metrics properly
        stats.totalImpressions += Number(data.impressions) || 0;
        stats.totalClicks += Number(data.clicks) || 0;
        stats.totalConversions += Number(data.conversions) || 0;
      });
      
      // ✅ CRITICAL: Calculate rates properly
      if (stats.totalImpressions > 0) {
        stats.clickThroughRate = ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2);
      }
      
      if (stats.totalClicks > 0) {
        stats.conversionRate = ((stats.totalConversions / stats.totalClicks) * 100).toFixed(2);
      }
      
      console.log('✅ Statistics calculated:', {
        total: stats.totalOffers,
        active: stats.activeOffers,
        impressions: stats.totalImpressions,
        clicks: stats.totalClicks,
        conversions: stats.totalConversions,
        convRate: stats.conversionRate + '%'
      });
      
      return stats;
    } catch (error) {
      console.error('❌ Get statistics error:', error);
      return {
        totalOffers: 0,
        activeOffers: 0,
        expiredOffers: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: '0.00',
        clickThroughRate: '0.00'
      };
    }
  }

  async getOfferById(offerId) {
    try {
      const docRef = doc(db, 'promo_offers', offerId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
        };
      }
      
      return null;
    } catch (error) {
      console.error('PromoService: Get offer by ID error:', error);
      return null;
    }
  }
}

const promoServiceInstance = new PromoService();
export default promoServiceInstance;
export { PromoService };
