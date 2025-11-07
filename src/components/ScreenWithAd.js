/**
 * Screen Wrapper with Banner Ad
 * Banner ad positioned BELOW tab bar as requested
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
      
      {/* Banner Ad - NO LONGER RENDERED HERE */}
      {/* Banner will be rendered in AppNavigator below tabs */}
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
    paddingBottom: 0,
  },
});

export default ScreenWithAd;
