import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const ConsentScreen = ({ navigation, route }) => {
  const { userEmail, userName, authMethod } = route.params;
  
  const [birthYear, setBirthYear] = useState('');
  const [consents, setConsents] = useState({
    termsOfService: false,
    privacyPolicy: false,
    dataProcessing: false,
    marketing: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Calculate age from birth year
  const calculateAge = (year) => {
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(year);
  };

  // Validate birth year
  const isValidBirthYear = (year) => {
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year);
    return yearNum >= 1900 && yearNum <= currentYear;
  };

  // Check if user is under 13 (COPPA compliance)
  const isUnder13 = () => {
    if (!birthYear || birthYear.length !== 4) return false;
    const age = calculateAge(birthYear);
    return age < 13;
  };

  // Check if all required consents are checked
  const areRequiredConsentsChecked = () => {
    return (
      consents.termsOfService &&
      consents.privacyPolicy &&
      consents.dataProcessing
    );
  };

  const handleContinue = async () => {
    // Validate birth year
    if (!birthYear || birthYear.length !== 4 || !isValidBirthYear(birthYear)) {
      Alert.alert(
        'Invalid Birth Year',
        'Please enter a valid 4-digit birth year (e.g., 1990)',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user is under 13 (COPPA)
    if (isUnder13()) {
      Alert.alert(
        'Age Requirement',
        'Sorry, you must be at least 13 years old to use HabitOwl. This is required by COPPA (Children\'s Online Privacy Protection Act).',
        [
          {
            text: 'Exit',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // Check required consents
    if (!areRequiredConsentsChecked()) {
      Alert.alert(
        'Required Consents',
        'Please accept the Terms of Service, Privacy Policy, and Data Processing consent to continue.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      // Pass consent data back to AuthScreen
      navigation.navigate('Auth', {
        consentCompleted: true,
        consentData: {
          birthYear: parseInt(birthYear),
          age: calculateAge(birthYear),
          consents: consents,
          consentDate: new Date().toISOString(),
        },
        userEmail,
        userName,
        authMethod,
      });
    } catch (error) {
      console.error('Consent error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleConsent = (key) => {
    setConsents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to HabitOwl! 🦉</Text>
          <Text style={styles.subtitle}>
            Before we get started, we need your consent for a few things
          </Text>
        </View>

        {/* Age Verification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Verification (COPPA Compliance)</Text>
          <Text style={styles.sectionDescription}>
            We need to verify that you're at least 13 years old to use HabitOwl.
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Birth Year *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1990"
              placeholderTextColor="#999"
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="number-pad"
              maxLength={4}
            />
            {birthYear.length === 4 && isValidBirthYear(birthYear) && (
              <Text style={styles.ageDisplay}>
                Age: {calculateAge(birthYear)} years old
              </Text>
            )}
          </View>
        </View>

        {/* Consents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Consents</Text>
          
          {/* Terms of Service */}
          <TouchableOpacity
            style={styles.consentItem}
            onPress={() => toggleConsent('termsOfService')}
            activeOpacity={0.7}
          >
            <Checkbox
              status={consents.termsOfService ? 'checked' : 'unchecked'}
              onPress={() => toggleConsent('termsOfService')}
              color="#4CAF50"
            />
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>
                I accept the{' '}
                <Text style={styles.linkText}>Terms of Service</Text>
                {' *'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.consentItem}
            onPress={() => toggleConsent('privacyPolicy')}
            activeOpacity={0.7}
          >
            <Checkbox
              status={consents.privacyPolicy ? 'checked' : 'unchecked'}
              onPress={() => toggleConsent('privacyPolicy')}
              color="#4CAF50"
            />
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>
                I accept the{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
                {' *'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Data Processing */}
          <TouchableOpacity
            style={styles.consentItem}
            onPress={() => toggleConsent('dataProcessing')}
            activeOpacity={0.7}
          >
            <Checkbox
              status={consents.dataProcessing ? 'checked' : 'unchecked'}
              onPress={() => toggleConsent('dataProcessing')}
              color="#4CAF50"
            />
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>
                I consent to the processing of my personal data for app functionality (habit tracking, progress analytics) *
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Optional Consents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional Consents</Text>
          
          {/* Marketing */}
          <TouchableOpacity
            style={styles.consentItem}
            onPress={() => toggleConsent('marketing')}
            activeOpacity={0.7}
          >
            <Checkbox
              status={consents.marketing ? 'checked' : 'unchecked'}
              onPress={() => toggleConsent('marketing')}
              color="#4CAF50"
            />
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>
                I agree to receive promotional emails and notifications about new features
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy Information */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Your Privacy Rights</Text>
          <Text style={styles.infoText}>
            • You can download your data anytime{'\n'}
            • You can request account deletion{'\n'}
            • Your data is encrypted and secure{'\n'}
            • We comply with GDPR, CCPA, and COPPA
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!areRequiredConsentsChecked() || !birthYear || isLoading) && 
            styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!areRequiredConsentsChecked() || !birthYear || isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Processing...' : 'Continue to HabitOwl'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            * Required fields
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  inputContainer: {
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  ageDisplay: {
    marginTop: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  consentTextContainer: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  consentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  linkText: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 22,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ConsentScreen;
