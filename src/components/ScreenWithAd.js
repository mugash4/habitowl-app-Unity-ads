/**
 * Screen Wrapper with Banner Ad
 * Automatically adds banner ad to bottom of screen for free users
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import AdMobBanner from './AdMobBanner';

const ScreenWithAd = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* Screen Content */}
      <View style={styles.content}>
        {children}
      </View>
      
      {/* Banner Ad - automatically shows only for free users */}
      <View style={styles.adContainer}>
        <AdMobBanner />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Safe area for iOS
  },
});

export default ScreenWithAd;
