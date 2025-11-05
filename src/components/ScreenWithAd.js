/**
 * Screen Wrapper with Banner Ad
 * Automatically adds banner ad above tab bar for free users
 * ✅ FIXED: Banner ad positioned above tab bar
 */

import React from 'react';
import { View, StyleSheet, Platform, SafeAreaView } from 'react-native';
import AdMobBanner from './AdMobBanner';

const ScreenWithAd = ({ children, style }) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {/* Screen Content */}
      <View style={styles.content}>
        {children}
      </View>
      
      {/* Banner Ad - Positioned above tab bar */}
      {Platform.OS !== 'web' && (
        <View style={styles.adContainer}>
          <AdMobBanner />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingBottom: 0, // Content manages its own padding
  },
  adContainer: {
    // ✅ FIXED: Position banner ad above tab bar
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60, // Above tab bar (iOS has notch padding)
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    // Add shadow for better separation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default ScreenWithAd;
