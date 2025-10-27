/**
 * Expo Config Plugin for IronSource (Unity Ads) Mediation
 * This plugin configures the native iOS and Android projects for Unity Ads
 * 
 * FIXED VERSION: Removed hardcoded SDK version to prevent conflicts
 * The ironSource SDK version is now managed by the npm package itself
 */

const { 
  withAppBuildGradle, 
  withProjectBuildGradle, 
  withInfoPlist,
} = require('@expo/config-plugins');

/**
 * Add IronSource to Android app/build.gradle
 */
const withAppBuildGradleConfig = (config) => {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Add multiDex if not present
    if (!buildGradle.includes('multiDexEnabled true')) {
      buildGradle = buildGradle.replace(
        /defaultConfig\s*{/,
        `defaultConfig {
        multiDexEnabled true`
      );
    }

    // FIXED: Only add Google Play Services dependencies (not the SDK itself)
    // The ironSource SDK is already included in the npm package
    if (!buildGradle.includes('play-services-appset')) {
      const dependenciesMatch = buildGradle.match(/dependencies\s*{/);
      if (dependenciesMatch) {
        const insertPosition = buildGradle.indexOf(dependenciesMatch[0]) + dependenciesMatch[0].length;
        const playServicesDeps = `
    // Google Play Services (required for IronSource)
    implementation 'com.google.android.gms:play-services-appset:16.1.0'
    implementation 'com.google.android.gms:play-services-ads-identifier:18.1.0'
    implementation 'com.google.android.gms:play-services-basement:18.4.0'
`;
        buildGradle = 
          buildGradle.slice(0, insertPosition) + 
          playServicesDeps + 
          buildGradle.slice(insertPosition);
      }
    }

    config.modResults.contents = buildGradle;
    return config;
  });
};

/**
 * Add IronSource Maven repository to Android project/build.gradle
 */
const withProjectBuildGradleConfig = (config) => {
  return withProjectBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    // Add IronSource Maven repository if not present
    if (!buildGradle.includes('android-sdk.is.com')) {
      // Find allprojects > repositories block
      const allProjectsMatch = buildGradle.match(/allprojects\s*{[\s\S]*?repositories\s*{/);
      if (allProjectsMatch) {
        const insertPosition = buildGradle.indexOf(allProjectsMatch[0]) + allProjectsMatch[0].length;
        const ironSourceRepo = `
        maven { url "https://android-sdk.is.com/" }`;
        buildGradle = 
          buildGradle.slice(0, insertPosition) + 
          ironSourceRepo + 
          buildGradle.slice(insertPosition);
      }
    }

    config.modResults.contents = buildGradle;
    return config;
  });
};

/**
 * Configure iOS Info.plist
 */
const withInfoPlistConfig = (config) => {
  return withInfoPlist(config, (config) => {
    // Add SKAdNetwork identifiers for Unity Ads
    if (!config.modResults.SKAdNetworkItems) {
      config.modResults.SKAdNetworkItems = [];
    }
    
    const unityAdNetworkIds = [
      'su67r6k2v3.skadnetwork',
      '4fzdc2evr5.skadnetwork',
      '4pfyvq9l8r.skadnetwork',
      'v72qych5uu.skadnetwork',
      'ludvb6z3bs.skadnetwork',
      'cp8zw746q7.skadnetwork',
      'c6k4g5qg8m.skadnetwork',
      '3sh42y64q3.skadnetwork',
      '3rd42ekr43.skadnetwork',
      '424m5254lk.skadnetwork',
      '578prtvx9j.skadnetwork',
      '5lm9lj6jb7.skadnetwork',
      'p78axxw29g.skadnetwork',
      'v4nxqhlyqp.skadnetwork',
      'wzmmz9fp6w.skadnetwork',
      'yclnxrl5pm.skadnetwork',
      't38b2kh725.skadnetwork',
      '7ug5zh24hu.skadnetwork',
      '9rd848q2bz.skadnetwork',
      'n6fk4nfna4.skadnetwork',
      'kbd757ywx3.skadnetwork',
      '9t245vhmpl.skadnetwork',
      'av6w8kgt66.skadnetwork',
      'klf5c3l5u5.skadnetwork',
      'ppxm28t8ap.skadnetwork',
      'uw77j35x4d.skadnetwork',
      'pwa73g5rt2.skadnetwork',
      'mlmmfzh3r3.skadnetwork',
      '5l3tpt7t6e.skadnetwork',
      'hs6bdukanm.skadnetwork',
      'cstr6suwn9.skadnetwork',
      '4468km3ulz.skadnetwork',
      '2u9pt9hc89.skadnetwork',
      '8s468mfl3y.skadnetwork',
      '74b6s63p6l.skadnetwork',
      'prcb7njmu6.skadnetwork',
      'e5fvkxwrpn.skadnetwork',
      'f38h382jlk.skadnetwork',
      '7rz58n8ntl.skadnetwork',
      'rx5hdcabgc.skadnetwork',
      'g28c52eehv.skadnetwork',
      'cg4yq2srnc.skadnetwork',
      'gta9lk7p23.skadnetwork',
      '252b5q8x7y.skadnetwork',
      '294l99pt4k.skadnetwork',
      'feyaarzu9v.skadnetwork',
      'ggvn48r87g.skadnetwork',
      'glqzh8vgby.skadnetwork',
      'v9wttpbfk9.skadnetwork',
      'n38lu8286q.skadnetwork',
      '47vhws6wlr.skadnetwork',
      'zmvfpc5aq8.skadnetwork',
      'ejvt5qm6ak.skadnetwork',
      '5tjdwbrq8w.skadnetwork',
      'mtkv5xtk9e.skadnetwork',
      '6g9af3uyq4.skadnetwork',
      'rvh3l7un93.skadnetwork',
      'y45688jllp.skadnetwork',
      '9nlb52qjxg.skadnetwork',
      'gvmwg8q7h5.skadnetwork'
    ];

    unityAdNetworkIds.forEach((id) => {
      if (!config.modResults.SKAdNetworkItems.find(item => item.SKAdNetworkIdentifier === id)) {
        config.modResults.SKAdNetworkItems.push({
          SKAdNetworkIdentifier: id
        });
      }
    });

    // Add App Transport Security settings
    if (!config.modResults.NSAppTransportSecurity) {
      config.modResults.NSAppTransportSecurity = {};
    }
    config.modResults.NSAppTransportSecurity.NSAllowsArbitraryLoads = true;

    // Add User Tracking Description
    if (!config.modResults.NSUserTrackingUsageDescription) {
      config.modResults.NSUserTrackingUsageDescription = 
        'This identifier will be used to deliver personalized ads to you.';
    }

    return config;
  });
};

/**
 * Main plugin function
 */
const withIronSource = (config) => {
  console.log('🔧 Applying IronSource configuration...');
  
  // Configure Android
  config = withProjectBuildGradleConfig(config);
  config = withAppBuildGradleConfig(config);
  
  // Configure iOS
  config = withInfoPlistConfig(config);
  
  console.log('✅ IronSource configuration applied');
  return config;
};

module.exports = withIronSource;