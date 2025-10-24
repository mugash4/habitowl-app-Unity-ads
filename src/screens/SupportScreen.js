import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import aiSupportService from '../services/aiSupportService';

export default function SupportScreen({ navigation }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message');
      return;
    }

    setLoading(true);
    setAiResponse(null);

    try {
      const user = auth.currentUser;
      
      // Prepare ticket data
      const ticketData = {
        subject: subject.trim(),
        message: message.trim(),
        userEmail: user?.email || 'anonymous',
        userId: user?.uid || 'anonymous',
        isPremium: false, // You can check premium status here
      };

      // Process ticket with AI
      const result = await aiSupportService.processTicket(ticketData);

      if (result.autoReplied) {
        // AI handled it!
        setAiResponse(result.response);
        Alert.alert(
          '✅ Instant Response',
          'Our AI assistant has answered your question! Check below for the response.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSubject('');
                setMessage('');
              }
            }
          ]
        );
      } else {
        // Needs human support
        Alert.alert(
          '📬 Ticket Submitted',
          'Your question has been forwarded to our support team. We\'ll respond within 24-48 hours.',
          [
            {
              text: 'OK',
              onPress: () => {
                setSubject('');
                setMessage('');
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      Alert.alert('Error', 'Failed to submit your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.aiIndicator}>
            <Ionicons name="sparkles" size={20} color="#667eea" />
            <Text style={styles.aiText}>AI-Powered Support</Text>
          </View>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description of your issue"
            value={subject}
            onChangeText={setSubject}
            editable={!loading}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Describe your issue in detail..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!loading}
          />

          {aiResponse && (
            <View style={styles.responseCard}>
              <View style={styles.responseHeader}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#667eea" />
                <Text style={styles.responseTitle}>AI Assistant Response</Text>
              </View>
              <Text style={styles.responseText}>{aiResponse}</Text>
              <Text style={styles.responseFooter}>
                Not satisfied? Submit another ticket and our team will help!
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#667eea" />
            <Text style={styles.infoText}>
              Our AI assistant will try to help you instantly. If needed, your ticket will be forwarded to our support team.
            </Text>
          </View>
        </View>

        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>Quick Help</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>🔐 Login Issues?</Text>
            <Text style={styles.faqAnswer}>Try restarting the app or checking your internet connection.</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>⭐ Want More Habits?</Text>
            <Text style={styles.faqAnswer}>Upgrade to Premium for unlimited habits! ($4.99/month)</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>🔔 Missing Notifications?</Text>
            <Text style={styles.faqAnswer}>Check Settings → Apps → HabitOwl → Enable Notifications</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  aiText: {
    marginLeft: 8,
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  responseCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  responseTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  responseText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  responseFooter: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  faqItem: {
    marginBottom: 15,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
