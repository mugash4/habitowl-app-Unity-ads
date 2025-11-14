import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  Card,
  Button,
  TextInput,
  Dialog,
  Portal,
  Appbar,
  Chip,
  Searchbar,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import AdminService from '../services/AdminService';

const SuspendUserScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionType, setSuspensionType] = useState('permanent');
  const [suspensionDays, setSuspensionDays] = useState('30');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.email?.toLowerCase().includes(query) ||
      user.displayName?.toLowerCase().includes(query) ||
      user.uid?.toLowerCase().includes(query)
    );
    
    setFilteredUsers(filtered);
  };

  const handleSuspendUser = (user) => {
    setSelectedUser(user);
    setSuspensionReason('');
    setSuspensionType('permanent');
    setSuspensionDays('30');
    setShowSuspendDialog(true);
  };

  const handleUnsuspendUser = async (user) => {
    Alert.alert(
      'Unsuspend User',
      `Are you sure you want to unsuspend ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsuspend',
          onPress: async () => {
            try {
              setLoading(true);
              await AdminService.unsuspendUserAccount(user.uid);
              Alert.alert('Success', 'User account has been unsuspended');
              await loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to unsuspend user: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const confirmSuspension = async () => {
    if (!suspensionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for suspension');
      return;
    }

    try {
      setLoading(true);
      const durationDays = suspensionType === 'temporary' ? parseInt(suspensionDays) : null;
      
      await AdminService.suspendUserAccount(
        selectedUser.uid,
        suspensionReason.trim(),
        durationDays
      );

      Alert.alert('Success', `User ${selectedUser.email} has been suspended`);
      setShowSuspendDialog(false);
      await loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to suspend user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderUserItem = ({ item }) => (
    <Card style={styles.userCard}>
      <Card.Content>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.displayName && (
              <Text style={styles.userName}>{item.displayName}</Text>
            )}
            <View style={styles.badges}>
              {item.isPremium && (
                <Chip icon="crown" style={styles.premiumChip} textStyle={styles.chipText}>
                  Premium
                </Chip>
              )}
              {item.suspended && (
                <Chip icon="lock" style={styles.suspendedChip} textStyle={styles.chipText}>
                  Suspended
                </Chip>
              )}
            </View>
          </View>
          {item.suspended ? (
            <Button
              mode="outlined"
              onPress={() => handleUnsuspendUser(item)}
              disabled={loading}
              icon="lock-open"
              style={styles.actionButton}
            >
              Unsuspend
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => handleSuspendUser(item)}
              disabled={loading}
              icon="account-lock"
              buttonColor="#dc2626"
              style={styles.actionButton}
            >
              Suspend
            </Button>
          )}
        </View>
        
        {item.suspended && item.suspensionReason && (
          <View style={styles.suspensionInfo}>
            <Icon name="information" size={16} color="#dc2626" />
            <Text style={styles.suspensionReason}>
              Reason: {item.suspensionReason}
            </Text>
          </View>
        )}
        
        {item.suspensionEndsAt && (
          <Text style={styles.suspensionEnds}>
            Ends: {new Date(item.suspensionEndsAt).toLocaleDateString()}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Suspend User Accounts" />
        <Appbar.Action icon="refresh" onPress={loadUsers} disabled={loading} />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by email, name, or UID"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-search" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      )}

      {/* Suspension Dialog */}
      <Portal>
        <Dialog visible={showSuspendDialog} onDismiss={() => setShowSuspendDialog(false)}>
          <Dialog.Title>🚫 Suspend User Account</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              User: {selectedUser?.email}
            </Text>

            <Text style={styles.label}>Suspension Type:</Text>
            <View style={styles.typeSelection}>
              <Chip
                selected={suspensionType === 'permanent'}
                onPress={() => setSuspensionType('permanent')}
                style={styles.typeChip}
              >
                Permanent
              </Chip>
              <Chip
                selected={suspensionType === 'temporary'}
                onPress={() => setSuspensionType('temporary')}
                style={styles.typeChip}
              >
                Temporary
              </Chip>
            </View>

            {suspensionType === 'temporary' && (
              <TextInput
                label="Duration (days)"
                value={suspensionDays}
                onChangeText={setSuspensionDays}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
            )}

            <TextInput
              label="Reason for Suspension *"
              value={suspensionReason}
              onChangeText={setSuspensionReason}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Explain why this user is being suspended..."
            />

            <View style={styles.warningBox}>
              <Icon name="alert" size={20} color="#dc2626" />
              <Text style={styles.warningText}>
                This user will be unable to access the app until unsuspended.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSuspendDialog(false)}>Cancel</Button>
            <Button onPress={confirmSuspension} loading={loading} textColor="#dc2626">
              Suspend User
            </Button>
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
  header: {
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f3f4f6',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  userCard: {
    marginBottom: 12,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  premiumChip: {
    backgroundColor: '#fef3c7',
    height: 28,
  },
  suspendedChip: {
    backgroundColor: '#fee2e2',
    height: 28,
  },
  chipText: {
    fontSize: 11,
    marginVertical: 0,
  },
  actionButton: {
    marginTop: 4,
  },
  suspensionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  suspensionReason: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
    marginLeft: 8,
  },
  suspensionEnds: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  dialogText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  typeSelection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    marginLeft: 8,
  },
});

export default SuspendUserScreen;
