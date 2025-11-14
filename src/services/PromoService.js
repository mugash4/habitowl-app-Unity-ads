/**
 * PromoService - Automatic Promotional Offer Management
 * COMPLETE FIX: All metrics update properly in real-time
 * Version: 7.0 - Production Ready
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
    
    // Delayed initialization to avoid blocking app startup
    setTimeout(() => {
      this.initializePromoSystemBackground();
    }, 2000);
  }

  /**
   * Background initialization - non-blocking
   */
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
        // Check if collection exists and has active offers
        const needsUpdate = await this.checkIfOffersNeedUpdate();
        
        if (needsUpdate) {
          console.log('📝 PromoService: Creating new offer...');
          await this.createWeeklyPromoOffers();
        } else {
          console.log('✅ PromoService: Active offers exist');
        }
        
        // Cleanup expired offers in background
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
      this.isInitialized = true; // Mark as initialized even on error to prevent retries
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Check if new offers need to be created
   */
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
      // If collection doesn't exist, we need to create offers
      if (error.code === 'permission-denied' || error.message.includes('index')) {
        console.log('⚠️ Collection may not exist or missing index. Will create offer.');
        return true;
      }
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
      
      // Track event
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

  /**
   * Cleanup expired offers
   */
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

  /**
   * Get personalized offer for user
   */
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
          
          // Convert Firestore Timestamps to ISO strings for easier handling
          if (offer.createdAt?.toDate) {
            offer.createdAt = offer.createdAt.toDate().toISOString();
          }
          if (offer.expiresAt?.toDate) {
            offer.expiresAt = offer.expiresAt.toDate().toISOString();
          }
          
          console.log('✅ PromoService: Found offer:', offer.title);
          
          // Track impression in background (non-blocking)
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
   * ✅ FIXED: Track offer impression with DETAILED ERROR LOGGING
   */
  async trackOfferImpression(offerId) {
    if (!offerId) {
      console.warn('⚠️ trackOfferImpression: No offerId provided');
      return false;
    }

    try {
      console.log('📊 Tracking impression:', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ CRITICAL: Log current values BEFORE update
      try {
        const currentDoc = await getDoc(offerRef);
        if (currentDoc.exists()) {
          const data = currentDoc.data();
          console.log('Current impressions BEFORE update:', data.impressions || 0);
        }
      } catch (err) {
        console.log('Could not read current value:', err.message);
      }
      
      // ✅ CRITICAL: Use increment() for atomic updates
      await updateDoc(offerRef, {
        impressions: increment(1),
        lastImpressionAt: Timestamp.now()
      });
      
      console.log('✅ Impression tracked successfully!');
      console.log('   Offer ID:', offerId);
      console.log('   Incremented impressions by 1');
      
      // Verify the update
      try {
        const updatedDoc = await getDoc(offerRef);
        if (updatedDoc.exists()) {
          const data = updatedDoc.data();
          console.log('✅ VERIFIED: New impressions value:', data.impressions || 0);
        }
      } catch (err) {
        console.log('Could not verify update:', err.message);
      }
      
      // Track in analytics
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_impression', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌❌❌ IMPRESSION TRACKING FAILED ❌❌❌');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // Check for permission denied
      if (error.code === 'permission-denied') {
        console.error('🚫 PERMISSION DENIED: Firestore rules are blocking this update!');
        console.error('   Check your firestore.rules file');
        console.error('   Make sure isTrackingUpdate() function allows impressions field');
      }
      
      return false;
    }
  }

  /**
   * ✅ FIXED: Track offer click with DETAILED ERROR LOGGING
   */
  async trackOfferClick(offerId) {
    if (!offerId) {
      console.warn('⚠️ trackOfferClick: No offerId provided');
      return false;
    }

    try {
      console.log('👆 Tracking click:', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ CRITICAL: Log current values BEFORE update
      try {
        const currentDoc = await getDoc(offerRef);
        if (currentDoc.exists()) {
          const data = currentDoc.data();
          console.log('Current clicks BEFORE update:', data.clicks || 0);
        }
      } catch (err) {
        console.log('Could not read current value:', err.message);
      }
      
      // ✅ CRITICAL: Use increment() for atomic updates
      await updateDoc(offerRef, {
        clicks: increment(1),
        lastClickAt: Timestamp.now()
      });
      
      console.log('✅ Click tracked successfully!');
      console.log('   Offer ID:', offerId);
      console.log('   Incremented clicks by 1');
      
      // Verify the update
      try {
        const updatedDoc = await getDoc(offerRef);
        if (updatedDoc.exists()) {
          const data = updatedDoc.data();
          console.log('✅ VERIFIED: New clicks value:', data.clicks || 0);
        }
      } catch (err) {
        console.log('Could not verify update:', err.message);
      }
      
      // Track in analytics
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_click', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌❌❌ CLICK TRACKING FAILED ❌❌❌');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // Check for permission denied
      if (error.code === 'permission-denied') {
        console.error('🚫 PERMISSION DENIED: Firestore rules are blocking this update!');
        console.error('   Check your firestore.rules file');
        console.error('   Make sure isTrackingUpdate() function allows clicks field');
      }
      
      return false;
    }
  }

  /**
   * ✅ FIXED: Track offer conversion with DETAILED ERROR LOGGING
   */
  async trackOfferConversion(offerId) {
    if (!offerId) {
      console.warn('⚠️ trackOfferConversion: No offerId provided');
      return false;
    }

    try {
      console.log('💰 Tracking conversion:', offerId);
      
      const offerRef = doc(db, 'promo_offers', offerId);
      
      // ✅ CRITICAL: Log current values BEFORE update
      try {
        const currentDoc = await getDoc(offerRef);
        if (currentDoc.exists()) {
          const data = currentDoc.data();
          console.log('Current conversions BEFORE update:', data.conversions || 0);
        }
      } catch (err) {
        console.log('Could not read current value:', err.message);
      }
      
      // ✅ CRITICAL: Use increment() for atomic updates
      await updateDoc(offerRef, {
        conversions: increment(1),
        lastConversionAt: Timestamp.now()
      });
      
      console.log('✅ Conversion tracked successfully!');
      console.log('   Offer ID:', offerId);
      console.log('   Incremented conversions by 1');
      
      // Verify the update
      try {
        const updatedDoc = await getDoc(offerRef);
        if (updatedDoc.exists()) {
          const data = updatedDoc.data();
          console.log('✅ VERIFIED: New conversions value:', data.conversions || 0);
        }
      } catch (err) {
        console.log('Could not verify update:', err.message);
      }
      
      // Track in analytics
      if (FirebaseService?.trackEvent) {
        FirebaseService.trackEvent('promo_conversion', {
          offer_id: offerId
        }).catch(() => {});
      }
      
      return true;
    } catch (error) {
      console.error('❌❌❌ CONVERSION TRACKING FAILED ❌❌❌');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // Check for permission denied
      if (error.code === 'permission-denied') {
        console.error('🚫 PERMISSION DENIED: Firestore rules are blocking this update!');
        console.error('   Check your firestore.rules file');
        console.error('   Make sure isTrackingUpdate() function allows conversions field');
      }
      
      return false;
    }
  }

  /**
   * Force create new offer (for testing or manual admin action)
   */
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

  /**
   * Get all active offers
   */
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
   * ✅ FIXED: Get offer statistics with proper calculation
   * This will show REAL-TIME stats from Firestore
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
        
        // Count active vs expired
        if (data.isActive && expiresAt && expiresAt.toMillis() > now.toMillis()) {
          stats.activeOffers++;
        } else if (!data.isActive || (expiresAt && expiresAt.toMillis() <= now.toMillis())) {
          stats.expiredOffers++;
        }
        
        // ✅ CRITICAL: Sum up metrics (handle undefined/null values properly)
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

  /**
   * Get detailed offer by ID
   */
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

// Export singleton instance
const promoServiceInstance = new PromoService();
export default promoServiceInstance;
export { PromoService };
