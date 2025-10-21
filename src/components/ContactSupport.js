import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ScrollView
} from 'react-native';
import {
  Dialog,
  Portal,
  Button,
  TextInput,
  RadioButton,
  List
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import FirebaseService from '../services/FirebaseService';

const ContactSupport = ({ visible, onDismiss }) => {
  const [selectedIssue, setSelectedIssue] = useState('general');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const issueTypes = [
    { value: 'general', label: 'General Question', icon: 'help-circle' },
    { value: 'bug', label: 'Bug Report', icon: 'bug' },
    { value: 'feature', label: 'Feature Request', icon: 'lightbulb' },
    { value: 'account', label: 'Account Issue', icon: 'account' },
    { value: 'billing', label: 'Billing/Premium', icon: 'credit-card' },
    { value: 'data', label: 'Data/Sync Issue', icon: 'sync' },
  ];

  const handleSendSupport = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    if (!userEmail.trim()) {
      Alert.alert('Error', 'Please provide your email');
      return;
    }

    try {
      setIsLoading(true);

      await FirebaseService.trackEvent('support_ticket_created', {
        issue_type: selectedIssue,
        has_account: !!FirebaseService.currentUser
      }).catch(() => {});

      const emailSubject = `HabitOwl Support: ${issueTypes.find(i => i.value === selectedIssue)?.label}`;
      const emailBody = `Issue Type: ${issueTypes.find(i => i.value === selectedIssue)?.label}
User Email: ${userEmail}
User ID: ${FirebaseService.currentUser?.uid || 'Anonymous'}

Message:
${message}

---
Sent from HabitOwl Mobile App`;

      const emailUrl = `mailto:support@habitowl.app?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

      await Linking.openURL(emailUrl);

      Alert.alert(
        'Support Request Sent!',
        'We\'ve opened your email client. Please send the email.',
        [
          {
            text: 'OK',
            onPress: () => {
              setMessage('');
              setUserEmail('');
              setSelectedIssue('general');
              onDismiss();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error sending support:', error);
      Alert.alert('Error', 'Unable to open email. Please email support@habitowl.app');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>
          <View style={styles.titleContainer}>
            <Icon name="help-circle" size={24} color="#4f46e5" />
            <Text style={styles.titleText}>Contact Support</Text>
          </View>
        </Dialog.Title>

        <Dialog.ScrollArea>
          <ScrollView style={styles.scrollContent}>
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
                      <RadioButton value={issue.value} />
                      <Icon name={issue.icon} size={20} color="#6b7280" />
                    </View>
                  )}
                  onPress={() => setSelectedIssue(issue.value)}
                  style={styles.radioItem}
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
            />

            <TextInput
              label="Describe your issue"
              value={message}
              onChangeText={setMessage}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
              placeholder="Please provide details..."
            />

            <Text style={styles.responseTime}>
              We typically respond within 24 hours
            </Text>
          </ScrollView>
        </Dialog.ScrollArea>

        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={handleSendSupport}
            loading={isLoading}
            disabled={isLoading}
            mode="contained"
          >
            Send
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    marginBottom: 12,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  radioItem: {
    paddingVertical: 4,
  },
  input: {
    marginBottom: 16,
  },
  responseTime: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});

export default ContactSupport;
