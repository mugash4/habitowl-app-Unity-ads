/**
 * PromoService - Automatic Promotional Offer Management
 * FIXED: Better error handling to prevent crashes
 */

import { 
  collection, 
  doc,
  getDocs,
  setDoc,
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

// CRITICAL FIX: Safe import of FirebaseService
let FirebaseService = null;
try {
  FirebaseService = require('./FirebaseService').default;
} catch (error) {
  console.log('PromoService: FirebaseService not available');
}

class PromoService {
  constructor() {
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
        title: "🚀 New Year, New You!",
        description: "Transform your life with Premium! Special offer: 60% OFF - Biggest discount ever!",
        discount: "60% OFF",
        durationDays: 7,
        type: "new_year"
      }
    ];
  }

  async initializePromoSystem() {
    try {
      console.log('PromoService: Initializing...');
      
      // CRITICAL FIX: Add timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Init timeout')), 2000)
      );

      const initPromise = (async () => {
        const needsUpdate = await this.checkIfOffersNeedUpdate();
        
        if (needsUpdate) {
          await this.createWeeklyPromoOffers();
        }
        
        this.cleanupExpiredOffers().catch(() => {});
        
        return true;
      })();

      await Promise.race([initPromise, timeoutPromise]);
    } catch (error) {
      console.log('PromoService: Init error (non-critical):', error.message);
      return false;
    }
  }

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
      return snapshot.empty;
    } catch (error) {
      console.log('PromoService: Check offers error:', error.message);
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
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdBy: 'auto_system',
        impressions: 0,
        clicks: 0,
        conversions: 0
      };
      
      await setDoc(doc(db, 'promo_offers', offerId), offerData);
      
      console.log('PromoService: Created offer:', template.title);
      
      if (FirebaseService && FirebaseService.trackEvent) {
        FirebaseService.trackEvent('promo_offer_auto_created', {
          offer_type: template.type,
          offer_title: template.title,
          duration_days: template.durationDays
        }).catch(() => {});
      }
      
      return offerData;
    } catch (error) {
      console.log('PromoService: Create offer error:', error.message);
      throw error;
    }
  }

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
        const updatePromises = snapshot.docs.map(docSnapshot =>
          setDoc(doc(db, 'promo_offers', docSnapshot.id), {
            isActive: false,
            deactivatedAt: now,
            deactivatedBy: 'auto_cleanup'
          }, { merge: true })
        );
        
        await Promise.all(updatePromises);
      }
      
      return true;
    } catch (error) {
      console.log('PromoService: Cleanup error:', error.message);
      return false;
    }
  }

  async getPersonalizedOffer(userStats) {
    try {
      const now = new Date().toISOString();
      
      const q = query(
        collection(db, 'promo_offers'),
        where('isActive', '==', true),
        where('expiresAt', '>', now),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const offer = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        };
        
        this.trackOfferImpression(offer.id).catch(() => {});
        
        return offer;
      }
      
      return null;
    } catch (error) {
      console.log('PromoService: Get offer error:', error.message);
      return null;
    }
  }

  async trackOfferImpression(offerId) {
    try {
      const offerRef = doc(db, 'promo_offers', offerId);
      const increment = FirebaseService && FirebaseService.increment 
        ? FirebaseService.increment(1) 
        : 1;
      
      await setDoc(offerRef, {
        impressions: increment,
        lastImpressionAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.log('PromoService: Track impression error:', error.message);
    }
  }

  async trackOfferClick(offerId) {
    try {
      const offerRef = doc(db, 'promo_offers', offerId);
      const increment = FirebaseService && FirebaseService.increment 
        ? FirebaseService.increment(1) 
        : 1;
      
      await setDoc(offerRef, {
        clicks: increment,
        lastClickAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.log('PromoService: Track click error:', error.message);
    }
  }

  async trackOfferConversion(offerId) {
    try {
      const offerRef = doc(db, 'promo_offers', offerId);
      const increment = FirebaseService && FirebaseService.increment 
        ? FirebaseService.increment(1) 
        : 1;
      
      await setDoc(offerRef, {
        conversions: increment,
        lastConversionAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.log('PromoService: Track conversion error:', error.message);
    }
  }

  async forceCreateNewOffer() {
    return await this.createWeeklyPromoOffers();
  }

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

  async getOfferStatistics() {
    try {
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
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.isActive && data.expiresAt > new Date().toISOString()) {
          stats.activeOffers++;
        } else {
          stats.expiredOffers++;
        }
        
        stats.totalImpressions += data.impressions || 0;
        stats.totalClicks += data.clicks || 0;
        stats.totalConversions += data.conversions || 0;
      });
      
      if (stats.totalClicks > 0) {
        stats.conversionRate = (stats.totalConversions / stats.totalClicks * 100).toFixed(2);
      }
      
      return stats;
    } catch (error) {
      console.log('PromoService: Get statistics error:', error.message);
      return null;
    }
  }
}

const promoServiceInstance = new PromoService();
export default promoServiceInstance;
export { PromoService };
