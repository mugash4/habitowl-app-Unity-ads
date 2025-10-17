import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking
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
      Alert.alert('Error', 'Please provide your email for our response');
      return;
    }

    try {
      setIsLoading(true);

      // Create support ticket in Firestore
      const supportTicket = {
        userId: FirebaseService.currentUser?.uid || 'anonymous',
        userEmail: userEmail.trim(),
        issueType: selectedIssue,
        message: message.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        deviceInfo: {
          platform: 'mobile',
          // You could add more device info here
        }
      };

      await FirebaseService.trackEvent('support_ticket_created', {
        issue_type: selectedIssue,
        has_account: !!FirebaseService.currentUser
      });

      // In a real app, you would send this to your support system
      // For now, we'll store it in Firestore and send an email
      
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
        'Support Request Sent! 📧',
        'We\'ve opened your email client with your support request. Please send the email and we\'ll respond within 24 hours.',
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
      console.error('Error sending support request:', error);
      
      // Fallback: Try to open email client directly
      try {
        await Linking.openURL('mailto:support@habitowl.app');
        Alert.alert(
          'Email Client Opened',
          'Please describe your issue in the email and we\'ll help you out!'
        );
      } catch (emailError) {
        Alert.alert(
          'Unable to Send',
          'Please email us directly at support@habitowl.app with your issue details.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    let url = '';
    let trackingEvent = '';

    switch (action) {
      case 'faq':
        url = 'https://habitowl-3405d.web.app/faq';
        trackingEvent = 'faq_opened';
        break;
      case 'video':
        url = 'https://www.youtube.com/watch?v=your-tutorial-video';
        trackingEvent = 'tutorial_video_opened';
        break;
      case 'community':
        url = 'https://reddit.com/r/habitowl';
        trackingEvent = 'community_opened';
        break;
      default:
        return;
    }

    try {
      await FirebaseService.trackEvent(trackingEvent);
      await Linking.openURL(url);
      onDismiss();
    } catch (error) {
      Alert.alert('Error', 'Unable to open link');
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>
          <Icon name="help-circle" size={24} color="#4f46e5" />
          <Text style={styles.titleText}>Contact Support</Text>
        </Dialog.Title>

        <Dialog.ScrollArea style={styles.scrollArea}>
          <View style={styles.content}>
            {/* Quick Help Options */}
            <Text style={styles.sectionTitle}>Quick Help</Text>
            
            <Button
              mode="outlined"
              icon="frequently-asked-questions"
              onPress={() => handleQuickAction('faq')}
              style={styles.quickButton}
              contentStyle={styles.quickButtonContent}
            >
              View FAQ
            </Button>

            <Button
              mode="outlined"
              icon="play-circle"
              onPress={() => handleQuickAction('video')}
              style={styles.quickButton}
              contentStyle={styles.quickButtonContent}
            >
              Watch Tutorial
            </Button>

            <Button
              mode="outlined"
              icon="forum"
              onPress={() => handleQuickAction('community')}
              style={styles.quickButton}
              contentStyle={styles.quickButtonContent}
            >
              Community Forum
            </Button>

            {/* Contact Form */}
            <Text style={styles.sectionTitle}>Send us a Message</Text>

            <Text style={styles.label}>What can we help you with?</Text>
            <RadioButton.Group
              onValueChange={setSelectedIssue}
              value={selectedIssue}
            >
              {issueTypes.map((issue) => (
                <List.Item
                  key={issue.value}
                  title={issue.label}
                  left={(props) => (
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
              placeholder="Please provide as much detail as possible..."
            />

            <Text style={styles.responseTime}>
              💬 We typically respond within 24 hours
            </Text>
          </View>
        </Dialog.ScrollArea>

        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={handleSendSupport}
            loading={isLoading}
            disabled={isLoading}
            mode="contained"
          >
            Send Message
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
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  scrollArea: {
    maxHeight: 400,
  },
  content: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 12,
  },
  quickButton: {
    marginBottom: 8,
  },
  quickButtonContent: {
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
    fontStyle: 'italic',
  },
});

export default ContactSupport;