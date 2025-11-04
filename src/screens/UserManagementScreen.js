import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Button,
  Appbar,
  Chip,
  Dialog,
  Portal,
  TextInput,
  ActivityIndicator,
  Searchbar,
  Menu,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AdminService from '../services/AdminService';
import DataExportService from '../services/DataExportService';

const UserManagementScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState(''); // 'suspend', 'terminate', 'export'
  const [actionReason, setActionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState('30');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'suspended', 'pending_deletion'
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, filterStatus]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await AdminService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => {
        if (filterStatus === 'active') {
          return !user.accountStatus || user.accountStatus === 'active';
        }
        return user.accountStatus === filterStatus;
      });
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.email?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query) ||
        user.uid?.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSuspendUser = (user) => {
    setSelectedUser(user);
    setActionType('suspend');
    setActionReason('');
    setSuspensionDays('30');
    setShowActionDialog(true);
  };

  const handleTerminateUser = (user) => {
    setSelectedUser(user);
    setActionType('terminate');
    setActionReason('');
    setShowActionDialog(true);
  };

  const handleExportUserData = async (user) => {
    try {
      setLoading(true);
      Alert.alert('Exporting Data', 'Please wait while we prepare the export...');
      
      const result = await DataExportService.exportUserData(user.uid);
      
      Alert.alert(
        'Export Complete',
        `Data exported successfully!\n\nFile: ${result.fileName}\nRecords:\n• ${result.recordCount.habits} habits\n• ${result.recordCount.referrals} referrals\n• ${result.recordCount.analytics} analytics`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting user data:', error);
      Alert.alert('Error', 'Failed to export user data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      if (actionType === 'suspend') {
        if (!actionReason.trim()) {
          Alert.alert('Error', 'Please provide a reason for suspension');
          return;
        }

        await AdminService.suspendUserAccount(
          selectedUser.uid,
          actionReason,
          parseInt(suspensionDays)
        );

        Alert.alert(
          'Success',
          `User account suspended for ${suspensionDays} days`,
          [{ text: 'OK', onPress: () => loadUsers() }]
        );
      } else if (actionType === 'terminate') {
        if (!actionReason.trim()) {
          Alert.alert('Error', 'Please provide a reason for termination');
          return;
        }

        Alert.alert(
          'Confirm Termination',
          'This will IMMEDIATELY delete all user data. This action cannot be undone. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Terminate',
              style: 'destructive',
              onPress: async () => {
                await AdminService.terminateUserAccount(
                  selectedUser.uid,
                  actionReason
                );

                Alert.alert(
                  'Success',
                  'User account terminated',
                  [{ text: 'OK', onPress: () => loadUsers() }]
                );
              }
            }
          ]
        );
      }

      setShowActionDialog(false);
      setSelectedUser(null);
      setActionReason('');
    } catch (error) {
      console.error('Error processing action:', error);
      Alert.alert('Error', error.message || 'Failed to process action');
    } finally {
      setLoading(false);
    }
  };

  const getUserStatusColor = (user) => {
    if (user.accountStatus === 'suspended') return '#ef4444';
    if (user.accountStatus === 'pending_deletion') return '#f59e0b';
    return '#10b981';
  };

  const getUserStatusText = (user) => {
    if (user.accountStatus === 'suspended') return 'Suspended';
    if (user.accountStatus === 'pending_deletion') return 'Pending Deletion';
    return 'Active';
  };

  const renderUserCard = (user) => {
    const statusColor = getUserStatusColor(user);
    const statusText = getUserStatusText(user);

    return (
      <Card key={user.docId || user.uid} style={styles.userCard}>
        <Card.Content>
          <View style={styles.userHeader}>
            <View style={styles.userInfo}>
              <Icon 
                name={user.isPremium ? "crown" : "account-circle"} 
                size={32} 
                color={user.isPremium ? "#f59e0b" : "#6b7280"} 
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user.displayName || 'No Name'}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userId}>ID: {user.uid.substring(0, 12)}...</Text>
              </View>
            </View>
            <Chip
              icon="check-circle"
              style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}
              textStyle={{ color: statusColor, fontWeight: '600' }}
            >
              {statusText}
            </Chip>
          </View>

          <View style={styles.userStats}>
            <View style={styles.statItem}>
              <Icon name="target" size={16} color="#6b7280" />
              <Text style={styles.statText}>{user.totalHabits || 0} habits</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="fire" size={16} color="#6b7280" />
              <Text style={styles.statText}>{user.longestStreak || 0} streak</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="calendar" size={16} color="#6b7280" />
              <Text style={styles.statText}>
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {user.suspendedAt && (
            <View style={styles.warningBox}>
              <Icon name="alert-circle" size={16} color="#dc2626" />
              <Text style={styles.warningText}>
                Suspended: {user.suspensionReason}
              </Text>
            </View>
          )}

          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => handleExportUserData(user)}
              style={styles.actionButton}
              icon="download"
              disabled={loading}
              compact
            >
              Export
            </Button>
            
            {(!user.accountStatus || user.accountStatus === 'active') && (
              <Button
                mode="outlined"
                onPress={() => handleSuspendUser(user)}
                style={[styles.actionButton, styles.suspendButton]}
                icon="pause-circle"
                disabled={loading}
                compact
              >
                Suspend
              </Button>
            )}

            <Button
              mode="contained"
              onPress={() => handleTerminateUser(user)}
              style={[styles.actionButton, styles.terminateButton]}
              icon="delete"
              disabled={loading}
              compact
              buttonColor="#dc2626"
            >
              Terminate
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="User Management" />
        <Appbar.Action 
          icon="refresh" 
          onPress={loadUsers}
          disabled={loading}
        />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search users..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              icon="filter"
              style={styles.filterButton}
            >
              {filterStatus === 'all' ? 'All' : filterStatus.replace('_', ' ')}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setFilterStatus('all'); setMenuVisible(false); }} title="All Users" />
          <Menu.Item onPress={() => { setFilterStatus('active'); setMenuVisible(false); }} title="Active" />
          <Menu.Item onPress={() => { setFilterStatus('suspended'); setMenuVisible(false); }} title="Suspended" />
          <Menu.Item onPress={() => { setFilterStatus('pending_deletion'); setMenuVisible(false); }} title="Pending Deletion" />
        </Menu>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryValue}>{users.length}</Text>
              <Text style={styles.summaryLabel}>Total Users</Text>
            </Card.Content>
          </Card>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryValue}>
                {users.filter(u => u.isPremium).length}
              </Text>
              <Text style={styles.summaryLabel}>Premium</Text>
            </Card.Content>
          </Card>
          <Card style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text style={styles.summaryValue}>
                {users.filter(u => u.accountStatus === 'suspended').length}
              </Text>
              <Text style={styles.summaryLabel}>Suspended</Text>
            </Card.Content>
          </Card>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="account-search" size={64} color="#6b7280" />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try a different search query' : 'No users match the selected filter'}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.usersList}>
            {filteredUsers.map(renderUserCard)}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showActionDialog} onDismiss={() => setShowActionDialog(false)}>
          <Dialog.Title>
            {actionType === 'suspend' ? 'Suspend User Account' : 'Terminate User Account'}
          </Dialog.Title>
          <Dialog.Content>
            {selectedUser && (
              <>
                <Text style={styles.dialogText}>
                  User: {selectedUser.email}
                </Text>

                {actionType === 'suspend' && (
                  <TextInput
                    label="Suspension Duration (days)"
                    value={suspensionDays}
                    onChangeText={setSuspensionDays}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.dialogInput}
                  />
                )}

                <TextInput
                  label="Reason"
                  value={actionReason}
                  onChangeText={setActionReason}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.dialogInput}
                  placeholder={
                    actionType === 'suspend'
                      ? 'Why is this account being suspended?'
                      : 'Why is this account being terminated?'
                  }
                />

                <View style={styles.dialogWarning}>
                  <Icon 
                    name="alert" 
                    size={20} 
                    color={actionType === 'terminate' ? '#dc2626' : '#f59e0b'} 
                  />
                  <Text style={styles.dialogWarningText}>
                    {actionType === 'suspend'
                      ? 'User will not be able to access their account during suspension.'
                      : 'This will IMMEDIATELY delete all user data. This action cannot be undone.'}
                  </Text>
                </View>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowActionDialog(false)}>Cancel</Button>
            <Button
              onPress={confirmAction}
              loading={loading}
              mode="contained"
              buttonColor={actionType === 'terminate' ? '#dc2626' : '#f59e0b'}
            >
              {actionType === 'suspend' ? 'Suspend' : 'Terminate'}
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
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
  },
  filterButton: {
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    elevation: 2,
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    marginBottom: 12,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  userId: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusChip: {
    marginLeft: 8,
  },
  userStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#991b1b',
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  suspendButton: {
    borderColor: '#f59e0b',
  },
  terminateButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyCard: {
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  dialogText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  dialogInput: {
    marginBottom: 16,
  },
  dialogWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  dialogWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#991b1b',
    marginLeft: 8,
  },
});

export default UserManagementScreen;
