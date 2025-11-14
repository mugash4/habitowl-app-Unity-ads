/**
 * PromoService - Automatic Promotional Offer Management
 * FIXED: Proper Firestore increment usage for accurate statistics tracking
 * Version: 5.0 - Statistics tracking fixed
 */

import { 
  collection, 
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query, 
  where,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Safe Firebase Service import
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
      },
      {
        title: "🚀 Transform Your Life!",
        description: "Start building better habits today with Premium! Special offer: 60% OFF - Biggest discount ever!",
        discount: "60% OFF",
        durationDays: 7,
        type: "new_year"
      }
    ];
    
    setTimeout(() => {
      this.initializePromoSystemBackground();
    }, 1000);
  }

  /**
   * Background initialization - non-blocking
   */
  async initializePromoSystemBackground() {
    if (this.isInitializing || this.isInitialized) {
      console.log('⚠️ PromoService: Already initializing or initialized');
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🔄 PromoService: Background init starting...');
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Init timeout after 8s')), 8000)
      );

      const initPromise = (async () => {
        const needsUpdate = await this.checkIfOffersNeedUpdate();
        
        if (needsUpdate) {
          console.log('📝 PromoService: Creating new offer...');
          await this.createWeeklyPromoOffers();
        } else {
          console.log('✅ PromoService: Active offers exist');
        }
        
        this.cleanupExpiredOffers().catch(() => {});
        
        return true;
      })();

      await Promise.race([initPromise, timeoutPromise]);
      
      this.isInitialized = true;
      console.log('✅ PromoService: Background init complete');
    } catch (error) {
      console.log('⚠️ PromoService: Background init error (non-critical):', error.message);
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Check if new offers need to be created
   */
  async checkIfOffersNeedUpdate() {
    try {
      const now = new Date().toISOString();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '>', now),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      const needsUpdate = snapshot.empty;
      
      console.log(`PromoService: Active offers check - ${needsUpdate ? 'NEEDS UPDATE' : 'OK'}`);
      return needsUpdate;
    } catch (error) {
      console.log('PromoService: Check offers error:', error.message);
      return false;
    }
  }

  /**
   * Create weekly promo offers automatically
   */
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
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdBy: 'auto_system',
        impressions: 0,
        clicks: 0,
        conversions: 0
      };
      
      await setDoc(doc(db, 'promo_offers', offerId), offerData);
      
      console.log('✅ PromoService: Created offer:', template.title);
      console.log('   Expires:', expiresAt.toLocaleDateString());
      
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_offer_auto_created', {
          offer_type: template.type,
          duration_days: template.durationDays
        }).catch(() => {});
      }
      
      return offerData;
    } catch (error) {
      console.log('❌ PromoService: Create offer error:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup expired offers
   */
  async cleanupExpiredOffers() {
    try {
      const now = new Date().toISOString();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '<', now)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log(`🧹 PromoService: Cleaning up ${snapshot.size} expired offers`);
        
        const updatePromises = snapshot.docs.map(docSnapshot =>
          updateDoc(doc(db, 'promo_offers', docSnapshot.id), {
            isActive: false,
            deactivatedAt: now,
            deactivatedBy: 'auto_cleanup'
          })
        );
        
        await Promise.all(updatePromises);
      }
      
      return true;
    } catch (error) {
      console.log('PromoService: Cleanup error:', error.message);
      return false;
    }
  }

  /**
   * Get personalized offer for user
   */
  async getPersonalizedOffer(userStats) {
    try {
      console.log('PromoService: Fetching personalized offer...');
      
      const now = new Date().toISOString();
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Offer fetch timeout')), 2500)
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
          
          console.log('✅ PromoService: Found offer:', offer.title);
          
          // Track impression in background
          this.trackOfferImpression(offer.id).catch((error) => {
            console.log('⚠️ Impression tracking failed:', error.message);
          });
          
          return offer;
        }
        
        console.log('ℹ️ PromoService: No active offers in database');
        return null;
      })();
      
      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.log('PromoService: Get offer error:', error.message);
      return null;
    }
  }

  /**
   * ✅ FIXED: Track offer impression with proper Firestore increment
   */
  async trackOfferImpression(offerId) {
    try {
      console.log('📊 PromoService: Tracking impression for', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ Use Firestore's increment directly
      await updateDoc(offerRef, {
        impressions: increment(1),
        lastImpressionAt: new Date().toISOString()
      });
      
      console.log('✅ PromoService: Impression tracked successfully');
      
      // Track in analytics
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_impression', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌ PromoService: Track impression error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Track offer click with proper Firestore increment
   */
  async trackOfferClick(offerId) {
    try {
      console.log('👆 PromoService: Tracking click for', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ Use Firestore's increment directly
      await updateDoc(offerRef, {
        clicks: increment(1),
        lastClickAt: new Date().toISOString()
      });
      
      console.log('✅ PromoService: Click tracked successfully');
      
      // Track in analytics
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_click', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌ PromoService: Track click error:', error.message);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Track offer conversion with proper Firestore increment
   */
  async trackOfferConversion(offerId) {
    try {
      console.log('💰 PromoService: Tracking conversion for', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ Use Firestore's increment directly
      await updateDoc(offerRef, {
        conversions: increment(1),
        lastConversionAt: new Date().toISOString()
      });
      
      console.log('✅ PromoService: Conversion tracked successfully');
      
      // Track in analytics
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_conversion', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌ PromoService: Track conversion error:', error.message);
      throw error;
    }
  }

  /**
   * Force create new offer (for manual testing or admin)
   */
  async forceCreateNewOffer() {
    console.log('🔧 PromoService: Force creating new offer...');
    return await this.createWeeklyPromoOffers();
  }

  /**
   * Get all active offers
   */
  async getAllActiveOffers() {
    try {
      const now = new Date().toISOString();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '>', now),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.log('PromoService: Get all offers error:', error.message);
      return [];
    }
  }

  /**
   * ✅ Get offer statistics with proper calculation
   */
  async getOfferStatistics() {
    try {
      console.log('📊 PromoService: Calculating offer statistics...');
      
      const allOffersQuery = query(collection(db, 'promo_offers'));
      const snapshot = await getDocs(allOffersQuery);
      
      const stats = {
        totalOffers: snapshot.size,
        activeOffers: 0,
        expiredOffers: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0
      };
      
      const now = new Date().toISOString();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Count active vs expired
        if (data.isActive && data.expiresAt > now) {
          stats.activeOffers++;
        } else {
          stats.expiredOffers++;
        }
        
        // Sum up metrics
        stats.totalImpressions += data.impressions || 0;
        stats.totalClicks += data.clicks || 0;
        stats.totalConversions += data.conversions || 0;
      });
      
      // Calculate conversion rate
      if (stats.totalClicks > 0) {
        stats.conversionRate = ((stats.totalConversions / stats.totalClicks) * 100).toFixed(2);
      }
      
      console.log('✅ PromoService: Stats calculated:', stats);
      
      return stats;
    } catch (error) {
      console.error('❌ PromoService: Get statistics error:', error.message);
      return {
        totalOffers: 0,
        activeOffers: 0,
        expiredOffers: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0
      };
    }
  }
}

// Export singleton instance
const promoServiceInstance = new PromoService();
export default promoServiceInstance;
export { PromoService };
