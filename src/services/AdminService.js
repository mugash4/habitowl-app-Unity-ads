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
    this.adminEmails = [];
    this.adminEmailsLoaded = false;
  }

  // ✅ CRITICAL FIX: Load admin emails with proper error handling
  async loadAdminEmails() {
    try {
      console.log('AdminService: Loading admin emails from Firestore...');
      
      const configRef = doc(db, 'admin_config', 'settings');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists() && configDoc.data().admin_emails) {
        this.adminEmails = configDoc.data().admin_emails;
        this.adminEmailsLoaded = true;
        console.log('AdminService: Admin emails loaded:', this.adminEmails.length, 'emails');
        return this.adminEmails;
      } else {
        console.warn('AdminService: No admin_emails found in Firestore admin_config/settings');
        console.warn('AdminService: Please create admin_config/settings document with admin_emails array field');
        this.adminEmails = [];
        this.adminEmailsLoaded = true;
        return [];
      }
    } catch (error) {
      console.error('AdminService: Error loading admin emails:', error);
      this.adminEmails = [];
      this.adminEmailsLoaded = false;
      return [];
    }
  }

  // ✅ CRITICAL FIX: Check admin status with proper error handling
  async checkAdminStatus(userEmail) {
    try {
      console.log('AdminService: Checking admin status for:', userEmail);
      
      if (!userEmail) {
        console.log('AdminService: No email provided');
        this.isAdmin = false;
        await AsyncStorage.setItem('is_admin', 'false');
        return false;
      }

      // Load admin emails if not already loaded
      if (!this.adminEmailsLoaded) {
        await this.loadAdminEmails();
      }
      
      // Check if user email is in the admin list
      const normalizedEmail = userEmail.toLowerCase().trim();
      this.isAdmin = this.adminEmails.some(
        email => email.toLowerCase().trim() === normalizedEmail
      );
      
      console.log('AdminService: Admin check result for', userEmail, ':', this.isAdmin);
      
      await AsyncStorage.setItem('is_admin', this.isAdmin.toString());
      return this.isAdmin;
    } catch (error) {
      console.error('AdminService: Error checking admin status:', error);
      this.isAdmin = false;
      await AsyncStorage.setItem('is_admin', 'false');
      return false;
    }
  }

  async isCurrentUserAdmin() {
    try {
      const user = auth.currentUser;
      console.log('AdminService: Current user:', user?.email || 'Not logged in');
      
      if (!user || !user.email) {
        console.log('AdminService: No current user');
        return false;
      }
      
      return await this.checkAdminStatus(user.email);
    } catch (error) {
      console.error('AdminService: Error checking current user admin status:', error);
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

  // ✅ CRITICAL FIX: API Key Management with strict admin verification
  async setGlobalApiKey(provider, apiKey) {
    try {
      console.log('AdminService: Setting API key for provider:', provider);
      
      // Double-check admin status
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

      console.log(`AdminService: ${provider} API key updated successfully`);
      return true;
    } catch (error) {
      console.error('AdminService: Error setting API key:', error);
      throw error;
    }
  }

  // ✅ CRITICAL FIX: Only admins can retrieve API keys
  async getGlobalApiKey(provider) {
    try {
      // Verify admin status before revealing API keys
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        console.warn('AdminService: Non-admin attempted to access API key');
        return null;
      }

      const configRef = doc(db, 'admin_config', 'api_keys');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        return configDoc.data()[provider] || null;
      }
      return null;
    } catch (error) {
      console.error('AdminService: Error getting API key:', error);
      return null;
    }
  }

  async setDefaultAiProvider(provider) {
    try {
      console.log('AdminService: Setting default AI provider:', provider);
      
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

      console.log(`AdminService: Default AI provider set to ${provider}`);
      return true;
    } catch (error) {
      console.error('AdminService: Error setting default AI provider:', error);
      throw error;
    }
  }

  async getDefaultAiProvider() {
    try {
      console.log('AdminService: Getting default AI provider...');
      
      const configRef = doc(db, 'admin_config', 'settings');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists() && configDoc.data().defaultAiProvider) {
        const provider = configDoc.data().defaultAiProvider;
        console.log('AdminService: Default provider:', provider);
        return provider;
      }
      
      console.log('AdminService: No default provider found, using deepseek');
      return 'deepseek';
    } catch (error) {
      console.error('AdminService: Error getting default AI provider:', error);
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
      console.error('AdminService: Error setting premium status:', error);
      throw error;
    }
  }

  // ✅ CRITICAL FIX: App Statistics with proper error handling and timeouts
  async getAppStatistics() {
    try {
      console.log('AdminService: Getting app statistics...');
      
      const isAdmin = await this.isCurrentUserAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Set timeout for Firestore queries
      const timeout = (ms) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), ms)
      );

      // Get data with timeouts
      const [usersSnapshot, habitsSnapshot, analyticsSnapshot] = await Promise.all([
        Promise.race([
          getDocs(collection(db, 'users')),
          timeout(10000)
        ]),
        Promise.race([
          getDocs(collection(db, 'habits')),
          timeout(10000)
        ]),
        Promise.race([
          getDocs(query(
            collection(db, 'analytics'), 
            where('timestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
          )),
          timeout(10000)
        ])
      ]);

      const users = usersSnapshot.docs.map(doc => doc.data());
      const habits = habitsSnapshot.docs.map(doc => doc.data());
      const analytics = analyticsSnapshot.docs.map(doc => doc.data());

      const stats = {
        totalUsers: users.length,
        premiumUsers: users.filter(u => u.isPremium).length,
        totalHabits: habits.length,
        activeHabits: habits.filter(h => h.isActive).length,
        weeklyEvents: analytics.length,
        averageHabitsPerUser: users.length > 0 ? (habits.length / users.length).toFixed(1) : 0
      };

      console.log('AdminService: Statistics loaded:', stats);
      return stats;
    } catch (error) {
      console.error('AdminService: Error getting app statistics:', error);
      
      // Return default stats instead of throwing
      return {
        totalUsers: 0,
        premiumUsers: 0,
        totalHabits: 0,
        activeHabits: 0,
        weeklyEvents: 0,
        averageHabitsPerUser: 0
      };
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

      console.log('AdminService: Promo offer created successfully');
      return true;
    } catch (error) {
      console.error('AdminService: Error creating promo offer:', error);
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
      console.error('AdminService: Error getting promo offers:', error);
      return [];
    }
  }
}

// Export as singleton instance (default export)
const adminServiceInstance = new AdminService();
export default adminServiceInstance;

// Also export the class itself as named export (for flexibility)
export { AdminService };