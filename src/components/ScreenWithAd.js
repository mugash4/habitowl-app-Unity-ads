/**
 * Screen Wrapper with Banner Ad
 * Automatically adds banner ad to bottom of screen for free users
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
      
      {/* Banner Ad - Fixed at bottom */}
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
  },
  adContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
});

export default ScreenWithAd;