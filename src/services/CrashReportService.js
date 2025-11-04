import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

class CrashReportService {
  constructor() {
    this.isInitialized = false;
    this.initialize();
  }

  initialize() {
    if (this.isInitialized) return;
    
    console.log('🔧 Initializing Crash Report Service...');
    this.setupGlobalErrorHandler();
    this.isInitialized = true;
  }

  setupGlobalErrorHandler() {
    // Capture unhandled promise rejections
    if (typeof global !== 'undefined') {
      const originalHandler = global.ErrorUtils?.getGlobalHandler();
      
      global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
        this.logCrashReport({
          type: 'unhandledError',
          error: error?.toString() || 'Unknown error',
          stack: error?.stack || 'No stack trace',
          isFatal: isFatal
        });

        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Capture console errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('Error:') || args[0] instanceof Error) {
        this.logCrashReport({
          type: 'consoleError',
          error: args[0]?.toString() || 'Unknown error',
          stack: args[0]?.stack || 'No stack trace'
        });
      }
      originalConsoleError.apply(console, args);
    };

    console.log('✅ Crash reporting enabled');
  }

  async logCrashReport(errorInfo) {
    try {
      const crashReport = {
        userId: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        timestamp: new Date().toISOString(),
        errorType: errorInfo.type || 'unknown',
        errorMessage: errorInfo.error || 'No error message',
        errorStack: errorInfo.stack || 'No stack trace',
        isFatal: errorInfo.isFatal || false,
        deviceInfo: {
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
        appInfo: {
          appVersion: Constants.expoConfig?.version || '2.9.0',
          sdkVersion: Constants.expoConfig?.sdkVersion || 'unknown',
        },
        autoReported: true
      };

      await addDoc(collection(db, 'crash_reports'), crashReport);
      console.log('✅ Crash report sent successfully');
    } catch (error) {
      console.error('❌ Failed to send crash report:', error);
    }
  }

  // Manual crash reporting
  async reportError(error, context = {}) {
    await this.logCrashReport({
      type: 'manual',
      error: error.toString(),
      stack: error.stack,
      context
    });
  }
}

export default new CrashReportService();
