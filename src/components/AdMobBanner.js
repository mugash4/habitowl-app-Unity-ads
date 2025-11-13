/**
 * ✅ FULLY FIXED: AdMob Banner Component with SDK Initialization Guard
 * - Waits for SDK initialization before rendering
 * - Shows banners ONLY for free users
 * - Proper error handling with user-friendly messages
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
  console.log('[Banner] ℹ️ AdMob SDK not available (Expo Go mode)');
}

const AdMobBanner = ({ style = {} }) => {
  const [isReady, setIsReady] = useState(false);
  const [shouldShowBanner, setShouldShowBanner] = useState(false);
  const [adUnitId, setAdUnitId] = useState(null);
  const [adStatus, setAdStatus] = useState('initializing'); // initializing, loading, loaded, error, hidden
  const [errorMessage, setErrorMessage] = useState('');
  const isMounted = useRef(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    console.log('[Banner] 🎬 Component mounted');
    isMounted.current = true;

    const initBanner = async () => {
      if (hasInitialized.current) {
        console.log('[Banner] ⚠️ Already initialized, skipping');
        return;
      }
      hasInitialized.current = true;

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
          console.log('[Banner] ⚠️ SDK not available (Expo Go mode)');
          if (isMounted.current) {
            setIsReady(true);
            setAdStatus('hidden');
            setShouldShowBanner(false);
          }
          return;
        }

        // ✅ CRITICAL FIX: Wait for AdMobService SDK initialization to complete
        console.log('[Banner] ⏳ Waiting for AdMob SDK initialization...');
        await adMobService.waitForInitialization();
        
        // Wait a bit more to ensure SDK is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted.current) {
          console.log('[Banner] ⚠️ Component unmounted during init');
          return;
        }

        console.log('[Banner] ✅ SDK initialized, checking status...');

        // Subscribe to status changes
        const unsubscribe = adMobService.onStatusChange((status) => {
          if (!isMounted.current) return;
          
          console.log('[Banner] 📢 Status update:', {
            loaded: status.premiumStatusLoaded,
            premium: status.isPremium,
            admin: status.isAdmin,
            sdkInit: status.isInitialized,
            sdkAvailable: status.sdkAvailable,
          });
          
          const shouldShow = status.premiumStatusLoaded && 
                            !status.isPremium && 
                            !status.isAdmin &&
                            status.sdkAvailable &&
                            status.isInitialized; // ✅ Also check SDK is initialized
          
          console.log('[Banner] 🎯', shouldShow ? 'SHOW BANNER' : 'HIDE BANNER');
          
          setShouldShowBanner(shouldShow);
          setIsReady(true);
          
          if (shouldShow) {
            const config = adMobService.getBannerConfig();
            if (config && config.adUnitId) {
              setAdUnitId(config.adUnitId);
              setAdStatus('loading');
              console.log('[Banner] ✅ Banner config ready:', config.adUnitId);
            } else {
              console.log('[Banner] ⚠️ No banner config available');
              setAdStatus('error');
              setErrorMessage('Banner not configured');
            }
          } else {
            setAdStatus('hidden');
            // Log why it's hidden
            if (status.isPremium) {
              setErrorMessage('Premium user');
            } else if (status.isAdmin) {
              setErrorMessage('Admin user');
            } else if (!status.isInitialized) {
              setErrorMessage('SDK initializing...');
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.log('[Banner] ❌ Init error:', error.message);
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
      hasInitialized.current = false;
      unsubscribePromise.then(unsub => {
        if (unsub && typeof unsub === 'function') unsub();
      });
    };
  }, []);

  // ✅ Loading state - show while initializing
  if (!isReady) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.statusContainer}>
          <Icon name="loading" size={16} color="#9ca3af" />
          <Text style={styles.statusText}>Loading ad...</Text>
        </View>
      </View>
    );
  }

  // ✅ Hidden state - Premium/Admin users
  if (adStatus === 'hidden') {
    // In production, return nothing for premium users
    if (!__DEV__) {
      return null;
    }
    
    // In development, show debug message
    return (
      <View style={[styles.container, styles.hiddenContainer, style]}>
        <Text style={styles.hiddenText}>
          🚫 Banner Hidden: {errorMessage}
        </Text>
      </View>
    );
  }

  // ✅ Error state - show visible error for debugging
  if (adStatus === 'error') {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Icon name="alert-circle" size={18} color="#ef4444" />
        <Text style={styles.errorText}>{errorMessage || 'Ad error'}</Text>
      </View>
    );
  }

  // ✅ Free user - RENDER BANNER
  if (shouldShowBanner && adUnitId) {
    console.log('[Banner] ✅ RENDERING BANNER AD:', adUnitId);
    
    return (
      <View style={[styles.container, style]}>
        {/* Loading overlay */}
        {adStatus === 'loading' && (
          <View style={styles.loadingOverlay}>
            <Icon name="loading" size={14} color="#6b7280" />
            <Text style={styles.loadingText}>Loading ad...</Text>
          </View>
        )}
        
        {/* Error overlay (if ad failed to load) */}
        {adStatus === 'error' && errorMessage && (
          <View style={styles.adErrorContainer}>
            <Icon name="information" size={14} color="#f59e0b" />
            <Text style={styles.adErrorText}>{errorMessage}</Text>
          </View>
        )}
        
        {/* ✅ The actual BannerAd component */}
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: false,
          }}
          onAdLoaded={() => {
            console.log('[Banner] ✅ ✅ ✅ AD LOADED SUCCESSFULLY!');
            if (isMounted.current) {
              setAdStatus('loaded');
              setErrorMessage('');
            }
            adMobService.trackAdImpression('banner', 'loaded');
          }}
          onAdFailedToLoad={(error) => {
            console.log('[Banner] ❌ Ad failed to load');
            console.log('[Banner]   Error code:', error.code);
            console.log('[Banner]   Error message:', error.message);
            
            let userMessage = '';
            
            // Translate error codes to user-friendly messages
            if (error.code === 3) {
              // ERROR CODE 3 = NO_FILL (most common, NORMAL)
              userMessage = 'No ads available';
              console.log('[Banner] ℹ️ ERROR CODE 3 (NO FILL) - This is NORMAL:');
              console.log('[Banner]   • New ad unit needs 24-48h to activate');
              console.log('[Banner]   • No ads available for your region');
              console.log('[Banner]   • Low ad inventory (try again later)');
              console.log('[Banner]   ✅ Your integration is CORRECT!');
            } else if (error.code === 0) {
              userMessage = 'Ad error (internal)';
            } else if (error.code === 1) {
              userMessage = 'Invalid ad configuration';
            } else if (error.code === 2) {
              userMessage = 'Network error';
            } else {
              userMessage = `Ad error (${error.code})`;
            }
            
            if (isMounted.current) {
              setAdStatus('error');
              setErrorMessage(userMessage);
            }
          }}
          onAdOpened={() => {
            console.log('[Banner] 👆 Ad clicked/opened');
            adMobService.trackAdImpression('banner', 'click');
          }}
          onAdClosed={() => {
            console.log('[Banner] 🚪 Ad closed');
          }}
        />
      </View>
    );
  }

  // ✅ Fallback - shouldn't reach here
  console.log('[Banner] ⚠️ Fallback state reached (shouldn\'t happen)');
  return (
    <View style={[styles.container, styles.errorContainer, style]}>
      <Icon name="information" size={16} color="#9ca3af" />
      <Text style={styles.infoText}>Ad unavailable</Text>
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
    gap: 6,
  },
  loadingText: {
    fontSize: 11,
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
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  infoText: {
    fontSize: 11,
    color: '#9ca3af',
  },
});

export default AdMobBanner;
