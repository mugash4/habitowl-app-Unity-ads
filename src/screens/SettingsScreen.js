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
      const currentUser = FirebaseService.currentUser;
      setUser(currentUser);

      // Check if user has pending deletion request
      if (currentUser) {
        const userData = await FirebaseService.getUserStats();
        if (userData?.accountStatus === 'pending_deletion' || userData?.deletionRequestedAt) {
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
      const result = await DataExportService.exportUserData(user.uid);
      
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
      const result = await DataExportService.exportHabitsCSV(user.uid);
      
      if (result && result.success) {
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
        Alert.alert('Export Failed', result?.error || 'Could not export habits');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      Alert.alert('Export Failed', 'An error occurred while exporting habits');
    } finally {
      setIsExporting(false);
    }
  };

  // Request account deletion with download option
  const handleRequestAccountDeletion = async () => {
    if (!user) return;

    Alert.alert(
      'Delete Account?',
      'Are you sure you want to delete your account? Your data will be archived for 90 days before permanent deletion. You can download your data first.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Download Data First',
          onPress: async () => {
            setIsExporting(true);
            try {
              const result = await DataExportService.exportUserData(user.uid);
              
              if (result.success) {
                Alert.alert(
                  'Data Downloaded',
                  'Your data has been downloaded. Proceed with account deletion?',
                  [
                    { 
                      text: 'Cancel', 
                      style: 'cancel' 
                    },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: async () => {
                        await submitDeletionRequest();
                      }
                    }
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
          }
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            await submitDeletionRequest();
          }
        }
      ]
    );
  };

  const submitDeletionRequest = async () => {
    try {
      await FirebaseService.requestAccountDeletion('User requested deletion from settings');
      
      setIsDeletionRequested(true);
      Alert.alert(
        'Request Submitted',
        'Your account deletion request has been submitted. Your data will be archived for 90 days before permanent deletion.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await FirebaseService.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Deletion request error:', error);
      Alert.alert('Error', 'Failed to submit deletion request');
    }
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
                  Account deletion pending (90 days)
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
            onPress={() => navigation.navigate('About')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
              <Text style={styles.actionText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('About')}
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

          {/* NEW: Account Deletion Option */}
          {!isDeletionRequested && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleRequestAccountDeletion}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash-outline" size={24} color="#f44336" />
                <Text style={[styles.actionText, { color: '#f44336' }]}>
                  Request Account Deletion
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          )}

          {isDeletionRequested && (
            <View style={styles.deletionInfoCard}>
              <Ionicons name="information-circle" size={24} color="#ff9800" />
              <View style={styles.deletionInfoText}>
                <Text style={styles.deletionInfoTitle}>
                  Deletion Request Pending
                </Text>
                <Text style={styles.deletionInfoDescription}>
                  Your account will be permanently deleted after 90 days. You can still download your data during this period.
                </Text>
              </View>
            </View>
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
  deletionInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  deletionInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  deletionInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  deletionInfoDescription: {
    fontSize: 14,
    color: '#ef6c00',
    lineHeight: 20,
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
