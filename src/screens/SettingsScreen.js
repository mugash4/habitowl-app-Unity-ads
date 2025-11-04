import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import FirebaseService from '../services/FirebaseService';
import DataExportService from '../services/DataExportService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    soundEffects: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletionRequested, setIsDeletionRequested] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await FirebaseService.getCurrentUser();
      setUser(currentUser);

      // Check if user has pending deletion request
      if (currentUser) {
        const userDoc = await FirebaseService.getUserData(currentUser.uid);
        if (userDoc?.deletionRequestedAt) {
          setIsDeletionRequested(true);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    saveSettings(newSettings);
  };

  // Export data as JSON
  const handleExportJSON = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to export your data');
      return;
    }

    setIsExporting(true);
    try {
      const result = await DataExportService.exportUserDataAsJSON(user.uid);
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `Your data has been exported to:\n${result.fileName}\n\nThe file is ready to share.`,
          [
            {
              text: 'OK',
              onPress: () => console.log('Export completed'),
            },
          ]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Could not export data');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting your data');
    } finally {
      setIsExporting(false);
    }
  };

  // Export data as CSV
  const handleExportCSV = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to export your data');
      return;
    }

    setIsExporting(true);
    try {
      const result = await DataExportService.exportHabitsAsCSV(user.uid);
      
      if (result.success) {
        Alert.alert(
          'Export Successful',
          `Your habits have been exported to:\n${result.fileName}\n\nYou can open this file in Excel or Google Sheets.`,
          [
            {
              text: 'OK',
              onPress: () => console.log('CSV export completed'),
            },
          ]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Could not export habits');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting habits');
    } finally {
      setIsExporting(false);
    }
  };

  // Download data before deletion
  const handleDownloadBeforeDeletion = async () => {
    if (!user) return;

    Alert.alert(
      'Download Your Data',
      'Your complete data will be exported as a JSON file before proceeding with account deletion.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Download',
          onPress: async () => {
            setIsExporting(true);
            try {
              const result = await FirebaseService.downloadDataBeforeDeletion(user.uid);
              
              if (result.success) {
                Alert.alert(
                  'Download Complete',
                  'Your data has been downloaded. Would you like to proceed with account deletion?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: handleRequestAccountDeletion,
                    },
                  ]
                );
              } else {
                Alert.alert('Download Failed', result.error || 'Could not download data');
              }
            } catch (error) {
              console.error('Download error:', error);
              Alert.alert('Error', 'Failed to download your data');
            } finally {
              setIsExporting(false);
            }
          },
        },
      ]
    );
  };

  // Request account deletion
  const handleRequestAccountDeletion = async () => {
    if (!user) return;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action:\n\n• Will be processed within 30 days\n• Cannot be undone after processing\n• Will permanently delete all your data\n\nWe recommend downloading your data first.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Download Data First',
          onPress: handleDownloadBeforeDeletion,
        },
        {
          text: 'Delete Without Download',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirebaseService.requestAccountDeletion(
                user.uid,
                'User requested deletion from settings'
              );

              if (result.success) {
                setIsDeletionRequested(true);
                Alert.alert(
                  'Deletion Request Submitted',
                  'Your account deletion request has been submitted. You will receive an email confirmation. Your account will be deleted within 30 days.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              } else {
                Alert.alert('Error', result.error || 'Could not submit deletion request');
              }
            } catch (error) {
              console.error('Deletion request error:', error);
              Alert.alert('Error', 'Failed to submit deletion request');
            }
          },
        },
      ]
    );
  };

  // Sign out
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseService.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.backButton} />
        </View>

        {/* User Profile Section */}
        {user && (
          <View style={styles.profileSection}>
            <View style={styles.profileIcon}>
              <Ionicons name="person" size={32} color="#4CAF50" />
            </View>
            <Text style={styles.profileName}>{user.displayName || 'User'}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            
            {isDeletionRequested && (
              <View style={styles.deletionBanner}>
                <Ionicons name="warning" size={20} color="#ff9800" />
                <Text style={styles.deletionBannerText}>
                  Account deletion pending
                </Text>
              </View>
            )}
          </View>
        )}

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#666" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={() => toggleSetting('notifications')}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon-outline" size={24} color="#666" />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={() => toggleSetting('darkMode')}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-medium-outline" size={24} color="#666" />
              <Text style={styles.settingText}>Sound Effects</Text>
            </View>
            <Switch
              value={settings.soundEffects}
              onValueChange={() => toggleSetting('soundEffects')}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Data Management & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management & Privacy</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportJSON}
            disabled={isExporting}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="download-outline" size={24} color="#2196F3" />
              <Text style={styles.actionText}>
                {isExporting ? 'Exporting...' : 'Download My Data (JSON)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportCSV}
            disabled={isExporting}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={24} color="#2196F3" />
              <Text style={styles.actionText}>
                {isExporting ? 'Exporting...' : 'Export Habits (CSV)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
              <Text style={styles.actionText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="document-outline" size={24} color="#4CAF50" />
              <Text style={styles.actionText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Account Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleSignOut}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={24} color="#FF9800" />
              <Text style={[styles.actionText, { color: '#FF9800' }]}>
                Sign Out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          {!isDeletionRequested && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleDownloadBeforeDeletion}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash-outline" size={24} color="#f44336" />
                <Text style={[styles.actionText, { color: '#f44336' }]}>
                  Delete Account
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>HabitOwl v2.9.0</Text>
          <Text style={styles.appInfoText}>© 2024 HabitOwl. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  deletionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  deletionBannerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});

export default SettingsScreen;
