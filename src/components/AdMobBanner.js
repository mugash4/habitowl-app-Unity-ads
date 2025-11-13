/**
 * ✅ FULLY FIXED: AdMob Banner Component
 * - Shows VISIBLE error messages on your phone screen
 * - Shows banner for FREE users only
 * - Shows clear status for debugging
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import adMobService from '../services/AdMobService';

// Import AdMob components
let BannerAd = null;
let BannerAdSize = null;

try {
  const admobModule = require('react-native-google-mobile-ads');
  BannerAd = admobModule.BannerAd;
  BannerAdSize = admobModule.BannerAdSize;
  console.log('[Banner] ✅ AdMob SDK loaded');
} catch (error) {
  console.log('[Banner] ℹ️ AdMob SDK not available');
}

const AdMobBanner = ({ style = {} }) => {
  const [shouldShowBanner, setShouldShowBanner] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [adStatus, setAdStatus] = useState('initializing'); // initializing, loading, loaded, error, hidden
  const [errorMessage, setErrorMessage] = useState('');
  const isMounted = useRef(true);
  const initAttempted = useRef(false);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    // ✅ FIX: Don't return early - let initialization happen
    // Even on web, we want to show status messages

    const initBanner = async () => {
      if (initAttempted.current) return;
      initAttempted.current = true;

      try {
        console.log('[Banner] 🔄 Initializing...');
        setAdStatus('initializing');
        
        // Check platform first
        if (Platform.OS === 'web') {
          console.log('[Banner] ℹ️ Web platform - no ads');
          if (isMounted.current) {
            setIsReady(true);
            setAdStatus('hidden');
            setShouldShowBanner(false);
          }
          return;
        }

        // Check SDK availability
        if (!BannerAd || !BannerAdSize) {
          console.log('[Banner] ⚠️ SDK not available');
          if (isMounted.current) {
            setIsReady(true);
            setAdStatus('error');
            setErrorMessage('AdMob SDK unavailable (needs EAS build)');
            setShouldShowBanner(false);
          }
          return;
        }

        // Wait for AdMobService initialization
        await adMobService.waitForInitialization();
        
        if (!isMounted.current) return;

        // Subscribe to status changes
        const unsubscribe = adMobService.onStatusChange((status) => {
          if (!isMounted.current) return;
          
          console.log('[Banner] 📢 Status:', {
            loaded: status.premiumStatusLoaded,
            premium: status.isPremium,
            admin: status.isAdmin,
            sdk: status.sdkAvailable,
            init: status.isInitialized
          });
          
          const shouldShow = status.premiumStatusLoaded && 
                            !status.isPremium && 
                            !status.isAdmin &&
                            status.sdkAvailable;
          
          console.log('[Banner] 🎯', shouldShow ? 'SHOW BANNER' : 'HIDE BANNER');
          
          setShouldShowBanner(shouldShow);
          setIsReady(true);
          
          if (shouldShow) {
            setAdStatus('loading');
            const config = adMobService.getBannerConfig();
            if (config) {
              setAdUnitId(config.adUnitId);
              console.log('[Banner] ✅ Banner configured:', config.adUnitId);
            } else {
              console.log('[Banner] ⚠️ No banner config');
              setAdStatus('error');
              setErrorMessage('Banner config unavailable');
            }
          } else {
            setAdStatus('hidden');
            // Show why banner is hidden
            if (status.isPremium) {
              setErrorMessage('Premium user - no ads');
            } else if (status.isAdmin) {
              setErrorMessage('Admin user - no ads');
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.log('[Banner] ❌ Init error:', error);
        if (isMounted.current) {
          setIsReady(true);
          setShouldShowBanner(false);
          setAdStatus('error');
          setErrorMessage(`Init failed: ${error.message}`);
        }
      }
    };

    const unsubscribePromise = initBanner();

    return () => {
      console.log('[Banner] 🚪 Unmounting');
      isMounted.current = false;
      initAttempted.current = false;
      unsubscribePromise.then(unsub => {
        if (unsub) unsub();
      });
    };
  }, []);

  // ✅ FIX: Always render something - never return null silently
  // This way user can see what's happening on their phone

  // Still loading status
  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.statusContainer}>
          <Icon name="loading" size={16} color="#9ca3af" />
          <Text style={styles.statusText}>Checking ad status...</Text>
        </View>
      </View>
    );
  }

  // Hidden for Premium/Admin users
  if (adStatus === 'hidden') {
    // Premium/Admin users - show NOTHING (return null)
    // But in development, show a message
    if (__DEV__) {
      return (
        <View style={[styles.container, styles.hiddenContainer, style]}>
          <Text style={styles.hiddenText}>
            🚫 Banner Hidden: {errorMessage}
          </Text>
        </View>
      );
    }
    return null; // Production - no banner for premium
  }

  // Error state - SHOW VISIBLE ERROR
  if (adStatus === 'error') {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Icon name="alert-circle" size={18} color="#ef4444" />
        <Text style={styles.errorText}>{errorMessage || 'Ad error'}</Text>
      </View>
    );
  }

  // Free user - SHOW BANNER OR LOADING
  if (shouldShowBanner && adUnitId) {
    console.log('[Banner] ✅ RENDERING BANNER:', adUnitId);
    
    return (
      <View style={[styles.container, style]}>
        {/* Show loading overlay until ad loads */}
        {adStatus === 'loading' && (
          <View style={styles.loadingOverlay}>
            <Icon name="loading" size={16} color="#6b7280" />
            <Text style={styles.loadingText}>Loading ad...</Text>
          </View>
        )}
        
        {/* Show error if ad failed */}
        {adStatus === 'error' && errorMessage && (
          <View style={styles.adErrorContainer}>
            <Icon name="alert-circle" size={14} color="#f59e0b" />
            <Text style={styles.adErrorText}>{errorMessage}</Text>
          </View>
        )}
        
        {/* The actual banner ad */}
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ AD LOADED!');
            if (isMounted.current) {
              setAdStatus('loaded');
              setErrorMessage('');
            }
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed:', error.code, error.message);
            
            let userMessage = '';
            
            // ✅ SHOW USER-FRIENDLY ERROR MESSAGES
            if (error.code === 3) {
              userMessage = '📭 No ads available right now';
              console.log('[Banner] 💡 ERROR CODE 3 (No Fill) - NORMAL');
              console.log('[Banner]    - New ad unit (24-48h activation)');
              console.log('[Banner]    - No ads for your location');
              console.log('[Banner]    - Low inventory (try later)');
              console.log('[Banner]    ✅ Integration is OK!');
            } else if (error.code === 0) {
              userMessage = '⚠️ Ad error (internal)';
            } else if (error.code === 1) {
              userMessage = '❌ Invalid ad unit ID';
            } else if (error.code === 2) {
              userMessage = '🌐 Network error';
            } else {
              userMessage = `⚠️ Ad error (code ${error.code})`;
            }
            
            if (isMounted.current) {
              setAdStatus('error');
              setErrorMessage(userMessage);
            }
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked');
            adMobService.trackAdImpression('banner', 'click');
          }}
          onAdClosed={() => {
            console.log('[Banner] 🚪 Ad closed');
          }}
        />
      </View>
    );
  }

  // Fallback - show error
  console.log('[Banner] ⚠️ Fallback state');
  return (
    <View style={[styles.container, styles.errorContainer, style]}>
      <Icon name="information" size={16} color="#9ca3af" />
      <Text style={styles.infoText}>Ad not configured</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  hiddenContainer: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  hiddenText: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    zIndex: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  adErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    zIndex: 10,
    gap: 6,
    paddingHorizontal: 12,
  },
  adErrorText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});

export default AdMobBanner;
