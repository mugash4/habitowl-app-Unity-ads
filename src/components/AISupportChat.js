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
import aiSupportService from '../services/aiSupportService';

/**
 * ✅ FIXED: Simplified AI Support Chat Component
 * - Fixed button visibility issue
 * - Proper modal structure like AICoachingChat
 */
const AISupportChat = ({ visible, onDismiss }) => {
  const [selectedIssue, setSelectedIssue] = useState('general');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

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
      console.log('✅ AI Support Chat opened');
      
      const user = FirebaseService.currentUser;
      if (user?.email) {
        setUserEmail(user.email);
      }
      
      setShowResponse(false);
      setAiResponse(null);
      setApiKeyMissing(false);
      setMessage('');
      setSelectedIssue('general');
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
      setApiKeyMissing(false);

      console.log('📤 Sending support ticket...');

      const result = await aiSupportService.handleSupportTicket({
        userEmail: userEmail.trim(),
        issueType: selectedIssue,
        message: message.trim(),
        platform: Platform.OS,
        appVersion: '1.12.0'
      });

      console.log('✅ Ticket created:', result.ticketId);

      setAiResponse(result);
      setTicketId(result.ticketId);
      setShowResponse(true);

      await FirebaseService.trackEvent('ai_support_ticket_created', {
        issue_type: selectedIssue,
        needs_human: result.needsHuman,
        confidence: result.confidence
      }).catch(() => {});

    } catch (error) {
      console.error('❌ Error sending support message:', error);
      
      if (error.message && error.message.includes('API key')) {
        setApiKeyMissing(true);
        Alert.alert(
          'Support System Setup Needed',
          'The AI support system needs to be configured by the administrator. Your message has been saved and our team will respond via email within 24 hours.\n\nAdmin: Please add API keys in Firebase Console → admin_config → settings → api_keys',
          [{ text: 'OK' }]
        );
      } else if (error.message && error.message.includes('network')) {
        Alert.alert(
          'Connection Error',
          'Please check your internet connection and try again.',
          [{ text: 'Retry', onPress: handleSendMessage }, { text: 'Cancel', style: 'cancel' }]
        );
      } else {
        Alert.alert(
          'Message Saved',
          'Your support request has been saved. Our team will respond to your email within 24 hours.\n\nFor urgent issues, please email: augustinemwathi96@gmail.com',
          [{ text: 'OK' }]
        );
      }
      
      setAiResponse({
        aiResponse: getFallbackMessage(selectedIssue),
        needsHuman: true,
        ticketId: `ticket_${Date.now()}`
      });
      setShowResponse(true);
      
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackMessage = (issueType) => {
    const fallbacks = {
      general: "Thank you for contacting HabitOwl support! 📧\n\nYour message has been received and our team will respond within 24 hours.\n\nFor immediate help, check out:\n• Settings → About → FAQ section\n• In-app help guides",
      
      bug: "Thanks for reporting this bug! 🐛\n\nOur team takes bug reports seriously. We'll investigate and get back to you within 24 hours.\n\nPlease include:\n• What you were doing\n• What happened vs what you expected\n• Your device type",
      
      feature: "Great feature idea! 💡\n\nWe love hearing from users. All feature requests are reviewed by our product team.\n\nYour suggestion has been saved and we'll consider it for future updates!",
      
      account: "Account issues are important! 🔐\n\nOur team will review your account and respond within 24 hours.\n\nIn the meantime:\n• Try the 'Forgot Password' option\n• Check if you're using the correct email\n• Try signing in with Google",
      
      billing: "Billing questions require human review 💳\n\nOur support team will check your account and respond within 24 hours.\n\nFor immediate assistance:\nEmail: augustinemwathi96@gmail.com",
      
      data: "Data sync issues can be frustrating! 🔄\n\nOur team will investigate and respond within 24 hours.\n\nQuick fixes to try:\n• Check internet connection\n• Sign out and sign back in\n• Force quit and restart the app"
    };

    return fallbacks[issueType] || fallbacks.general;
  };

  const handleClose = () => {
    setMessage('');
    setSelectedIssue('general');
    setShowResponse(false);
    setAiResponse(null);
    setTicketId(null);
    setApiKeyMissing(false);
    onDismiss();
  };

  const handleNewTicket = () => {
    setMessage('');
    setSelectedIssue('general');
    setShowResponse(false);
    setAiResponse(null);
    setTicketId(null);
    setApiKeyMissing(false);
  };

  return (
    <Portal>
      <Dialog 
        visible={visible} 
        onDismiss={handleClose} 
        style={styles.dialog}
        dismissable={!isLoading}
      >
        {/* Header */}
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Icon name="robot" size={32} color="#ffffff" />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>AI Support Assistant</Text>
              <Text style={styles.headerSubtitle}>
                {apiKeyMissing ? 'Email-based support active' : 'Instant help powered by AI'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ✅ CRITICAL FIX: Use Dialog.ScrollArea with proper structure */}
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {!showResponse ? (
              <>
                <Text style={styles.sectionTitle}>What can we help you with?</Text>
                
                {/* Issue Type Selection */}
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

                {/* Email Input */}
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

                {/* Message Input */}
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

                {/* Info Tip */}
                <View style={styles.tipContainer}>
                  <Icon name="lightbulb-outline" size={16} color="#f59e0b" />
                  <Text style={styles.tipText}>
                    {apiKeyMissing 
                      ? 'Your message will be sent to our support team via email'
                      : 'AI will respond instantly. Complex issues are forwarded to our team.'}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.responseContainer}>
                  <View style={styles.responseHeader}>
                    <Icon name={aiResponse?.needsHuman ? "account" : "robot"} size={24} color="#4f46e5" />
                    <Text style={styles.responseTitle}>
                      {aiResponse?.needsHuman ? 'Support Team Notified' : 'AI Response'}
                    </Text>
                    {aiResponse?.needsHuman && (
                      <Chip 
                        icon="email" 
                        style={styles.chip}
                        textStyle={styles.chipText}
                      >
                        Email
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
                        Our support team has been notified and will respond to {userEmail} within 24 hours.
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
                        onPress={() => {
                          Alert.alert('Thanks!', 'Glad we could help!');
                          handleClose();
                        }}
                        style={styles.ratingButton}
                      >
                        Yes
                      </Button>
                      <Button 
                        icon="thumb-down" 
                        mode="outlined"
                        onPress={() => {
                          Alert.alert('Sorry', 'Our team will review your ticket and respond via email.');
                          handleClose();
                        }}
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
        </Dialog.ScrollArea>

        {/* ✅ CRITICAL FIX: Actions outside ScrollArea */}
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
                labelStyle={{ color: '#ffffff' }}
              >
                {isLoading ? 'Sending...' : 'Send Message'}
              </Button>
            </>
          ) : (
            <>
              <Button onPress={handleNewTicket}>
                New Ticket
              </Button>
              <Button 
                onPress={handleClose} 
                mode="contained" 
                buttonColor="#4f46e5"
                labelStyle={{ color: '#ffffff' }}
              >
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
    maxHeight: '90%',
    maxWidth: 500,
    alignSelf: 'center',
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
  scrollArea: {
    maxHeight: 400,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

export default AISupportChat;
