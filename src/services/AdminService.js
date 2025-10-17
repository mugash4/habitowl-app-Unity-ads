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
import { db } from '../../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AdminService {
  constructor() {
    this.isAdmin = false;
    this.adminEmails = [
      'augustinemwathi96@gmail.com', // Replace with your actual email
      // Add more admin emails if needed
    ];
  }

  async checkAdminStatus(userEmail) {
    try {
      // Check if user is in admin list
      this.isAdmin = this.adminEmails.includes(userEmail?.toLowerCase());
      await AsyncStorage.setItem('is_admin', this.isAdmin.toString());
      return this.isAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
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

  // API Key Management (Server-side only)
  async setGlobalApiKey(provider, apiKey) {
    if (!this.isAdmin) throw new Error('Unauthorized');

    try {
      const configRef = doc(db, 'admin_config', 'api_keys');
      await setDoc(configRef, {
        [provider]: apiKey,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin'
      }, { merge: true });

      console.log(`${provider} API key updated successfully`);
      return true;
    } catch (error) {
      console.error('Error setting API key:', error);
      throw error;
    }
  }

  async getGlobalApiKey(provider) {
    try {
      const configRef = doc(db, 'admin_config', 'api_keys');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        return configDoc.data()[provider];
      }
      return null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  async setDefaultAiProvider(provider) {
    if (!this.isAdmin) throw new Error('Unauthorized');

    try {
      const configRef = doc(db, 'admin_config', 'settings');
      await setDoc(configRef, {
        defaultAiProvider: provider,
        updatedAt: new Date().toISOString()
      }, { merge: true });

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
    if (!this.isAdmin) throw new Error('Unauthorized');

    try {
      const q = query(collection(db, 'users'), where('uid', '==', userId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(userDoc.ref, {
          isPremium: isPremium,
          premiumUpdatedAt: new Date().toISOString(),
          premiumUpdatedBy: 'admin'
        });
      }

      return true;
    } catch (error) {
      console.error('Error setting premium status:', error);
      throw error;
    }
  }

  // App Statistics
  async getAppStatistics() {
    if (!this.isAdmin) throw new Error('Unauthorized');

    try {
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
    if (!this.isAdmin) throw new Error('Unauthorized');

    try {
      const offersRef = collection(db, 'promo_offers');
      await setDoc(doc(offersRef), {
        ...offerData,
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
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

export default new AdminService();