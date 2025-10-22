import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  Card,
  Button,
  TextInput,
  List,
  Chip,
  Dialog,
  Portal,
  Appbar,
  Divider
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AdminService from '../services/AdminService';
import SecureAIService from '../services/SecureAIService';
import FirebaseService from '../services/FirebaseService';

const AdminScreen = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [defaultProvider, setDefaultProvider] = useState('deepseek');
  const [loading, setLoading] = useState(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Promo offer states
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('');
  const [promoValidDays, setPromoValidDays] = useState('7');

  useEffect(() => {
    verifyAdminAccess();
  }, []);

  // ✅ CRITICAL: Verify admin access on screen load
  const verifyAdminAccess = async () => {
    try {
      setIsVerifyingAdmin(true);
      const isAdmin = await AdminService.isCurrentUserAdmin();
      
      if (!isAdmin) {
        Alert.alert(
          'Access Denied',
          'You do not have administrator privileges.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setIsAuthorized(false);
        return;
      }
      
      setIsAuthorized(true);
      await loadAdminData();
    } catch (error) {
      console.error('Admin verification error:', error);
      Alert.alert(
        'Error',
        'Unable to verify admin access.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setIsAuthorized(false);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [appStats, currentProvider] = await Promise.all([
        AdminService.getAppStatistics(),
        AdminService.getDefaultAiProvider()
      ]);
      
      setStats(appStats);
      setDefaultProvider(currentProvider);
    } catch (error) {
      Alert.alert('Error', 'Failed to load admin data: ' + error.message);
      console.error('Admin data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    // ✅ EXTRA SECURITY: Re-verify admin status before saving API key
    const isAdmin = await AdminService.isCurrentUserAdmin();
    if (!isAdmin) {
      Alert.alert('Error', 'Admin verification failed. Access denied.');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      await SecureAIService.setApiKey(selectedProvider, apiKey.trim());
      
      Alert.alert('Success', `${selectedProvider.toUpperCase()} API key has been securely saved`);
      setShowApiDialog(false);
      setApiKey('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultProvider = async (provider) => {
    // ✅ EXTRA SECURITY: Re-verify admin status
    const isAdmin = await AdminService.isCurrentUserAdmin();
    if (!isAdmin) {
      Alert.alert('Error', 'Admin verification failed. Access denied.');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      await SecureAIService.setDefaultProvider(provider);
      setDefaultProvider(provider);
      Alert.alert('Success', `Default AI provider set to ${provider.toUpperCase()}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set default provider: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromoOffer = async () => {
    if (!promoTitle.trim() || !promoDescription.trim() || !promoDiscount.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // ✅ EXTRA SECURITY: Re-verify admin status
    const isAdmin = await AdminService.isCurrentUserAdmin();
    if (!isAdmin) {
      Alert.alert('Error', 'Admin verification failed. Access denied.');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(promoValidDays));

      await AdminService.createPromoOffer({
        title: promoTitle.trim(),
        description: promoDescription.trim(),
        discount: promoDiscount.trim(),
        expiresAt: expiresAt.toISOString(),
        validDays: parseInt(promoValidDays)
      });

      Alert.alert('Success', 'Promotional offer created successfully');
      setShowPromoDialog(false);
      setPromoTitle('');
      setPromoDescription('');
      setPromoDiscount('');
      setPromoValidDays('7');
    } catch (error) {
      Alert.alert('Error', 'Failed to create promotional offer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.statGradient}>
            <Icon name="account" size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.statCard}>
          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
            <Icon name="crown" size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.premiumUsers}</Text>
            <Text style={styles.statLabel}>Premium Users</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.statCard}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.statGradient}>
            <Icon name="target" size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.totalHabits}</Text>
            <Text style={styles.statLabel}>Total Habits</Text>
          </LinearGradient>
        </Card>

        <Card style={styles.statCard}>
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.statGradient}>
            <Icon name="chart-line" size={24} color="#ffffff" />
            <Text style={styles.statValue}>{stats.weeklyEvents}</Text>
            <Text style={styles.statLabel}>Weekly Events</Text>
          </LinearGradient>
        </Card>
      </View>
    );
  };

  // ✅ Show loading while verifying admin access
  if (isVerifyingAdmin) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  // ✅ Don't render anything if not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Admin Dashboard" />
        <Appbar.Action icon="refresh" onPress={loadAdminData} />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Notice */}
        <Card style={[styles.card, styles.securityNotice]}>
          <Card.Content>
            <View style={styles.noticeHeader}>
              <Icon name="shield-lock" size={24} color="#ef4444" />
              <Text style={styles.noticeTitle}>Admin Access</Text>
            </View>
            <Text style={styles.noticeText}>
              You have administrative privileges. API keys and sensitive data are visible only to verified admins.
            </Text>
          </Card.Content>
        </Card>

        {/* App Statistics */}
        <Text style={styles.sectionTitle}>App Statistics</Text>
        {renderStats()}

        {/* AI Configuration */}
        <Card style={styles.card}>
          <List.Subheader>🔐 AI Configuration (Admin Only)</List.Subheader>
          
          <List.Item
            title="Configure API Keys"
            description="Set API keys for AI providers (Admin Only)"
            left={(props) => <List.Icon {...props} icon="key" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setShowApiDialog(true)}
          />

          <List.Item
            title="Default AI Provider"
            description={`Currently: ${defaultProvider.toUpperCase()}`}
            left={(props) => <List.Icon {...props} icon="robot" />}
          />

          <View style={styles.providerChips}>
            {['deepseek', 'openai', 'openrouter'].map((provider) => (
              <Chip
                key={provider}
                selected={defaultProvider === provider}
                onPress={() => handleSetDefaultProvider(provider)}
                style={styles.providerChip}
              >
                {provider.toUpperCase()}
              </Chip>
            ))}
          </View>
        </Card>

        {/* Marketing Tools */}
        <Card style={styles.card}>
          <List.Subheader>Marketing Tools</List.Subheader>
          
          <List.Item
            title="Create Promotional Offer"
            description="Create time-limited offers for users"
            left={(props) => <List.Icon {...props} icon="tag" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setShowPromoDialog(true)}
          />

          <List.Item
            title="User Analytics"
            description="View detailed user behavior analytics"
            left={(props) => <List.Icon {...props} icon="analytics" />}
            onPress={() => Alert.alert('Coming Soon', 'Advanced analytics dashboard coming soon')}
          />
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <List.Subheader>Quick Actions</List.Subheader>
          
          <List.Item
            title="Broadcast Notification"
            description="Send notification to all users"
            left={(props) => <List.Icon {...props} icon="bell" />}
            onPress={() => Alert.alert('Coming Soon', 'Broadcast notifications coming soon')}
          />

          <List.Item
            title="Export User Data"
            description="Export user data for analysis"
            left={(props) => <List.Icon {...props} icon="download" />}
            onPress={() => Alert.alert('Coming Soon', 'Data export coming soon')}
          />
        </Card>

        {/* API Key Configuration Dialog */}
        <Portal>
          <Dialog visible={showApiDialog} onDismiss={() => setShowApiDialog(false)}>
            <Dialog.Title>🔐 Configure API Key (Admin Only)</Dialog.Title>
            <Dialog.Content>
              <Text style={styles.dialogDescription}>
                Select provider and enter API key:
              </Text>

              <View style={styles.providerSelection}>
                {['deepseek', 'openai', 'openrouter'].map((provider) => (
                  <Chip
                    key={provider}
                    selected={selectedProvider === provider}
                    onPress={() => setSelectedProvider(provider)}
                    style={styles.dialogChip}
                  >
                    {provider.toUpperCase()}
                  </Chip>
                ))}
              </View>
              
              <TextInput
                label={`${selectedProvider.toUpperCase()} API Key`}
                value={apiKey}
                onChangeText={setApiKey}
                mode="outlined"
                secureTextEntry
                style={styles.dialogInput}
              />

              <Text style={styles.helpText}>
                {selectedProvider === 'deepseek' && 'Get API key from: https://platform.deepseek.com'}
                {selectedProvider === 'openai' && 'Get API key from: https://platform.openai.com'}
                {selectedProvider === 'openrouter' && 'Get API key from: https://openrouter.ai'}
              </Text>
              
              <View style={styles.warningBox}>
                <Icon name="alert" size={20} color="#ef4444" />
                <Text style={styles.warningText}>
                  API keys are stored securely and only accessible to admins.
                </Text>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowApiDialog(false)}>Cancel</Button>
              <Button onPress={handleSetApiKey} loading={loading}>Save</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Promotional Offer Dialog */}
        <Portal>
          <Dialog visible={showPromoDialog} onDismiss={() => setShowPromoDialog(false)}>
            <Dialog.Title>Create Promotional Offer</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Offer Title"
                value={promoTitle}
                onChangeText={setPromoTitle}
                mode="outlined"
                style={styles.dialogInput}
                placeholder="e.g., Limited Time: 50% Off Premium"
              />

              <TextInput
                label="Description"
                value={promoDescription}
                onChangeText={setPromoDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.dialogInput}
                placeholder="Describe the offer details..."
              />

              <TextInput
                label="Discount"
                value={promoDiscount}
                onChangeText={setPromoDiscount}
                mode="outlined"
                style={styles.dialogInput}
                placeholder="e.g., 50% OFF, $2.99/month"
              />

              <TextInput
                label="Valid for (days)"
                value={promoValidDays}
                onChangeText={setPromoValidDays}
                mode="outlined"
                keyboardType="numeric"
                style={styles.dialogInput}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowPromoDialog(false)}>Cancel</Button>
              <Button onPress={handleCreatePromoOffer} loading={loading}>Create</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  securityNotice: {
    margin: 16,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginVertical: 8,
  },
  providerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  providerChip: {
    marginBottom: 4,
  },
  dialogDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  providerSelection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dialogChip: {
    flex: 1,
  },
  dialogInput: {
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});

export default AdminScreen;
