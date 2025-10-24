import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  Dialog,
  Portal,
  Button,
  TextInput,
  RadioButton,
  List,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import FirebaseService from '../services/FirebaseService';
import AISupportService from '../services/AISupportService';

const AISupportChat = ({ visible, onDismiss }) => {
  const [selectedIssue, setSelectedIssue] = useState('general');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [ticketId, setTicketId] = useState(null);

  const issueTypes = [
    { value: 'general', label: 'General Question', icon: 'help-circle', color: '#3b82f6' },
    { value: 'bug', label: 'Bug Report', icon: 'bug', color: '#ef4444' },
    { value: 'feature', label: 'Feature Request', icon: 'lightbulb', color: '#f59e0b' },
    { value: 'account', label: 'Account Issue', icon: 'account', color: '#8b5cf6' },
    { value: 'billing', label: 'Billing/Premium', icon: 'credit-card', color: '#10b981' },
    { value: 'data', label: 'Data/Sync Issue', icon: 'sync', color: '#06b6d4' },
  ];

  useEffect(() => {
    if (visible) {
      // Pre-fill user email if logged in
      const user = FirebaseService.currentUser;
      if (user?.email) {
        setUserEmail(user.email);
      }
    }
  }, [visible]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Required', 'Please describe your issue');
      return;
    }

    if (!userEmail.trim()) {
      Alert.alert('Required', 'Please provide your email');
      return;
    }

    try {
      setIsLoading(true);
      setShowResponse(false);

      // Send to AI Support Service
      const result = await AISupportService.handleSupportTicket({
        userEmail: userEmail.trim(),
        issueType: selectedIssue,
        message: message.trim(),
        platform: Platform.OS,
        appVersion: '2.9.0'
      });

      // Show AI response
      setAiResponse(result);
      setTicketId(result.ticketId);
      setShowResponse(true);

      // Track event
      await FirebaseService.trackEvent('ai_support_ticket_created', {
        issue_type: selectedIssue,
        needs_human: result.needsHuman,
        confidence: result.confidence
      }).catch(() => {});

    } catch (error) {
      console.error('Error sending support message:', error);
      Alert.alert(
        'Error',
        'Unable to send your message. Please try again or email support@habitowl.app'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSelectedIssue('general');
    setShowResponse(false);
    setAiResponse(null);
    setTicketId(null);
    onDismiss();
  };

  const handleNewTicket = () => {
    setMessage('');
    setSelectedIssue('general');
    setShowResponse(false);
    setAiResponse(null);
    setTicketId(null);
  };

  const getCurrentIssueType = () => {
    return issueTypes.find(i => i.value === selectedIssue);
  };

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={handleClose} 
        style={styles.dialog}
        dismissable={!isLoading}
      >
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Icon name="robot" size={32} color="#ffffff" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Support Assistant</Text>
              <Text style={styles.headerSubtitle}>
                Instant help powered by AI
              </Text>
            </View>
          </View>
        </LinearGradient>

        <Dialog.ScrollArea>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {!showResponse ? (
                // Ticket Creation Form
                <>
                  <Text style={styles.sectionTitle}>What can we help you with?</Text>
                  
                  <RadioButton.Group
                    onValueChange={setSelectedIssue}
                    value={selectedIssue}
                  >
                    {issueTypes.map((issue) => (
                      <List.Item
                        key={issue.value}
                        title={issue.label}
                        left={() => (
                          <View style={styles.radioContainer}>
                            <RadioButton value={issue.value} color="#4f46e5" />
                            <Icon name={issue.icon} size={20} color={issue.color} />
                          </View>
                        )}
                        onPress={() => setSelectedIssue(issue.value)}
                        style={[
                          styles.radioItem,
                          selectedIssue === issue.value && styles.radioItemSelected
                        ]}
                      />
                    ))}
                  </RadioButton.Group>

                  <TextInput
                    label="Your Email"
                    value={userEmail}
                    onChangeText={setUserEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    placeholder="your.email@example.com"
                    left={<TextInput.Icon icon="email" />}
                    disabled={isLoading}
                  />

                  <TextInput
                    label="Describe your issue"
                    value={message}
                    onChangeText={setMessage}
                    mode="outlined"
                    multiline
                    numberOfLines={5}
                    style={styles.textArea}
                    placeholder="Please provide as much detail as possible..."
                    left={<TextInput.Icon icon="message-text" />}
                    disabled={isLoading}
                  />

                  <View style={styles.tipContainer}>
                    <Icon name="lightbulb-outline" size={16} color="#f59e0b" />
                    <Text style={styles.tipText}>
                      AI will respond instantly. Complex issues are forwarded to our team.
                    </Text>
                  </View>
                </>
              ) : (
                // AI Response Display
                <>
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <Icon name="robot" size={24} color="#4f46e5" />
                      <Text style={styles.responseTitle}>AI Response</Text>
                      {aiResponse?.needsHuman && (
                        <Chip 
                          icon="account" 
                          style={styles.chip}
                          textStyle={styles.chipText}
                        >
                          Escalated
                        </Chip>
                      )}
                    </View>

                    <View style={styles.responseCard}>
                      <Text style={styles.responseText}>{aiResponse?.aiResponse}</Text>
                    </View>

                    {aiResponse?.needsHuman && (
                      <View style={styles.escalationNotice}>
                        <Icon name="account-arrow-right" size={20} color="#10b981" />
                        <Text style={styles.escalationText}>
                          Your ticket has been forwarded to our support team. 
                          We'll respond within 24 hours.
                        </Text>
                      </View>
                    )}

                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketLabel}>Ticket ID:</Text>
                      <Text style={styles.ticketId}>#{ticketId?.slice(-8)}</Text>
                    </View>

                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>Was this helpful?</Text>
                      <View style={styles.ratingButtons}>
                        <Button 
                          icon="thumb-up" 
                          mode="outlined"
                          onPress={() => Alert.alert('Thanks!', 'Glad we could help!')}
                          style={styles.ratingButton}
                        >
                          Yes
                        </Button>
                        <Button 
                          icon="thumb-down" 
                          mode="outlined"
                          onPress={() => Alert.alert('Sorry', 'Our team will review your ticket.')}
                          style={styles.ratingButton}
                        >
                          No
                        </Button>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Dialog.ScrollArea>

        <Dialog.Actions style={styles.actions}>
          {!showResponse ? (
            <>
              <Button onPress={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onPress={handleSendMessage}
                loading={isLoading}
                disabled={isLoading}
                mode="contained"
                buttonColor="#4f46e5"
              >
                {isLoading ? 'Sending...' : 'Send to AI'}
              </Button>
            </>
          ) : (
            <>
              <Button onPress={handleNewTicket}>
                New Ticket
              </Button>
              <Button onPress={handleClose} mode="contained" buttonColor="#4f46e5">
                Close
              </Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '95%',
    borderRadius: 16,
  },
  header: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  radioItem: {
    paddingVertical: 8,
    borderRadius: 8,
  },
  radioItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  input: {
    marginBottom: 16,
    marginTop: 8,
  },
  textArea: {
    marginBottom: 16,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  responseContainer: {
    paddingBottom: 16,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  chip: {
    backgroundColor: '#10b981',
  },
  chipText: {
    color: '#ffffff',
    fontSize: 12,
  },
  responseCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4f46e5',
    marginBottom: 16,
  },
  responseText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  escalationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  escalationText: {
    fontSize: 13,
    color: '#065f46',
    marginLeft: 8,
    flex: 1,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ticketLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 8,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4f46e5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ratingContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  ratingButton: {
    flex: 1,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});

export default AISupportChat;
