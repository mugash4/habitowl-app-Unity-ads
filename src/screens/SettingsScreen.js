import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  Linking
} from 'react-native';
import {
  List,
  Card,
  Button,
  Switch,
  Dialog,
  Portal,
  TextInput,
  Chip,
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
import { AdminService } from '../services/AdminService';

const SettingsScreen = ({ navigation }) => {
  const [userStats, setUserStats] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [showReferralDialog, setShowReferralDialog] = useState(false);
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [apiProvider, setApiProvider] = useState('deepseek');
  const [referralCode, setReferralCode] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUserData();
    loadSettings();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await AdminService.isCurrentUserAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const stats = await FirebaseService.getUserStats();
      setUserStats(stats);
      setIsPremium(stats?.isPremium || false);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const provider = await SecureAIService.getCurrentProvider();
      setApiProvider(provider);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handlePremiumUpgrade = () => {
    navigation.navigate('Premium');
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
              navigation.replace('Auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      const referralCode = userStats?.referralCode;
      const message = `Check out HabitOwl - the smart habit tracker that actually works! 🦉\n\nUse my referral code: ${referralCode}\n\nDownload: https://habitowl-app.web.app`;
      
      await Share.share({
        message,
        title: 'Join me on HabitOwl!'
      });

      // Track sharing
      await FirebaseService.trackEvent('app_shared', {
        method: 'native_share',
        referral_code: referralCode
      });
    } catch (error) {
      console.error('Error sharing app:', error);
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
      loadUserData(); // Refresh user data
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAboutPress = () => {
    navigation.navigate('About');
  };

  const handleAdminPress = () => {
    if (isAdmin) {
      navigation.navigate('Admin');
    }
  };

  const handleContactSupport = () => {
    setShowContactSupport(true);
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://habitowl-app.web.app/privacy');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://habitowl-app.web.app/terms');
  };

  const toggleNotifications = async (enabled) => {
    setNotifications(enabled);
    if (!enabled) {
      await NotificationService.cancelAllNotifications();
    }
    // You would typically save this preference
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
              <Text style={styles.userName}>{user.displayName || 'User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Icon name="crown" size={16} color="#f59e0b" />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderUserInfo()}

      {/* Promo Offers */}
      <PromoOfferBanner />

      {/* Premium Section */}
      {!isPremium && (
        <Card style={styles.card}>
          <List.Item
            title="Upgrade to Premium"
            description="Remove ads, unlimited habits, AI coaching"
            left={(props) => <List.Icon {...props} icon="crown" color="#f59e0b" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handlePremiumUpgrade}
          />
        </Card>
      )}

      {/* AI Settings */}
      <Card style={styles.card}>
        <List.Subheader>AI & Personalization</List.Subheader>
        
        <List.Item
          title="AI Provider"
          description={`Currently using: ${apiProvider.toUpperCase()}`}
          left={(props) => <List.Icon {...props} icon="robot" />}
        />

        <List.Item
          title="Smart Coaching"
          description="Powered by advanced AI"
          left={(props) => <List.Icon {...props} icon="brain" />}
        />
        
        {isAdmin && (
          <List.Item
            title="Admin Panel"
            description="Manage app settings and API keys"
            left={(props) => <List.Icon {...props} icon="shield-account" color="#ef4444" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleAdminPress}
          />
        )}
      </Card>

      {/* Social Features */}
      <Card style={styles.card}>
        <List.Subheader>Social & Sharing</List.Subheader>
        
        <List.Item
          title="Share HabitOwl"
          description="Invite friends and earn rewards"
          left={(props) => <List.Icon {...props} icon="share" />}
          onPress={handleShareApp}
        />

        <List.Item
          title="Enter Referral Code"
          description="Got a code from a friend?"
          left={(props) => <List.Icon {...props} icon="ticket" />}
          onPress={() => setShowReferralDialog(true)}
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
              >
                Share
              </Button>
            )}
          />
        )}
      </Card>

      {/* App Settings */}
      <Card style={styles.card}>
        <List.Subheader>App Settings</List.Subheader>
        
        <List.Item
          title="Notifications"
          description="Habit reminders and motivational messages"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
            />
          )}
        />

        <List.Item
          title="Statistics"
          description="View your habit analytics"
          left={(props) => <List.Icon {...props} icon="chart-line" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('Statistics')}
        />
      </Card>

      {/* Support & Legal */}
      <Card style={styles.card}>
        <List.Subheader>Support & Legal</List.Subheader>
        
        <List.Item
          title="Contact Support"
          description="Get help or report issues"
          left={(props) => <List.Icon {...props} icon="help-circle" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleContactSupport}
        />

        <List.Item
          title="About HabitOwl"
          description="Learn more about the app"
          left={(props) => <List.Icon {...props} icon="information" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={handleAboutPress}
        />

        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          onPress={handlePrivacyPolicy}
        />

        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          onPress={handleTermsOfService}
        />

        <List.Item
          title="App Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />
      </Card>

      {/* Sign Out */}
      <Card style={styles.card}>
        <List.Item
          title="Sign Out"
          titleStyle={styles.signOutText}
          left={(props) => <List.Icon {...props} icon="logout" color="#ef4444" />}
          onPress={handleSignOut}
        />
      </Card>

      {/* Contact Support Modal */}
      <Portal>
        <Dialog visible={showContactSupport} onDismiss={() => setShowContactSupport(false)}>
          <ContactSupport onClose={() => setShowContactSupport(false)} />
        </Dialog>
      </Portal>

      {/* Referral Code Dialog */}
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

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  premiumText: {
    color: '#f59e0b',
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  signOutText: {
    color: '#ef4444',
  },
  dialogDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  dialogInput: {
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 20,
  },
});

export default SettingsScreen;