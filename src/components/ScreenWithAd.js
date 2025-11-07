/**
 * Screen Wrapper
 * No longer shows banner (banner is now in tab navigator)
 * Just provides consistent layout
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

const ScreenWithAd = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

export default ScreenWithAd;
