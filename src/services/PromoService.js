/**
 * PromoService - Automatic Promotional Offer Management
 * 
 * This service automatically creates and manages promotional offers
 * for non-premium users without requiring manual intervention.
 * 
 * Features:
 * - Auto-generates weekly promo offers
 * - Creates compelling offers based on app data
 * - Expires old offers automatically
 * - No Firebase Cloud Functions needed (client-side)
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
import FirebaseService from './FirebaseService';

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

  /**
   * Initialize promo system - Call this when app starts
   * Checks if offers need to be created/updated
   */
  async initializePromoSystem() {
    try {
      console.log('PromoService: Initializing promotional system...');
      
      // Check if we need to create/update offers
      const needsUpdate = await this.checkIfOffersNeedUpdate();
      
      if (needsUpdate) {
        console.log('PromoService: Creating new promotional offers...');
        await this.createWeeklyPromoOffers();
      } else {
        console.log('PromoService: Active offers already exist, no update needed');
      }
      
      // Clean up expired offers (fire and forget)
      this.cleanupExpiredOffers().catch(err => 
        console.log('PromoService: Cleanup error (non-critical):', err.message)
      );
      
      return true;
    } catch (error) {
      console.error('PromoService: Initialization error:', error);
      // Don't throw - this is non-critical
      return false;
    }
  }

  /**
   * Check if we need to create new offers
   * Returns true if no active offers exist or all have expired
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
      
      // If no active, non-expired offers exist, we need to create them
      return snapshot.empty;
    } catch (error) {
      console.error('PromoService: Error checking offers:', error);
      return false; // Don't create if we can't check (prevents duplicates)
    }
  }

  /**
   * Create weekly promotional offers automatically
   * Selects random templates and creates offers in Firestore
   */
  async createWeeklyPromoOffers() {
    try {
      // Select a random template
      const template = this.PROMO_TEMPLATES[
        Math.floor(Math.random() * this.PROMO_TEMPLATES.length)
      ];
      
      // Calculate expiration date
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + template.durationDays);
      
      // Create offer document
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
      
      // Save to Firestore
      await setDoc(doc(db, 'promo_offers', offerId), offerData);
      
      console.log('PromoService: Created offer:', template.title);
      console.log('PromoService: Expires at:', expiresAt.toISOString());
      
      // Track creation event
      FirebaseService.trackEvent('promo_offer_auto_created', {
        offer_type: template.type,
        offer_title: template.title,
        duration_days: template.durationDays
      }).catch(() => {});
      
      return offerData;
    } catch (error) {
      console.error('PromoService: Error creating offers:', error);
      throw error;
    }
  }

  /**
   * Clean up expired offers
   * Deactivates offers that have passed their expiration date
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
        console.log(`PromoService: Cleaning up ${snapshot.size} expired offers...`);
        
        const updatePromises = snapshot.docs.map(docSnapshot =>
          setDoc(doc(db, 'promo_offers', docSnapshot.id), {
            isActive: false,
            deactivatedAt: now,
            deactivatedBy: 'auto_cleanup'
          }, { merge: true })
        );
        
        await Promise.all(updatePromises);
        console.log('PromoService: Cleanup complete');
      }
      
      return true;
    } catch (error) {
      console.error('PromoService: Cleanup error:', error);
      return false;
    }
  }

  /**
   * Get personalized offer for user
   * Can be enhanced to show different offers based on user behavior
   */
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
        
        // Track impression
        this.trackOfferImpression(offer.id).catch(() => {});
        
        return offer;
      }
      
      return null;
    } catch (error) {
      console.error('PromoService: Error getting personalized offer:', error);
      return null;
    }
  }

  /**
   * Track offer impression (view)
   */
  async trackOfferImpression(offerId) {
    try {
      const offerRef = doc(db, 'promo_offers', offerId);
      await setDoc(offerRef, {
        impressions: FirebaseService.increment ? FirebaseService.increment(1) : 1,
        lastImpressionAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.log('PromoService: Error tracking impression:', error);
    }
  }

  /**
   * Track offer click
   */
  async trackOfferClick(offerId) {
    try {
      const offerRef = doc(db, 'promo_offers', offerId);
      await setDoc(offerRef, {
        clicks: FirebaseService.increment ? FirebaseService.increment(1) : 1,
        lastClickAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.log('PromoService: Error tracking click:', error);
    }
  }

  /**
   * Track offer conversion (upgrade)
   */
  async trackOfferConversion(offerId) {
    try {
      const offerRef = doc(db, 'promo_offers', offerId);
      await setDoc(offerRef, {
        conversions: FirebaseService.increment ? FirebaseService.increment(1) : 1,
        lastConversionAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.log('PromoService: Error tracking conversion:', error);
    }
  }

  /**
   * Manual method to force create new offer (for testing)
   */
  async forceCreateNewOffer() {
    console.log('PromoService: Force creating new offer...');
    return await this.createWeeklyPromoOffers();
  }

  /**
   * Get all active offers (for admin panel)
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
      console.error('PromoService: Error getting all offers:', error);
      return [];
    }
  }

  /**
   * Get offer statistics (for admin panel)
   */
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
      console.error('PromoService: Error getting statistics:', error);
      return null;
    }
  }
}

// Export singleton instance
const promoServiceInstance = new PromoService();
export default promoServiceInstance;

// Also export class for flexibility
export { PromoService };
