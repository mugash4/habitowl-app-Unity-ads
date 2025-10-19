const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
  withInfoPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Custom Expo config plugin for IronSource Unity Ads mediation
 * This configures both Android and iOS native code for IronSource SDK
 */
const withIronSource = (config) => {
  // Configure Android
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('play-services-ads-identifier')) {
      return config;
    }

    // Add required Google Play Services dependencies
    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*{/,
      `dependencies {
    // IronSource required dependencies
    implementation 'com.google.android.gms:play-services-appset:16.0.2'
    implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'
    implementation 'com.google.android.gms:play-services-basement:18.3.0'
    // IronSource Ad Quality SDK
    implementation 'com.unity3d.ads-mediation:adquality-sdk:7.24.1'
`
    );

    return config;
  });

  // Configure Android Manifest permissions
  config = withProjectBuildGradle(config, (config) => {
    // Ensure Maven Central repository is available
    if (!config.modResults.contents.includes('mavenCentral()')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*{\s*repositories\s*{/,
        `allprojects {
    repositories {
        mavenCentral()
`
      );
    }
    return config;
  });

  // Configure iOS Info.plist
  config = withInfoPlist(config, (config) => {
    // Add SKAdNetwork IDs for IronSource
    const skAdNetworkItems = config.modResults.SKAdNetworkItems || [];
    
    const ironSourceSKAdNetworks = [
      { SKAdNetworkIdentifier: 'su67r6k2v3.skadnetwork' },
    ];

    // Add IronSource SKAdNetwork IDs if not already present
    ironSourceSKAdNetworks.forEach((item) => {
      const exists = skAdNetworkItems.some(
        (existing) => existing.SKAdNetworkIdentifier === item.SKAdNetworkIdentifier
      );
      if (!exists) {
        skAdNetworkItems.push(item);
      }
    });

    config.modResults.SKAdNetworkItems = skAdNetworkItems;

    // Add App Transport Security settings
    if (!config.modResults.NSAppTransportSecurity) {
      config.modResults.NSAppTransportSecurity = {};
    }
    config.modResults.NSAppTransportSecurity.NSAllowsArbitraryLoads = true;

    // Add Universal SKAN Reporting endpoint
    config.modResults.NSAdvertisingAttributionReportEndpoint = 
      'https://postbacks-mobile.unity3d.com/v1/ios';

    return config;
  });

  return config;
};

module.exports = withIronSource;
