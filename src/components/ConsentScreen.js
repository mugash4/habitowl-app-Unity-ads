import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import {
  Card,
  Button,
  Checkbox,
  TextInput,
  HelperText
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import PrivacyComplianceService from '../services/PrivacyComplianceService';
import FirebaseService from '../services/FirebaseService';
import Constants from 'expo-constants';

const ConsentScreen = ({ onConsentGiven, userEmail }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToDataProcessing, setAgreedToDataProcessing] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [isOver13, setIsOver13] = useState(null);

  const handleDateChange = async (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      
      // Verify age automatically
      const ageCheck = await PrivacyComplianceService.verifyAge(selectedDate);
      setIsOver13(ageCheck.isOver13);
      setAgeVerified(true);
      
      if (!ageCheck.isOver13) {
        Alert.alert(
          'Age Restriction',
          'Sorry, you must be 13 years or older to use HabitOwl. This is required by COPPA (Children\'s Online Privacy Protection Act).',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!agreedToTerms || !agreedToPrivacy || !agreedToDataProcessing) {
      Alert.alert(
        'Required Consents',
        'You must agree to Terms of Service, Privacy Policy, and Data Processing to use HabitOwl.'
      );
      return;
    }

    if (!ageVerified) {
      Alert.alert('Age Verification', 'Please select your date of birth.');
      return;
    }

    if (!isOver13) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to use this app.'
      );
      return;
    }

    try {
      setLoading(true);

      const user = FirebaseService.currentUser;
      if (!user) {
        throw new Error('No user found');
      }

      // Record consent
      await PrivacyComplianceService.recordUserConsent(user.uid, {
        agreedToTerms: agreedToTerms,
        agreedToPrivacy: agreedToPrivacy,
        agreedToDataProcessing: agreedToDataProcessing,
        marketingConsent: marketingConsent,
        dateOfBirth: dateOfBirth.toISOString(),
        isOver13: isOver13,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version || '2.9.0'
      });

      console.log('✅ Consent recorded successfully');
      
      // Call parent callback
      onConsentGiven();

    } catch (error) {
      console.error('Error recording consent:', error);
      Alert.alert('Error', 'Failed to record consent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Icon name="shield-check" size={60} color="#ffffff" />
          <Text style={styles.title}>Privacy & Consent</Text>
          <Text style={styles.subtitle}>
            Before you continue, please review and accept our policies
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {/* Age Verification */}
            <Text style={styles.sectionTitle}>Age Verification (Required)</Text>
            <Text style={styles.sectionDescription}>
              COPPA requires us to verify you are 13 or older
            </Text>
            
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
              icon="calendar"
            >
              {ageVerified 
                ? `Date of Birth: ${dateOfBirth.toLocaleDateString()}` 
                : 'Select Date of Birth'}
            </Button>

            {ageVerified && (
              <View style={[styles.ageStatus, isOver13 ? styles.ageApproved : styles.ageRestricted]}>
                <Icon 
                  name={isOver13 ? "check-circle" : "alert-circle"} 
                  size={20} 
                  color={isOver13 ? "#10b981" : "#ef4444"} 
                />
                <Text style={[styles.ageStatusText, isOver13 ? styles.approvedText : styles.restrictedText]}>
                  {isOver13 ? 'Age verified ✓' : 'Must be 13 or older'}
                </Text>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {/* Required Consents */}
            <Text style={styles.sectionTitle}>Required Agreements</Text>
            
            <View style={styles.checkboxRow}>
              <Checkbox
                status={agreedToTerms ? 'checked' : 'unchecked'}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                color="#4f46e5"
              />
              <Text style={styles.checkboxLabel}>
                I agree to the <Text style={styles.link}>Terms of Service</Text>
              </Text>
            </View>

            <View style={styles.checkboxRow}>
              <Checkbox
                status={agreedToPrivacy ? 'checked' : 'unchecked'}
                onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
                color="#4f46e5"
              />
              <Text style={styles.checkboxLabel}>
                I agree to the <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>

            <View style={styles.checkboxRow}>
              <Checkbox
                status={agreedToDataProcessing ? 'checked' : 'unchecked'}
                onPress={() => setAgreedToDataProcessing(!agreedToDataProcessing)}
                color="#4f46e5"
              />
              <Text style={styles.checkboxLabel}>
                I consent to data processing for app functionality
              </Text>
            </View>

            {/* Optional Consents */}
            <Text style={styles.sectionTitle}>Optional</Text>
            
            <View style={styles.checkboxRow}>
              <Checkbox
                status={marketingConsent ? 'checked' : 'unchecked'}
                onPress={() => setMarketingConsent(!marketingConsent)}
                color="#4f46e5"
              />
              <Text style={styles.checkboxLabel}>
                I want to receive tips and promotional offers
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || !agreedToTerms || !agreedToPrivacy || !agreedToDataProcessing || !isOver13}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              Continue to HabitOwl
            </Button>

            <Text style={styles.disclaimer}>
              By continuing, you confirm that you are at least 13 years old and agree to our data practices as described in our Privacy Policy.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  dateButton: {
    marginBottom: 12,
  },
  ageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  ageApproved: {
    backgroundColor: '#d1fae5',
  },
  ageRestricted: {
    backgroundColor: '#fee2e2',
  },
  ageStatusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  approvedText: {
    color: '#065f46',
  },
  restrictedText: {
    color: '#991b1b',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  link: {
    color: '#4f46e5',
    textDecorationLine: 'underline',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: '#4f46e5',
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ConsentScreen;
