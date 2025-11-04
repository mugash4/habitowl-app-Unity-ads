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
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AdminService from '../services/AdminService';

const DeletionRequestsScreen = ({ navigation }) => {
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadDeletionRequests();
  }, []);

  const loadDeletionRequests = async () => {
    try {
      setLoading(true);
      const requests = await AdminService.getPendingDeletionRequests();
      
      // Sort by request date (newest first)
      requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      
      setDeletionRequests(requests);
    } catch (error) {
      console.error('Error loading deletion requests:', error);
      Alert.alert('Error', 'Failed to load deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeletionRequests();
    setRefreshing(false);
  };

  const handleApproveRequest = async (request) => {
    setSelectedRequest(request);
    setActionType('approve');
    setShowConfirmDialog(true);
  };

  const handleRejectRequest = async (request) => {
    setSelectedRequest(request);
    setActionType('reject');
    setShowConfirmDialog(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest) return;

    try {
      setLoading(true);
      
      if (actionType === 'approve') {
        // Process account deletion
        const result = await AdminService.processAccountDeletion(
          selectedRequest.userId,
          false // false = 90-day retention
        );

        Alert.alert(
          'Success',
          `Account deletion approved. Data archived for 90-day retention period.\n\nDeleted records:\n• ${result.deletedRecords.habits} habits\n• ${result.deletedRecords.analytics} analytics\n• ${result.deletedRecords.referrals} referrals`,
          [{ text: 'OK', onPress: () => loadDeletionRequests() }]
        );
      } else {
        // Reject deletion request
        const { collection, doc, updateDoc } = require('firebase/firestore');
        const { db } = require('../config/firebase');
        
        const requestRef = doc(db, 'deletion_requests', selectedRequest.id);
        await updateDoc(requestRef, {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: require('../config/firebase').auth.currentUser?.email || 'admin',
          rejectionReason: rejectionReason || 'Not approved by admin'
        });

        Alert.alert(
          'Success',
          'Deletion request rejected',
          [{ text: 'OK', onPress: () => loadDeletionRequests() }]
        );
      }

      setShowConfirmDialog(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error processing deletion request:', error);
      Alert.alert('Error', error.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getDaysUntilDeletion = (scheduledDate) => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffTime = scheduled - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderDeletionRequest = (request) => {
    const daysUntil = getDaysUntilDeletion(request.scheduledDeletionDate);
    
    return (
      <Card key={request.id} style={styles.requestCard}>
        <Card.Content>
          <View style={styles.requestHeader}>
            <View style={styles.userInfo}>
              <Icon name="account-alert" size={24} color="#ef4444" />
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{request.userEmail}</Text>
                <Text style={styles.userId}>ID: {request.userId.substring(0, 8)}...</Text>
              </View>
            </View>
            <Chip
              icon="clock-outline"
              style={[
                styles.statusChip,
                daysUntil <= 30 ? styles.urgentChip : styles.normalChip
              ]}
              textStyle={styles.chipText}
            >
              {daysUntil}d left
            </Chip>
          </View>

          <View style={styles.requestDetails}>
            <View style={styles.detailRow}>
              <Icon name="calendar" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Requested:</Text>
              <Text style={styles.detailValue}>{formatDate(request.requestedAt)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Icon name="calendar-check" size={16} color="#6b7280" />
              <Text style={styles.detailLabel}>Scheduled:</Text>
              <Text style={styles.detailValue}>{formatDate(request.scheduledDeletionDate)}</Text>
            </View>

            {request.reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={() => handleApproveRequest(request)}
              style={[styles.actionButton, styles.approveButton]}
              icon="check-circle"
              disabled={loading}
            >
              Approve
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleRejectRequest(request)}
              style={[styles.actionButton, styles.rejectButton]}
              icon="close-circle"
              disabled={loading}
            >
              Reject
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
        <Appbar.Content title="Deletion Requests" />
        <Appbar.Action 
          icon="refresh" 
          onPress={loadDeletionRequests}
          disabled={loading}
        />
      </Appbar.Header>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoHeader}>
              <Icon name="information" size={24} color="#2563eb" />
              <Text style={styles.infoTitle}>GDPR/CCPA Compliance</Text>
            </View>
            <Text style={styles.infoText}>
              • Data is archived for 90 days before permanent deletion{'\n'}
              • Users can cancel within the 90-day period{'\n'}
              • Admins can approve or reject requests{'\n'}
              • Rejected requests restore full account access
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.statGradient}>
              <Icon name="delete-alert" size={20} color="#ffffff" />
              <Text style={styles.statValue}>{deletionRequests.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </LinearGradient>
          </Card>

          <Card style={styles.statCard}>
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statGradient}>
              <Icon name="alert-circle" size={20} color="#ffffff" />
              <Text style={styles.statValue}>
                {deletionRequests.filter(r => getDaysUntilDeletion(r.scheduledDeletionDate) <= 30).length}
              </Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </LinearGradient>
          </Card>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : deletionRequests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="check-circle" size={64} color="#10b981" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyText}>No pending deletion requests</Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.requestsList}>
            {deletionRequests.map(renderDeletionRequest)}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)}>
          <Dialog.Title>
            {actionType === 'approve' ? 'Approve Deletion?' : 'Reject Deletion?'}
          </Dialog.Title>
          <Dialog.Content>
            {selectedRequest && (
              <>
                <Text style={styles.dialogText}>
                  User: {selectedRequest.userEmail}
                </Text>
                
                {actionType === 'approve' ? (
                  <>
                    <Text style={styles.dialogWarning}>
                      ⚠️ This will:
                    </Text>
                    <Text style={styles.dialogList}>
                      • Delete all user data (habits, analytics, referrals){'\n'}
                      • Archive data for 90-day retention period{'\n'}
                      • Mark deletion request as completed{'\n'}
                      • User account will be permanently removed
                    </Text>
                    <Text style={styles.dialogNote}>
                      This action cannot be undone after 90 days.
                    </Text>
                  </>
                ) : (
                  <>
                    <TextInput
                      label="Rejection Reason (Optional)"
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                      style={styles.reasonInput}
                      placeholder="Why is this request being rejected?"
                    />
                    <Text style={styles.dialogNote}>
                      User will retain full account access.
                    </Text>
                  </>
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button
              onPress={confirmAction}
              loading={loading}
              mode="contained"
              buttonColor={actionType === 'approve' ? '#ef4444' : '#6b7280'}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  statGradient: {
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 2,
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    marginBottom: 12,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userId: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusChip: {
    marginLeft: 8,
  },
  urgentChip: {
    backgroundColor: '#fee2e2',
  },
  normalChip: {
    backgroundColor: '#e0e7ff',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  reasonBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#ef4444',
  },
  rejectButton: {
    borderColor: '#6b7280',
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
  },
  dialogText: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  dialogWarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
  },
  dialogList: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  dialogNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  reasonInput: {
    marginBottom: 16,
  },
});

export default DeletionRequestsScreen;
