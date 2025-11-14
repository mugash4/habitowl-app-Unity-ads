/**
 * Error Boundary Component
 * Catches React errors and reports them automatically
 */

import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import PrivacyComplianceService from '../services/PrivacyComplianceService';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, errorInfo) {
    console.error('❌ App Crash Detected:', error);
    console.error('Error Info:', errorInfo);

    // Report crash automatically
    try {
      await PrivacyComplianceService.reportCrash({
        errorMessage: error.toString(),
        errorStack: error.stack || errorInfo.componentStack,
        errorName: error.name || 'UnknownError',
        screen: this.props.screen || 'Unknown',
        platform: Platform.OS,
        osVersion: Platform.Version,
        appVersion: Constants.expoConfig?.version || '2.9.0',
        userActions: [] // You can track user actions before crash
      });

      console.log('✅ Crash report sent automatically');
    } catch (reportError) {
      console.error('❌ Failed to send crash report:', reportError);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>😔 Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We've automatically reported this issue and will fix it soon.
          </Text>
          <Text style={styles.errorText}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
          <Button title="Try Again" onPress={this.handleReset} color="#4f46e5" />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 20,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
