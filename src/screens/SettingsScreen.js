import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking,
  ActivityIndicator
} from 'react-native';
import {
  List,
  Card,
  Button,
  Switch,
  Dialog,
  Portal,
  TextInput,
  Divider
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';
import AdService from '../services/AdService';
import SecureAIService from '../services/SecureAIService';
import NotificationService from '../services/NotificationService';
import ContactSupport from '../components/ContactSupport';
import PromoOfferBanner from '../components/PromoOfferBanner';
import AdminService from '../services/AdminService';

const SettingsScreen = ({ navigation }) => {
  const [userStats, setUserStats] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [apiProvider, setApiProvider] = useState('deepseek');
  const [referralCode, setReferralCode] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // FIXED: Use simple useEffect instead of useFocusEffect to prevent re-render issues
  useEffect(() => {
    console.log('Settings screen mounted, loading data...');
    initializeSettings();
  }, []);

  // FIXED: Simplified initialization with better timeout protection
  const initializeSettings = async () => {
    try {
      setIsLoading(true);
      console.log('Initializing settings...');
      
      // Set a reasonable timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.log('Loading timeout reached - displaying screen with available data');
        setIsLoading(false);
      }, 8000); // 8 seconds timeout

      // Load all data - each function has its own error handling
      await Promise.allSettled([
        loadUserData(),
        loadSettings(),
        checkAdminStatus()
      ]);

      // Clear timeout since we finished loading
      clearTimeout(timeoutId);
      console.log('Settings initialization complete');
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing settings screen:', error);
      // Always show the screen, even if there were errors
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const user = FirebaseService.currentUser;
      if (user && user.email) {
        const adminStatus = await AdminService.checkAdminStatus(user.email);
        console.log('Admin status:', adminStatus);
        setIsAdmin(adminStatus);
        
        // Auto-grant premium to admins
        if (adminStatus && !isPremium) {
          try {
            await FirebaseService.updateUserPremiumStatus(true);
            setIsPremium(true);
            console.log('Auto-granted premium to admin');
          } catch (premiumError) {
            console.error('Error granting premium to admin:', premiumError);
          }
        }
      } else {
        console.log('No user or email found');
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const loadUserData = async () => {
    try {
      console.log('Loading user stats...');
      const stats = await FirebaseService.getUserStats();
      console.log('User stats loaded:', stats);
      
      if (stats) {
        setUserStats(stats);
        setIsPremium(stats.isPremium || false);
      } else {
        console.log('No user stats found, using defaults');
        // Set default values
        const user = FirebaseService.currentUser;
        setUserStats({
          displayName: user?.displayName || 'User',
          email: user?.email || '',
          totalHabits: 0,
          longestStreak: 0,
          referralCount: 0
        });
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default values on error
      const user = FirebaseService.currentUser;
      setUserStats({
        displayName: user?.displayName || 'User',
        email: user?.email || '',
        totalHabits: 0,
        longestStreak: 0,
        referralCount: 0
      });
      setIsPremium(false);
    }
  };

  const loadSettings = async () => {
    try {
      console.log('Loading AI provider settings...');
      const stats = await FirebaseService.getUserStats();
      const isPremiumUser = stats?.isPremium || false;
      
      const provider = await SecureAIService.getActiveProvider(isPremiumUser);
      console.log('Active provider:', provider);
      setApiProvider(provider || 'deepseek');
    } catch (error) {
      console.error('Error loading settings:', error);
      setApiProvider('deepseek');
    }
  };

  const handlePremiumUpgrade = () => {
    try {
      const parentNav = navigation.getParent();
      if (parentNav && parentNav.navigate) {
        parentNav.navigate('Premium');
      } else {
        Alert.alert('Info', 'Premium upgrade coming soon!');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open Premium screen');
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
              const parentNav = navigation.getParent();
              if (parentNav && parentNav.replace) {
                parentNav.replace('Auth');
              }
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      const referralCode = userStats?.referralCode || 'HABITOWL';
      const message = `Check out HabitOwl - the smart habit tracker that actually works! \n\nUse my referral code: ${referralCode}\n\nDownload: https://habitowl-app.web.app`;
      
      await Share.share({
        message,
        title: 'Join me on HabitOwl!'
      });

      await FirebaseService.trackEvent('app_shared', {
        method: 'native_share',
        referral_code: referralCode
      }).catch(err => console.error('Error tracking event:', err));
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing app:', error);
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
      await loadUserData();
    } catch (error) {
      console.error('Error processing referral:', error);
      Alert.alert('Error', error.message || 'Failed to process referral code');
    }
  };

  const handleAboutPress = () => {
    try {
      const parentNav = navigation.getParent();
      if (parentNav && parentNav.navigate) {
        parentNav.navigate('About');
      } else {
        Alert.alert('Info', 'About section coming soon!');
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Unable to open About screen');
    }
  };

  const handleAdminPress = () => {
    if (isAdmin) {
      try {
        const parentNav = navigation.getParent();
        if (parentNav && parentNav.navigate) {
          parentNav.navigate('Admin');
        } else {
          Alert.alert('Info', 'Admin panel coming soon!');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Error', 'Unable to open Admin screen');
      }
    } else {
      Alert.alert('Access Denied', 'Admin access only');
    }
  };

  const handleContactSupport = () => {
    setShowContactSupport(true);
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://habitowl-app.web.app/privacy').catch(err => {
      console.error('Error opening privacy policy:', err);
      Alert.alert('Error', 'Unable to open privacy policy');
    });
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://habitowl-app.web.app/terms').catch(err => {
      console.error('Error opening terms:', err);
      Alert.alert('Error', 'Unable to open terms of service');
    });
  };

  const handleStatisticsPress = () => {
    try {
      navigation.navigate('Statistics');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Info', 'Please use the Statistics tab at the bottom of the screen');
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
              <Text style={styles.userName}>{user.displayName || userStats?.displayName || 'User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
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

          {userStats && (
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
          )}
        </LinearGradient>
      </Card>
    );
  };

  // FIXED: Improved loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  // FIXED: Always render content once loading is complete
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderUserInfo()}

        <PromoOfferBanner onUpgradePress={handlePremiumUpgrade} />

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
          
          <List.Item
            title="AI Provider"
            description={`Currently using: ${apiProvider.toUpperCase()}`}
            left={(props) => <List.Icon {...props} icon="robot" />}
            titleStyle={styles.listItemTitle}
            descriptionStyle={styles.listItemDescription}
          />

          <List.Item
            title="Smart Coaching"
            description="Powered by advanced AI"
            left={(props) => <List.Icon {...props} icon="brain" />}
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
            description="2.3.0"
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

      <Portal>
        <Dialog visible={showContactSupport} onDismiss={() => setShowContactSupport(false)}>
          <ContactSupport onClose={() => setShowContactSupport(false)} />
        </Dialog>
      </Portal>

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
            <Button onPress={() => setShowReferralDialog(false)} labelStyle={styles.buttonLabel}>Cancel</Button>
            <Button onPress={handleReferralSubmit} labelStyle={styles.buttonLabel}>Apply</Button>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
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
});

export default SettingsScreen;
