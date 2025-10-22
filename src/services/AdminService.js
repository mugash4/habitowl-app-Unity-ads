import { 
  collection, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AdminService {
  constructor() {
    this.isAdmin = false;
    this.adminEmails = []; // Will be loaded from Firestore
  }

  // ✅ FIXED: Load admin emails from Firestore instead of hardcoding
  async loadAdminEmails() {
    try {
      const configRef = doc(db, 'admin_config', 'settings');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists() && configDoc.data().admin_emails) {
        this.adminEmails = configDoc.data().admin_emails;
        console.log('Admin emails loaded from Firestore:', this.adminEmails.length);
      } else {
        console.warn('No admin_emails found in Firestore admin_config/settings');
        this.adminEmails = [];
      }
      
      return this.adminEmails;
    } catch (error) {
      console.error('Error loading admin emails:', error);
      this.adminEmails = [];
      return [];
    }
  }

  // ✅ FIXED: Check admin status using Firestore data
  async checkAdminStatus(userEmail) {
    try {
      if (!userEmail) {
        this.isAdmin = false;
        await AsyncStorage.setItem('is_admin', 'false');
        return false;
      }

      // Load admin emails from Firestore
      await this.loadAdminEmails();
      
      // Check if user email is in the admin list
      const normalizedEmail = userEmail.toLowerCase().trim();
      this.isAdmin = this.adminEmails.some(
        email => email.toLowerCase().trim() === normalizedEmail
      );
      
      console.log(`Admin check for ${userEmail}: ${this.isAdmin}`);
      
      await AsyncStorage.setItem('is_admin', this.isAdmin.toString());
      return this.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdmin = false;
      await AsyncStorage.setItem('is_admin', 'false');
      return false;
    }
  }

  async isCurrentUserAdmin() {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        return false;
      }
      return await this.checkAdminStatus(user.email);
    } catch (error) {
      console.error('Error checking current user admin status:', error);
      return false;
    }
  }

  async getAdminStatus() {
    try {
      const stored = await AsyncStorage.getItem('is_admin');
      return stored === 'true';
    } catch (error) {
      return false;
    }
  }

  // ✅ FIXED: API Key Management with strict admin verification
  async setGlobalApiKey(provider, apiKey) {
    try {
      // Double-check admin status from Firestore
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const configRef = doc(db, 'admin_config', 'api_keys');
      await setDoc(configRef, {
        [provider]: apiKey,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin'
      }, { merge: true });

      console.log(`${provider} API key updated successfully by ${auth.currentUser?.email}`);
      return true;
    } catch (error) {
      console.error('Error setting API key:', error);
      throw error;
    }
  }

  // ✅ FIXED: Only admins can retrieve API keys
  async getGlobalApiKey(provider) {
    try {
      // Verify admin status before revealing API keys
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        console.warn('Non-admin attempted to access API key');
        return null;
      }

      const configRef = doc(db, 'admin_config', 'api_keys');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        return configDoc.data()[provider] || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  async setDefaultAiProvider(provider) {
    try {
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const configRef = doc(db, 'admin_config', 'settings');
      await setDoc(configRef, {
        defaultAiProvider: provider,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin'
      }, { merge: true });

      console.log(`Default AI provider set to ${provider} by ${auth.currentUser?.email}`);
      return true;
    } catch (error) {
      console.error('Error setting default AI provider:', error);
      throw error;
    }
  }

  async getDefaultAiProvider() {
    try {
      const configRef = doc(db, 'admin_config', 'settings');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        return configDoc.data().defaultAiProvider || 'deepseek';
      }
      return 'deepseek';
    } catch (error) {
      console.error('Error getting default AI provider:', error);
      return 'deepseek';
    }
  }

  // Premium User Management
  async setPremiumStatus(userId, isPremium) {
    try {
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const q = query(collection(db, 'users'), where('uid', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          isPremium: isPremium,
          premiumUpdatedAt: new Date().toISOString(),
          premiumUpdatedBy: auth.currentUser?.email || 'admin'
        });
      }

      return true;
    } catch (error) {
      console.error('Error setting premium status:', error);
      throw error;
    }
  }

  // ✅ FIXED: App Statistics with admin verification
  async getAppStatistics() {
    try {
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const [usersSnapshot, habitsSnapshot, analyticsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'habits')),
        getDocs(query(collection(db, 'analytics'), where('timestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))))
      ]);

      const users = usersSnapshot.docs.map(doc => doc.data());
      const habits = habitsSnapshot.docs.map(doc => doc.data());
      const analytics = analyticsSnapshot.docs.map(doc => doc.data());

      return {
        totalUsers: users.length,
        premiumUsers: users.filter(u => u.isPremium).length,
        totalHabits: habits.length,
        activeHabits: habits.filter(h => h.isActive).length,
        weeklyEvents: analytics.length,
        averageHabitsPerUser: habits.length / Math.max(users.length, 1)
      };
    } catch (error) {
      console.error('Error getting app statistics:', error);
      throw error;
    }
  }

  // Promotional Offers Management
  async createPromoOffer(offerData) {
    try {
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      const offersRef = collection(db, 'promo_offers');
      await setDoc(doc(offersRef), {
        ...offerData,
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.email || 'admin',
        isActive: true
      });

      return true;
    } catch (error) {
      console.error('Error creating promo offer:', error);
      throw error;
    }
  }

  async getActivePromoOffers() {
    try {
      const q = query(
        collection(db, 'promo_offers'), 
        where('isActive', '==', true),
        where('expiresAt', '>', new Date().toISOString())
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting promo offers:', error);
      return [];
    }
  }
}

// Export as singleton instance (default export)
const adminServiceInstance = new AdminService();
export default adminServiceInstance;

// Also export the class itself as named export (for flexibility)
export { AdminService };
