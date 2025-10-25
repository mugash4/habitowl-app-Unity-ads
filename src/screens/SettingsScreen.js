import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
} from 'react-native';
import {
  List,
  Card,
  Button,
  Switch,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';
import SecureAIService from '../services/SecureAIService';
import NotificationService from '../services/NotificationService';
import ContactSupport from '../components/ContactSupport';
import AdminService from '../services/AdminService';

// ✅ FIXED: Completely safe PromoOfferBanner import
let PromoOfferBanner = null;
try {
  const PromoModule = require('../components/PromoOfferBanner');
  PromoOfferBanner = PromoModule.default || PromoModule;
  console.log('✅ PromoOfferBanner loaded');
} catch (error) {
  console.log('ℹ️ PromoOfferBanner not available (non-critical)');
}

const SettingsScreen = ({ navigation }) => {
  // ✅ FIXED: Initialize with safe default values
  const user = FirebaseService.currentUser;
  const [userStats, setUserStats] = useState({
    displayName: user?.displayName || 'User',
    email: user?.email || '',
    totalHabits: 0,
    longestStreak: 0,
    referralCount: 0,
    referralCode: ''
  });
  
  const [isPremium, setIsPremium] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [apiProvider, setApiProvider] = useState('deepseek');
  const [referralCode, setReferralCode] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('SettingsScreen: Mounted ✅');
    
    // ✅ FIXED: Load data in background with proper error handling
    loadAllDataInBackground();
  }, []);

  // ✅ FIXED: Non-blocking background data loading
  const loadAllDataInBackground = async () => {
    setIsLoading(true);
    
    try {
      // Load all data with individual error handling
      await Promise.allSettled([
        loadUserDataSafely(),
        loadSettingsSafely(),
        checkAdminStatusSafely()
      ]);
    } catch (error) {
      console.log('SettingsScreen: Background load error:', error.message);
    } finally {
      setIsLoading(false);
      console.log('SettingsScreen: Data loaded ✅');
    }
  };

  const loadUserDataSafely = async () => {
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const stats = await Promise.race([
        FirebaseService.getUserStats(),
        timeout
      ]);
      
      if (stats && typeof stats === 'object') {
        setUserStats(prevStats => ({
          ...prevStats,
          ...stats
        }));
        setIsPremium(!!stats.isPremium);
      }
    } catch (error) {
      console.log('User data load failed:', error.message);
      // Keep default values
    }
  };

  const loadSettingsSafely = async () => {
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );
      
      const settingsPromise = (async () => {
        const stats = await FirebaseService.getUserStats();
        return await SecureAIService.getActiveProvider(stats?.isPremium || false);
      })();
      
      const provider = await Promise.race([settingsPromise, timeout]);
      if (provider) {
        setApiProvider(provider);
      }
    } catch (error) {
      console.log('Settings load failed:', error.message);
      setApiProvider('deepseek');
    }
  };

  const checkAdminStatusSafely = async () => {
    try {
      const user = FirebaseService.currentUser;
      if (!user?.email) {
        return;
      }
      
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      const adminStatus = await Promise.race([
        AdminService.checkAdminStatus(user.email),
        timeout
      ]);
      
      setIsAdmin(!!adminStatus);
      
      if (adminStatus && !isPremium) {
        FirebaseService.updateUserPremiumStatus(true).catch(() => {});
        setIsPremium(true);
      }
    } catch (error) {
      console.log('Admin check failed:', error.message);
      setIsAdmin(false);
    }
  };

  const handlePremiumUpgrade = () => {
    try {
      navigation.getParent()?.navigate('Premium');
    } catch (error) {
      Alert.alert('Info', 'Premium upgrade screen is being loaded...');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseService.signOut();
              navigation.getParent()?.replace('Auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      const code = userStats?.referralCode || 'HABITOWL';
      const message = `Check out HabitOwl - the smart habit tracker!\n\nUse code: ${code}\n\nDownload: https://habitowl-app.web.app`;
      
      await Share.share({ 
        message, 
        title: 'Join me on HabitOwl!' 
      });
      
      await FirebaseService.trackEvent('app_shared', {
        method: 'native_share',
        referral_code: code
      }).catch(() => {});
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Share error:', error);
      }
    }
  };

  const handleReferralSubmit = async () => {
    if (!referralCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    }

    try {
      await FirebaseService.processReferral(referralCode.trim().toUpperCase());
      setShowReferralDialog(false);
      setReferralCode('');
      Alert.alert('Success!', 'Referral code applied successfully!');
      await loadUserDataSafely();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process referral code');
    }
  };

  const handleAboutPress = () => {
    try {
      navigation.getParent()?.navigate('About');
    } catch (error) {
      Alert.alert('Info', 'About section coming soon!');
    }
  };

  const handleAdminPress = () => {
    if (isAdmin) {
      try {
        navigation.getParent()?.navigate('Admin');
      } catch (error) {
        Alert.alert('Error', 'Unable to open Admin panel');
      }
    }
  };

  const handleContactSupport = () => {
    // ✅ IMPROVED: Provide immediate feedback
    console.log('Opening support chat...');
    setShowContactSupport(true);
  
    // Track analytics
    FirebaseService.trackEvent('support_chat_opened', {
      from_screen: 'settings'
    }).catch(err => console.log('Analytics tracking failed:', err));
  };


  const handlePrivacyPolicy = () => {
    Linking.openURL('https://habitowl-3405d.web.app/privacy').catch(() => 
      Alert.alert('Error', 'Unable to open privacy policy')
    );
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://habitowl-3405d.web.app/terms').catch(() => 
      Alert.alert('Error', 'Unable to open terms of service')
    );
  };

  const handleStatisticsPress = () => {
    try {
      navigation.navigate('Statistics');
    } catch (error) {
      Alert.alert('Info', 'Please use the Statistics tab');
    }
  };

  const toggleNotifications = async (enabled) => {
    try {
      setNotifications(enabled);
      if (!enabled) {
        await NotificationService.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setNotifications(!enabled);
    }
  };

  const renderUserInfo = () => {
    const user = FirebaseService.currentUser;
    if (!user) return null;

    return (
      <Card style={styles.card}>
        <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.userInfoGradient}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Icon name="account" size={40} color="#ffffff" />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {userStats.displayName}
              </Text>
              <Text style={styles.userEmail}>{userStats.email}</Text>
              <View style={styles.badgeContainer}>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Icon name="crown" size={16} color="#f59e0b" />
                    <Text style={styles.premiumText}>Premium</Text>
                  </View>
                )}
                {isAdmin && (
                  <View style={styles.adminBadge}>
                    <Icon name="shield-check" size={16} color="#ef4444" />
                    <Text style={styles.adminText}>Admin</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.totalHabits || 0}</Text>
              <Text style={styles.statLabel}>Habits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.longestStreak || 0}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.referralCount || 0}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
          </View>
        </LinearGradient>
      </Card>
    );
  };

  // ✅ FIXED: Screen renders immediately, even while loading
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderUserInfo()}

        {/* ✅ FIXED: Safe PromoOfferBanner rendering */}
        {!isPremium && !isAdmin && PromoOfferBanner && (
          <View style={styles.promoContainer}>
            <PromoOfferBanner onUpgradePress={handlePremiumUpgrade} />
          </View>
        )}

        {!isPremium && !isAdmin && (
          <Card style={styles.card}>
            <List.Item
              title="Upgrade to Premium"
              description="Remove ads, unlimited habits, AI coaching"
              left={(props) => <List.Icon {...props} icon="crown" color="#f59e0b" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handlePremiumUpgrade}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />
          </Card>
        )}

        <Card style={styles.card}>
          <List.Subheader style={styles.subheader}>AI & Personalization</List.Subheader>
          
          {isAdmin && (
            <List.Item
              title="AI Powered"
              description={`Currently using: ${apiProvider.toUpperCase()}`}
              left={(props) => <List.Icon {...props} icon="robot" />}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />
          )}

          <List.Item
            title="Smart Coaching"
            description={isPremium || isAdmin ? "AI-powered coaching is available! Go to any habit and tap the lightbulb icon to get personalized insights and suggestions." : "Upgrade to Premium to unlock AI coaching"}
            left={(props) => <List.Icon {...props} icon="brain" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              if (!isPremium && !isAdmin) {
                Alert.alert(
                  'Premium Feature',
                  'Smart Coaching is available for Premium subscribers only. Upgrade now to get personalized AI-powered habit coaching!',
                [
                  { text: 'Maybe Later', style: 'cancel' },
                  { text: 'Upgrade to Premium', onPress: handlePremiumUpgrade }
                ]
              );
             } else {
                // Show instructions for premium users
                Alert.alert(
                  '💡 How to Use AI Coaching',
                  'AI-powered coaching is available!\n\n1. Go to Home screen\n2. Find any habit card\n3. Tap the lightbulb (💡) icon on the habit\n4. Ask questions and get personalized coaching!\n\nThe lightbulb icon is located next to each habit name.',
                [
                  { text: 'Got it!', style: 'default' }
                ]
              );
            }
          }}
          titleStyle={styles.listItemTitle}
          descriptionStyle={styles.listItemDescription}
        />


          
          {isAdmin && (
            <List.Item
              title="Admin Panel"
              description="Manage app settings and API keys"
              left={(props) => <List.Icon {...props} icon="shield-account" color="#ef4444" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleAdminPress}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />
          )}
        </Card>


        <Card style={styles.card}>
          <List.Subheader style={styles.subheader}>Social & Sharing</List.Subheader>
          
          <List.Item
            title="Share HabitOwl"
            description="Invite friends and earn rewards"
            left={(props) => <List.Icon {...props} icon="share" />}
            onPress={handleShareApp}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />

          <List.Item
            title="Enter Referral Code"
            description="Got a code from a friend?"
            left={(props) => <List.Icon {...props} icon="ticket" />}
            onPress={() => setShowReferralDialog(true)}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />

          {userStats?.referralCode && (
            <List.Item
              title="Your Referral Code"
              description={userStats.referralCode}
              left={(props) => <List.Icon {...props} icon="card-text" />}
              right={(props) => (
                <Button
                  compact
                  mode="outlined"
                  onPress={() => Share.share({ message: userStats.referralCode })}
                  labelStyle={styles.buttonLabel}
                >
                  Share
                </Button>
              )}
              titleStyle={styles.listItemTitle}
              descriptionStyle={styles.listItemDescription}
            />
          )}
        </Card>

        <Card style={styles.card}>
          <List.Subheader style={styles.subheader}>App Settings</List.Subheader>
          
          <List.Item
            title="Notifications"
            description="Habit reminders and motivational messages"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notifications}
                onValueChange={toggleNotifications}
                color="#4f46e5"
              />
            )}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />

          <List.Item
            title="Statistics"
            description="View your habit analytics"
            left={(props) => <List.Icon {...props} icon="chart-line" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleStatisticsPress}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
        </Card>

        <Card style={styles.card}>
          <List.Subheader style={styles.subheader}>Support & Legal</List.Subheader>
          
          <List.Item
            title="Contact Support"
            description="Get help or report issues"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleContactSupport}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />

          <List.Item
            title="About HabitOwl"
            description="Learn more about the app"
            left={(props) => <List.Icon {...props} icon="information" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleAboutPress}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />

          <List.Item
            title="Privacy Policy"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            onPress={handlePrivacyPolicy}
            titleStyle={styles.listItemTitle}
          />

          <List.Item
            title="Terms of Service"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            onPress={handleTermsOfService}
            titleStyle={styles.listItemTitle}
          />

          <List.Item
            title="App Version"
            description="2.9.0"
            left={(props) => <List.Icon {...props} icon="information" />}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />
        </Card>

        <Card style={styles.card}>
          <List.Item
            title="Sign Out"
            titleStyle={styles.signOutText}
            left={(props) => <List.Icon {...props} icon="logout" color="#ef4444" />}
            onPress={handleSignOut}
          />
        </Card>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <ContactSupport 
        visible={showContactSupport} 
        onDismiss={() => setShowContactSupport(false)} 
      />

      <Portal>
        <Dialog visible={showReferralDialog} onDismiss={() => setShowReferralDialog(false)}>
          <Dialog.Title>Enter Referral Code</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogDescription}>
              Enter a referral code from a friend to get started:
            </Text>
            
            <TextInput
              label="Referral Code"
              value={referralCode}
              onChangeText={setReferralCode}
              mode="outlined"
              autoCapitalize="characters"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReferralDialog(false)}>Cancel</Button>
            <Button onPress={handleReferralSubmit}>Apply</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  userInfoGradient: {
    padding: 20,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#e0e7ff',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: '#c7d2fe',
    marginTop: 4,
  },
  subheader: {
    color: '#1f2937',
    fontWeight: 'bold',
  },
  listItemTitle: {
    color: '#1f2937',
    fontWeight: '600',
  },
  listItemDescription: {
    color: '#6b7280',
  },
  buttonLabel: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  dialogDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  dialogInput: {
    marginBottom: 16,
  },
  bottomPadding: {
    height: 20,
  },
  promoContainer: {
    marginBottom: 8,
  },
});

export default SettingsScreen;
